declare const __performance: Performance;
const timeout = 5000

function includeApi(targets: (string | RegExp)[], source: string): boolean {
  if (!targets) return false;
  const len = targets.length;
  for(let i = 0; i < len; i++) {
    const t = targets[i];
    if (t instanceof RegExp && t.test(source)) {
      return true;
    } else if (t === source || source.indexOf(t as string) > -1){
      return true;
    }
  }
  return false;
}

function includeSource(targets: (string | RegExp)[], source: string): boolean {
  if (!targets) return false;
  var len = targets.length;
  for (var i = 0; i < len; i++) {
    var t = targets[i];
    if (t instanceof RegExp && t.test(source)) {
      return true;
    } else if (t === source || source.indexOf(t as string) > -1){
      return true;
    }
  }
  return false;
}

function getImgSrc(dom: any) {
  let imgSrc;
  if (dom.nodeName.toUpperCase() == 'IMG') {
    imgSrc = dom.src;
  } else {
    const computedStyle = window.getComputedStyle(dom);
    const bgImg = computedStyle.getPropertyValue('background-image') || computedStyle.getPropertyValue('background');
    const matches = bgImg.match(/url\(.*?\)/g);
    if (matches && matches.length) {
      const urlStr = matches[matches.length - 1]; // use the last one
      const innerUrl = urlStr.replace(/^url\([\'\"]?/, '').replace(/[\'\"]?\)$/, '');
      if (/^http/.test(innerUrl) || /^\/\//.test(innerUrl)) {
        imgSrc = innerUrl;
      }
    }
  }
  return imgSrc;
}

interface Options {
  firstApi: (string | RegExp)[];
  firstCss: (string | RegExp)[];
  firstJs: (string | RegExp)[];
}

export default function(options: Options) {
  // __performance是通过@mkt/webpack-plugin-performance-tracker写的
  // 页面的性能指标都在这个对象中
  if (typeof __performance === 'undefined') {
    throw new Error('Can not using without @mkt/webpack-plugin-performance-tracker,' 
      + 'please install @mkt/webpack-plugin-performance-tracker')
  }

  return new Promise((resolve, reject) => {
    function measure() {
      setTimeout(function() {
        if (!('getEntries' in performance)) {
          reject(Error('not support'))
          return
        }
        const entries: any = performance.getEntries();
        for (let i = 0, len = entries.length; i < len; i++) {
          const entry = entries[i];
          const time = Number((entry.startTime + entry.duration).toFixed(2));

          if (entry.name === 'first-paint') {
            __performance.fp = time;
          } else if(entry.name === 'first-contentful-paint'){
            __performance.fcp = time;
          } else {
            switch (entry.initiatorType) {
              case 'xmlhttprequest':
                if (includeApi(options.firstApi || [], entry.name)) {
                  if (__performance.fapi < time) {
                    __performance.fapi = time;
                  }
                }
                break;
              case 'img':
                var $mainImgs = document.querySelectorAll('[perf-img]');
                var imgLen = $mainImgs.length;
                for (let j = 0; j < imgLen; j++) {
                  var $mainImg = $mainImgs[j];
                  if (entry.name === getImgSrc($mainImg)) {
                    if (__performance.fimg < time) {
                      __performance.fimg = time;
                    }
                  }
                }
                break;
              case 'link':
              case 'script':
                if (includeSource(options.firstJs || [], entry.name)) {
                  if (__performance.fjs < time) {
                    __performance.fjs = time;
                  }
                } else if (includeSource(options.firstCss || [], entry.name)) {
                  if (__performance.fcss < time) {
                    __performance.fcss = time;
                  }
                }
                break;
            }
          }
        }
        let fmp = 0; // first main paint时间，如果用户未打点，则为0
        let tti = __performance.tti; // 响应时间
        let measureSmp = true; // 用户是否打点了smp
        try {
          const ttiEntry: any = performance.measure('tti', 'start', 'tti');
          tti = Math.max(tti, Number((ttiEntry.startTime + ttiEntry.duration).toFixed(2)));
        } catch (e) {}
        try {
          const fmpEntry: any = performance.measure('fmp', 'start', 'fmp');
          fmp = Number((fmpEntry.startTime + fmpEntry.duration).toFixed(2));
        } catch(e) {
          measureSmp = false;
        }
      
        // 判断页面是否被阻塞了
        /**
          1. fp/fcp 5s后为0（一直白屏） 
          2. 如果配置了首js 5s后为0（说明5s后js未加载下来）
          3. 如果配置了首api，5s后仍然为0（说明5s后接口还未拉取回来）  
          4. 如果手动打点fmp，5s后仍然为0或者fmp耗时超过5s（重要元素渲染超过5s）
          5. 如果手动打点了tti，tti耗时超过5s（页面到可响应时间超过5s）
          6. long task超过5s（js阻塞超过5s） 
        **/
        function isBlock() {
          return __performance.fp === 0 || __performance.fcp === 0 // 1
            || options.firstJs && __performance.fjs === 0 // 2
            || options.firstApi && __performance.fapi === 0 // 3
            || measureSmp && (fmp === 0 || fmp > timeout) // 4
            || tti > timeout; // 5/6
        }
        __performance.tti = tti;
        __performance.fmp = fmp;
        if (isBlock()) {
          reject(Error('timeout'));
        } else {
          resolve(__performance);
        }
        // clear
        performance.clearMarks();
        performance.clearMeasures();
      }, timeout);
    }

    if (document.readyState == 'complete') {
      measure();
    } else {
      window.addEventListener('load', () => {
        measure();
      });
    }
  })
}

export interface Performance {
  id: string;
  fp: number; // first paint
  fcp: number; // first contentful paint
  fapi: number; // first api
  fjs: number; // first js
  fcss: number; // first css
  fimg: number; // first image
  tti: number;// time to interactive
  fmp: number; // first meaningful paint
}
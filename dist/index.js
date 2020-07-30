"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var timeout = 5000;
function includeApi(targets, source) {
    if (!targets)
        return false;
    var len = targets.length;
    for (var i = 0; i < len; i++) {
        var t = targets[i];
        if (t instanceof RegExp && t.test(source)) {
            return true;
        }
        else if (t === source || source.indexOf(t) > -1) {
            return true;
        }
    }
    return false;
}
function includeSource(targets, source) {
    if (!targets)
        return false;
    var len = targets.length;
    for (var i = 0; i < len; i++) {
        var t = targets[i];
        if (t instanceof RegExp && t.test(source)) {
            return true;
        }
        else if (t === source || source.indexOf(t) > -1) {
            return true;
        }
    }
    return false;
}
function getImgSrc(dom) {
    var imgSrc;
    if (dom.nodeName.toUpperCase() == 'IMG') {
        imgSrc = dom.src;
    }
    else {
        var computedStyle = window.getComputedStyle(dom);
        var bgImg = computedStyle.getPropertyValue('background-image') || computedStyle.getPropertyValue('background');
        var matches = bgImg.match(/url\(.*?\)/g);
        if (matches && matches.length) {
            var urlStr = matches[matches.length - 1]; // use the last one
            var innerUrl = urlStr.replace(/^url\([\'\"]?/, '').replace(/[\'\"]?\)$/, '');
            if (/^http/.test(innerUrl) || /^\/\//.test(innerUrl)) {
                imgSrc = innerUrl;
            }
        }
    }
    return imgSrc;
}
function default_1(options) {
    // __performance是通过@mkt/webpack-plugin-performance-tracker写的
    // 页面的性能指标都在这个对象中
    if (typeof __performance === 'undefined') {
        throw new Error('Can not using without @mkt/webpack-plugin-performance-tracker,'
            + 'please install @mkt/webpack-plugin-performance-tracker');
    }
    return new Promise(function (resolve, reject) {
        function measure() {
            setTimeout(function () {
                if (!('getEntries' in performance)) {
                    reject(Error('not support'));
                    return;
                }
                var entries = performance.getEntries();
                for (var i = 0, len = entries.length; i < len; i++) {
                    var entry = entries[i];
                    var time = Number((entry.startTime + entry.duration).toFixed(2));
                    if (entry.name === 'first-paint') {
                        __performance.fp = time;
                    }
                    else if (entry.name === 'first-contentful-paint') {
                        __performance.fcp = time;
                    }
                    else {
                        switch (entry.initiatorType) {
                            case 'xmlhttprequest':
                                if (includeApi(options.firstApi || [], entry.name)) {
                                    __performance.fapi = time;
                                }
                                break;
                            case 'img':
                                var $mainImgs = document.querySelectorAll('[perf-img]');
                                var imgLen = $mainImgs.length;
                                for (var j = 0; j < imgLen; j++) {
                                    var $mainImg = $mainImgs[j];
                                    if (entry.name === getImgSrc($mainImg)) {
                                        __performance.fimg = time;
                                    }
                                }
                                break;
                            case 'link':
                            case 'script':
                                if (includeSource(options.firstJs || [], entry.name)) {
                                    __performance.fjs = time;
                                }
                                else if (includeSource(options.firstCss || [], entry.name)) {
                                    __performance.fcss = time;
                                }
                                break;
                        }
                    }
                }
                var fmp = 0; // first main paint时间，如果用户未打点，则为0
                var tti = __performance.tti; // 响应时间
                var measureSmp = true; // 用户是否打点了smp
                try {
                    var ttiEntry = performance.measure('tti', 'start', 'tti');
                    tti = Math.max(tti, Number((ttiEntry.startTime + ttiEntry.duration).toFixed(2)));
                }
                catch (e) { }
                try {
                    var fmpEntry = performance.measure('fmp', 'start', 'fmp');
                    fmp = Number((fmpEntry.startTime + fmpEntry.duration).toFixed(2));
                }
                catch (e) {
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
                }
                else {
                    resolve(__performance);
                }
                // clear
                performance.clearMarks();
                performance.clearMeasures();
            }, timeout);
        }
        if (document.readyState == 'complete') {
            measure();
        }
        else {
            window.addEventListener('load', function () {
                measure();
            });
        }
    });
}
exports.default = default_1;
//# sourceMappingURL=index.js.map
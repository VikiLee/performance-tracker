## 功能
用于采集性能指标数据，需要配合[webpack-plugin-performance-tracker](https://github.com/VikiLee/webpack-plugin-performance-tracker)使用

### usage
在入口文件处：
```
import performanceTracker from 'performance-tracker'

performanceTracker({
  firstJs: [/app.*\.js/, /test.js/],
  firstCss: [/app.*\.css/],
  firstApi: ['/api/v1/users/profile', '/api/v1/user/status']
}).then((data) => {
  console.log(data)
}).catch((error) => {
  if (error && error.message === 'timeout') {
    console.log('timeout')
  } else {
    console.log('Your browser does not support performance')
  }
})
```
性能指标会在页面加载5s后全部获取，如果5s后获取的数据不全，则说明页面timeout了，这个时候看需求决定是否上报异常。之所以取5s为界定值，和用户感知相关：

用户感知 | 响应时间
---|---
流畅 | < 1s
可用 | 1s ~ 2s
丢帧 | 纯页面性能指标
卡顿 | 3s ~ 5s
阻塞 | > 5s

### options

name | type | description
---|---|---
firstJs | (RegExp\|string)[] | 重要js数组，支持全匹配或者正则
firsCss | (RegExp\|string)[] | 重要css数组，支持全匹配或者正则
firstApi | (RegExp\|string)[] | 重要api数组，支持全匹配或者正则

配置了对应参数后，获取的性能指标值中就包含了页面加载这些资源所消耗的时间。

注意匹配算法是模糊匹配，比如firstJs: ['app.js']，则请求的url包含了app.js则会被匹配到。

### 性能指标

<code>fp</code>: first paint，即首次渲染时间  

<code>fcp</code>: first contentful paint，首个内容绘制时间，具体指图片或者文本的首个像素渲染，一般和first paint取值相同，即我们平时所说的白屏时间  

<code>fmp</code>: first meaningful paint，首个重要元素渲染时间，某种意义上可以作为首屏时间，需要在首个重要元素渲染后中打点

<code>fcss</code>: 重要css加载时间，需要配置firstCss，取耗时最长的值


<code>fjs</code>: 重要的js加载时间，需要配置firstJs，取耗时最长的值    

<code>fimg</code>:  首图加载时间，某种意义上可以作为首屏时间，需要在首图元素上添加自定义属性perf-img="true"以便识别哪个是首图，支持多个  

<code>tti</code>: 可交互时间，默认取[long task](https://w3c.github.io/longtasks/)，但是long task经常不正确，需要用户手动打点

附上直观图：
![](https://user-gold-cdn.xitu.io/2020/7/27/1738f63f9f72606c?w=1400&h=488&f=png&s=39528)

### fmp打点
在你认为你页面中重要的元素渲染后打点，比如react <code>componentDidMount</code>或者vue <code>mounted</code>中
```
window.performance && performance.mark('fmp')
```
### tti打点
在你认为页面中可以交互的元素渲染出来后打点，比如在一个重要的按钮渲染出来后，或者表单元素渲染出来后进行打点，同样可以利用react的componentDidMount或者vue的mounted钩子函数中: 
```
window.performance && performance.mark('tti')
```


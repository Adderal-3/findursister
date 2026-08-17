# HTML 安全审查（调用 `/html-security-scan`）

DS Marker 结构校验完成后，对所有含 DS Marker 的 HTML 文件及所有注入产物执行 HTML 安全审查。

### 域名白名单

外部资源仅允许以下域名：`*.163.com`、`*.166.net`、`*.netease.com`、`*.16163.com`、`res.wx.qq.com`（微信 JSSDK）

📋 问题严重程度说明：
   🔴 阻断项 = 功能完全不能用，必须修复
   🟡 警告项 = 可能有问题，建议修复但不阻断
   ✅ 通过项 = 写法正确，无需处理

### HIGH 阻断项（发现即阻断）

- [ ] 无 `eval(`
- [ ] 无 `new Function(`
- [ ] 无 `document.write(`
- [ ] 无 `innerHTML =` / `innerHTML +=`
- [ ] `<script src>` 全部指向白名单域名
- [ ] `<iframe src>` 全部指向白名单域名
- [ ] 无 `javascript:` 伪协议（带实际代码）
- [ ] 无 50+ 连续 `\x` / `\u` 转义序列
- [ ] `<form action>` 全部指向白名单域名
- [ ] 所有外部资源使用 `https://`，无 `http://` 引用
- [ ] JSSDK CDN：`ds.res.netease.com/online/pkg/ds-js-sdk/1.0.87/ds-js-sdk.min.js`
- [ ] DsUlink2 CDN：`g.166.net/pkg/ds-ulink2/latest/ds-ulink2.min.js`
- [ ] MobileShare CDN：`ds.res.netease.com/online/pkg/mobile-share/2.2.0/mobile-share.min.js`
- [ ] NS 统计 SDK：`ds.res.netease.com/online/pkg/stats/latest/stats.min.js`
- [ ] 导航栏 CSS CDN（若已接入）：`ds.res.netease.com/online/pkg/ds-navigation-mini-program-bar/0.0.5/index.css`
- [ ] 导航栏 JS CDN（若已接入）：`ds.res.netease.com/online/pkg/ds-navigation-mini-program-bar/0.0.5/index.js`

### MEDIUM 需人工确认项

- [ ] `document.cookie` 操作已知晓
- [ ] `postMessage` 有 origin 校验
- [ ] 无第三方追踪代码

### HTML 结构检查

- [ ] 有 `<!DOCTYPE html>` 声明
- [ ] 有 `<meta charset>` 声明
- [ ] 有 `<meta name="viewport">` 声明

### LOW 信息提示项

- [ ] `<script type="module">` 内无未声明直接赋值
- [ ] 无 `console.log` / `console.error` 残留
- [ ] 无 `debugger` 语句
- [ ] 无 `alert(` / `confirm(` / `prompt(` 调试弹窗

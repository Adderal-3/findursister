# SDK-LOADER 块

- [ ] NS snippet 存在，含 `ns('create', ...)` 和 `ns('send', 'pageview')`
- [ ] `ns('create', ...)` 与 `ns('send', 'pageview')` 之间已设置三个公共维度：`dimension95` / `dimension96` / `dimension97`
- [ ] 三个维度值引用 `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID`（不得硬编码）
- [ ] **禁止定义** `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID`（这些变量由部署平台注入，代码中不得赋值/声明，否则会导致日志异常）
- [ ] `timeOnSessionTracker` 已注册（heartBeatTime / sessionExpiredTime / inactiveTime 三个参数）
- [ ] JSSDK script 标签存在（`ds.res.netease.com/online/pkg/ds-js-sdk/1.0.87/ds-js-sdk.min.js`）
- [ ] DsUlink 加载有 UA 检测（`!/Godlike/i.test`）且有 `onDsUlinkReady` 注册
- [ ] MobileShare 加载有同样 UA 检测且有 `onMobileShareReady` 注册
- [ ] SDK-LOADER 块在所有业务 marker 之前（`<head>` 加载在前）

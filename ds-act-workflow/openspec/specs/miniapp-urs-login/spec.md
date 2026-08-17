## ADDED Requirements

### Requirement: 微信 JSSDK 注入
系统 SHALL 在 `index.html` 中直接引入微信 JSSDK 脚本，使 `wx.miniProgram` API 在小程序 WebView 中可用。

#### Scenario: JSSDK 已注入，小程序环境
- **WHEN** 页面在微信小程序 WebView 中加载
- **THEN** `wx.miniProgram` API 可用，后续联登和跳转逻辑正常执行

#### Scenario: JSSDK 已注入，非小程序环境
- **WHEN** 页面在普通浏览器或 App WebView 中加载
- **THEN** JSSDK 脚本加载但 `wx.miniProgram.getEnv` 返回非小程序标识，不影响现有逻辑

### Requirement: URS Cookie 联登触发
系统 SHALL 在微信小程序环境下，通过 `universal-login` 的 `hasLoggedIn()` 方法触发 URS Cookie 联登，复用小程序登录态。

#### Scenario: 联登成功
- **WHEN** 当前运行在微信小程序 WebView 中
- **AND** 小程序服务端已将 URS Cookie 写入 `.163.com` 域
- **THEN** `window.dsLogin.hasLoggedIn()` 返回 `true`
- **AND** H5 用户处于已登录态，无需重复登录

#### Scenario: 联登失败跳转登录页
- **WHEN** 当前运行在微信小程序 WebView 中
- **AND** URS Cookie 不存在或已过期（服务端未完成联登）
- **THEN** `window.dsLogin.hasLoggedIn()` 返回 `false`
- **AND** 系统 SHALL 调用 `wx.miniProgram.navigateTo({ url: '/pages/login/index' })` 跳转小程序登录页
- **AND** 用户在小程序登录页完成登录后，小程序自动返回 H5

#### Scenario: JSSDK 加载超时时联登失败兜底
- **WHEN** 当前运行在微信小程序 WebView 中
- **AND** 微信 JSSDK 在 3s 内加载超时，`wx.miniProgram` API 不可用
- **THEN** 系统 SHALL 不调用 `wx.miniProgram.navigateTo`（避免 JS 报错）
- **AND** 系统 SHALL 阻止页面继续渲染，展示错误提示「网络异常，请重新进入页面」

#### Scenario: 联登初始化时机
- **WHEN** precheck 判断为小程序环境
- **THEN** `window.dsLogin` 使用 `universal-login` 完成初始化
- **AND** 随后在 JSSDK 加载 Promise resolve 后调用 `hasLoggedIn()` 触发联登检查
- **AND** 联登检查在页面正式渲染前完成


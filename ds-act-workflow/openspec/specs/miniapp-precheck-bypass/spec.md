## ADDED Requirements

### Requirement: 小程序环境跳过 ulink 跳转
系统 SHALL 在 precheck 预检流程中，当检测到微信小程序 WebView 环境时，跳过 ulink 跳转 App 的逻辑，直接继续后续流程。

#### Scenario: 小程序环境预检
- **WHEN** precheck 预检执行
- **AND** `isWechatMiniProgram()` 返回 `true`
- **THEN** 不触发任何 ulink 跳转或 App 下载引导
- **AND** 预检正常通过，继续后续页面初始化流程

#### Scenario: 非小程序环境预检行为不变
- **WHEN** precheck 预检执行
- **AND** `isWechatMiniProgram()` 返回 `false`
- **AND** 当前为站外环境（未安装 App 或未登录）
- **THEN** 触发原有 ulink 跳转逻辑，行为与修改前完全一致

#### Scenario: 小程序环境不展示下载引导 UI
- **WHEN** 当前运行在微信小程序 WebView 中
- **THEN** 页面不渲染任何「下载 App」或「打开 App」的引导弹窗/按钮

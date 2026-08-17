## ADDED Requirements

### Requirement: 微信小程序 WebView 环境检测
系统 SHALL 提供 `isWechatMiniProgram()` 工具函数，通过 User-Agent 特征字符串检测当前页面是否运行在微信小程序内嵌 WebView 环境中。

#### Scenario: 微信小程序 WebView 环境
- **WHEN** User-Agent 包含 `miniProgram`（大小写不敏感，即 `.toLowerCase()` 后含 `miniprogram`）
- **THEN** `isWechatMiniProgram()` 返回 `true`

#### Scenario: 普通微信浏览器（非小程序）
- **WHEN** User-Agent 包含 `MicroMessenger` 但不包含 `miniProgram` 字符串
- **THEN** `isWechatMiniProgram()` 返回 `false`

#### Scenario: App 内 WebView 环境
- **WHEN** User-Agent 不包含 `miniProgram` 字符串
- **THEN** `isWechatMiniProgram()` 返回 `false`

#### Scenario: 普通浏览器环境
- **WHEN** User-Agent 为标准桌面或移动浏览器 UA
- **THEN** `isWechatMiniProgram()` 返回 `false`

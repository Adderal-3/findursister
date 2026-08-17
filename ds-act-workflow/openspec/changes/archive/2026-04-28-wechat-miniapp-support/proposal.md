## Why

活动 H5 需要支持在微信小程序 webview 内嵌访问，但当前 precheck 预检逻辑会对站外用户触发 ulink 跳转 App，而微信小程序环境禁止直接跳转第三方 App，导致访问异常。同时，小程序用户已完成登录，H5 需要通过联登机制复用小程序登录态，避免用户重复登录。

## What Changes

- **precheck 环境判断**：在预检逻辑中识别微信小程序 webview 环境（通过 UA 中的 `miniProgram` 标识），跳过 ulink 跳转 App 的逻辑
- **微信 JSSDK 接入**：引入微信 JSSDK（`weixin-js-sdk` 或 CDN），以支持 `wx.miniProgram.*` API 调用
- **联登支持**：在小程序环境下，通过 URS Cookie 联登机制实现登录态复用——小程序服务端中转后将 URS Cookie 写入 `.163.com`，H5 侧通过 `universal-login` 的 `hasLoggedIn()` 自动读取并完成登录

## Capabilities

### New Capabilities

- `miniapp-env-detect`：检测当前运行环境是否为微信小程序 webview，供 precheck 及登录流程判断
- `miniapp-precheck-bypass`：在微信小程序环境下，precheck 预检跳过 ulink 跳转 App 逻辑
- `miniapp-urs-login`：微信小程序 webview 内嵌 H5 的 URS Cookie 联登接入，复用小程序登录态

### Modified Capabilities

- `startup-dependency-check`：预检流程需感知小程序环境，跳过站外跳转 App 逻辑

## Impact

- **precheck/startup 模块**：增加环境判断分支，微信小程序环境跳过 ulink 跳转
- **登录模块**：`universal-login`（URS 登录）接入，需在小程序环境下调用 `hasLoggedIn()` 触发 Cookie 联登
- **依赖**：新增微信 JSSDK（`weixin-js-sdk`）依赖
- **无 Breaking Change**：非小程序环境行为不变

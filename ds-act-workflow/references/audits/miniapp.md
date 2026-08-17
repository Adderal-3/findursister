# 小程序支持审查（条件触发）

> 仅当检测到 `isWechatMiniProgram` 函数存在时执行本章节审查，否则跳过。

### 基础改造

- [ ] `isWechatMiniProgram()` 函数存在（检测 `miniprogram` UA）
- [ ] 每个含 DS Marker 的 HTML 文件中微信 JSSDK 已注入（`jweixin-1.6.0.js`），且位于 `ds.js` 之前
- [ ] `withPrecheck` 函数开头有 `isWechatMiniProgram()` 分支，小程序环境直接执行 callback、跳过 ulink

### URS Cookie 联登

- [ ] 每个含 DS Marker 的 HTML 文件中 `universal-login` CSS + JS 已注入，且位于 `ds.js` 之前
- [ ] `initApp` 已声明为 `async`
- [ ] `initApp` 内有 `isWechatMiniProgram()` 分支
- [ ] 小程序分支：`new Ulogin(...)` 实例化存在，含 `env: 'production'`
- [ ] `hasLoggedIn()` 结果判断存在：成功则赋值 `userInfo`，失败则调用 `wx.miniProgram.navigateTo` 跳登录页并 `return`
- [ ] 非小程序分支保留原有 `dsInit()` / `initShare()` / `initUlink()` 调用

### 自定义分享

- [ ] `initShare` 函数开头有 `isWechatMiniProgram()` 分支
- [ ] 小程序分支调用 `wx.miniProgram.postMessage`，data 含 `pageId`、`shareConfig`
- [ ] `shareConfig` 含 `title`（引用 `SHARE_TITLE`）、`imageUrl`（引用 `SHARE_ICON`）、`url`
- [ ] 非小程序分支的原有 Godlike / MobileShare 逻辑保持不变

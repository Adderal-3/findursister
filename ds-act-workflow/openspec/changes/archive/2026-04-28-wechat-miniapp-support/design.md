## Context

活动 H5 运行在多种入口下：App 内 WebView、微信小程序内嵌 WebView、以及普通站外浏览器。当前 precheck 预检流程在判断为站外环境时，会触发 ulink 跳转引导用户下载/打开 App，但微信小程序 WebView 禁止 JS 跳转第三方 App（`wx.miniProgram.navigateTo` 仅允许跳转小程序页面），导致访问异常。

登录方面，小程序内嵌 H5 使用 URS Cookie 联登：小程序服务端在用户打开 H5 之前，已将 URS Cookie 写入 `.163.com` 域，H5 只需通过 `universal-login` 的 `hasLoggedIn()` 自动读取并完成登录。无需额外的 JSSDK 权限配置，只需引入 JSSDK 使用 `wx.miniProgram.getEnv` 判断环境。

## Goals / Non-Goals

**Goals:**
- 在 precheck 中准确识别微信小程序 webview 环境，跳过 ulink 跳转 App 逻辑
- 接入微信 JSSDK，支持 `wx.miniProgram` API 调用
- 在小程序环境下通过 URS Cookie 联登，复用小程序登录态，避免用户重复登录
- 非小程序环境行为完全不变（无破坏性变更）

**Non-Goals:**
- 大神开放平台联登（oauth code 方式）—— 当前需求仅 URS Cookie 联登
- 小程序选角/传角功能
- 自定义分享功能
- 微信 JSSDK 权限验证（config/签名）—— 联登不需要

## Decisions

### 决策 1：环境检测方式 — UA 检测 + wx.miniProgram.getEnv 双重判断

**选择**：优先通过 User-Agent 中的 `miniProgram` 字符串快速检测，再通过 `wx.miniProgram.getEnv` 进行精确确认。

**原因**：UA 检测同步且无副作用，适合 precheck 早期执行；`wx.miniProgram.getEnv` 是官方 API，但为异步且需要 JSSDK 加载完成。两者组合可兼顾速度与准确性。

**备选方案**：仅用 UA 检测 — 风险是 UA 可被伪造，但在活动场景下可接受。

```typescript
// UA 快速检测
export function isWechatMiniProgram(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('miniprogram');
}
```

### 决策 2：JSSDK 引入方式 — 直接注入 index.html

**选择**：在 `index.html` 直接 `<script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js">` 静态注入。

**原因**：小程序 WebView 本身已有 `wx.miniProgram`，JSSDK 只是补全 API 接口。静态注入最简单，无动态加载复杂度，非小程序环境加载了也无副作用。

### 决策 3：联登触发时机 — precheck 完成后、页面正式渲染前

**选择**：在 precheck 判断为小程序环境后，调用 `window.dsLogin.hasLoggedIn()` 触发 URS Cookie 联登，完成后再继续正常的登录态检查流程。

**原因**：与现有登录流程保持一致，最小化改动范围，复用已有的 `universal-login` 组件。

## Risks / Trade-offs

- **UA 字符串依赖** → 微信更新 UA 格式可能导致误判。缓解：同时使用 `wx.miniProgram.getEnv` 作为兜底
- **JSSDK CDN 加载失败** → 网络异常时 JSSDK 无法加载，联登失败。缓解：加载超时后降级，提示用户手动登录
- **URS Cookie 联登依赖服务端** → 服务端未调用联登接口时 Cookie 不存在，`hasLoggedIn()` 返回 false。缓解：联登失败强制调用 `wx.miniProgram.navigateTo({ url: '/pages/login/index' })` 跳转登录页，用户完成登录后小程序自动返回 H5

## Migration Plan

1. 新增 `isWechatMiniProgram()` 工具函数
2. 修改 precheck 模块：判断为小程序环境时跳过 ulink 跳转
3. 新增 JSSDK 动态加载逻辑
4. 修改登录初始化：小程序环境下调用 `hasLoggedIn()` 触发联登
5. 本地调试：使用微信开发者工具的 webview 调试模式验证

无需数据迁移，无 rollback 风险（环境判断条件不影响现有逻辑）。

## Open Questions

- 当前项目是否已引入 `universal-login`？需确认 `window.dsLogin` 的初始化位置
- `precheck` 模块的具体文件路径？需在代码中定位 ulink 跳转逻辑

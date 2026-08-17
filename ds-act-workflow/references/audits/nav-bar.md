# 导航栏审查（条件触发）

> 仅当检测到 `[DS:NAV-BAR:START]` marker 或 `DsNavigationMiniProgramBar` 字样时执行本章节，否则跳过。

### 资源加载

- [ ] 每个含 DS Marker 的 HTML 文件中导航栏 CSS 已注入：`ds.res.netease.com/online/pkg/ds-navigation-mini-program-bar/0.0.5/index.css`，使用 `<link rel="stylesheet">`
- [ ] 每个含 DS Marker 的 HTML 文件中导航栏 JS 已注入：`ds.res.netease.com/online/pkg/ds-navigation-mini-program-bar/0.0.5/index.js`，使用 `type="text/javascript"`（UMD 格式，**禁止** `type="module"`）
- [ ] 导航栏 JS 位于 `ds.js` 之前（UMD 需先挂载到 `window`，ds.js 才能引用）

### 初始化结构

- [ ] `[DS:NAV-BAR:START]` / `[DS:NAV-BAR:END]` marker 存在且成对出现
- [ ] UMD 兼容处理存在：`if (window.DsNavigationMiniProgramBar && window.DsNavigationMiniProgramBar.default)` → 重新赋值 `.default`
- [ ] `initNavBar()` 在 `initApp()` 内、`await initLogin()` 之后调用（**禁止**在 `initLogin` 之前或独立 `ready()` 外单独调用）
- [ ] `setWebviewFullScreen: { isFullScreen: true }` 已调用（导航栏接管系统导航区域必须全屏）
- [ ] `new DsNavigationMiniProgramBar(...)` 实例化存在，赋值给 `navInstance`

### 回调配置

- [ ] `closeClick` 回调存在，调用 `ds.callHandler('closeWindow')`
- [ ] `menuClick` 回调存在，调用 `ds.callHandler('showShareMenu')`
- [ ] `changeVisable` 回调存在，调用 `ds.callHandler('setStatusBar', { color: NavigationBarTheme })`
- [ ] `navInstance.ready()` 有 `.then(...)` 确认初始化完成

### 主题配置

- [ ] `NavigationBarTheme` 变量值为 `'white'` 或 `'black'`（**禁止** `'transparent'` 等非法值，组件不支持）
- [ ] `statusBarStyle` 传值与 `NavigationBarTheme` 保持一致（`black` → `'black'`，其余 → `'white'`）
- [ ] `applyNavTheme` 函数中 `ds.callHandler('setStatusBar')` 包裹在 `window.ds.ready().then(...)` 内（业务层可能在任意时机调用，需防止 JSSDK 未就绪时报错）
- [ ] `applyNavTheme` 函数中 `navInstance.setTheme()` 调用有 `typeof navInstance.setTheme === 'function'` 守卫

### 导出

- [ ] `initNavBar` / `applyNavTheme` 已合并进 `[DS:EXPORTS]` 块的 `export { ... }` 语句（不在 NAV-BAR 块内单独 export）
- [ ] `window.initNavBar` / `window.applyNavTheme` 已在 EXPORTS 块 window 挂载区域赋值

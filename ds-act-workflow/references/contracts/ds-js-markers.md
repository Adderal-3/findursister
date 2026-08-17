# 契约：ds.js Marker 块

> ds.js 由 inject 能力按本契约生成，audit 能力按本契约校验，deploy 不触碰。
>
> 代码真源：`references/templates/ds-js-template.js`（可 lint）。本文件引用其行范围，不内联全部代码。

## Marker 块总表

ds.js 由 10 个 Marker 块组成，每块以 `/* [DS:XXX:START] */` / `/* [DS:XXX:END] */` 注释对界定。template 内含 9 个块；NAV-BAR 是第 10 个，独立模板文件 `references/templates/ds-nav-bar-template.js`（不在 ds-js-template.js 中，由 inject 在生成时追加到 `[DS:EXPORTS]` 之前）。

| Marker 块 | 在 template 中 | 职责 | 占位符 | 不变量 |
|-----------|---------------|------|--------|--------|
| [DS:CONFIG] | ✅ | 配置常量 | `{EVENT_ACTION}` `{EVENT_CATEGORY}` `{APP_KEY}` `{SHARE_TITLE}` `{SHARE_DESC}` `{SHARE_ICON}` `{SQUARE_ID}` `{IS_COCOS}` `{H5_LOGIN_ENABLED}` | 占位符必须全部替换；不得残留 `{...}` 字面量 |
| [DS:MINIAPP-DETECT] | ✅ | 微信小程序环境检测 | 无 | `isWechatMiniProgram()` 仅判 UA，不判 SDK 可用性 |
| [DS:JSSDK] | ✅ | JSSDK 初始化 + 登录 | 无 | `ds.ready()` 必须在 `callHandler` 之前；`initLogin()` 内部完成 `await ds.ready()` |
| [DS:NS-LOG] | ✅ | NS 日志打点 | 无 | 大神 App 内 `deviceid` 取 `godlikeInfo['GL-DeviceId']`，否则 `getUUID()` |
| [DS:SHARE] | ✅ | 分享配置 | 无（读 CONFIG 常量） | `IS_COCOS=true` 时非 Godlike 分支降级为 no-op（避免 MobileShare 加载微信 JSSDK 误判） |
| [DS:ULINK] | ✅ | ulink 跳转 | 无 | `onDsUlinkReady` 回调模式；大神 App 内 / 小程序内跳过 |
| [DS:WX-LAUNCH-MASK] | ✅ | 安卓微信全屏遮罩引导（唤起大神 App） | 无 | `initWxLaunchMask()` 在 `initApp()` 内 `await initLogin()` 之前调用；首行 `if (H5_LOGIN_ENABLED) return;`（仅不支持站外时启用）；大神 App 内 / 小程序内跳过；UMD `wx-launch-mask.umd.js` 动态加载，自动识别安卓微信环境 |
| [DS:CLICK-PRECHECK] | ✅ | 点击前置检查（thunk） | 无 | thunk 模式返回 async 包装函数，透传 `...args`；禁止 `onclick="withPrecheck(fn)"` |
| [DS:EXPORTS] | ✅ | window 挂载 + export | 无 | `window.*` 挂载与 `export` 语句必须同步；NAV-BAR 接入后追加 `initNavBar`/`applyNavTheme` |
| [DS:NAV-BAR] | ❌（独立模板 `ds-nav-bar-template.js`） | 导航栏组件 | `{NAV_THEME}` `{NAV_HIDE_TITLE}` `{NAV_TITLE}` | `initNavBar()` 必须在 `initLogin()` 之后调用（依赖 `ds.ready()`） |

## 各块定义

### [DS:CONFIG]

**定义**：ds.js 顶部的配置常量块，所有运行时配置集中于此。

**占位符**：

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{EVENT_ACTION}` | NS 日志 eventAction | `'dream_activity'` |
| `{EVENT_CATEGORY}` | NS 日志 eventCategory | `'fe_xxx'` |
| `{APP_KEY}` | 游戏 appKey | `'xxx'` |
| `{SHARE_TITLE}` | 分享标题 | `'梦幻西游新春活动'` |
| `{SHARE_DESC}` | 分享描述 | `'一起来玩'` |
| `{SHARE_ICON}` | 分享图标 URL | `'https://...'` |
| `{SQUARE_ID}` | 圈子 ID | `'12345'` |
| `{IS_COCOS}` | 是否 Cocos 工程（布尔，无引号） | `true` / `false` |
| `{H5_LOGIN_ENABLED}` | H5 是否支持登录 | `true` / `false` |

**不变量**：占位符必须全部替换为字面值；`{IS_COCOS}` 与 `{H5_LOGIN_ENABLED}` 替换为布尔字面量（无引号），其余替换为字符串字面量（带引号）。

**代码引用**：`references/templates/ds-js-template.js:1-11`

### [DS:MINIAPP-DETECT]

**定义**：微信小程序环境检测函数。

**占位符**：无。

**不变量**：`isWechatMiniProgram()` 仅判断 UA（`navigator.userAgent.toLowerCase().includes('miniprogram')`），不判断 `window.wx` 是否可用。SDK 可用性判断由调用方另行检查 `typeof window.wx !== 'undefined'`。

**代码引用**：`references/templates/ds-js-template.js:13-17`

### [DS:JSSDK]

**定义**：JSSDK 初始化（`dsInit`）与登录（`initLogin`）。大神 App 内走 `ds.callHandler`，非 App 内走 `Ulogin`（URS 联登）。

**占位符**：无。

**不变量**：
- `ds.ready()` 必须在任意 `callHandler` 之前 `await`。
- `initLogin()` 内部已完成 `await ds.ready()`，其后调用 `initNavBar()` 时序安全。
- 小程序未登录时 `wx.miniProgram.navigateTo` 跳转登录页，页面离开，后续 JS 不再执行。

**代码引用**：`references/templates/ds-js-template.js:19-64`

### [DS:NS-LOG]

**定义**：NS 日志打点函数 `trackEvent(extra)` 与 UUID 生成 `getUUID()`。

**占位符**：无（读 CONFIG 块的 `EVENT_ACTION`/`EVENT_CATEGORY`/`APP_KEY` 常量）。

**不变量**：
- 大神 App 内 `deviceid` 取 `godlikeInfo['GL-DeviceId']`；否则用 `getUUID()` 生成。
- `window.ns` 不可用时静默 return（不抛错）。

**代码引用**：`references/templates/ds-js-template.js:66-111`

### [DS:SHARE]

**定义**：分享初始化 `initShare()`，三分支：小程序 / 大神 App / 普通浏览器。

**占位符**：无（读 CONFIG 块的 `SHARE_TITLE`/`SHARE_DESC`/`SHARE_ICON`/`SQUARE_ID` 常量）。

**不变量**：
- `IS_COCOS=true` 时，普通浏览器分支（MobileShare）降级为 no-op。原因：MobileShare 会间接加载微信 JSSDK，Cocos 引擎检测到 `window.wx` 后误判为微信小游戏环境进入错误分支。
- 小程序分支用 `wx.miniProgram.postMessage` 发送分享配置，`pageId` 取 `window.location.pathname`（去 query/hash）。

**代码引用**：`references/templates/ds-js-template.js:113-155`

### [DS:ULINK]

**定义**：ulink 跳转初始化 `initUlink()` 与圈子跳转 `openSquareUrl(squareId)`。

**占位符**：无（读 CONFIG 块的 `SQUARE_ID` 常量）。

**不变量**：
- `onDsUlinkReady` 回调模式：SDK 异步加载完成后再实例化 `DsUlink`。
- 大神 App 内、小程序内均跳过（App 内用原生跳转，小程序内无 ulink）。

**代码引用**：`references/templates/ds-js-template.js:157-182`

### [DS:WX-LAUNCH-MASK]

**定义**：安卓微信全屏遮罩引导 `initWxLaunchMask()`。仅在"不支持 App 站外体验"（`H5_LOGIN_ENABLED=false`）时启用——WxLaunchMask UMD 自动识别安卓微信环境，展示全屏遮罩并嵌入微信 open-tag，点击唤起大神 App。支持站外体验时（`H5_LOGIN_ENABLED=true`）不加载遮罩，避免打断体验。

**占位符**：无（`WX_LAUNCH_APP_ID`、`WX_LAUNCH_MASK_SDK` 为固定常量，`SQUARE_ID` 读 CONFIG 块）。

**不变量**：
- `initWxLaunchMask()` 在 `initApp()` 内 `await initLogin()` 之前调用（不依赖登录态，自身判断环境）。
- 首行 `if (H5_LOGIN_ENABLED) return;`——支持站外体验时直接返回，不加载遮罩、不挂 UMD。
- 大神 App 内（`window.ds.isGodlike`）、小程序内（`isWechatMiniProgram()`）均跳过（App 内用原生，小程序内走 `wx.miniProgram`）。
- UMD `wx-launch-mask.umd.js`（`android-wx-ulink-sdk/0.0.4`）按需动态 `<script>` 加载；`window.WxLaunchMask.mount({ launchAppId, extInfo, debug, forceMount, onLaunch })` 挂载遮罩；`?forceMount=1` 强制展示便于非微信环境调试。

**代码引用**：`references/templates/ds-js-template.js:184-221`

### [DS:CLICK-PRECHECK]

**定义**：统一点击前置检查 `withPrecheck(callback)`，thunk 模式。

**占位符**：无。

**不变量**：
- **thunk 模式**：返回 `async function(...args)` 包装函数，必须作为事件处理器直接绑定（`addEventListener('click', withPrecheck(fn))`）。透传 `...args` 给 callback。
- **禁止** `onclick="withPrecheck(fn)"` 与 `function() { withPrecheck(() => fn()) }`——thunk 返回后从未被调用，静默失效。
- 三分支：大神 App（`checkLogined`）/ 小程序（查 `userInfo.uid`）/ 普通浏览器（`H5_LOGIN_ENABLED` 决定弹 URS 或 `openSquareUrl` 引导回 App）。

**代码引用**：`references/templates/ds-js-template.js:223-284`

### [DS:EXPORTS]

**定义**：window 挂载 + ES module export，对外暴露 ds.js 的公共 API。

**占位符**：无。

**不变量**：
- `window.*` 挂载与 `export` 语句必须同步（`type="module"` 下函数不在全局作用域，非模块脚本/HTML 内联需通过 window 访问）。
- NAV-BAR 接入后，`initNavBar` / `applyNavTheme` 追加到 export 语句与 window 挂载。

**导出清单**：`userInfo` / `godlikeInfo` / `withPrecheck` / `openSquareUrl` / `trackEvent`（+ NAV-BAR 接入后的 `initNavBar` / `applyNavTheme`）。

**代码引用**：`references/templates/ds-js-template.js:295-313`

### [DS:NAV-BAR]

**定义**：导航栏组件（`DsNavigationMiniProgramBar`）初始化 `initNavBar()` 与主题切换 `applyNavTheme(theme)`。**不在 ds-js-template.js 中**——独立模板文件，由 inject 在生成 ds.js 时插入到 `[DS:EXPORTS:START]` 之前。

**占位符**：

| 占位符 | 含义 | 取值 |
|--------|------|------|
| `{NAV_THEME}` | 主题色 | `'white'`（深色背景用白字）/ `'black'`（浅色背景用黑字） |
| `{NAV_HIDE_TITLE}` | 是否隐藏标题 | `true` / `false` |
| `{NAV_TITLE}` | 标题文本 | `'梦幻西游新春活动'` 或 `''` |

**不变量**：
- `initNavBar()` 必须在 `initLogin()` 之后调用——内部 `ds.callHandler('setWebviewFullScreen')` 需要 JSSDK ready，`initLogin()` 已完成 `await ds.ready()`。
- 接入时同步修改 EXPORTS 块：export 语句追加 `initNavBar, applyNavTheme`，window 挂载追加 `window.initNavBar` / `window.applyNavTheme`。
- `initApp()` 末尾在 `await initLogin()` 之后追加 `initNavBar()` 调用。

**代码引用**：`references/templates/ds-nav-bar-template.js`（完整文件，含 `initNavBar` + `applyNavTheme` + UMD 兼容处理）

## 生产者 / 消费者

| 角色 | 能力 | 职责 |
|------|------|------|
| 生产者 | inject（`capabilities/inject.md`） | 按本契约填充占位符、生成 ds.js、追加 NAV-BAR 块（如需） |
| 消费者 | audit（`capabilities/audit.md` + `audits/*.md`） | 按本契约校验：Marker 块齐全、占位符无残留、不变量成立、thunk 绑定正确 |
| 不触碰 | deploy | 仅打包，不解析 / 不修改 ds.js 内容 |

## 与原语的关系

`primitives/scan-html.md` 返回所有 HTML 注释的原始清单（位置 + 内容），**不做 Marker 语义识别**。inject / audit 拿到注释清单后，按本文件的 Marker 模式（`[DS:XXX:START]` / `[DS:XXX:END]`）自行匹配。Marker 语法变更只改本文件，scan-html 不变。

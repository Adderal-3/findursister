# 能力：注入大神 SDK（模式 1 / INJECT）

> 将大神平台 SDK（ds.js + SDK-LOADER + 第三方依赖）注入 H5 项目，并按用户确认选择性包裹点击事件。

## 依赖

- **前置能力**：`capabilities/structure.md`（推荐）——出参 `src/*.js` 是本能力的注入目标。项目内嵌 CSS/JS 未分离时，inject 仍可执行，但产物可维护性差。
- **公共原语**：
  - `primitives/scan-html.md`——返回 HTML 注释清单、style/script 块、head/body 区间，供定位注入点与 Marker 匹配。
  - `primitives/detect-framework.md`——输出 `framework`（HTML/React/Vue）+ `IS_COCOS` 标志，决定读哪个框架分支、是否跳过微信 JSSDK。
- **产物契约**：
  - `contracts/ds-js-markers.md`——ds.js 的 10 个 Marker 块定义、占位符、不变量。本能力是生产者。
  - `contracts/sdk-loader.md`——SDK-LOADER 模板结构、SEO 标签去重规则、`{IS_COCOS}` 占位符语义。
  - `contracts/miniapp.md`——小程序接入原理（联登/传角/分享），声明式知识参考，供"判断规则"段引用。
  - `contracts/framework-diffs.md`——三框架差异总表（文件路径、点击事件修复语法、SDK-LOADER 注入目标、NAV-BAR 有无等），据 `framework` 取对应列。
- **外部技能**：`appkey-naming`——据游戏圈子名查询 `APP_KEY` 与 `SQUARE_ID`（外网圈子 ID）。依赖检测 + `.skill-cache.json` 缓存机制由 SKILL.md router 保留。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| 游戏圈子名 | 用户 | 是 | — | 交互询问（例："炉石传说"、"梦幻西游手游"） |
| `APP_KEY` | appkey-naming 技能 | 是 | — | 前置传递（用户输入圈子名后自动调用技能查询） |
| `SQUARE_ID` | appkey-naming 技能 | 是 | — | 前置传递（取 `prodSquareId` 外网圈子 ID） |
| `EVENT_ACTION` | 用户 | 否 | `'fe_act_game_hsti'` | 交互询问（NS 日志 eventAction） |
| `EVENT_CATEGORY` | 用户 | 否 | `'act_game_hsti'` | 交互询问（NS 日志 eventCategory） |
| `H5_LOGIN_ENABLED` | 用户 | 否 | `false` | 交互询问（A=不支持未登录引导回 App / B=支持弹 URS 登录框） |
| `SHARE_TITLE` | 从 `<title>` 提取 | 否 | `'游戏分享'` | 可推断 |
| `SHARE_DESC` | 从 `<meta name="description">` 或首段 `<p>` 提取 | 否 | `'快来一起玩吧'` | 可推断 |
| `SHARE_ICON` | 固定默认 | 否 | `'https://g.166.net/product/a19/logo.png'` | 可推断 |
| `IS_COCOS` | detect-framework 原语 | 是 | — | 前置传递（布尔，不询问用户） |
| `framework` | detect-framework 原语 | 是 | — | 前置传递（HTML/React/Vue） |
| `SELECTED_HTML_FILES` | scan-html 原语 + 用户确认 | 是 | — | 前置传递（单 HTML 静默默认；多 HTML 须用户确认） |
| `NAV_THEME` | 用户 | 否 | `'white'` | 交互询问（A=white 深色背景白字 / B=black 浅色背景黑字） |
| `NAV_HIDE_TITLE` | 用户 | 否 | `true` | 交互询问（A=不显示标题 / 输入文案=显示） |
| `NAV_TITLE` | 用户 | 否 | `''` | 交互询问（与 NAV_HIDE_TITLE 同问题；显示标题时填入文案） |

> **`SELECTED_HTML_FILES` 获取规则**：scan-html 返回项目根目录所有 `.html`（排除 `node_modules`、`dist`）。仅 1 个 → 静默 `["index.html"]`；多个 → 列出清单请用户确认（回车默认 index.html，或逗号分隔输入）。此集合贯穿后续所有遍历注入步骤。

> **`NAV_*` 仅 HTML 框架适用**：React/Vue 无导航栏组件（见 `framework-diffs.md`），不收集此三项。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| ds.js | `src/ds.js`（HTML）/ `src/hooks/useDs*.ts` + `src/ds.d.ts`（React）/ `src/composables/useDs*.ts` + `src/ds.d.ts`（Vue） | `contracts/ds-js-markers.md`（10 个 Marker 块，占位符全部替换，NAV-BAR 块仅 HTML 追加） |
| SDK-LOADER | `SELECTED_HTML_FILES` 每个文件 `</head>` 前（React 有 `src/Document.tsx` 时注入其 `<head>`） | `contracts/sdk-loader.md`（SEO 标签区 + SDK 加载区，`{IS_COCOS}` 替换，去重） |
| 第三方依赖脚本 | `SELECTED_HTML_FILES` 每个文件 `</head>` 前（SDK-LOADER 之前） | jweixin-1.6.0.js（Cocos 跳过）+ universal-login/2.1.4（css+umd.js）+ 导航栏组件 mini-program-bar（仅 HTML） |
| 导航栏偏移 CSS | `SELECTED_HTML_FILES` 每个文件 `<style>` 末尾或 `src/style.css` 末尾（仅 HTML） | `body { padding-top: var(--ds-total-mini-program-bar-height); }` |
| 点击事件修复 | 用户确认的点击事件所在业务文件 | `withPrecheck(fn)` 包裹（方式 A 单元素直接绑定 / 方式 B 事件委托到 document） |

## 能做什么

- **生成 ds.js**：按 `framework` 选模板，填充全部占位符（CONFIG 块 9 项），追加 NAV-BAR 块（仅 HTML），合并 EXPORTS 语句与 window 挂载，在 `initApp()` 内（仅 HTML）调用 `initWxLaunchMask()`（`await initLogin()` 之前）并在末尾 `await initLogin()` 之后追加 `initNavBar()` 调用。含全部 7 模块：微信小程序支持、NS 日志埋点、ulink 跳转、JSSDK 端能力、移动端分享、导航栏组件、安卓微信遮罩。
- **注入 SDK-LOADER**：遍历 `SELECTED_HTML_FILES`，在 `</head>` 前注入 SEO 标签区 + SDK 加载区，按标签类型逐项去重（已存在跳过），替换 `{IS_COCOS}`。
- **注入第三方依赖**：jweixin（Cocos 跳过）+ universal-login + 导航栏组件（仅 HTML），按版本号去重（旧版本替换为新版本，不跳过）。
- **注入导航栏偏移 CSS**：仅 HTML 框架，向 `SELECTED_HTML_FILES` 每个文件的 `<style>` 末尾或 `src/style.css` 末尾追加 `body { padding-top: var(--ds-total-mini-program-bar-height); }`，消费运行时 CSS 变量（与第三方依赖中的导航栏组件 JS/CSS 配套）。
- **清理旧产物**：删除 `src/ds.ts`（旧 TS 版本）、删除重复 ulink 脚本块（`<!-- Ulink 脚本` / `ds-ulink2` / `DsUlink`）、覆盖已存在的 `src/ds.js`。清理前询问用户确认（全部清理 / 选择性清理 / 取消）。
- **连接 ds.js 到 HTML**：遍历 `SELECTED_HTML_FILES`，在游戏业务 script 之前添加 `<script type="module" src="./src/ds.js">`（HTML）；React/Vue 据框架差异表处理。**幂等检测须同时匹配 `./src/ds.js` 与 `/src/ds.js`**（兼容历史项目用绝对路径注入的 script 标签，避免重复注入）。
- **选择性包裹点击事件**：据 scan-html 结果 + 启发式分类（见判断规则），列出候选请用户确认，仅对确认项用 `withPrecheck` 包裹（方式 A/B 据元素性质选择）。
- **输出注入结果摘要**：文件变更表、配置参数表、清理记录、Click Handler 修复计数。

## 不能做什么

- **不删除业务代码**——只删除大神相关旧产物（ds.ts、重复 ulink 脚本），业务代码原样保留。
- **不修改 game.js 业务逻辑**——点击事件修复仅插入 `withPrecheck` 包裹，不改 handler 内部逻辑。
- **Cocos 项目不注入微信 JSSDK**——`IS_COCOS=true` 时跳过 `jweixin-1.6.0.js`，`[DS:SHARE]` 普通浏览器分支降级为 no-op，SDK-LOADER 的 mobile-share 块不加载。原因：MobileShare 间接加载微信 JSSDK 会污染 `window.wx`，Cocos 引擎误判为微信小游戏环境导致白屏。
- **多 HTML 时不自动选文件**——必须用户确认 `SELECTED_HTML_FILES`，不静默默认全部。
- **不覆盖用户已有 SEO 标签**——SEO 标签区按去重规则仅补齐缺失项，已有标签原样保留。
- **不决定后续能力路由**——注入完成后可提示后续选项（audit/deploy/game-log 等），但不强制执行。
- **不做 Marker 语义识别的扫描**——scan-html 返回原始注释清单，本能力按 `contracts/ds-js-markers.md` 的 Marker 模式自行匹配。

## 判断规则

### 1. 点击事件启发式分类表

scan-html 返回所有 `<script>` 块后，本能力搜索点击事件模式（据 `framework` 取扫描扩展名与检测模式，见 `framework-diffs.md`）：

| 框架 | 检测模式 | 扫描扩展名 |
|------|---------|-----------|
| HTML | `addEventListener("click", ...)` / `onclick = function()` | `.js` |
| React | `onClick={...}` / `addEventListener("click", ...)` / `onclick =` | `.tsx` `.ts` `.jsx` `.js` |
| Vue | `@click="..."` / `addEventListener("click", ...)` / `onclick =` | `.vue` `.ts` `.js` |

对未用 `withPrecheck` 包裹的点击事件，据元素/变量名启发式分类：

| 信号模式（名称含） | 标注 | 默认建议 |
|---------|------|---------|
| `start` / `play` / `begin` / `draw` / `lottery` / `claim` / `exchange` / `share` / `submit` / `confirm` / `join` / `enter` | 🔴 建议包裹 | 建议包裹（业务关键动作，需登录预检） |
| `close` / `cancel` / `tab` / `toggle` / `rule` / `rules` / `back` / `arrow` / `prev` / `next` / `scroll` / `hide` / `show` | 🟢 可不包裹 | 可跳过（UI 交互，无业务副作用） |
| 无法匹配上述任一模式 | 🟡 需确认 | 请用户据业务判断 |

> **名称匹配规则**：取事件绑定目标的元素 id / class / 变量名，转小写后做子串匹配。如 `startBtn` 含 `start` → 🔴；`closeModal` 含 `close` → 🟢；`itemClick` 无匹配 → 🟡。
>
> **修复方式选择**（仅对用户确认项）：
> - **方式 A：单元素直接绑定**（元素唯一、静态）——`element.addEventListener("click", withPrecheck(businessLogic))`；React `<button onClick={withPrecheck(fn)}>`；Vue `<button @click="withPrecheck(fn)">`。
> - **方式 B：事件委托到 document**（多个同类元素或动态注入）——`document.addEventListener("click", withPrecheck(function(e) { if (!e.target.closest(".target")) return; businessLogic(); }))`。React/Vue 模板/JSX 绑定无需手动委托（框架内部已委托）。
> - **选择原则**：元素唯一静态 → A；元素多个或动态增删 → B；多个需预检的不同元素 → 各自注册一个委托。

### 2. CONFIG 块智能处理规则

检测到已存在 `src/ds.js` 且含 DS markers 时，CONFIG 块占位符按以下规则处理（部分保留部分覆盖）：

| 占位符 | 已存在 ds.js 时 | 理由 |
|--------|----------------|------|
| `{EVENT_ACTION}` | **覆盖**（用户新输入值） | 用户偏好，每次注入可能调整 |
| `{EVENT_CATEGORY}` | **覆盖**（用户新输入值） | 用户偏好 |
| `{H5_LOGIN_ENABLED}` | **覆盖**（步骤3用户选择值） | 用户偏好 |
| `{IS_COCOS}` | **覆盖**（最新前置扫描结果） | 环境检测，非用户偏好，始终以最新结果为准 |
| `{APP_KEY}` | **保留**原有值 | appkey-naming 查询结果稳定，避免误覆盖 |
| `{SQUARE_ID}` | **保留**原有值 | 同上 |
| `{SHARE_TITLE}` | **保留**原有值 | 已提取值稳定 |
| `{SHARE_DESC}` | **保留**原有值 | 已提取值稳定 |
| `{SHARE_ICON}` | **保留**原有值 | 固定默认值 |

> **已存在 ds.js 但无 DS markers**：在文件头部追加模板内容（不覆盖）。
> **不存在 ds.js**：新建，写入替换后的模板内容。

### 3. Cocos 项目判定后的下游影响

`IS_COCOS=true`（detect-framework 输出）时，本能力执行以下跳过/降级：

| 影响点 | 行为 | 原因 |
|--------|------|------|
| 微信 JSSDK 注入（`jweixin-1.6.0.js`） | **跳过** | Cocos 引擎内无法嵌入微信 SDK，强行注入破坏引擎加载 |
| SDK-LOADER mobile-share 块 | **不加载**（`{IS_COCOS}` 替换为 `true`，`if (!true && ...)` 恒假） | MobileShare 间接加载微信 JSSDK，污染 `window.wx` 致 Cocos 误判微信小游戏 |
| `[DS:SHARE]` 普通浏览器分支 | **降级为 no-op** | 同上原因，避免 MobileShare 加载 |
| `[DS:MINIAPP-DETECT]` / `[DS:JSSDK]` / `[DS:ULINK]` / `[DS:NS-LOG]` | **正常注入** | 不涉及微信 JSSDK 加载，与 Cocos 无冲突 |

> **`IS_COCOS` 与 `framework` 独立**：Cocos 工程的 `framework` 仍按 package.json 判定（通常为 `HTML`，因 Cocos 导出产物无 package.json）。两个标志分别影响不同决策点，不互相推导。

### 4. 第三方依赖版本去重规则

| 标签 | 跳过条件 |
|------|---------|
| `jweixin-1.6.0.js` | 已存在含 `jweixin` 的 script / **Cocos 项目自动跳过** |
| `universal-login/2.1.4/index.css` | 已存在含 `universal-login/2.1.4` 的 link（旧版本须替换，不可跳过） |
| `universal-login/2.1.4/index.umd.min.js` | 已存在含 `universal-login/2.1.4` 的 script（旧版本须替换，不可跳过） |
| `mini-program-bar/0.0.5/index.css`（仅 HTML） | 已存在含 `mini-program-bar/0.0.5` 的 link（旧版本须替换） |
| `mini-program-bar/0.0.5/index.js`（仅 HTML） | 已存在含 `mini-program-bar/0.0.5` 的 script（旧版本须替换） |

> 导航栏资源去重判断必须含版本号；检测到旧版本（如 `0.0.4`）已存在时，**不跳过，替换为新版本 URL**。

### 5. SDK-LOADER 注入目标分支（React 特例）

| 条件 | 注入目标 |
|------|---------|
| `framework=React` 且 `src/Document.tsx` 存在 | 注入其 `<head>` |
| `framework=React` 且无 `Document.tsx` | 遍历 `SELECTED_HTML_FILES` |
| `framework=React` 且两者皆空 | 输出模板让用户手动加 |
| `framework=HTML` / `Vue` | 遍历 `SELECTED_HTML_FILES`，注入每个文件 `</head>` 前 |

## 幂等性

- **重入检测标志**：
  - ds.js：`src/ds.js` 存在且含 DS markers（`/* [DS:CONFIG:START] */` 等）。
  - SDK-LOADER：目标 HTML 含 `<!-- [DS:SDK-LOADER:START] -->` 注释对。
  - NAV-BAR 块：ds.js 含 `/* [DS:NAV-BAR:START] */`。
  - 点击事件：handler 已用 `withPrecheck` 包裹。
  - 第三方依赖：含对应版本号的 script/link 标签。
  - ds.js 连接：HTML 已含 `<script src="./src/ds.js">` 或 `<script src="/src/ds.js">`（兼容历史绝对路径注入）。
- **重入行为**：
  - **ds.js CONFIG 块**：部分保留部分覆盖（见判断规则段 2）。`EVENT_ACTION`/`EVENT_CATEGORY`/`H5_LOGIN_ENABLED`/`IS_COCOS` 覆盖；`APP_KEY`/`SHARE_*`/`SQUARE_ID` 保留。
  - **SDK-LOADER**：注释对已存在 → 跳过整个 SDK 加载区注入（幂等）；SEO 标签区仍逐项去重补齐。
  - **内容完整性校验**（marker 存在但内容不完整时）：检测 NS Stats 块缺 `ns("set","dimension95",window.DA_SQUARE_ID)` 等 3 行 dimension 设置 / mobile-share 块缺 `onMobileShareReady` 回调队列 / mobile-share 被 `if(false&&...)` 禁用 → 输出 ⚠️ 警告「SDK-LOADER marker 存在但内容非 canonical（缺 dimension 设置 / onMobileShareReady / mobile-share 禁用），建议删除 marker 后重跑 inject 生成 canonical 版」不自动覆盖（告知差异让用户决定）。
  - **NAV-BAR 块**：marker 已存在 → 跳过插入；`initApp()` 内 `initNavBar()` 调用已存在 → 跳过追加。
  - **第三方依赖**：按版本号去重，已存在同版本跳过，旧版本替换。
  - **点击事件**：已用 `withPrecheck` 包裹 → 跳过；未包裹且用户再次确认 → 重新包裹。
  - **旧产物清理**：`src/ds.ts` / 重复 ulink 脚本——每次重入重新检测，存在则清理。
  - **ds.js 连接**：HTML 已含匹配的 script 标签 → 跳过插入；未含 → 在游戏业务 script 之前插入 `<script type="module" src="./src/ds.js">`。

## 执行步骤

本能力是**严格串行管线**，几乎无可并行节点。每一步的输出是下一步的输入：

```
scan-html（返回 HTML 注释/style/script/head-body 清单）
  ↓
detect-framework（返回 framework + IS_COCOS）
  ↓
配置收集
  ├─ 用户交互询问：游戏圈子名 → appkey-naming → APP_KEY/SQUARE_ID
  ├─ 用户交互询问：EVENT_ACTION/EVENT_CATEGORY/H5_LOGIN_ENABLED
  ├─ 用户交互询问：NAV_THEME/NAV_TITLE/NAV_HIDE_TITLE（仅 HTML）
  └─ 可推断提取：SHARE_TITLE（<title>）/SHARE_DESC（meta/p）/SHARE_ICON（固定）
  ↓
模板填充（据 framework 选模板，按 contracts/ds-js-markers.md 替换占位符）
  ↓
ds.js 生成（CONFIG 块智能处理 + NAV-BAR 块追加 + EXPORTS 合并）
  ↓
SDK-LOADER 注入（遍历 SELECTED_HTML_FILES，SEO 标签去重 + SDK 加载区 + {IS_COCOS} 替换）
  ↓
第三方依赖注入（jweixin/universal-login/导航栏，版本去重）
  ↓
导航栏偏移 CSS 注入（仅 HTML）
  ↓
旧产物清理（ds.ts / 重复 ulink 脚本，用户确认）
  ↓
点击事件检测（scan-html 结果 + 启发式分类 🔴/🟢/🟡）
  ↓
用户确认需包裹的点击事件
  ↓
withPrecheck 包裹（方式 A/B 据元素性质）
  ↓
注入结果摘要输出
```

## 反模式表

> 以下反模式从 SKILL.md 迁移，与 inject 能力相关。

| ❌ 错误写法 | ✅ 正确写法 | 原因 |
|---|---|---|
| 用 `ds.getDeviceId()` 获取设备ID | 用 `godlikeInfo['GL-DeviceId']` | 大神JSSDK里根本没有这个方法，会拿不到设备ID |
| 不等 ulink 加载完就调用跳转 | 等 `onDsUlinkReady` 回调后再跳转 | ulink 是异步加载的，不等它准备好就调用会报错 |
| 只写了大神APP内的分享逻辑 | 两个分支都要写（APP内 + APP外）**（Cocos 项目除外：浏览器环境不注入 MobileShare，分享降级为 no-op）** | 站外用户也希望能分享，只写APP内的话他们分享不了 |
| Cocos 项目直接注入 mobile-share | 注入流程自动检测 Cocos（`IS_COCOS = true`），跳过 mobile-share；若已误注入，重跑 inject | MobileShare 会间接加载微信 JSSDK（`window.wx`），Cocos 引擎检测到后误判为微信小游戏环境，进入错误代码分支导致白屏 |
| 调用 `wx.*` 前没有判断 `window.wx` 是否存在 | 先判断 `typeof window.wx !== 'undefined'` 再调用 `wx.miniProgram.*`；`isWechatMiniProgram()` 只回答"在微信里吗"，不能替代 SDK 可用性判断 | 第三方库可能注入残缺的 `window.wx`（如 MobileShare），或是环境未加载 JSSDK，直接调 `wx.xxx` 会抛 ReferenceError |
| 分享图标用相对路径如 `/images/share.png` | 用 `https://` 完整URL | 分享时图片是在新页面加载的，相对路径会找不到 |
| 点击事件直接绑定业务函数 | 用 `withPrecheck(你的函数)` 直接作为事件处理器（如 `element.addEventListener('click', withPrecheck(fn))`），事件参数自动透传 | withPrecheck 会先检查用户登录状态，不包裹的话未登录用户点什么都没反应 |
| 不等 SDK 准备好就调用 openLoginPage | 等 `window.ds.ready()` 后再调 | SDK 可能还没加载完，提前调会没反应 |
| 把 ds.js 放在游戏脚本之后加载 | ds.js 必须在游戏脚本之前 | 游戏脚本加载晚的话，用户一点击就没反应，因为函数还没定义好 |
| H5 环境下 `withPrecheck` 未检查 `H5_LOGIN_ENABLED` 配置 | 根据 `H5_LOGIN_ENABLED` 选择 `dsLogin.show()`（支持模式）或 `openSquareUrl()`（不支持模式） | `H5_LOGIN_ENABLED = true` 时应弹 URS 登录框引导登录，`false` 时引导回大神 App；不检查配置会导致支持模式下未登录用户被错误引导回 App |
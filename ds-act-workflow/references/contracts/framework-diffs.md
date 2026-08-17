# 契约：框架差异摘要（HTML / React / Vue）

> 原三框架文件（`html.md` / `react.md` / `vue.md`，已迁移删除）的共享逻辑已沉淀到本目录其他契约：
> - SDK-LOADER 注入 → `sdk-loader.md`
> - ds.js 生成 + Marker 块 + CONFIG 占位符 → `ds-js-markers.md`
> - 微信小程序环境检测 → `miniapp.md`
>
> 本文件只记录三框架的**差异点**，供 `capabilities/inject.md` 等能力文件的"框架分支"段引用。
> 框架类型由 `primitives/detect-framework.md` 输出，能力文件据 `framework` 取本表对应列。

## 差异点总表

| 维度 | HTML | React | Vue |
|------|------|-------|-----|
| **代码组织方式** | 全局函数 + ES module export（单文件 `src/ds.js`） | hooks（`useXxx` 返回对象） | composables（`useXxx` 返回对象，`reactive` 包裹共享状态） |
| **文件路径约定** | `src/ds.js`（+ `src/ds.ts` 旧版需删除） | `src/hooks/useDsInit.ts` `useNsLog.ts` `useDsShare.ts` `useDsUlink.ts` | `src/composables/useDsInit.ts` `useNsLog.ts` `useDsShare.ts` `useDsUlink.ts` |
| **ds.d.ts 类型声明** | 不需要（纯 JS，无 TS 编译） | 需要（`src/ds.d.ts`，声明 `window.ds` / `ns` / `dsUlink` / `DsUlink` / `MobileShare` / `Ulogin` / `dsLogin` 等） | 需要，内容与 React 完全相同 |
| **点击事件检测模式** | `addEventListener("click", ...)` / `onclick = function()` | `onClick={...}` / `addEventListener("click", ...)` / `onclick =` | `@click="..."` / `addEventListener("click", ...)` / `onclick =` |
| **点击事件修复语法** | `element.addEventListener("click", withPrecheck(fn))` 或事件委托到 `document` | `<button onClick={withPrecheck(fn)}>`（合成事件，框架已委托，无需手动委托） | `<button @click="withPrecheck(fn)">`（模板编译直接绑定，无需手动委托） |
| **withPrecheck 来源** | ds.js export + `window.withPrecheck` | `useDsUlink()` hook 解构 | `useDsUlink()` composable 解构 |
| **共享状态响应式** | 普通对象（`userInfo = {}`） | 普通对象（`userInfo = {}`，hooks 内不要求响应式） | `reactive({})` 包裹（`userInfo` / `godlikeInfo`） |
| **应用入口调用 initLogin** | `initApp()` 内 `await initLogin()` | `App.tsx` 的 `useEffect(() => { initLogin(); }, [])` | `App.vue` 的 `onMounted(() => { initLogin(); })` |
| **SDK-LOADER 注入目标** | 遍历 `SELECTED_HTML_FILES`，注入每个文件 `</head>` 前 | 有 `src/Document.tsx` → 注入其 `<head>`；否则遍历 `SELECTED_HTML_FILES`；两者皆空 → 输出模板让用户手动加 | 遍历 `SELECTED_HTML_FILES`，注入每个文件 `</head>` 前（与 HTML 相同） |
| **第三方依赖脚本** | 微信 JSSDK + URS 登录 + **导航栏组件**（mini-program-bar） | 微信 JSSDK + URS 登录（无导航栏组件） | 微信 JSSDK + URS 登录（无导航栏组件） |
| **NAV-BAR 块** | 有（`[DS:NAV-BAR]`，`initNavBar` / `applyNavTheme`，追加到 EXPORTS） | 无 | 无 |
| **扫描文件扩展名** | `.js` | `.tsx` / `.ts` / `.jsx` / `.js` | `.vue` / `.ts` / `.js` |
| **探索阶段文件清单** | `src/ds.ts` / `src/ds.js` | `src/hooks/useDsInit.ts` 等 4 个 + `src/ds.d.ts` | `src/composables/useDsInit.ts` 等 4 个 + `src/ds.d.ts` |
| **清理阶段差异** | 删除旧 ulink 脚本 + 删除 `src/ds.ts` | 删除旧 hooks 文件（将被覆盖）+ 删除重复 ulink 脚本 | 删除旧 composables 文件（将被覆盖）+ 删除重复 ulink 脚本 |
| **useNsLog / useDsShare / useDsUlink 内容** | — | 基线（hooks 形态，完整 TS 实现见 `templates/ds-react-hooks-template.ts`） | 与 React 完全相同（仅 import 路径 `./useDsInit`、目录 `composables/` 不同） |

## 各维度详解

### 1. 代码组织方式

- **HTML**：所有逻辑集中在单文件 `src/ds.js`，以 ES module `export { ... }` 暴露公共 API，同时挂载到 `window.*` 供非模块脚本访问。`type="module"` 是硬性要求（`export` 关键字在普通 script 中会语法错误）。
- **React**：拆分为 4 个 hooks 文件（`useDsInit` / `useNsLog` / `useDsShare` / `useDsUlink`），每个导出 `useXxx()` 函数返回对象。`withPrecheck` 由 `useDsUlink()` 返回。
- **Vue**：与 React 同构，4 个 composables 文件，命名与接口完全一致。唯一差异：共享状态（`userInfo` / `godlikeInfo`）用 `reactive({})` 包裹以保持响应式。

### 2. 文件路径约定

| 用途 | HTML | React | Vue |
|------|------|-------|-----|
| JSSDK 初始化 | `src/ds.js`（内含全部） | `src/hooks/useDsInit.ts` | `src/composables/useDsInit.ts` |
| NS 日志 | `src/ds.js` | `src/hooks/useNsLog.ts` | `src/composables/useNsLog.ts` |
| 分享 | `src/ds.js` | `src/hooks/useDsShare.ts` | `src/composables/useDsShare.ts` |
| Ulink + withPrecheck | `src/ds.js` | `src/hooks/useDsUlink.ts` | `src/composables/useDsUlink.ts` |
| 类型声明 | —（不需要） | `src/ds.d.ts` | `src/ds.d.ts` |

### 3. ds.d.ts 类型声明

React 与 Vue 共用同一份 `src/ds.d.ts`，声明 `Window` 接口扩展：`ds` / `ns` / `dsUlink` / `DsUlink` / `MobileShare` / `onDsUlinkReady` / `onMobileShareReady` / `Ulogin` / `dsLogin`。HTML 项目为纯 JS，无 TS 编译，不需要此文件。

### 4. 点击事件检测与修复

**检测模式**（探索阶段 1.3，启发式分类三框架共用同一套 🔴/🟢/🟡 规则）：

| 框架 | 检测模式 | 扫描扩展名 |
|------|---------|-----------|
| HTML | `addEventListener("click", ...)` / `onclick = function()` | `.js` |
| React | `onClick={` / `addEventListener("click", ...)` / `onclick =` | `.tsx` `.ts` `.jsx` `.js` |
| Vue | `@click=` / `addEventListener("click", ...)` / `onclick =` | `.vue` `.ts` `.js` |

**修复语法**：

| 框架 | 模板/JSX 修复 | addEventListener 修复 |
|------|--------------|----------------------|
| HTML | —（无模板） | 方式 A 单元素直接绑定 / 方式 B 事件委托到 `document`（动态注入元素） |
| React | `<button onClick={withPrecheck(fn)}>`（合成事件，框架内部已委托，**无需手动委托**） | 同 HTML 方式 A/B（仅直接调用 `addEventListener` 的场景才需手动委托） |
| Vue | `<button @click="withPrecheck(fn)">`（模板编译直接绑定，**无需手动委托**） | 同 HTML 方式 A/B（仅直接调用 `addEventListener` 的场景才需手动委托） |

### 5. 框架检测逻辑引用

框架类型判定由 `primitives/detect-framework.md` 统一输出，能力文件不再各自实现：

- **`framework` 字段**：读 `package.json` 的 `dependencies`/`devDependencies`，含 `react` → `React`，含 `vue` → `Vue`，无 `package.json` 或均未匹配 → `HTML`。
- **`IS_COCOS` 字段**：独立标志，两项条件同时满足才为 `true`——存在 `cocos2d-js*.js` 文件 + 任意 `.js` 含 `_CCSettings`。
- **React 特例**：`src/Document.tsx` 存在时，SDK-LOADER 注入目标改为该文件的 `<head>`，而非遍历 `SELECTED_HTML_FILES`。这是 React 独有的注入目标分支，由 inject 能力在 `framework=React` 分支内处理。

### 6. React/Vue hooks 代码模板

React 与 Vue 的 4 个 hooks/composables 文件（`useDsInit` / `useNsLog` / `useDsShare` / `useDsUlink`）+ `ds.d.ts` 类型声明的完整 TypeScript 实现见 `templates/ds-react-hooks-template.ts`。该模板是可 lint 的真源，含完整类型标注（`Record<string, unknown>`、泛型 `<T extends unknown[]>`、hook 导出签名、`declare global` 块）。

**Vue 适配**（相对 React 的差异）：
- 目录：`src/hooks/` → `src/composables/`
- 共享状态：`const userInfo = {}` → `const userInfo = reactive({})`（`godlikeInfo` 同理），需 `import { reactive } from 'vue'`
- 其余（函数体、类型、hook 签名）与 React 完全相同

**inject 能力生成时的占位符替换**：`{EVENT_ACTION}` `{EVENT_CATEGORY}` `{APP_KEY}` `{SHARE_TITLE}` `{SHARE_DESC}` `{SHARE_ICON}` `{SQUARE_ID}` `{IS_COCOS}` `{H5_LOGIN_ENABLED}`，与 HTML 项目的 `ds-js-template.js` 占位符一致（见 `ds-js-markers.md`）。

## 7. 框架专属审查修复模式与额外关注点

> 审查（模式 2）发现框架相关问题时，报告的"你需要"修复指引须用本节对应框架的修复模式，并在报告末尾提及该框架的额外关注点。HTML 项目无框架专属修复模式（走通用规则）。

### React

**审查修复模式**（报告"你需要"字段据此给出）：

- **`useEffect` 中调用 `withPrecheck` 且未确保 ds.js 已初始化** → ❌ 阻断。修复：将业务逻辑包裹在 `withPrecheck` **内部**（由 withPrecheck 自处理登录预检），**而非在外层自行裸调** withPrecheck；且确保该 useEffect 在 `initLogin()` / `checkLogined()` 完成后才执行（前置依赖 ds 就绪）。
- **组件 `onClick` 直接调 `window.ds.callHandler('openLoginPage')` 未经 `window.ds.ready()`** → ❌ 阻断。修复：`window.ds.ready().then(() => window.ds.callHandler('openLoginPage'))`。

**额外关注点**（React 项目审查报告须在末尾提及）：

- `useEffect` 依赖数组（`[]` 仅挂载时调用一次，避免重复 init）。
- 组件卸载时的清理（避免内存泄漏 / 重复绑定）。
- ESM `import` 正确性（`withPrecheck` 由 `useDsUlink()` 解构，勿在外部重复 import）。

### Vue

**审查修复模式**（报告"你需要"字段据此给出）：

- **composable / `.vue` 中 import 的 `withPrecheck` 调用前未确保 ds.js 就绪** → ❌ 阻断。`withPrecheck` **本身不保证 ds 就绪**——ds 未就绪时登录预检是空操作；勿以"withPrecheck 自处理登录"为由豁免此项。修复：在 composable 返回的 precheck 函数中加入 ready 等待逻辑（`await window.ds.ready()` 或内部 `checkLogined`）。
- **`ref` / 响应式变量映射平台注入值**（如 `const x = ref(window.DA_SQUARE_ID)` 或 `ref(window.DA_*)`）→ ❌ 阻断。`window.DA_*` 由部署平台注入，业务代码禁止定义、也禁止读取入响应式状态。修复：移除该 ref，平台注入值不引用。

**额外关注点**（Vue 项目审查报告须在末尾提及）：

- `ref` 响应式变量不应映射 `window.DA_SQUARE_ID` 等平台注入值。
- composable 的副作用管理（init / 清理配对）。
- SSR 兼容性（`window` 访问须在 `onMounted` 客户端生命周期内，勿在 setup 顶层访问）。

## 8. 框架注入输出适配说明

> React/Vue 项目注入（模式 1）完成后，输出须提及 Vite 适配说明，帮助开发者理解 hooks/composables 与 Vite 的关系：
>- 生成的 hooks/composables 位于 `src/hooks/`（React）或 `src/composables/`（Vue），在 Vite 默认 `src/` 扫描范围内，无需额外配置即可被 import。
>- `vite.config` 无需为 ds 代码额外配置（非 Cocos 项目，不走 entry.js / `?url` 流程）。
>- import 路径约定：组件中 `import { useDsUlink } from './hooks/useDsUlink'`（React）或 `from './composables/useDsUlink'`（Vue）。

## 生产者 / 消费者

| 角色 | 能力 | 职责 |
|------|------|------|
| 消费者 | inject（`capabilities/inject.md`） | 据 `framework` 选模板文件、文件路径、点击事件修复语法、是否生成 `ds.d.ts`、SDK-LOADER 注入目标 |
| 消费者 | audit（`capabilities/audit.md`） | 据框架分支校验文件路径、点击事件绑定方式、`ds.d.ts` 存在性 |
| 不触碰 | deploy | 仅打包，不关心框架差异 |

## 与原语的关系

- `primitives/detect-framework.md` 输出 `framework` + `IS_COCOS`，本文件据 `framework` 取对应列的差异配置。
- `primitives/scan-html.md` 返回原始 HTML 注释清单，三框架共用，无差异。

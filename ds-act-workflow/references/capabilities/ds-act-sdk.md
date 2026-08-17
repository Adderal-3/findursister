# 能力：大神活动接入（模式 6 / DS-ACT-SDK）

> 接入 `ds-act-sdk`，为活动 H5 提供七个可选子能力：角色绑定、任务弹窗、回流任务检测、CPS 底部栏、心易会员流失召回、抽奖、CPS 下载引导弹窗。SDK 通过 `window.DsActSdk` 暴露，`configure()` 写配置到内存，各 UI 组件 `.evoke()` 自动挂载全局单例 `DsActProvider` 完成登录态检测与 actInfo 拉取。
>
> 七个子能力的具体注入细节保留在附属文件 `references/capabilities/ds-act-sdk/act-role.md` / `act-task.md` / `act-task-checker.md` / `act-cps-bar.md` / `act-vip-recall.md` / `act-lottery.md` / `act-cps-download-guide.md`，本能力按用户选择加载对应子模块。

## 依赖

- **前置能力**：`capabilities/inject.md`（**必须**）——出参 `src/ds.js` 是本能力 `configure()` 的宿主，SDK-LOADER 已就位是 `ds-act-sdk` 资源加载的前提。未接入大神 SDK 时本能力无法执行。
- **公共原语**：
  - `primitives/scan-html.md`——返回 HTML 注释清单、script 标签清单、head/body 区间，供定位含 DS Marker 的 HTML 文件（候选页面）与注入点。
- **产物契约**：
  - `contracts/ds-act-sdk-api.md`——`configure` / `evoke` / `TaskChecker` 等 API 签名、触发矩阵（哪些调用挂 Provider、哪些不挂）、`DsActProvider` 自动启动流程。本能力的"判断规则"段大量引用此契约。
  - `references/capabilities/ds-act-sdk/ds-act-sdk-axios.md`——自定义接口请求用法（`actDsAxios` / `actWebAxios`：站内默认带签名 / 站外 / 动态选实例 / 临时改 baseURL）。活动自己的抽奖、排行榜、自定义任务接口用这两个预配 axios 实例，无需自建。
- **附属子模块**（按用户功能选择加载，非全量读取）：
  - `references/capabilities/ds-act-sdk/act-role.md`——角色绑定（A）：`#ds-role-root` 容器 + `Role.evoke` + `evokeRoleSelection` 依赖陷阱。
  - `references/capabilities/ds-act-sdk/act-task.md`——任务弹窗（B）：`#ds-task-root` 容器 + `TaskModule.evoke` + 显隐控制（`taskListPopupState`）+ 触发方式 A/B。
  - `references/capabilities/ds-act-sdk/act-task-checker.md`——回流任务检测（C）：`new TaskChecker(actId, asId)` 纯逻辑类骨架 + 方法表 + 错误码。
  - `references/capabilities/ds-act-sdk/act-cps-bar.md`——CPS 底部栏（D）：`#ds-cps-bar-root` 容器 + `CpsUniversalBar.evoke` + frontConfig 自动拉取。
  - `references/capabilities/ds-act-sdk/act-vip-recall.md`——心易会员流失召回（E）：headless 能力，`configure` 传 `vipRecall` 配置 + `useVipRecall` hook / service 函数直接调用。
  - `references/capabilities/ds-act-sdk/act-lottery.md`——抽奖（F）：headless 能力，`useLuckydraw` hook / service 函数直接调用，支持次数抽奖与积分抽奖（模块从 `actInfo.moduleList` 派生，configure 无需额外配置）。
  - `references/capabilities/ds-act-sdk/act-cps-download-guide.md`——CPS 下载引导弹窗（G）：`#ds-cps-download-modal-root` 隐藏容器 + `CpsDownloadModal.evoke` + 零参 `showCpsDownloadModal()`，命令式脱离任务面板，站内四步/站外两步由 `isGodlike()` 自动分发。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| `ACT_SDK_HTML_FILES` | scan-html 原语 + 用户确认 | 是 | — | 前置传递（候选为**含 DS Marker** 的 HTML 文件，非全部 HTML；单文件静默默认，多文件须用户确认） |
| `actId` | 用户 | 按需 | — | 交互询问（大神活动后台**外网**活动 ID；A/B/C/F/G 必填，仅 D 时可省略） |
| `appKey` | ds.js 复用 / 用户 | 是 | — | 智能复用（`src/ds.js` 已有 `APP_KEY` 常量时自动读取并提示确认复用；无则交互询问） |
| `frontId` | 用户 | 按需 | — | 交互询问（**选 D 或 G 时收集**；CPS 底部栏 / CPS 下载引导弹窗必填，其他功能不依赖） |
| 功能多选 | 用户 | 是 | — | 交互询问（字母组合如 `AD`/`C`/`ABCDEFG`；输入顺序不影响执行顺序，固定按 A→B→C→D→E→F→G 依次执行选中项） |
| `showRole` | 用户 | 否 | `false` | 交互询问（**仅选 B 时**；任务弹窗内是否展示角色绑定入口） |
| 任务弹窗触发方式 | 用户 | 是 | — | 交互询问（**仅选 B 时**；A=自动生成入口按钮 / B=页面已有按钮触发） |
| `TRIGGER_SELECTOR` | 用户 | 按需 | — | 交互询问（**仅 B 模式**；用户描述按钮外观/名称后，在页面代码定位元素提取 CSS 选择器） |
| `asId` | 用户 | 是 | — | 交互询问（**选 C 或 G 时**；触发任务 ID，注意与用户维度绑定，不支持按角色区分；C 为回流任务，G（CPS 弹窗）触发任务不限回流） |

> **`ACT_SDK_HTML_FILES` 获取规则**：scan-html 返回所有 HTML 注释后，本能力按 DS Marker 模式（`<!-- [DS:SDK-LOADER:START] -->` 等）筛选出**已接入大神 SDK** 的 HTML 文件作为候选。仅 1 个 → 静默默认；多个 → 列出清单请用户确认（回车默认 index.html，或逗号分隔）。候选不是全部 HTML——ds-act-sdk 依赖 SDK-LOADER 已就位。

> **`appKey` 智能复用**：`src/ds.js` 的 CONFIG 块含 `APP_KEY` 常量时，自动读取并提示"检测到 ds.js 已有 appKey=xxx，是否复用？"，用户确认后复用，无需重复填写。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| ds-act-sdk 资源 | `ACT_SDK_HTML_FILES` 每个文件 `<head>` 末尾（SDK-LOADER 块之后、`src/ds.js` 引用之前） | `ds-act-sdk/0.3.1` CSS + JS（`ds-act-sdk.min.css` + `ds-act-sdk.min.js`） |
| `configure` 配置代码 | `src/ds.js` 末尾（无则业务主 JS 文件），包裹于 `/* ========== DS:ACT-SDK BEGIN ========== */` 与 `END` 之间 | `contracts/ds-act-sdk-api.md`（`window.DsActSdk.configure({ production: { actId, appKey, frontId? } })`） |
| `ds.js` 引用 type 校正 | `ACT_SDK_HTML_FILES` 每个文件 | `<script type="module" src="src/ds.js">`（相对路径脚本必须 `type="module"`，否则 import/export 报错） |
| HTML 容器（A） | `ACT_SDK_HTML_FILES` 每个文件 `</body>` 前 | `<!-- DS Act SDK 角色绑定容器 --><div id="ds-role-root"></div>` |
| `Role.evoke` 代码（A） | `src/ds.js` 的 DS:ACT-SDK 块内 | `references/capabilities/ds-act-sdk/act-role.md` A.2（`container: '#ds-role-root'`） |
| HTML 容器 + 按钮（B） | `ACT_SDK_HTML_FILES` 每个文件 `</body>` 前 | `#ds-task-root` 容器；A 模式额外 `#ds-task-entry-btn` 按钮（初始 `display:none`） |
| 按钮样式（B-A 模式） | `src/style.css`（不存在则内联 `<style>`） | `references/capabilities/ds-act-sdk/act-task.md` B.2（fixed 悬浮按钮样式） |
| `TaskModule.evoke` 代码（B） | `src/ds.js` 的 DS:ACT-SDK 块内 | `references/capabilities/ds-act-sdk/act-task.md` B.3（`showRole` + 显隐控制 `dsActStore.set(taskListPopupState, true)`） |
| `TaskChecker` 骨架（C） | `src/ds.js` 的 DS:ACT-SDK 块内 | `references/capabilities/ds-act-sdk/act-task-checker.md` C.3（`new TaskChecker(actId, asId)` + 注释式调用链，不封装函数） |
| HTML 容器（D） | `ACT_SDK_HTML_FILES` 每个文件 `</body>` 前 | `#ds-cps-bar-root` 容器 + `body { padding-bottom: var(--cps-bar-bottom, 0px); }` |
| `CpsUniversalBar.evoke` 代码（D） | `src/ds.js` 的 DS:ACT-SDK 块内 | `references/capabilities/ds-act-sdk/act-cps-bar.md` D.2（`container: '#ds-cps-bar-root'`） |
| HTML 容器（G） | `ACT_SDK_HTML_FILES` 每个文件 `</body>` 前 | `<!-- CPS 下载引导弹窗容器 --><div id="ds-cps-download-modal-root" style="...隐藏...">`（宿主 return null） |
| `CpsDownloadModal.evoke` 代码（G） | `src/ds.js` 的 DS:ACT-SDK 块内 | `references/capabilities/ds-act-sdk/act-cps-download-guide.md` G.4（`evoke({ container: '#ds-cps-download-modal-root' })` + `new TaskChecker(actId, asId)` 预检 + 零参 `showCpsDownloadModal()` 调用链） |

## 能做什么

- **注入 SDK 资源**：遍历 `ACT_SDK_HTML_FILES`，在 `<head>` 末尾（SDK-LOADER 块之后）追加 `ds-act-sdk/0.3.1` 的 CSS link + JS script，确保在 `src/ds.js` 加载之前就位；校正 `ds.js` 引用标签的 `type="module"`。
- **生成全局配置**：在 `src/ds.js` 末尾追加 `DS:ACT-SDK BEGIN/END` 包裹的 `window.DsActSdk.configure({ production: { actId, appKey, frontId? } })`，按用户选择填充占位符（选 D 或 G 时取消 `frontId` 注释）。
- **按选择加载子模块**：据功能多选结果，按 A→B→C→D→E→F→G 固定顺序依次读取并执行选中模块的附属文件，各模块独立注入 HTML 容器 + 生成 evoke/调用代码（E/F 为 headless 无 HTML 容器；G 为隐藏容器）。
- **智能复用 appKey**：检测 `src/ds.js` 已有 `APP_KEY` 常量时自动读取并提示复用。
- **frontId 按需收集**：选 D 或 G 时询问 frontId（含参考文档链接原文展示）；未选 D/G 不询问。
- **输出汇总报告**：文件变更表、配置参数表、验证方式（按实际选中功能列出，未选不展示）。

## 不能做什么

- **不替代 inject**——本能力依赖 `src/ds.js` 与 SDK-LOADER 已就位，不注入大神基础 SDK。未接入 inject 时终止并提示先执行模式 1。
- **不手动检测登录态、不手动拉取 actInfo**——五个 UI 组件与 headless 能力的登录态、actInfo 均由 SDK 自动处理（UI 走 `.evoke()` 挂载 Provider → `LoginBoot`；headless 走 hook/service 内部）。业务侧无需重复处理。
- **不为 `TaskChecker` 封装触发函数**——C 模块只生成 `new TaskChecker` + 注释式调用链骨架，调用时机完全由业务方决定（玩家死亡/登录后/点击按钮等），不做触发模式询问。
- **不硬编码 CPS 展示配置**——D 模块（底部栏）和 G 模块（下载引导弹窗）的所有展示配置由 `frontId` 对应后台 `frontConfig` 自动拉取（D 走 `cpsUniversalBarConfig.ext`，G 走 `cpsModalConfig.ext`），代码中只写 `evoke({ container })`。`loginedUser`/`onLogin`/`isWydsCpsUser` 等参数 SDK 已自动注入，业务侧不传。
- **不改变子模块执行顺序**——无论用户输入 `DA` 还是 `AD`，固定按 A→B→C→D→E→F→G 依次执行选中项。
- **不在无 DS Marker 的 HTML 上注入**——候选页面必须是已接入大神 SDK 的文件，ds-act-sdk 依赖 SDK-LOADER 已就位。
- **不把 CPS 下载引导弹窗绑定任务面板**——G 模块 `CpsDownloadModal` 是独立 evoke，`showCpsDownloadModal()` 零参命令式调起，不依赖 `taskListPopupState`；不为其封装触发函数，调起时机由业务方决定。
- **不决定后续能力路由**——接入完成后可提示后续选项（audit/deploy），但不强制执行。

## 判断规则

### 1. evoke 自动挂载 Provider 机制（核心）

五个 UI 组件（`Role` / `TaskList` / `TaskModule` / `CpsUniversalBar` / `CpsDownloadModal`）的 `.evoke()` 内部走 `mountComponent` → `ensureRoot()` → `createRoot(<DsActProvider>)`，自动完成：

| 自动行为 | 触发者 | 说明 |
|---------|--------|------|
| 挂载全局单例 `DsActProvider` | 首次 `evoke()` | 隐藏 div `#__ds-act-sdk-root__`，所有 evoke 共用同一个 `dsActStore`，状态天然同步 |
| `LoginBoot` 登录态检测 | `DsActProvider` 挂载时 `useEffect[]` 一次 | 站内 `ds.ready → checkLogined → getMyInfo → getGodlikeInfo`；站外 `dsLogin.hasLoggedIn()` |
| `fetchActInfo(actId)` | `useEffect[actId, isLoginLoading]` | 登录态就绪后自动拉取活动信息写入 store |
| `FrontConfigBoot` | `DsActProvider`（若有 frontId） | 非阻塞拉取前端配置，fan-out `squareId` |

> **推论**：业务侧无需手动检测登录态、无需手动拉取 actInfo。`configure()` 仅写配置到内存，不触发任何初始化——真正启动发生在首次 `evoke()`。

### 2. TaskChecker 纯逻辑类与 store 隔离

`new TaskChecker(actId, asId)` 是**纯逻辑类**，与 jotai store **完全隔离**：

| 维度 | UI 组件 evoke | TaskChecker |
|------|--------------|-------------|
| 挂 Provider | ✅ | ❌ |
| LoginBoot 跑 | ✅ | ❌ |
| actInfo 来源 | store（Provider 自动拉取） | 私有缓存（自带 `fetchActInfo`） |
| 可脱离 Provider | ❌（依赖 store） | ✅（独立使用） |

> **推论**：C 模块生成的 `TaskChecker` 骨架不依赖任何 UI `evoke` 已执行——它自己拉取 actInfo。这与 `evokeRoleSelection` 形成关键对比（见下条）。

### 3. evokeRoleSelection 依赖陷阱

`evokeRoleSelection()` 是**纯函数**，不挂载 `DsActProvider`，直接读写 `dsActStore.get(actInfoState).appKey`：

| 调用 | 挂 Provider？ | actInfo 写入 store？ | 安全使用前提 |
|------|--------------|---------------------|-------------|
| `Role.evoke()` / `TaskModule.evoke()` / `CpsUniversalBar.evoke()` | ✅ | ✅ | 无前提，自带 |
| `evokeRoleSelection()` | ❌ | ❌（依赖 store 已有） | **必须先有一次 UI `.evoke()` 调用**，使 Provider 挂载并拉取 actInfo，否则 store 为空、`fetchRoleList` 拿不到 appKey、绑角失败 |

> **A 模块的高级用法约束**：当业务方需要主动触发绑角（而非通过 Role 组件点击）时，`references/capabilities/ds-act-sdk/act-role.md` A.3 的 `evokeRoleSelection` 代码必须出现在至少一个 UI `evoke` 调用之后。本能力在生成此代码时须提示此依赖，不静默放置。

### 4. 功能多选与执行顺序

用户输入字母组合（如 `AD`/`C`/`ABCDEFG`），输入顺序不影响执行顺序，固定按 **A→B→C→D→E→F→G** 依次执行选中模块。理由：A/B/D/G 的 HTML 容器均注入 `</body>` 前，按固定顺序避免容器顺序漂移；C 只写 JS 骨架无 HTML 产物，E/F 为 headless 无 HTML 产物，放最后不影响布局。

### 5. frontId 收集时机

| 用户选择 | frontId 处理 |
|---------|-------------|
| 含 D 或 G | 必填，步骤 5 收集（未提供则原文展示参考文档链接询问） |
| 不含 D 和 G | 不询问，`configure` 中 `frontId` 行保持注释 |

> **D 模块 frontId 不可省**：`CpsUniversalBar` 依赖 `frontConfig.cpsUniversalBarConfig.ext` 拉取后台配置，`appKey` 为空时组件 `return null` 不渲染。
>
> **G 模块 frontId 不可省**：`CpsDownloadModal` 依赖 `frontConfig.cpsModalConfig.ext` 拉取全部展示配置，未配置时弹窗无数据。

### 6. 任务弹窗显隐控制（B 模块关键区分）

`TaskModule.evoke()` 是**挂载**（只调一次），后续**显示面板**通过 `dsActStore.set(taskListPopupState, true)` 控制，两者职责分离。本能力生成的触发代码（A 模式按钮 / B 模式自定义元素）只调 `set(taskListPopupState, true)`，不重复 `evoke`。

## 幂等性

- **重入检测标志**：
  - SDK 资源：`ACT_SDK_HTML_FILES` 中 HTML 含 `ds-act-sdk/0.3.1` 的 link/script 标签。
  - configure 配置：`src/ds.js` 含 `/* ========== DS:ACT-SDK BEGIN ========== */` 标记。
  - 各子模块容器：HTML 含对应 `#ds-role-root` / `#ds-task-root` / `#ds-cps-bar-root` / `#ds-cps-download-modal-root` 容器注释。
  - 各子模块代码：`src/ds.js` 的 DS:ACT-SDK 块内含对应 `evoke` / `new TaskChecker` 调用；F 的 `useLuckydraw` 用法说明。
- **重入行为**：
  - **前置检查**：在含 DS Marker 的 HTML 和 `src/` 中搜索 `ds-act-sdk` / `DsActSdk`，已找到 → **询问是否覆盖**，用户选 `n` 则终止。
  - **SDK 资源**：已存在同版本 → 跳过注入。
  - **configure 块**：`DS:ACT-SDK BEGIN/END` 标记已存在 → 询问覆盖（覆盖则整块重写，不部分保留——与 inject 的 CONFIG 块部分保留策略不同，因 actId/frontId 随活动变化）。
  - **HTML 容器**：对应容器注释已存在 → 跳过插入。
  - **子模块代码**：对应 `evoke`/`new TaskChecker` 已存在 → 跳过追加。
  - **`ds.js` type 校正**：每次重入重新检测，`type="module"` 缺失则补齐。

## 执行步骤

本能力是**严格串行管线**，无可并行节点。每一步的输出是下一步的输入：

```
前置检查（搜索 ds-act-sdk / DsActSdk，已存在询问覆盖）
  ↓
scan-html（返回 HTML 注释清单）→ 按 DS Marker 筛选含 SDK-LOADER 的 HTML 文件
  ↓
ACT_SDK_HTML_FILES 确认（单文件静默；多文件用户确认）
  ↓
SDK 资源注入（遍历 ACT_SDK_HTML_FILES，head 末尾追加 CSS+JS）+ ds.js type 校正
  ↓
配置收集
  ├─ appKey 智能复用（读 ds.js APP_KEY 常量，提示确认）
  ├─ 交互询问：actId（A/B/C/F/G 必填，仅 D 可省）
  ├─ 功能多选（A/B/C/D/E/F/G 字母组合）
  ├─ frontId（选 D 或 G 时收集，含参考文档链接）
  └─ asId（选 C 或 G 时收集，含参考文档链接）
  ↓
configure 配置代码生成（src/ds.js 末尾追加 DS:ACT-SDK BEGIN/END 块）
  ↓
子模块按 A→B→C→D→E→F→G 顺序执行（仅选中项）
  ├─ A：ds-act-sdk/act-role.md → #ds-role-root 容器 + Role.evoke 代码
  ├─ B：ds-act-sdk/act-task.md → 触发方式询问 + #ds-task-root 容器 + (A模式)按钮/样式 + TaskModule.evoke 代码
  ├─ C：ds-act-sdk/act-task-checker.md → asId 询问 + TaskChecker 骨架
  ├─ D：ds-act-sdk/act-cps-bar.md → #ds-cps-bar-root 容器 + padding-bottom CSS + CpsUniversalBar.evoke 代码
  ├─ E：ds-act-sdk/act-vip-recall.md → configure 追加 vipRecall 配置 + useVipRecall hook / service 函数用法说明（无 HTML 容器）
  ├─ F：ds-act-sdk/act-lottery.md → useLuckydraw hook / service 函数用法说明（无 HTML 容器，configure 无需额外配置）
  └─ G：ds-act-sdk/act-cps-download-guide.md → asId 询问 + #ds-cps-download-modal-root 隐藏容器 + CpsDownloadModal.evoke + new TaskChecker 预检 + 零参 showCpsDownloadModal() 调用链
  ↓
汇总报告输出（文件变更表 + 配置参数表 + 验证方式，仅列选中功能）
```

## 反模式表

> 以下反模式从 SKILL.md 迁移，与 ds-act-sdk 能力相关。

| ❌ 错误写法 | ✅ 正确写法 | 原因 |
|---|---|---|
| ds-act-sdk 只配置 staging 参数 | 只配置 production 参数（`DsActSdk.configure({ production: { actId, appKey } })`） | staging 是调试用的，线上活动只需要配置 production |
| actId 用错（如填了圈子 ID） | actId 是大神活动后台生成的活动 ID，格式如 `6954c5d472bbb96d77fe687c` | actId 和 frontId 是不同的 ID，填错会导致任务列表为空 |
| 任务弹窗容器 `#ds-task-root` 未添加到 HTML | 在 `</body>` 前添加 `<div id="ds-task-root"></div>` | evoke 需要有容器元素，找不到容器就无法渲染 |
| 手动检测登录态后再调用 `evoke` | 直接调用 `evoke({ container })`，evoke 自带 DsActProvider 自动处理登录态 + actInfo 拉取 | 手动检测是旧版 IIFE 骨架的做法，evoke 内部自动挂载 Provider，手动检测冗余且可能绕过 Provider 状态同步 |
| 在按钮点击时才调用 `DsActSdk.configure()` | `configure` 在页面加载时立即调用，按钮只负责 `dsActStore.set(taskListPopupState, true)` | configure 是配置初始化，每次点击都调用会造成重复配置 |
| `gameInfo.icon` 用相对路径 | 必须用 `https://` 开头的完整 URL | 任务弹窗内展示的图片是独立加载的，相对路径找不到 |
| 不调用 `tc.query()` 就直接用 `tc.isCompleted()` | 必须先 `await tc.query()` 拉取任务数据，再调用同步状态方法 | isCompleted/isClaimable 是同步方法，依赖 query() 拉回来的数据，不先查询永远返回 false |
| 任务完成就直接调 `tc.claim()`，不判断 `isClaimable` | 先判断 `tc.isClaimable()` 为 true 再调用 `claim()` | claim() 内部虽然有保护，但直接调用会在已领取时返回错误，还白白发了一次请求 |
| 领奖弹窗由 SDK 控制 | 弹窗完全由业务方实现，SDK 只给回调 `onClaimable`，业务方在回调里展示弹窗 | SDK 不干预 UI，这样业务方可以自由控制弹窗样式和时机 |
| 把 `CpsUniversalBar.evoke()` 放在 `if (isLoggedIn)` 内 | 直接调用 `evoke({ container })`，evoke 自带 DsActProvider 自动处理登录态 | evoke 内部自动挂载 Provider 处理登录态，手动判断登录态是旧版 IIFE 骨架做法，已废弃 |
| 忘记在 HTML 添加 `#ds-cps-bar-root` 容器 | 在 `</body>` 前添加 `<div id="ds-cps-bar-root"></div>` | evoke 找不到挂载容器会直接失败，CPS 栏不会渲染 |
| 以为 CPS 底部栏的下载链接/按钮文案需要在代码里配置 | 只传 `container` 选择器，所有展示内容通过 `frontId` 关联的后台配置自动拉取 | CPS 底部栏的内容由运营在大神CMS后台配置，代码侧无需也不应硬编码 |
| `evokeRoleSelection()` 调用前没有任何 UI `evoke` | 必须先有一次 UI 组件 `evoke`（Role/TaskModule/CpsUniversalBar 任一）挂载 Provider | evokeRoleSelection 直接读写 dsActStore，依赖 actInfo 已就位；无 UI evoke 则 store 为空，绑角失败 |
| 用 IIFE 手动检测登录态 + `initActTask` 封装 | 直接 `TaskModule.evoke({ container })`，evoke 自带 Provider 自动处理 | 旧版 IIFE 骨架已废弃；evoke 内部走 mountComponent 自动挂载 DsActProvider + LoginBoot |
| `new TaskChecker()` 后不调 `isMatched()` 就直接 `query()` | 先 `await tc.isMatched()` 判断命中，再 `await tc.query()` 拉取详情 | query 内部会自动调 isMatched，但显式调用更清晰；isMatched 返回 false 时 query 返回空数组 |
| 抽奖按钮不防重复点击，用户连点触发多次 `doLuckydraw` | React 用 debounce，HTML/JS 用锁变量（`let drawing = false; if (drawing) return; drawing = true; try { ... } finally { drawing = false; }`） | `doLuckydraw` 是 async，连点会发多次抽奖请求，浪费次数/积分且可能并发冲突 |
| 手动调 `fetchLuckydrawInfo` 刷新而非等编排函数自动刷新 | 不手动刷新——`doLuckydraw`/`doLuckydrawMore` 成功后内部自动调 `fetchLuckydrawInfo`（积分抽奖额外调 `fetchCurrencyInfo`） | 编排函数成功后已自动刷新，手动刷新多余且可能与自动刷新竞争 |
| 直接调底层 `doLuckDrawByChanceMore` 不合并结果 | 用编排函数 `doLuckydrawMore`（内部已 `mergeLuckydrawResults`），或手动调 `mergeLuckydrawResults` 合并 | `multiDraw` 接口返回 `DrawResult[]`，不合并直接用会丢失聚合奖品列表 |
| 判断 `res.isError` 判断抽奖失败 | 判断 `res && res.code === 200` 为成功，`res === null` 为失败 | SDK 失败统一返回 `null`，`DrawResult` 无 `isError` 字段 |
| 把 CPS 下载弹窗 `showCpsDownloadModal()` 挂到任务面板显隐 / 封装成触发函数 | 独立 `evoke({ container })` 挂宿主，业务时机直接零参裸调 `showCpsDownloadModal()` | 它不依赖 taskListPopupState，是命令式独立入口；封装函数是旧版废弃写法 |
| 站内/站外分别调不同弹窗方法 | 统一零参 `showCpsDownloadModal()`，站内四步/站外两步由 `isGodlike()` 内部自动分发 | 调用方无需判断环境，SDK 已内化站内外分流 |
| 在 iOS 上仍调起 CPS 下载弹窗 | 调起前先判断 `ds.isIOS`，iOS 直接走后续流程不弹窗 | CPS 不支持 iOS，底层仅 Toast 提示，业务应短路避免无效弹窗 |
| 忘记在 HTML 添加 `#ds-cps-download-modal-root` 容器 / 未先 evoke 就调 showCpsDownloadModal | 先注入隐藏容器 + `evoke` 挂宿主，再调 `showCpsDownloadModal()` | 宿主未挂载时调起只输出 console.error 不弹窗 |

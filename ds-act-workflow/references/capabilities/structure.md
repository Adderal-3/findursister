# 能力：规范目录结构（模式 0 / STRUCTURE）

> 将 H5 项目所有 HTML 文件内嵌的 CSS / 业务 JS 提取为 `src/` 下独立文件，修正 HTML 引用，生成 `CLAUDE.md` 记录目录约定，并修复 `type="module"` 化导致的 window 桥接断裂。
>
> 模式 0 是 ds-act-workflow 的入口能力，无前置能力依赖，产物为下游 inject / audit 提供可注入、可审查的目录结构。

## 依赖

- **前置能力**：无——本能力是管线入口，可直接对原始 H5 项目执行。
- **公共原语**：
  - `primitives/scan-html.md`——返回每个 HTML 文件的 `<style>` 块、内嵌 `<script>` 块、外链 `<script>` 标签、`<head>`/`<body>` 区间、HTML 注释清单。本能力据此定位提取目标、注入点与 SDK-LOADER 边界。
- **产物契约**：无直接生产/消费关系。本能力不触碰 `src/ds.js`（由 inject 管理），不写入 DS Marker；但需识别 `<!-- [DS:SDK-LOADER` 注释区域以豁免其中的 `<script>` 块（按注释原始内容匹配，不依赖 `contracts/sdk-loader.md` 的语义）。
- **外部技能**：无。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| 项目根目录 | 调用方 | 是 | 当前工作目录 | 前置传递 |
| HTML 文件集合 | scan-html 原语 | 是 | — | 前置传递（glob `*.html`，排除 `node_modules`、`dist`；scan-html 返回结构化清单） |
| 执行日期 | 系统 | 是 | 当天 | 可推断（用于追加分隔符注释 `YYYY-MM-DD`） |

> **HTML 文件集合获取规则**：scan-html 返回项目根目录所有 `.html`。若无任何 HTML 文件 → 立即中止，输出 `❌ 未找到 HTML 文件，无法执行 MODE 0`。仅 1 个（`index.html`）→ 静默处理；多个 → 逐个独立执行，按命名规则分流（见判断规则段 1）。本能力**不要求用户确认文件集合**——所有 HTML 一律处理（与 inject 的 `SELECTED_HTML_FILES` 不同，inject 涉及选择性注入需用户确认，structure 是全量整理）。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| 提取的 CSS | `src/<对应名>-style.css`（`index.html` → `src/style.css`） | 所有 `<style>` 块内容按 DOM 顺序合并（不含标签本身）；已存在则追加（见幂等性段） |
| 提取的业务 JS | `src/<对应名>-game.js`（`index.html` → `src/game.js`） | 所有内嵌 `<script>` 块内容按 DOM 顺序合并（不含标签本身）；已存在则追加；末尾含 window 桥接块（若触发） |
| 修正后的 HTML | 原 HTML 文件路径（覆盖写） | 移除已提取的 `<style>`/内嵌 `<script>` 块；`</head>` 前插入 `<link rel="stylesheet" href="src/<对应名>-style.css">`；`</body>` 前插入 `<script type="module" src="src/<对应名>-game.js"></script>`；加载顺序校验 |
| window 桥接块 | 触发桥接的 `src/<对应名>-game.js` 内 | `/* [DS:WINDOW-BRIDGE:START] */` … `/* [DS:WINDOW-BRIDGE:END] */`，按函数定义位置分 `module` 组（文件末尾追加）/ `domready` 组（DOMContentLoaded 回调末尾插入） |
| CLAUDE.md | 项目根目录 `CLAUDE.md` | 按 `contracts/claude-md-template.md` 契约生成：不存在 → 新建（含项目结构 + 脚本加载顺序 + 开发约定 + 通用工程原则）；已存在且无 `由 ds-act-workflow 模式0 整理生成` 字样 → 追加 `## 项目结构` section；已存在且含该字样 → 跳过 |

> **`src/ds.js` 不在本能力产物范围**：由 inject（模式 1）管理，本能力仅在校验加载顺序时读取其引用是否存在，不创建、不修改、不删除。

## 能做什么

- **提取内嵌 CSS**：遍历 HTML 文件所有 `<style>` 块，按 DOM 顺序合并内容写入 `src/<对应名>-style.css`。**修正 `url()` 相对路径**：`<style>` 原在 index.html（根），提取到 `src/` 后路径差一层——`url('fonts/x')` → `url('../fonts/x')`、`url('artwork/x')` → `url('../artwork/x')`，否则 Vite 无法解析 → H2 失败。
- **提取内嵌业务 JS**：遍历所有无 `src` 属性的 `<script>` 块，按 DOM 顺序合并内容写入 `src/<对应名>-game.js`。跳过外链 `<script src="...">` 与被 `<!-- [DS:SDK-LOADER` 注释区域包围的块（见判断规则段 2）。
- **修正 HTML 引用**：移除已提取块，在 `</head>` 前插入 `<link>`、`</body>` 前插入 `<script type="module">`，含去重与 type 修正（见判断规则段 3）。
- **校验脚本加载顺序**：若 `src/ds.js` 引用存在，确保 SDK-LOADER → ds.js → `<对应名>-game.js` 顺序，错则调整并告警。
- **修复 window 桥接**：检测 inline handler 调用的函数名与 `*-game.js` 内函数声明的交集，按定义位置（module 顶层 / domready）分组挂载到 `window`（见判断规则段 4）。
- **Lint 字符串模板 onclick**：扫描 `*-game.js` 内字符串/模板字面量中的 `onclick="fn()"` 写法，告警不自动修改（见判断规则段 5）。
- **生成 CLAUDE.md**：按 `contracts/claude-md-template.md` 契约生成，记录目录结构约定、脚本加载顺序、开发约定（含 module 作用域限制）、通用工程原则。
- **输出整理摘要**：文件变更表 + 警告行 + window 桥接计数。

## 不能做什么

- **不触碰 `src/ds.js`**——由 inject（模式 1）管理，本能力不创建、不修改、不删除；仅在加载顺序校验时读取其引用是否存在。
- **不删除业务代码**——只移除已提取的内嵌 `<style>`/`<script>` 块标签，业务逻辑原样迁移到 `src/`。
- **不自动重构字符串模板 onclick**——`innerHTML = \`...<button onclick="fn()">...\`` 这类写法仅告警，由开发者手动改用 `addEventListener`（重构影响面不确定）。
- **不修改 SDK-LOADER 区域内容**——被 `<!-- [DS:SDK-LOADER` 注释包围的 `<script>` 块整体豁免提取，原样保留。
- **不要求用户确认 HTML 文件集合**——所有 HTML 一律处理（全量整理，非选择性注入）。
- **不决定后续能力路由**——整理完成后可提示后续选项（inject/audit/deploy），但不强制执行。
- **不做框架判定**——框架识别是 `detect-framework` 的职责；本能力仅处理 HTML 文件的内嵌块提取，不读 `package.json`。
- **不处理 Cocos 启动块豁免**——Cocos 项目的 `cocos2d-js` 启动脚本通常是外链 `<script src>`，本能力按"无 src 才提取"规则天然跳过；若 Cocos 启动代码内嵌且未被 SDK-LOADER 注释包围，本能力会提取它（这是已知边界，由 inject/audit 阶段兜底）。

## 判断规则

### 1. 多 HTML 文件命名规则

| HTML 文件 | 提取的 CSS 路径 | 提取的 JS 路径 |
|-----------|----------------|----------------|
| `index.html` | `src/style.css` | `src/game.js` |
| `<name>.html`（如 `page2.html`） | `src/<name>-style.css` | `src/<name>-game.js` |

> `index.html` 保持原名无前缀；其他 HTML 加 `<name>-` 前缀避免冲突。每个 HTML 文件的步骤 2-4 独立执行，互不影响。

### 2. 内嵌 `<script>` 块提取豁免规则

| 条件 | 行为 |
|------|------|
| `<script>` 无 `src` 属性，且未被 SDK-LOADER 注释包围 | **提取**（内容合并到 `*-game.js`） |
| `<script src="...">` 外链形式 | **跳过**（保留原标签） |
| `<script>` 被 `<!-- [DS:SDK-LOADER` 注释区域包围 | **跳过**（大神 SDK 产物，由 inject 管理） |

> **SDK-LOADER 包围判定**：从当前 `<script>` 向上扫描（忽略空白行），若遇到含 `[DS:SDK-LOADER` 的 HTML 注释则视为被包围；或 `<script>` 标签自身内容含 `[DS:SDK-LOADER` 字样亦跳过。本判定基于注释原始文本匹配，不依赖 `contracts/sdk-loader.md` 的 Marker 语义。

### 3. HTML 引用插入的去重与 type 修正

**`<link>` 标签（`</head>` 前）**：

| 条件 | 行为 |
|------|------|
| 规范化路径后已存在相同 `<link>` | 跳过（去重） |
| 不存在 | 插入 `<link rel="stylesheet" href="src/<对应名>-style.css">` |
| 不存在 `</head>` | 追加到文件末尾，标记警告 |

**`<script>` 标签（`</body>` 前）**：

| 条件 | 行为 |
|------|------|
| 已存在 `<script src="src/<对应名>-game.js">` 且含 `type="module"` | 跳过（去重） |
| 已存在但**缺少 `type="module"`**（或 type 为其他值） | **原地替换**为 `<script type="module" src="src/<对应名>-game.js"></script>`，标记警告 |
| 不存在 | 插入新标签 |
| 不存在 `</body>` | 追加到文件末尾，标记警告 |

> **type 修正的原因**：`*-game.js` 以 `type="module"` 加载才能使用 ES 模块语法，但模块作用域内函数不自动挂载 `window`——这正是 window 桥接修复（段 4）要解决的问题。

### 4. window 桥接检测与修复规则

**检测**：

1. 遍历所有 HTML 文件，提取 inline handler 中直接调用的函数名（集合 A）：匹配所有 `on\w+="..."` 属性值中格式为 `fnName(` 的调用（含分号分隔的多个调用）。**排除** ds.js 已挂载到 `window` 的函数：`withPrecheck`、`trackEvent`、`openSquareUrl`、`initShare`、`initUlink`、`initLogin`。
   1b. 同时遍历所有 `*-game.js`，提取字符串/模板字面量中 `onclick="fnName("` 调用的函数名，合并入集合 A（动态注入 HTML 的 onclick 与 inline 属性 onclick 一样需桥接，否则模块作用域内调用静默失效——规则 5 的 Lint 只告警不修，但函数名须纳入桥接范围）。
2. 遍历所有提取出的 `*-game.js` 文件，提取函数声明（集合 B），并记录每个函数的定义位置：
   - `module` — 定义在模块顶层（`function fnName(` 不在任何回调内）
   - `domready` — 定义在 `DOMContentLoaded` 回调内部
3. 计算 `needs_bridge = A ∩ B`：为空 → 静默跳过；非空 → 执行修复。

**修复（按定义位置分组）**：

| 组 | 定义位置 | 插入点 | 插入内容 |
|----|---------|--------|---------|
| `domready` | DOMContentLoaded 回调内部 | 回调最后一个 `});`（或 `})`）之前 | `/* [DS:WINDOW-BRIDGE:START] */` + `window.fnA = fnA;` … + `/* [DS:WINDOW-BRIDGE:END] */` |
| `module` | 模块顶层 | `*-game.js` 文件末尾追加 | 同上结构 |

> **分组的原因**：`domready` 组函数定义在回调内，仅在回调执行后存在，桥接语句必须放在回调内部（回调末尾）才能引用到函数；`module` 组函数定义在顶层，桥接语句放文件末尾即可。两组分别用独立的 `[DS:WINDOW-BRIDGE:START/END]` 块包裹，便于幂等检测。

> **为何不全部挂载**：仅挂载 `needs_bridge` 交集——inline handler 实际调用的函数。未在 inline handler 中调用的模块内函数无需挂载 `window`，避免污染全局。

### 5. 字符串模板 onclick Lint 规则

在 window 桥接检测/修复完成后，额外扫描 `*-game.js` 文件，查找**字符串拼接或模板字面量中**出现的 onclick 写法：

- 匹配模式：`` onclick=["'`]?(\w+)\( ``（出现在字符串/模板上下文中，而非 HTML 属性上）
- 典型来源：`` innerHTML = `...<button onclick="fn()">...` ``、`innerHTML += '...<div onclick="fn()">...'`

| 条件 | 行为 |
|------|------|
| 发现匹配 | 摘要表补充告警行：`⚠️ *-game.js 第 N 行存在字符串模板 onclick（fn1、fn2...），模块作用域内调用会静默失效，请改用 addEventListener`；**不自动修改** |
| 未发现 | 静默跳过 |

> **不自动修改的原因**：字符串模板内的 onclick 通常伴随动态 DOM 注入，改用 `addEventListener` 需在注入后重新绑定，重构影响面不确定，由开发者手动处理更安全。

### 6. 加载顺序校验规则

若修正后的 HTML 中 `src/ds.js` 引用存在：

| 顺序要求 | 错误时行为 |
|---------|-----------|
| SDK-LOADER 块 → `src/ds.js` → `src/<对应名>-game.js` | 调整位置并标记警告 `已调整加载顺序：src/ds.js 移至 src/game.js 之前（大神SDK必须先加载）` |

> 仅当 `src/ds.js` 引用存在时才校验；本能力不创建 ds.js 引用（由 inject 负责），只确保已有引用的顺序正确。

## 幂等性

- **重入检测标志**：
  - 提取的 CSS/JS：`src/<对应名>-style.css` / `src/<对应名>-game.js` 文件已存在。
  - HTML 引用：`<link>` / `<script type="module">` 标签已存在（含 type 修正后）。
  - window 桥接块：`*-game.js` 含 `[DS:WINDOW-BRIDGE:START]` 注释对。
  - CLAUDE.md：含 `由 ds-act-workflow 模式0 整理生成` 字样。
- **重入行为**：
  - **提取的 CSS/JS**：文件已存在 → **追加而非覆盖**。原文件内容 + 注释分隔符（`/* ===== 从 <对应HTML文件名> 提取（YYYY-MM-DD）===== */` 或 `// ===== ... =====`）+ 本次提取内容。避免覆盖开发者手动修改过的 `src/` 文件。
  - **HTML 引用**：`<link>` 已存在 → 跳过；`<script>` 已存在且含 `type="module"` → 跳过；缺 `type="module"` → 原地替换（每次重入重新检测）。
  - **HTML 内嵌块移除**：每次重入重新扫描，已提取的 `<style>`/`<script>` 块若仍在 HTML 中则移除（若开发者重新内嵌了新块，会被再次提取）。
  - **window 桥接块**：`[DS:WINDOW-BRIDGE:START]` 已存在 → 跳过该文件（避免重复写入）；未存在且 `needs_bridge` 非空 → 插入。
  - **CLAUDE.md**：不存在 → 新建；已存在且无模式0 字样 → 追加 `## 项目结构` section；已存在且含字样 → 跳过。
  - **加载顺序**：每次重入重新校验，错则调整。

> **追加而非覆盖的权衡**：覆盖会丢失开发者对 `src/` 文件的手动修改；追加保留历史内容但可能产生重复（若同一 HTML 多次整理）。分隔符注释 `===== 从 <文件名> 提取（日期）=====` 标记每次提取的来源与时间，便于开发者识别与清理。

## 执行步骤

本能力是**串行管线**，每个 HTML 文件独立处理，文件间亦串行（共享 `src/` 目录创建）：

```
scan-html（返回每个 HTML 的 style/script 块、head/body 区间、注释清单）
  ↓
逐文件处理（每个 HTML 独立）：
  ├─ 内存分析：识别可提取的 <style> 块、内嵌 <script> 块（豁免 SDK-LOADER 区域）
  │   （若 scan-html 返回空 styleBlocks/inlineScriptBlocks：跳过提取与写入，直奔 window 桥接检测→CLAUDE.md 生成）
  ├─ 构建产物：
  │   ├─ new_html（移除已提取块 + 插入 <link>/<script type="module"> + 加载顺序校验）
  │   ├─ style_css（已存在则追加，分隔符注释）
  │   └─ game_js（已存在则追加，分隔符注释）
  └─ 一次性写入：HTML 覆盖 + src/*.css + src/*.js（mkdir -p src/）
  ↓
window 桥接检测（遍历所有 HTML inline handler 函数名 ∩ 所有 *-game.js 函数声明）
  ↓
window 桥接修复（按 module/domready 分组，插入 [DS:WINDOW-BRIDGE] 块）
  ↓
字符串模板 onclick Lint（扫描 *-game.js，告警不修改）
  ↓
CLAUDE.md 生成/追加
  ↓
整理摘要输出（文件变更表 + 警告 + 桥接计数）
```

## 反模式表

> 以下反模式从 SKILL.md 迁移，与 structure 能力的 window 桥接相关。

| ❌ 错误写法 | ✅ 正确写法 | 原因 |
|---|---|---|
| `window.xxx = someFunction` 但 `someFunction` 未定义（赋值后 `window.xxx` 为 `undefined`） | 先确保函数已定义再挂 window；若函数在新版本中已废弃，赋空实现 `function(){}` 而非引用不存在的变量 | `window.updateProbabilityDisplay = updateProbabilityDisplay` 若 `updateProbabilityDisplay` 从未声明，赋值结果为 `undefined`，后续调用即抛 `ReferenceError`；至少给一个空函数兜底 |
| HTML 中 `onclick="openLeaderboard()"` 只靠 `function` 声明期望全局可见 | 显式写 `window.openLeaderboard = openLeaderboard` 挂到全局 | `function` 声明理论上全局可见，但被 `'use strict'` / 构建工具包裹作用域 / IIFE 隔离后挂不到 `window`；内联 `onclick` 只在 `window` 上查找函数名，不认块级作用域 |
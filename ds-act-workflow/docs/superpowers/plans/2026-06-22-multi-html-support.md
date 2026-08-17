# 多 HTML 项目注入与审查支持 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 ds-act-workflow 的模式0/1/2/4/5/6 支持多 HTML 项目，消除约 50 处 `index.html` 硬编码，改为遍历用户选择的页面集合或自动检测含 DS Marker 的文件。

**Architecture:** 在模式1步骤0后新增步骤0.5（HTML 页面选择），生成 `SELECTED_HTML_FILES` 变量贯穿注入流程；模式2独立扫描 DS Marker 确定审查范围；模式5/6 各自独立选择页面（候选为含 DS Marker 的文件）；模式0按源 HTML 名关联提取 CSS/JS。纯文档改造，不引入新文件。

**Tech Stack:** Markdown 指令文件（skill 模板）

---

## Global Constraints

- 单 HTML 项目行为完全不变（向后兼容）：只有 1 个 HTML 文件时，步骤0.5 静默跳过
- `src/ds.js` 只生成一份，所有页面共享引用，CONFIG 块配置统一
- 模式2不依赖 `SELECTED_HTML_FILES`，独立扫描 `<!-- [DS:SDK-LOADER:START] -->` marker
- 模式5/6 候选列表为"含 DS Marker 的 HTML 文件"，非所有 HTML 文件
- 模式0文件命名：index.html → `src/style.css` + `src/game.js`；其他 → `src/<name>-style.css` + `src/<name>-game.js`
- `game-storage.js` 的 `<script>` 标签必须带 `type="module"`
- 所有改造都是文档级修改（修改 .md 模板文件），不涉及代码运行时逻辑

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `references/inject.md` | 修改：新增步骤0.5；步骤0/3/3.6/4 改为遍历 `SELECTED_HTML_FILES` |
| `references/html.md` | 修改：4-HTML-2/3/5 改为遍历；结果摘要更新 |
| `references/react.md` | 修改：同 html.md，Document.tsx 保持单入口 |
| `references/vue.md` | 修改：同 html.md |
| `references/structure.md` | 修改：步骤1-4 支持多 HTML 提取；文件命名规则；CLAUDE.md 约定更新 |
| `references/audit.md` | 修改：审查范围改为"含 DS Marker 的 HTML 文件" |
| `references/audit-rules.md` | 修改：~15 处 `index.html` 硬编码改为遍历；容器检查特殊处理；版本检查改造 |
| `references/ds-act-sdk.md` | 修改：新增步骤0.5 页面选择；容器注入改为遍历 `ACT_SDK_HTML_FILES` |
| `references/act-task.md` | 修改：容器注入改为遍历 |
| `references/act-cps-bar.md` | 修改：容器注入改为遍历 |
| `references/game-storage.md` | 修改：步骤4.2 改为遍历选中文件；script 标签补 `type="module"` |
| `references/game-log.md` | 修改：扫描范围改为"含 DS Marker 的 HTML 文件" |
| `references/server-storage/02-best-practices.md` | 修改：步骤3.3 改为遍历选中文件 |
| `references/server-storage/99-api-reference.md` | 修改：改为遍历选中文件 |
| `references/miniapp.md` | 修改：注入步骤改为遍历（deprecated 文件，保持一致） |
| `references/miniapp-h5-integration.md` | 修改：注入步骤改为遍历 |

---

## Task 1：inject.md — 新增步骤0.5 + 步骤0 扩展扫描

**Files:**
- Modify: `references/inject.md`

**Interfaces:**
- Produces: `SELECTED_HTML_FILES` 变量（数组，如 `["index.html", "page2.html"]`），供 Task 2/3/4 使用

- [ ] **Step 1：步骤0 第2项 ulink 检测改为扫描所有 HTML**

将 `references/inject.md` 第14-16行：

```
2. **index.html 中的 ulink 脚本检测：**
   - 搜索 `<!-- Ulink 脚本` 或 `ds-ulink2` 相关代码
   - 记录位置和内容
```

替换为：

```
2. **所有 HTML 文件中的 ulink 脚本检测：**
   - 扫描项目根目录所有 `.html` 文件（排除 `node_modules`、`dist`）
   - 在每个文件中搜索 `<!-- Ulink 脚本` 或 `ds-ulink2` 相关代码
   - 记录每个文件中的位置和内容
```

- [ ] **Step 2：步骤0 探索报告新增 HTML 文件清单**

将 `references/inject.md` 第29-49行的探索报告模板中，在"**检测到的重复内容：**"之前插入：

```
**检测到的 HTML 文件：**
- index.html
- page2.html（如有）
- result.html（如有）
```

- [ ] **Step 3：在步骤0和步骤1之间插入步骤0.5**

在 `references/inject.md` 第50行（`---` 分隔线）之后、`### 步骤 1` 之前插入：

```markdown

### 步骤 0.5：HTML 页面选择（新增）

扫描项目根目录所有 `.html` 文件（排除 `node_modules`、`dist`）。

**若只有 1 个 HTML 文件**（即 `index.html`）：
- `SELECTED_HTML_FILES = ["index.html"]`
- 静默跳过，不询问用户

**若有多个 HTML 文件**：

```
## HTML 页面选择

检测到以下 HTML 文件：

  [✅] index.html（默认）
  [ ] page2.html
  [ ] result.html

请输入需要注入大神业务代码的页面（回车确认默认，或输入文件名，逗号分隔）：
> index.html, page2.html
```

用户确认后，记录为 `SELECTED_HTML_FILES`（如 `["index.html", "page2.html"]`）。

> **注意：** `SELECTED_HTML_FILES` 贯穿后续所有注入步骤。步骤3（SDK-LOADER）、步骤3.6（导航栏偏移CSS）、步骤4（重复逻辑清理）、步骤5（ds.js 引用注入）均遍历此集合。
```

- [ ] **Step 4：步骤3.6 导航栏偏移 CSS 改为遍历**

将 `references/inject.md` 第202行：

```
**注入位置：** 追加到 `index.html` 的现有 `<style>` 块末尾（若无则新建），或写入 `src/style.css` 的最末尾。
```

替换为：

```
**注入位置：** 遍历 `SELECTED_HTML_FILES`，对每个文件追加到其现有 `<style>` 块末尾（若无则新建），或写入 `src/style.css` 的最末尾。
```

- [ ] **Step 5：步骤4 重复逻辑清理改为遍历**

将 `references/inject.md` 第215行：

```
  [1] 旧的 ulink 脚本 — index.html:8-15
```

替换为：

```
  [1] 旧的 ulink 脚本 — 遍历 SELECTED_HTML_FILES 中每个文件检测，报告格式：[文件名]:[行号范围]
```

- [ ] **Step 6：提交**

```bash
git add references/inject.md
git commit -m "feat(inject): 新增步骤0.5 HTML页面选择，步骤0/3.6/4 改为遍历 SELECTED_HTML_FILES"
```

---

## Task 2：html.md — 4-HTML-2/3/5 改为遍历

**Files:**
- Modify: `references/html.md`

**Interfaces:**
- Consumes: `SELECTED_HTML_FILES`（来自 Task 1）

- [ ] **Step 1：4-HTML-1.2 ulink 检测改为扫描所有 HTML**

将 `references/html.md` 第26行：

```
### 1.2 检测 index.html 中的重复 ulink 脚本
```

替换为：

```
### 1.2 检测所有 HTML 文件中的重复 ulink 脚本
```

- [ ] **Step 2：4-HTML-2.1 旧 ulink 清理改为遍历**

将 `references/html.md` 第84行：

```
如果在 index.html 中发现旧的 ulink 脚本块（如 `<!-- Ulink 脚本`），删除它。
```

替换为：

```
遍历 `SELECTED_HTML_FILES`，在每个文件中检测旧的 ulink 脚本块（如 `<!-- Ulink 脚本`），发现则删除。
```

- [ ] **Step 3：4-HTML-2.3 清理报告更新**

将 `references/html.md` 第95行：

```
  [1] 旧的 ulink 脚本 — index.html:x-x
```

替换为：

```
  [1] 旧的 ulink 脚本 — 遍历 SELECTED_HTML_FILES，格式：[文件名]:[行号范围]
```

- [ ] **Step 4：4-HTML-3 标题和注入位置改为遍历**

将 `references/html.md` 第106行：

```
## 4-HTML-3：生成 SDK-LOADER（注入到 index.html `<head>`）
```

替换为：

```
## 4-HTML-3：生成 SDK-LOADER（遍历 SELECTED_HTML_FILES，注入到每个文件 `<head>`）
```

- [ ] **Step 5：4-HTML-3 SDK-LOADER 去重检查改为遍历**

将 `references/html.md` 第140行：

```
检查 index.html 中是否已存在 `<!-- [DS:SDK-LOADER:START] -->`：
- 若已存在 → 提示"SDK-LOADER 已存在，跳过重复注入"
- 若不存在 → 在 `</head>` 前插入（见下方去重规则）
```

替换为：

```
遍历 `SELECTED_HTML_FILES`，对每个文件检查是否已存在 `<!-- [DS:SDK-LOADER:START] -->`：
- 若已存在 → 提示"[文件名] SDK-LOADER 已存在，跳过重复注入"
- 若不存在 → 在该文件 `</head>` 前插入（见下方去重规则）
```

- [ ] **Step 6：4-HTML-3 SEO 标签去重改为逐文件检查**

将 `references/html.md` 第150行：

```
注入前**逐项检查** index.html 中是否已存在同名标签，已存在的跳过，不存在的才注入。SEO 标签注入位置：`<head>` 内尽量靠前（在 `<!-- [DS:SDK-LOADER:START] -->` 之前）；SDK-LOADER 脚本区紧随其后。
```

替换为：

```
遍历 `SELECTED_HTML_FILES`，对每个文件**逐项检查**是否已存在同名标签，已存在的跳过，不存在的才注入。SEO 标签注入位置：`<head>` 内尽量靠前（在 `<!-- [DS:SDK-LOADER:START] -->` 之前）；SDK-LOADER 脚本区紧随其后。
```

- [ ] **Step 7：4-HTML-5 ds.js 引用注入改为遍历**

将 `references/html.md` 第320-327行：

```
## 4-HTML-5：连接 ds.js（在 index.html 中）

**重要：ds.js 必须放在游戏业务 script 之前！**

检查 index.html 是否已有 `<script type="module" src="/src/ds.js">`：
- 若没有 → 在游戏业务 script **之前**添加：
  ```html
  <script type="module" src="/src/ds.js"></script>
  ```
- 若已有 → 确认位置是否在游戏 script 之前，若不是则调整位置
```

替换为：

```
## 4-HTML-5：连接 ds.js（遍历 SELECTED_HTML_FILES）

**重要：ds.js 必须放在游戏业务 script 之前！**

遍历 `SELECTED_HTML_FILES`，对每个文件检查是否已有 `<script type="module" src="/src/ds.js">`：
- 若没有 → 在游戏业务 script **之前**添加：
  ```html
  <script type="module" src="/src/ds.js"></script>
  ```
- 若已有 → 确认位置是否在游戏 script 之前，若不是则调整位置
```

- [ ] **Step 8：4-HTML-7 结果摘要更新**

将 `references/html.md` 第405-406行：

```
| index.html | ✅ 已注入 SDK-LOADER |
| index.html | ✅ 已注入微信 JSSDK + URS 登录组件 + 导航栏组件资源 |
```

替换为：

```
| SELECTED_HTML_FILES 中每个文件 | ✅ 已注入 SDK-LOADER |
| SELECTED_HTML_FILES 中每个文件 | ✅ 已注入微信 JSSDK + URS 登录组件 + 导航栏组件资源 |
```

- [ ] **Step 9：提交**

```bash
git add references/html.md
git commit -m "feat(html): 4-HTML-2/3/5 改为遍历 SELECTED_HTML_FILES，结果摘要更新"
```

---

## Task 3：react.md + vue.md — 同步改造

**Files:**
- Modify: `references/react.md`
- Modify: `references/vue.md`

**Interfaces:**
- Consumes: `SELECTED_HTML_FILES`（来自 Task 1）

- [ ] **Step 1：react.md 1.2 ulink 检测改为遍历**

将 `references/react.md` 第21行：

```
在 `index.html` 或 `src/Document.tsx` 中搜索：
```

替换为：

```
遍历 `SELECTED_HTML_FILES`（若有 `src/Document.tsx` 则也搜索该文件），在每个文件中搜索：
```

- [ ] **Step 2：react.md 1.0 注入目标改为遍历**

将 `references/react.md` 第80行：

```
在 `</head>` 标签之前（SDK-LOADER 之前）注入以下脚本，目标文件与 SDK-LOADER 相同（`src/Document.tsx` 的 `<head>` 或 `index.html`）。每项按去重规则检查：已存在则跳过，不存在才注入。
```

替换为：

```
在 `</head>` 标签之前（SDK-LOADER 之前）注入以下脚本，目标文件与 SDK-LOADER 相同。若有 `src/Document.tsx` 则注入其 `<head>`；否则遍历 `SELECTED_HTML_FILES`，注入每个文件的 `</head>` 前。每项按去重规则检查：已存在则跳过，不存在才注入。
```

- [ ] **Step 3：react.md SDK-LOADER 注入逻辑更新**

将 `references/react.md` 第99-102行：

```
检查项目：
- 有 `src/Document.tsx` → 在 `<head>` 部分注入（读取 references/sdk-loader-template.html 原样插入）
- 无 `Document.tsx` 但有 `index.html` → 与 HTML 项目相同，注入到 index.html `</head>` 前
- 两者都没有 → 提示用户手动添加，并输出 sdk-loader-template.html 内容
```

替换为：

```
检查项目：
- 有 `src/Document.tsx` → 在 `<head>` 部分注入（读取 references/sdk-loader-template.html 原样插入）
- 无 `Document.tsx` → 遍历 `SELECTED_HTML_FILES`，与 HTML 项目相同，注入到每个文件 `</head>` 前
- `SELECTED_HTML_FILES` 为空且无 `Document.tsx` → 提示用户手动添加，并输出 sdk-loader-template.html 内容
```

- [ ] **Step 4：react.md 结果摘要更新**

将 `references/react.md` 第432-433行：

```
| index.html / Document.tsx | ✅ 已注入 SDK-LOADER |
| index.html / Document.tsx | ✅ 已注入微信 JSSDK + URS 登录组件 |
```

替换为：

```
| SELECTED_HTML_FILES 中每个文件 / Document.tsx | ✅ 已注入 SDK-LOADER |
| SELECTED_HTML_FILES 中每个文件 / Document.tsx | ✅ 已注入微信 JSSDK + URS 登录组件 |
```

- [ ] **Step 5：vue.md 1.2 ulink 检测改为遍历**

将 `references/vue.md` 第24行：

```
在 `index.html` 中搜索：
```

替换为：

```
遍历 `SELECTED_HTML_FILES`，在每个文件中搜索：
```

- [ ] **Step 6：vue.md 1.0 注入目标改为遍历**

将 `references/vue.md` 第83行：

```
在 `index.html` 的 `</head>` 标签之前（SDK-LOADER 之前）注入以下脚本。每项按去重规则检查：已存在则跳过，不存在才注入。
```

替换为：

```
遍历 `SELECTED_HTML_FILES`，在每个文件的 `</head>` 标签之前（SDK-LOADER 之前）注入以下脚本。每项按去重规则检查：已存在则跳过，不存在才注入。
```

- [ ] **Step 7：vue.md SDK-LOADER 注入逻辑更新**

将 `references/vue.md` 第102行：

```
注入到 `index.html`（与 HTML 项目相同，注入到 `</head>` 前）。
```

替换为：

```
遍历 `SELECTED_HTML_FILES`，注入到每个文件（与 HTML 项目相同，注入到 `</head>` 前）。
```

- [ ] **Step 8：vue.md 结果摘要更新**

将 `references/vue.md` 第401-402行：

```
| index.html | ✅ 已注入 SDK-LOADER |
| index.html | ✅ 已注入微信 JSSDK + URS 登录组件 |
```

替换为：

```
| SELECTED_HTML_FILES 中每个文件 | ✅ 已注入 SDK-LOADER |
| SELECTED_HTML_FILES 中每个文件 | ✅ 已注入微信 JSSDK + URS 登录组件 |
```

- [ ] **Step 9：提交**

```bash
git add references/react.md references/vue.md
git commit -m "feat(react,vue): 同步 html.md 改造，注入步骤改为遍历 SELECTED_HTML_FILES"
```

---

## Task 4：structure.md — 多 HTML 提取支持

**Files:**
- Modify: `references/structure.md`

**Interfaces:**
- Produces: 多 HTML 文件按源名关联提取到 `src/<name>-style.css` + `src/<name>-game.js`

- [ ] **Step 1：标题和说明改为多 HTML**

将 `references/structure.md` 第3行：

```
将 `index.html` 中内嵌的 CSS 和业务 JS 提取为独立文件，修正引用，并生成 `CLAUDE.md` 记录目录约定。
```

替换为：

```
将所有 HTML 文件中内嵌的 CSS 和业务 JS 提取为独立文件，修正引用，并生成 `CLAUDE.md` 记录目录约定。

**文件命名规则：**
- `index.html` → `src/style.css` + `src/game.js`（保持原名）
- 其他 HTML（如 `page2.html`）→ `src/page2-style.css` + `src/page2-game.js`
- `src/ds.js` 由模式1管理，模式0不触碰
```

- [ ] **Step 2：步骤1 改为扫描所有 HTML**

将 `references/structure.md` 第7-13行：

```
## 步骤 1：Read index.html（1次工具调用）

- 若当前目录下不存在 `index.html` → 立即中止，输出：
  ```
  ❌ 未找到 index.html，无法执行 MODE 0，请在 H5 项目根目录下运行。
  ```
- 使用 Read 工具读取 `index.html` 全文，载入内存。后续所有分析和构建均在内存中完成，**不再调用额外的 Read 工具**。
```

替换为：

```
## 步骤 1：扫描并读取所有 HTML 文件

- 扫描项目根目录所有 `.html` 文件（排除 `node_modules`、`dist`）
- 若无任何 HTML 文件 → 立即中止，输出：
  ```
  ❌ 未找到 HTML 文件，无法执行 MODE 0，请在 H5 项目根目录下运行。
  ```
- **若只有 `index.html`** → 行为不变，读取 `index.html` 全文，提取到 `src/style.css` + `src/game.js`
- **若有多个 HTML 文件** → 逐个读取每个 HTML 文件全文，按命名规则分别提取：
  - `index.html` → `src/style.css` + `src/game.js`
  - `<name>.html` → `src/<name>-style.css` + `src/<name>-game.js`
- 后续步骤2-4对每个 HTML 文件独立执行
```

- [ ] **Step 3：步骤2 内存分析改为逐文件**

将 `references/structure.md` 第19行：

```
在内存中分析 `index.html` 全文，找出：
```

替换为：

```
对每个 HTML 文件，在内存中分析其全文，找出：
```

- [ ] **Step 4：步骤3 构建输出改为按文件名命名**

将 `references/structure.md` 第41行：

```
**`new_html`（修改后的 index.html）：**
```

替换为：

```
**`new_html`（修改后的 HTML 文件，对每个文件独立构建）：**

> 对于 `index.html`，提取的 CSS 写入 `src/style.css`，JS 写入 `src/game.js`。
> 对于其他 HTML（如 `page2.html`），提取的 CSS 写入 `src/page2-style.css`，JS 写入 `src/page2-game.js`。
```

- [ ] **Step 5：步骤3 link/script 引用改为按文件名命名**

将 `references/structure.md` 第44-52行中的：

```
   ```html
   <link rel="stylesheet" href="src/style.css">
   ```
   若不存在 `</head>` → 追加到文件末尾，并标记警告
4. 在 `</body>` 之前插入：
   ```html
   <script type="module" src="src/game.js"></script>
   ```
```

替换为：

```
   ```html
   <link rel="stylesheet" href="src/style.css">
   ```
   （对于其他 HTML 如 `page2.html`，改为 `href="src/page2-style.css"`）
   若不存在 `</head>` → 追加到文件末尾，并标记警告
4. 在 `</body>` 之前插入：
   ```html
   <script type="module" src="src/game.js"></script>
   ```
   （对于其他 HTML 如 `page2.html`，改为 `src="src/page2-game.js"`）
```

- [ ] **Step 6：步骤3 style_css/game_js 变量说明更新**

将 `references/structure.md` 第64行：

```
**`style_css`（提取的 CSS 内容）：**
- 检查 `src/style.css` 是否已存在（用 Read 工具读取，若报错则视为不存在）
```

替换为：

```
**`style_css`（提取的 CSS 内容，按文件名对应）：**
- 对于 `index.html`：检查 `src/style.css` 是否已存在
- 对于其他 HTML（如 `page2.html`）：检查 `src/page2-style.css` 是否已存在
- 用 Read 工具读取对应文件，若报错则视为不存在
```

将第75行：

```
**`game_js`（提取的 JS 内容）：**
- 检查 `src/game.js` 是否已存在（用 Read 工具读取，若报错则视为不存在）
```

替换为：

```
**`game_js`（提取的 JS 内容，按文件名对应）：**
- 对于 `index.html`：检查 `src/game.js` 是否已存在
- 对于其他 HTML（如 `page2.html`）：检查 `src/page2-game.js` 是否已存在
- 用 Read 工具读取对应文件，若报错则视为不存在
```

- [ ] **Step 7：步骤4 写入逻辑更新**

将 `references/structure.md` 第92-97行：

```
**写入（最多 4 次工具调用）：**

1. 若 `src/` 目录不存在 → 用 Bash 工具执行 `mkdir -p src/` 创建目录
2. `Write` → `index.html`（写入 `new_html`）
3. `Write` → `src/style.css`（写入 `style_css`）
4. `Write` → `src/game.js`（写入 `game_js`）
```

替换为：

```
**写入（对每个 HTML 文件执行）：**

1. 若 `src/` 目录不存在 → 用 Bash 工具执行 `mkdir -p src/` 创建目录
2. 对每个 HTML 文件：
   - `Write` → `[文件名].html`（写入该文件的 `new_html`）
   - `Write` → `src/[对应名]-style.css`（写入该文件的 `style_css`）
   - `Write` → `src/[对应名]-game.js`（写入该文件的 `game_js`）
   - `index.html` 对应 `src/style.css` + `src/game.js`（无前缀）
```

- [ ] **Step 8：步骤4 摘要更新**

将 `references/structure.md` 第113-119行：

```
| src/style.css | ✅ 已创建（从 index.html 提取 N 行） |
| src/game.js   | ✅ 已创建（从 index.html 提取 N 行） |
| index.html    | ✅ 已更新：移除内嵌块，添加 <link> 和 <script type="module" src> 引用 |
```

替换为：

```
| src/style.css | ✅ 已创建（从 index.html 提取 N 行） |
| src/game.js   | ✅ 已创建（从 index.html 提取 N 行） |
| index.html    | ✅ 已更新：移除内嵌块，添加 <link> 和 <script type="module" src> 引用 |
| src/page2-style.css | ✅ 已创建（从 page2.html 提取 N 行）（如有多个 HTML） |
| src/page2-game.js   | ✅ 已创建（从 page2.html 提取 N 行）（如有多个 HTML） |
| page2.html    | ✅ 已更新（如有多个 HTML） |
```

- [ ] **Step 9：步骤5 window 桥接检测改为遍历**

将 `references/structure.md` 第134行：

```
**① 扫描 `index.html`，提取 inline handler 中直接调用的函数名（集合 A）：**
```

替换为：

```
**① 遍历所有 HTML 文件，提取每个文件 inline handler 中直接调用的函数名（集合 A）：**
```

将第139行：

```
**② 扫描 `game.js`，提取函数声明（集合 B），并记录每个函数的定义位置：**
```

替换为：

```
**② 遍历所有提取出的 `*-game.js` 文件，提取函数声明（集合 B），并记录每个函数的定义位置：**
```

- [ ] **Step 10：步骤6 CLAUDE.md 目录约定更新**

将 `references/structure.md` 第225-231行（新建 CLAUDE.md 的目录结构块）：

```
```
index.html      # 主入口，只保留 HTML 结构和外链引用，不内嵌样式或脚本
src/
  style.css     # 所有页面样式（从 index.html 提取，勿在 index.html 中新增 <style>）
  game.js       # 游戏/活动业务逻辑脚本（从 index.html 提取，勿在 index.html 中新增内嵌 <script>）
  ds.js         # 大神平台业务注入，由 /ds-act-workflow 工具管理，勿手动修改
```
```

替换为：

```
```
index.html          # 主入口，只保留 HTML 结构和外链引用，不内嵌样式或脚本
page2.html          # 次级页面（如有多个 HTML）
src/
  style.css         # index.html 的样式（勿在 index.html 中新增 <style>）
  game.js           # index.html 的业务逻辑（勿在 index.html 中新增内嵌 <script>）
  page2-style.css   # page2.html 的样式（如有多个 HTML）
  page2-game.js     # page2.html 的业务逻辑（如有多个 HTML）
  ds.js             # 大神平台业务注入，由 /ds-act-workflow 工具管理，勿手动修改
```
```

- [ ] **Step 11：步骤6 CLAUDE.md 加载顺序说明更新**

将 `references/structure.md` 第235行：

```
index.html 中脚本必须按以下顺序加载，否则业务逻辑会因依赖未就绪而失效：
```

替换为：

```
每个 HTML 文件中脚本必须按以下顺序加载，否则业务逻辑会因依赖未就绪而失效：
```

将第239行：

```
3. `src/game.js` — 游戏/活动业务逻辑（必须在 ds.js 之后）
```

替换为：

```
3. `src/game.js`（或 `src/<name>-game.js`）— 该页面对应的业务逻辑（必须在 ds.js 之后）
```

- [ ] **Step 12：步骤6 CLAUDE.md 追加块同步更新**

将 `references/structure.md` 第316-322行（追加 CLAUDE.md 的目录结构块）同步替换为与 Step 10 相同的多 HTML 目录结构。

将第326行：

```
index.html 中脚本必须按以下顺序加载，否则业务逻辑会因依赖未就绪而失效：
```

替换为：

```
每个 HTML 文件中脚本必须按以下顺序加载，否则业务逻辑会因依赖未就绪而失效：
```

将第330行：

```
3. `src/game.js` — 游戏/活动业务逻辑（必须在 ds.js 之后）
```

替换为：

```
3. `src/game.js`（或 `src/<name>-game.js`）— 该页面对应的业务逻辑（必须在 ds.js 之后）
```

- [ ] **Step 13：提交**

```bash
git add references/structure.md
git commit -m "feat(structure): 支持多 HTML 提取，文件按源 HTML 名关联命名"
```

---

## Task 5：audit.md — 审查范围改为 DS Marker 检测

**Files:**
- Modify: `references/audit.md`

**Interfaces:**
- Produces: 审查范围自动检测机制（扫描含 `<!-- [DS:SDK-LOADER:START] -->` 的 HTML 文件）

- [ ] **Step 1：步骤1 审查目标文件改为 DS Marker 检测**

将 `references/audit.md` 第3-23行替换为：

```markdown
### 步骤 1：确定审查目标文件

**1a. 自动检测含 DS Marker 的 HTML 文件：**

扫描项目根目录所有 `.html` 文件（排除 `node_modules`、`dist`），检测是否含 `<!-- [DS:SDK-LOADER:START] -->` marker。含 marker 的文件视为"已接入大神"，纳入审查范围。

输出检测到的页面清单：

```
## 审查范围检测

扫描到以下含 DS Marker 的 HTML 文件：

  [✅] index.html
  [✅] page2.html

将依次对以上文件执行审查。
```

**1b. 审查分两类文件范围：**

**A. DS 注入文件**（用于 Marker 结构校验）：

| 框架 | 审查文件 |
|---|---|
| HTML | 所有含 DS Marker 的 HTML 文件、`src/ds.js` |
| React | 所有含 DS Marker 的 HTML 文件（或 `src/Document.tsx`）、`src/ds.d.ts`、`src/hooks/useDsInit.ts`、`src/hooks/useNsLog.ts`、`src/hooks/useDsShare.ts`、`src/hooks/useDsUlink.ts` |
| Vue | 所有含 DS Marker 的 HTML 文件、`src/ds.d.ts`、`src/composables/useDsInit.ts`、`src/composables/useNsLog.ts`、`src/composables/useDsShare.ts`、`src/composables/useDsUlink.ts` |

**B. 全局业务代码文件**（用于重复逻辑检测和点击预检检查）：

| 框架 | 扫描范围 |
|---|---|
| HTML | `src/` 下所有 `.js` 文件 |
| React | `src/` 下所有 `.js`、`.ts`、`.jsx`、`.tsx` 文件 |
| Vue | `src/` 下所有 `.js`、`.ts`、`.vue` 文件 |

逐个读取 DS 注入文件。全局业务代码文件在步骤 4.5 中按需扫描。
```

- [ ] **Step 2：步骤4 HTML 安全审查改为遍历**

将 `references/audit.md` 第48行：

```
对 `index.html`（以及所有注入了 SDK-LOADER 的 HTML 文件）调用 `/html-security-scan` 技能。
```

替换为：

```
对所有含 DS Marker 的 HTML 文件调用 `/html-security-scan` 技能。
```

- [ ] **Step 3：步骤4.5.3 mini-game-data-sdk 检测改为遍历**

将 `references/audit.md` 第71行：

```
  扫描 `index.html`，检查是否同时存在以下两行（顺序：CSS 在前、JS 在后）：
```

替换为：

```
  遍历所有含 DS Marker 的 HTML 文件，检查每个文件中是否同时存在以下两行（顺序：CSS 在前、JS 在后）：
```

- [ ] **Step 4：步骤6 注入结果摘要更新**

将 `references/audit.md` 第198行：

```
| index.html | ✅ 已注入 SDK-LOADER |
```

替换为：

```
| 所有含 DS Marker 的 HTML 文件 | ✅ 已注入 SDK-LOADER |
```

- [ ] **Step 5：提交**

```bash
git add references/audit.md
git commit -m "feat(audit): 审查范围改为自动检测 DS Marker，安全审查遍历所有含 Marker 文件"
```

---

## Task 6：audit-rules.md — 硬编码改为遍历 + 容器检查特殊处理

**Files:**
- Modify: `references/audit-rules.md`

**Interfaces:**
- Consumes: DS Marker 检测机制（来自 Task 5）

- [ ] **Step 1：Cocos mobile-share 检查改为遍历**

将 `references/audit-rules.md` 第59行：

```
- [ ] **IF `IS_COCOS = true`：** `initShare` 中非 Godlike / 非小程序分支为 no-op（直接 return 或 `else if (!IS_COCOS)` 跳过 MobileShare）；`index.html` 中 SDK-LOADER 未加载 `mobile-share.min.js`（若检测到 mobile-share 注入则阻断：会污染 `window.wx` 导致 Cocos 引擎误判为微信小游戏）
```

替换为：

```
- [ ] **IF `IS_COCOS = true`：** `initShare` 中非 Godlike / 非小程序分支为 no-op（直接 return 或 `else if (!IS_COCOS)` 跳过 MobileShare）；遍历所有含 DS Marker 的 HTML 文件，SDK-LOADER 未加载 `mobile-share.min.js`（若检测到 mobile-share 注入则阻断：会污染 `window.wx` 导致 Cocos 引擎误判为微信小游戏）
```

- [ ] **Step 2：script type 检查改为遍历**

将 `references/audit-rules.md` 第101行：

```
扫描 `index.html` 中**全部 `<script>` 标签**，每一个标签都必须明确指定 `type` 属性，不允许省略：
```

替换为：

```
遍历所有含 DS Marker 的 HTML 文件，扫描每个文件中**全部 `<script>` 标签**，每一个标签都必须明确指定 `type` 属性，不允许省略：
```

- [ ] **Step 3：mini-game-data-sdk 版本检查改为遍历**

将 `references/audit-rules.md` 第196行：

```
- [ ] **`mini-game-data-sdk` 版本检查**：当前最新版本为 `0.0.9`。扫描 `index.html` 中的 CDN 地址，若低于 `0.0.9`，输出提示引导升级：`⚠️ mini-game-data-sdk 当前版本为 x.x.x，最新版本为 0.0.9，建议升级：将 CDN 地址中的版本号替换为 0.0.9`
```

替换为：

```
- [ ] **`mini-game-data-sdk` 版本检查**：当前最新版本为 `0.0.9`。遍历所有含 DS Marker 的 HTML 文件中的 CDN 地址，任一文件版本低于 `0.0.9`，输出提示引导升级：`⚠️ mini-game-data-sdk 当前版本为 x.x.x，最新版本为 0.0.9，建议升级：将 CDN 地址中的版本号替换为 0.0.9`
```

- [ ] **Step 4：HTML 安全审查改为遍历**

将 `references/audit-rules.md` 第254行：

```
DS Marker 结构校验完成后，对 `index.html` 及所有注入产物执行 HTML 安全审查。
```

替换为：

```
DS Marker 结构校验完成后，对所有含 DS Marker 的 HTML 文件及所有注入产物执行 HTML 安全审查。
```

- [ ] **Step 5：微信 JSSDK 检查改为遍历**

将 `references/audit-rules.md` 第312行：

```
- [ ] `index.html` 中微信 JSSDK 已注入（`jweixin-1.6.0.js`），且位于 `ds.js` 之前
```

替换为：

```
- [ ] 每个含 DS Marker 的 HTML 文件中微信 JSSDK 已注入（`jweixin-1.6.0.js`），且位于 `ds.js` 之前
```

- [ ] **Step 6：URS Cookie 联登检查改为遍历**

将 `references/audit-rules.md` 第317行：

```
- [ ] `index.html` 中 `universal-login` CSS + JS 已注入，且位于 `ds.js` 之前
```

替换为：

```
- [ ] 每个含 DS Marker 的 HTML 文件中 `universal-login` CSS + JS 已注入，且位于 `ds.js` 之前
```

- [ ] **Step 7：导航栏 CSS/JS 检查改为遍历**

将 `references/audit-rules.md` 第347-348行：

```
- [ ] `index.html` 中导航栏 CSS 已注入：`ds.res.netease.com/online/pkg/ds-navigation-mini-program-bar/0.0.4/index.css`，使用 `<link rel="stylesheet">`
- [ ] `index.html` 中导航栏 JS 已注入：`ds.res.netease.com/online/pkg/ds-navigation-mini-program-bar/0.0.4/index.js`，使用 `type="text/javascript"`（UMD 格式，**禁止** `type="module"`）
```

替换为：

```
- [ ] 每个含 DS Marker 的 HTML 文件中导航栏 CSS 已注入：`ds.res.netease.com/online/pkg/ds-navigation-mini-program-bar/0.0.4/index.css`，使用 `<link rel="stylesheet">`
- [ ] 每个含 DS Marker 的 HTML 文件中导航栏 JS 已注入：`ds.res.netease.com/online/pkg/ds-navigation-mini-program-bar/0.0.4/index.js`，使用 `type="text/javascript"`（UMD 格式，**禁止** `type="module"`）
```

- [ ] **Step 8：容器检查改为按需检测**

将 `references/audit-rules.md` 第417-418行：

```
- [ ] 若代码含 `sdk.TaskModule.evoke(`，`index.html` 中存在 `id="ds-task-root"` 容器 → 缺失即**阻断**
- [ ] 若代码含 `sdk.CpsUniversalBar.evoke(`，`index.html` 中存在 `id="ds-cps-bar-root"` 容器 → 缺失即**阻断**
```

替换为：

```
- [ ] 若某页面引用的 JS 中含 `sdk.TaskModule.evoke(`，该页面 HTML 中存在 `id="ds-task-root"` 容器 → 缺失即**阻断**（按页面粒度检查，非每个页面都需要）
- [ ] 若某页面引用的 JS 中含 `sdk.CpsUniversalBar.evoke(`，该页面 HTML 中存在 `id="ds-cps-bar-root"` 容器 → 缺失即**阻断**（按页面粒度检查，非每个页面都需要）
```

- [ ] **Step 9：ds-act-sdk 加载顺序检查改为遍历**

将 `references/audit-rules.md` 第422行：

```
- [ ] `ds-act-sdk.min.css` 和 `ds-act-sdk.min.js` 的 `<link>` / `<script>` 标签存在于 `index.html` → 缺失即**阻断**
```

替换为：

```
- [ ] 遍历所有含 DS Marker 的 HTML 文件，`ds-act-sdk.min.css` 和 `ds-act-sdk.min.js` 的 `<link>` / `<script>` 标签存在于需要 ds-act-sdk 的页面中 → 缺失即**阻断**
```

- [ ] **Step 10：ds-act-sdk 版本检查改为遍历**

将 `references/audit-rules.md` 第425行：

```
- [ ] **`ds-act-sdk` 版本检查**：当前最新版本为 `0.1.1`。扫描 `index.html` 中的 CDN 地址，若低于 `0.1.1`，输出提示引导升级：`⚠️ ds-act-sdk 当前版本为 x.x.x，最新版本为 0.1.1，建议升级：将 CDN 地址中的版本号替换为 0.1.1`
```

替换为：

```
- [ ] **`ds-act-sdk` 版本检查**：当前最新版本为 `0.1.1`。遍历所有含 DS Marker 的 HTML 文件中的 CDN 地址，任一文件版本低于 `0.1.1`，输出提示引导升级：`⚠️ ds-act-sdk 当前版本为 x.x.x，最新版本为 0.1.1，建议升级：将 CDN 地址中的版本号替换为 0.1.1`
```

- [ ] **Step 11：提交**

```bash
git add references/audit-rules.md
git commit -m "feat(audit-rules): 15处 index.html 硬编码改为遍历 DS Marker 文件，容器检查改为按需检测"
```

---

## Task 7：ds-act-sdk.md + act-task.md + act-cps-bar.md — 页面选择 + 容器遍历

**Files:**
- Modify: `references/ds-act-sdk.md`
- Modify: `references/act-task.md`
- Modify: `references/act-cps-bar.md`

**Interfaces:**
- Produces: `ACT_SDK_HTML_FILES` 变量（模式6独立选择，候选为含 DS Marker 的文件）

- [ ] **Step 1：ds-act-sdk.md 步骤1 前置检查改为遍历**

将 `references/ds-act-sdk.md` 第15行：

```
在 `index.html` 和 `src/` 中搜索 `ds-act-sdk` / `DsActSdk`：
```

替换为：

```
在所有含 DS Marker 的 HTML 文件和 `src/` 中搜索 `ds-act-sdk` / `DsActSdk`：
```

- [ ] **Step 2：ds-act-sdk.md 新增步骤1.5 页面选择**

在 `references/ds-act-sdk.md` 第19行（步骤1结束的 `---` 之后）插入：

```markdown

## 步骤 1.5：HTML 页面选择（新增）

扫描所有含 DS Marker 的 HTML 文件（即已通过模式1接入大神的页面）。

**若只有 1 个含 DS Marker 的 HTML 文件**：
- `ACT_SDK_HTML_FILES = [该文件]`
- 静默跳过，不询问用户

**若有多个含 DS Marker 的 HTML 文件**：

```
## HTML 页面选择

检测到以下含 DS Marker 的 HTML 文件：

  [✅] index.html（默认）
  [ ] page2.html
  [ ] result.html

请输入需要接入 ds-act-sdk 的页面（回车确认默认，或输入文件名，逗号分隔）：
```

用户确认后，记录为 `ACT_SDK_HTML_FILES`。

> **注意：** 候选为含 DS Marker 的文件，而非所有 HTML 文件。ds-act-sdk 依赖 SDK-LOADER 已就位。
```

- [ ] **Step 3：ds-act-sdk.md 步骤2 SDK 资源注入改为遍历**

将 `references/ds-act-sdk.md` 第26行：

```
在 `index.html` 的 `<head>` 末尾（SDK-LOADER 块之后）追加，确保在 `src/ds.js` 加载之前就位：
```

替换为：

```
遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `<head>` 末尾（SDK-LOADER 块之后）追加，确保在 `src/ds.js` 加载之前就位：
```

- [ ] **Step 4：ds-act-sdk.md 步骤7 结果摘要更新**

将 `references/ds-act-sdk.md` 第264行：

```
| index.html | ✅ 注入 ds-act-sdk CSS/JS |
```

替换为：

```
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 注入 ds-act-sdk CSS/JS |
```

将第267-268行：

```
| index.html | ✅ 添加 #ds-task-root 容器（A：任务面板） |
| index.html | ✅ 添加 #ds-task-entry-btn 按钮（A：任务面板，仅 A 模式） |
```

替换为：

```
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 添加 #ds-task-root 容器（A：任务面板） |
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 添加 #ds-task-entry-btn 按钮（A：任务面板，仅 A 模式） |
```

将第272行：

```
| index.html | ✅ 添加 #ds-cps-bar-root 容器（C：CPS 通用悬浮栏） |
```

替换为：

```
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 添加 #ds-cps-bar-root 容器（C：CPS 通用悬浮栏） |
```

- [ ] **Step 5：act-task.md 容器注入改为遍历**

将 `references/act-task.md` 第40行：

```
在 `index.html` 的 `</body>` 前插入容器（A 模式还需插入按钮）：
```

替换为：

```
遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入容器（A 模式还需插入按钮）：
```

- [ ] **Step 6：act-cps-bar.md 容器注入改为遍历**

将 `references/act-cps-bar.md` 第14行：

```
在 `index.html` 的 `</body>` 前插入挂载容器：
```

替换为：

```
遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入挂载容器：
```

- [ ] **Step 7：提交**

```bash
git add references/ds-act-sdk.md references/act-task.md references/act-cps-bar.md
git commit -m "feat(ds-act-sdk): 新增步骤1.5页面选择，容器注入改为遍历 ACT_SDK_HTML_FILES"
```

---

## Task 8：game-storage.md + game-log.md + server-storage — 扫描范围 + 引用注入改造

**Files:**
- Modify: `references/game-storage.md`
- Modify: `references/game-log.md`
- Modify: `references/server-storage/02-best-practices.md`
- Modify: `references/server-storage/99-api-reference.md`

**Interfaces:**
- Consumes: DS Marker 检测机制

- [ ] **Step 1：game-storage.md 步骤4.2 改为遍历 + 补 type="module"**

将 `references/game-storage.md` 第232-244行：

```
**4.2 修改 index.html，添加 script 引用**

在 `index.html` 中，找到业务脚本的第一个 `<script src>` 引用之前，插入：

```html
<script src="game-storage.js"></script>
```

若 `game-storage.js` 生成在 `src/` 下，则引用改为：

```html
<script src="src/game-storage.js"></script>
```
```

替换为：

```
**4.2 遍历含 DS Marker 的 HTML 文件，添加 script 引用**

新增页面选择步骤（同模式6，候选为含 DS Marker 的文件），用户选择后遍历注入。

在每个选中的 HTML 文件中，找到业务脚本的第一个 `<script src>` 引用之前，插入：

```html
<script type="module" src="game-storage.js"></script>
```

若 `game-storage.js` 生成在 `src/` 下，则引用改为：

```html
<script type="module" src="src/game-storage.js"></script>
```
```

- [ ] **Step 2：game-storage.md 步骤4.4 结果摘要更新**

将 `references/game-storage.md` 第261行：

```
| index.html | 新增 <script src="game-storage.js"> 引用 |
```

替换为：

```
| 选中文件每个 | 新增 <script type="module" src="game-storage.js"> 引用 |
```

- [ ] **Step 3：game-log.md 扫描范围改为含 DS Marker**

将 `references/game-log.md` 第22行：

```
| HTML | `src/` 下所有 `.js`、`.ts` 文件 + `index.html` 中的内联 `<script>` 脚本；若无 `src/` 目录则扫当前目录所有 `.js`、`.ts` 文件（排除 `node_modules`、`.git`） |
```

替换为：

```
| HTML | `src/` 下所有 `.js`、`.ts` 文件 + 所有含 DS Marker 的 HTML 文件中的内联 `<script>` 脚本；若无 `src/` 目录则扫当前目录所有 `.js`、`.ts` 文件（排除 `node_modules`、`.git`） |
```

- [ ] **Step 4：server-storage/02-best-practices.md 步骤3.3 改为遍历**

将 `references/server-storage/02-best-practices.md` 第290-292行：

```
## 3.3 index.html 引用注入

在 `index.html` 中，确保引入顺序：
```

替换为：

```
## 3.3 HTML 引用注入

新增页面选择步骤（同模式6，候选为含 DS Marker 的文件），用户选择后遍历注入。

在每个选中的 HTML 文件中，确保引入顺序：
```

- [ ] **Step 5：server-storage/99-api-reference.md 改为遍历**

将 `references/server-storage/99-api-reference.md` 第28行：

```
在 `index.html` 的 `<head>` 中按顺序添加（CSS 在前，JS 在后）：
```

替换为：

```
遍历选中的 HTML 文件（候选为含 DS Marker 的文件），在每个文件的 `<head>` 中按顺序添加（CSS 在前，JS 在后）：
```

- [ ] **Step 6：提交**

```bash
git add references/game-storage.md references/game-log.md references/server-storage/02-best-practices.md references/server-storage/99-api-reference.md
git commit -m "feat(game-storage,game-log,server-storage): 扫描范围改为含 DS Marker 文件，引用注入改为遍历"
```

---

## Task 9：miniapp.md + miniapp-h5-integration.md — deprecated 文件同步改造

**Files:**
- Modify: `references/miniapp.md`
- Modify: `references/miniapp-h5-integration.md`

**Interfaces:**
- Consumes: `SELECTED_HTML_FILES`（来自 Task 1）

- [ ] **Step 1：miniapp.md 微信 JSSDK 注入改为遍历**

将 `references/miniapp.md` 第55行：

```
**3.2 在 `index.html` 的 `<head>` 中注入微信 JSSDK，位置须在 `src/ds.js` 的 `<script>` 引用之前：**
```

替换为：

```
**3.2 遍历 `SELECTED_HTML_FILES`，在每个文件的 `<head>` 中注入微信 JSSDK，位置须在 `src/ds.js` 的 `<script>` 引用之前：**
```

- [ ] **Step 2：miniapp.md universal-login 注入改为遍历**

将 `references/miniapp.md` 第140行：

```
**5.1 在 `index.html` 注入 universal-login，位置须在 `src/ds.js` 的 `<script>` 引用之前：**
```

替换为：

```
**5.1 遍历 `SELECTED_HTML_FILES`，在每个文件注入 universal-login，位置须在 `src/ds.js` 的 `<script>` 引用之前：**
```

- [ ] **Step 3：miniapp.md 结果摘要更新**

将 `references/miniapp.md` 第245行：

```
| index.html | ✅ 注入微信 JSSDK + universal-login |
```

替换为：

```
| SELECTED_HTML_FILES 中每个文件 | ✅ 注入微信 JSSDK + universal-login |
```

- [ ] **Step 4：miniapp-h5-integration.md 注入改为遍历**

将 `references/miniapp-h5-integration.md` 第11行：

```
在 `index.html` 的 `<head>` 中直接注入，所有小程序能力依赖此脚本：
```

替换为：

```
遍历 `SELECTED_HTML_FILES`，在每个文件的 `<head>` 中直接注入，所有小程序能力依赖此脚本：
```

将第48行：

```
- 在 `index.html` 注入 `universal-login` CDN：
```

替换为：

```
- 遍历 `SELECTED_HTML_FILES`，在每个文件注入 `universal-login` CDN：
```

- [ ] **Step 5：提交**

```bash
git add references/miniapp.md references/miniapp-h5-integration.md
git commit -m "feat(miniapp): deprecated 文件同步改造，注入步骤改为遍历 SELECTED_HTML_FILES"
```

---

## Task 10：最终验证 — 全文搜索残留 index.html 硬编码

**Files:**
- 无文件修改（验证任务）

- [ ] **Step 1：搜索所有模板文件中残留的操作型 index.html 硬编码**

运行搜索：在 `references/` 目录下搜索 `index.html`，排除以下合理场景：
- 文档说明（如"Cocos web-mobile 部署到 CDN 时需要根目录原样结构（index.html + 引擎 JS）"）
- 构建产物路径（如 `dist/index.html`）
- 示例中的文件名（如"如 `index.html`"）
- CLAUDE.md 目录约定中的 `index.html # 主入口`

预期：所有操作型硬编码（"注入到 index.html"、"检查 index.html"、"在 index.html 中"）均已改为遍历 `SELECTED_HTML_FILES` 或 DS Marker 检测。

- [ ] **Step 2：验证单 HTML 向后兼容**

通读改造后的 `inject.md` 步骤0.5，确认：
- 只有 1 个 HTML 文件时 `SELECTED_HTML_FILES = ["index.html"]`，静默跳过
- 后续步骤遍历 `["index.html"]` 等价于原行为

- [ ] **Step 3：验证模式2 DS Marker 检测独立性**

通读改造后的 `audit.md` 步骤1，确认：
- 不依赖 `SELECTED_HTML_FILES`
- 独立扫描 `<!-- [DS:SDK-LOADER:START] -->` marker
- 手动复制 SDK-LOADER 到其他页面的场景能被覆盖

- [ ] **Step 4：验证模式5/6 候选列表为含 DS Marker 的文件**

通读改造后的 `ds-act-sdk.md` 步骤1.5 和 `game-storage.md` 步骤4.2，确认：
- 候选列表来源是"含 DS Marker 的 HTML 文件"
- 非所有 HTML 文件
- 单文件时静默跳过

- [ ] **Step 5：验证模式0 文件命名规则**

通读改造后的 `structure.md`，确认：
- `index.html` → `src/style.css` + `src/game.js`（无前缀）
- `page2.html` → `src/page2-style.css` + `src/page2-game.js`（有前缀）
- CLAUDE.md 目录约定和加载顺序说明已更新

- [ ] **Step 6：提交验证记录**

```bash
git log --oneline  # 确认所有 Task 的提交都在
git diff staging..HEAD --stat  # 确认变更文件清单与设计文档一致
```

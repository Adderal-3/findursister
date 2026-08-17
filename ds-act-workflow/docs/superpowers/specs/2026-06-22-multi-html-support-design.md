# 设计文档：多 HTML 项目注入与审查支持

**日期：** 2026-06-22
**状态：** 待审核

---

## 背景

当前 `ds-act-workflow` skill 的所有模式均假设单 HTML 入口项目，约 50 处硬编码 `index.html` 作为操作目标。对于多 HTML 项目（如 `index.html` + `page2.html` + `result.html`），只有 `index.html` 会被注入大神业务代码，其他页面无法获得 SDK-LOADER、ds.js 引用、导航栏组件等资源，导致功能缺失。

---

## 目标

1. 模式1（注入）：支持向多个 HTML 页面注入 SDK-LOADER、第三方依赖、ds.js 引用、导航栏偏移 CSS
2. 模式0（规范目录结构）：支持从多个 HTML 文件提取内嵌 CSS/JS，文件按源 HTML 名关联
3. 模式2（审查）：自动检测含 DS Marker 的 HTML 文件，全部纳入审查
4. 模式5（数据持久化）/模式6（ds-act-sdk）：每模式独立选择注入页面，候选限定为含 DS Marker 的文件
5. 模式4（埋点）：扫描范围改为所有含 DS Marker 的 HTML 文件
6. 模式3（构建打包）：自动包含所有 HTML，无需改造

---

## 不变的内容

- `src/ds.js` 只生成一份，所有页面共享引用，CONFIG 块配置统一
- 模式1 步骤1-2（框架检测 + 模块选择）不变
- 模式1 步骤3.5（导航栏配置收集）不变——配置收集一次，统一用于所有选中页面
- 模式1 步骤6（click handler 修复）不变——已扫描所有 `.js` 文件
- 模式1 步骤7（注入后审查）不变——调用 audit.md，audit 自身检测覆盖范围
- 模式3（构建打包）不变——无 `index.html` 硬编码操作
- `ds-js-template.js` 不变
- `sdk-loader-template.html` 不变
- 单 HTML 项目行为完全不变（向后兼容）

---

## 变更详情

### 1. 核心机制——页面选择清单

#### 1.1 新增变量 `SELECTED_HTML_FILES`

在模式1步骤0（项目探索）之后，新增**步骤0.5：HTML 页面选择**：

1. 扫描项目根目录所有 `.html` 文件（排除 `node_modules`、`dist`）
2. **若只有 1 个 HTML 文件**（即 `index.html`）→ `SELECTED_HTML_FILES = ["index.html"]`，静默跳过，不询问
3. **若有多个 HTML 文件** → 输出清单，`index.html` 默认勾选 ✅，其他默认未勾选 ☐，询问用户选择

```
## HTML 页面选择

检测到以下 HTML 文件：

  [✅] index.html（默认）
  [ ] page2.html
  [ ] result.html

请输入需要注入大神业务代码的页面（回车确认默认，或输入文件名，逗号分隔）：
> index.html, page2.html
```

用户确认后，记录为 `SELECTED_HTML_FILES = ["index.html", "page2.html"]`。

#### 1.2 变量贯穿范围

| 模式/步骤 | 使用方式 |
|-----------|----------|
| 模式1 步骤3（SDK-LOADER注入） | 遍历 `SELECTED_HTML_FILES`，每个文件注入 SDK-LOADER + 第三方依赖 |
| 模式1 步骤3.6（导航栏偏移CSS） | 遍历注入 |
| 模式1 步骤5（ds.js引用） | 遍历注入 `<script type="module" src="/src/ds.js">` |
| 模式1 步骤6（click handler修复） | 扫描范围不变（已是所有 .js 文件） |
| 模式2（审查） | **不使用此变量**，改为自动检测 DS Marker |
| 模式5/6 | 每模式独立选择页面 |

#### 1.3 模式2的独立机制

模式2不依赖 `SELECTED_HTML_FILES`，而是自动扫描所有 `.html` 文件，检测是否含 `<!-- [DS:SDK-LOADER:START] -->` marker，含 marker 的文件才审查。这保证审查与注入解耦——即使手动复制了 SDK-LOADER 到其他页面，审查也能覆盖。

---

### 2. 模式1（inject）各步骤改造

#### 2.1 步骤0（项目探索）——扩展扫描范围

- **大神相关文件检测**：不变（已扫 `src/ds.ts`、`src/ds.js`、所有含大神 API 的文件）
- **ulink 脚本检测**：从"只扫 index.html"改为"扫所有 `.html` 文件"，报告每个文件中的旧 ulink 脚本位置
- **点击事件检测**：不变（已扫所有 `.js` 文件）

探索报告新增"检测到的 HTML 文件"清单，为步骤0.5做铺垫。

#### 2.2 步骤0.5（新增）——HTML 页面选择

如第1段所述，扫描所有 `.html` 文件，用户勾选，生成 `SELECTED_HTML_FILES`。单 HTML 文件时静默跳过。

#### 2.3 步骤3（游戏圈子询问）——小调整

`SHARE_TITLE` / `SHARE_DESC` 的自动提取：当前从 `index.html` 的 `<title>` 和 `<meta>` 提取。改为从 `SELECTED_HTML_FILES[0]`（即 index.html）提取，保持一致。

#### 2.4 步骤3.6（导航栏偏移CSS）——遍历注入

当前：追加到 `index.html` 的 `<style>` 块。

改为：遍历 `SELECTED_HTML_FILES`，每个文件的 `<style>` 块末尾追加 `padding-top: var(--ds-total-mini-program-bar-height)`。若文件无 `<style>` 块则新建。

#### 2.5 步骤4（重复逻辑清理）——遍历清理

当前：清理 `index.html` 中的旧 ulink 脚本。

改为：遍历 `SELECTED_HTML_FILES`，清理每个文件中的旧 ulink 脚本块。清理报告列出每个文件的清理状态。

#### 2.6 步骤5（代码生成）——模板文件改造重点

以 `html.md` 为例：

| 子步骤 | 当前 | 改造后 |
|--------|------|--------|
| 4-HTML-2（重复逻辑清理） | `如果在 index.html 中发现旧 ulink` | `遍历 SELECTED_HTML_FILES，在每个文件中检测并清理` |
| 4-HTML-3（SDK-LOADER注入） | `注入到 index.html <head>` | `遍历 SELECTED_HTML_FILES，每个文件 </head> 前注入` |
| 4-HTML-3（SEO标签去重） | `检查 index.html 中是否已存在` | `逐文件检查去重` |
| 4-HTML-4（生成ds.js） | 不变（ds.js 只生成一份） | 不变 |
| 4-HTML-5（连接ds.js） | `检查 index.html 是否已有 <script src="/src/ds.js">` | `遍历 SELECTED_HTML_FILES，每个文件注入 ds.js 引用` |

**关键不变量：** `src/ds.js` 只生成一份，所有页面共享引用。CONFIG 块配置统一，不按页面区分。

#### 2.7 React / Vue 模板

`react.md` 和 `vue.md` 的改造与 `html.md` 类似，但有一个特殊性：React/Vue 通常是单入口（`index.html` 或 `Document.tsx`），多 HTML 场景罕见。

处理方式：
- React：若检测到多个 HTML 文件，仍走选择流程；`Document.tsx` 场景保持原逻辑（单入口）
- Vue：同上

---

### 3. 模式0（规范目录结构）多 HTML 改造

#### 3.1 文件命名规则

index 保持原名，其他按 HTML 名命名：

| 源 HTML | 提取的 CSS | 提取的 JS |
|---------|-----------|-----------|
| `index.html` | `src/style.css` | `src/game.js` |
| `page2.html` | `src/page2-style.css` | `src/page2-game.js` |
| `result.html` | `src/result-style.css` | `src/result-game.js` |

#### 3.2 步骤1改造——遍历所有 HTML

当前：只读 `index.html`，不存在则中止。

改为：
1. 扫描所有 `.html` 文件
2. **若只有 `index.html`** → 行为不变，读 `index.html`，提取到 `src/style.css` + `src/game.js`
3. **若有多个 HTML** → 遍历每个 HTML 文件，按命名规则分别提取内嵌 CSS/JS 到对应文件

#### 3.3 步骤2-4改造——逐文件处理

对每个 HTML 文件独立执行：
- 分析内嵌 `<style>` 块和内嵌 `<script>` 块
- 生成对应的 `src/<name>-style.css` 和 `src/<name>-game.js`
- 修改原 HTML：移除内嵌块，添加 `<link rel="stylesheet" href="src/<name>-style.css">` 和 `<script type="module" src="src/<name>-game.js">` 引用

#### 3.4 CLAUDE.md 目录约定更新

```
index.html      # 主入口
page2.html      # 次级页面
src/
  style.css         # index.html 的样式
  game.js           # index.html 的业务逻辑
  page2-style.css   # page2.html 的样式
  page2-game.js     # page2.html 的业务逻辑
  ds.js             # 大神平台业务注入（共享）
```

#### 3.5 加载顺序说明更新

每个 HTML 文件中脚本加载顺序独立保证：

```
1. SDK-LOADER（</head> 前）
2. src/ds.js（type="module"）
3. 该页面对应的 src/<name>-game.js
```

---

### 4. 模式2（审查）多 HTML 改造

#### 4.1 自动检测机制

模式2不依赖 `SELECTED_HTML_FILES`，独立扫描所有 `.html` 文件，检测是否含 DS Marker：

**判定规则：** HTML 文件含 `<!-- [DS:SDK-LOADER:START] -->` → 视为"已接入大神"，纳入审查范围。

#### 4.2 审查范围输出

审查开始时输出检测到的页面清单：

```
## 审查范围检测

扫描到以下含 DS Marker 的 HTML 文件：

  [✅] index.html
  [✅] page2.html

将依次对以上文件执行审查。
```

#### 4.3 audit.md 改造

步骤1（审查范围）：

```
| HTML | 所有含 DS Marker 的 HTML 文件、src/ds.js |
```

步骤3（HTML安全审查）：

> 对所有含 DS Marker 的 HTML 文件调用 `/html-security-scan`

#### 4.4 audit-rules.md 改造

约 15 处 `index.html` 硬编码检查项，全部改为"遍历所有含 DS Marker 的 HTML 文件"。改造模式统一：

| 当前 | 改造后 |
|------|--------|
| `扫描 index.html 中全部 <script> 标签` | `遍历所有含 DS Marker 的 HTML 文件，扫描每个文件的 <script> 标签` |
| `index.html 中微信 JSSDK 已注入` | `每个含 DS Marker 的 HTML 文件中微信 JSSDK 已注入` |
| `index.html 中存在 id="ds-task-root" 容器` | `含 DS Marker 的 HTML 文件中，需要任务面板的页面存在 id="ds-task-root" 容器` |
| `ds-act-sdk 的 <link>/<script> 存在于 index.html` | `遍历含 DS Marker 的 HTML 文件，ds-act-sdk 资源已注入` |

#### 4.5 容器检查特殊处理

`#ds-task-root`、`#ds-cps-bar-root` 等容器不需要每个页面都有。审查规则改为：**仅当该页面引用的 JS 中含对应 SDK 调用代码时才检查容器是否存在**。

- 页面引用的 JS 中含 `sdk.TaskModule.evoke(` → 检查该页面 HTML 含 `#ds-task-root`
- 页面引用的 JS 中含 `sdk.CpsUniversalBar.evoke(` → 检查该页面 HTML 含 `#ds-cps-bar-root`

#### 4.6 版本检查改造

> 遍历所有含 DS Marker 的 HTML 文件中的 CDN 地址，任一文件版本低于最新则提示升级

---

### 5. 模式5/6（数据持久化 + ds-act-sdk）多 HTML 改造

#### 5.1 核心原则：每模式独立选择

模式5和模式6不复用 `SELECTED_HTML_FILES`，各自独立询问注入哪些页面。原因：任务面板可能只在 `result.html` 出现，CPS 栏可能只在 `index.html` 出现，数据持久化脚本可能只在游戏页需要。

#### 5.2 模式6（ds-act-sdk）改造

**步骤1（SDK 资源注入）：**

新增步骤0.5：HTML 页面选择。候选为"含 DS Marker 的 HTML 文件"（即已通过模式1接入大神的页面），而非所有 HTML 文件。因为 ds-act-sdk 依赖 SDK-LOADER 已就位。

```
## HTML 页面选择

检测到以下含 DS Marker 的 HTML 文件：

  [✅] index.html（默认）
  [ ] page2.html
  [ ] result.html

请输入需要接入 ds-act-sdk 的页面（回车确认默认，或输入文件名，逗号分隔）：
```

用户选择后记录为 `ACT_SDK_HTML_FILES`，后续容器注入遍历此集合。

**步骤2（容器注入）：**

| 容器 | 当前 | 改造后 |
|------|------|--------|
| `#ds-task-root` | `在 index.html 的 </body> 前插入` | `遍历 ACT_SDK_HTML_FILES，在每个文件 </body> 前插入` |
| `#ds-task-entry-btn` | `在 index.html 的 </body> 前插入` | 同上 |
| `#ds-cps-bar-root` | `在 index.html 的 </body> 前插入` | 同上 |

**结果摘要：**

```
| [每个选中文件] | ✅ 注入 ds-act-sdk CSS/JS |
| [每个选中文件] | ✅ 添加 #ds-task-root 容器 |
```

#### 5.3 模式5（数据持久化）改造

**本地存档（game-storage.md）：**

步骤4.2：`修改 index.html，添加 script 引用` → 新增页面选择步骤（同模式6，候选为含 DS Marker 的文件），用户选择后遍历注入 `<script type="module" src="game-storage.js">`。

**服务端存储（server-storage/）：**

- `02-best-practices.md` 步骤3.3：`在 index.html 中，确保引入顺序` → 改为遍历选中文件
- `99-api-reference.md`：`在 index.html 的 <head> 中按顺序添加` → 改为遍历选中文件

#### 5.4 模式4（埋点）改造

扫描范围改为：

```
| HTML | src/ 下所有 .js/.ts 文件 + 所有含 DS Marker 的 HTML 文件中的内联 <script> |
```

#### 5.5 miniapp.md / miniapp-h5-integration.md 改造

这两个文件在模式1合并小程序支持后被标记为 deprecated，但仍被部分流程引用。注入步骤中的 `index.html` 硬编码改为遍历 `SELECTED_HTML_FILES`，与 `html.md` 保持一致。

---

### 6. 模式3（构建打包）

无需改造。当前 `deploy.md` 无 `index.html` 硬编码操作（仅文档说明），打包时自动包含所有 HTML 文件及其引用的资源。

---

## 受影响文件清单

| 文件 | 改造内容 |
|------|----------|
| `references/inject.md` | 新增步骤0.5；步骤0/3/3.6/4/5 改为遍历 `SELECTED_HTML_FILES` |
| `references/html.md` | 4-HTML-2/3/5 改为遍历；结果摘要更新 |
| `references/react.md` | 同 html.md，Document.tsx 保持单入口 |
| `references/vue.md` | 同 html.md |
| `references/structure.md` | 步骤1-4 支持多 HTML 提取；文件命名规则；CLAUDE.md 约定更新 |
| `references/audit.md` | 审查范围改为"含 DS Marker 的 HTML 文件" |
| `references/audit-rules.md` | ~15 处 `index.html` 硬编码改为遍历；容器检查特殊处理；版本检查改造 |
| `references/ds-act-sdk.md` | 新增步骤0.5 页面选择；容器注入改为遍历 `ACT_SDK_HTML_FILES` |
| `references/act-task.md` | 容器注入改为遍历 |
| `references/act-cps-bar.md` | 容器注入改为遍历 |
| `references/game-storage.md` | 步骤4.2 改为遍历选中文件 |
| `references/game-log.md` | 扫描范围改为"含 DS Marker 的 HTML 文件" |
| `references/server-storage/02-best-practices.md` | 步骤3.3 改为遍历选中文件 |
| `references/server-storage/99-api-reference.md` | 改为遍历选中文件 |
| `references/miniapp.md` | 注入步骤改为遍历（若被模式1调用） |
| `references/miniapp-h5-integration.md` | 注入步骤改为遍历 |

---

## 验证清单

改造完成后，应通过以下场景验证：

### 单 HTML 项目（向后兼容）

- [ ] 模式1：只有 `index.html` 时，步骤0.5 静默跳过，行为与改造前完全一致
- [ ] 模式0：只有 `index.html` 时，提取到 `src/style.css` + `src/game.js`，行为不变
- [ ] 模式2：只有 `index.html` 含 DS Marker 时，审查范围仅 `index.html`
- [ ] 模式5/6：只有 `index.html` 含 DS Marker 时，候选列表仅 `index.html`

### 多 HTML 项目

- [ ] 模式1：检测到多个 HTML 文件时，步骤0.5 询问用户选择
- [ ] 模式1：`SELECTED_HTML_FILES` 中每个文件都注入了 SDK-LOADER + 第三方依赖 + ds.js 引用
- [ ] 模式1：`SELECTED_HTML_FILES` 中每个文件都注入了导航栏偏移 CSS
- [ ] 模式1：`SELECTED_HTML_FILES` 中每个文件的旧 ulink 脚本都被清理
- [ ] 模式1：`src/ds.js` 只生成一份，所有选中页面共享引用
- [ ] 模式0：多个 HTML 文件分别提取到 `src/<name>-style.css` + `src/<name>-game.js`
- [ ] 模式0：`index.html` 提取到 `src/style.css` + `src/game.js`（保持原名）
- [ ] 模式2：自动检测含 DS Marker 的 HTML 文件，全部纳入审查
- [ ] 模式2：容器检查仅在含对应 SDK 调用代码的页面执行
- [ ] 模式6：候选列表为含 DS Marker 的文件，用户选择后遍历注入容器
- [ ] 模式5：本地存档 script 引用遍历注入到选中文件
- [ ] 模式4：扫描范围覆盖所有含 DS Marker 的 HTML 文件的内联 `<script>`
- [ ] 模式3：打包时自动包含所有 HTML 文件

### 边界场景

- [ ] 用户在步骤0.5 只选了 `index.html`（即多 HTML 文件但只注入一个）→ 其他页面不受影响
- [ ] 模式2 检测到含 DS Marker 的文件但模式1未注入过（手动复制场景）→ 仍能正常审查
- [ ] 模式6 候选列表为空（无含 DS Marker 的文件）→ 提示先运行模式1

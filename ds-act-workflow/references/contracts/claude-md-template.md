# 契约：CLAUDE.md 生成模板

> structure 能力（`capabilities/structure.md`）按本契约生成项目根目录 `CLAUDE.md`，记录目录结构约定、脚本加载顺序、开发约定与通用工程原则。
>
> 本模板是 structure 能力的**产物契约**——生成前读此文件取模板正文，生成时按"入参/出参"段的占位符替换规则填充。

## 生成规则

| 条件 | 行为 |
|------|------|
| `CLAUDE.md` 不存在 | **新建**，写入下方"模板正文"全部内容 |
| 已存在且**不含** `由 ds-act-workflow 模式0 整理生成` 字样 | **追加**下方"追加段"内容（不修改原有内容） |
| 已存在且**含**该字样 | **跳过**（幂等，避免重复写入） |

> **占位符替换**：模板正文中无占位符——目录结构约定是通用的（`index.html` / `src/style.css` / `src/game.js` / `src/ds.js` 等），不按项目实际文件名填充。若项目有多个 HTML，目录树示例中的 `page2.html` 行保留作为多页面示例。

## 模板正文（新建时写入）

````markdown
# 项目说明

## 项目结构

本项目遵循以下目录结构约定（由 ds-act-workflow 模式0 整理生成）：

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

## 脚本加载顺序（重要）

每个 HTML 文件中脚本必须按以下顺序加载，否则业务逻辑会因依赖未就绪而失效：

1. SDK-LOADER（`</head>` 前）— 大神平台初始化
2. `src/ds.js` — 大神业务封装
3. `src/game.js`（或 `src/<name>-game.js`）— 该页面对应的业务逻辑（必须在 ds.js 之后）

## 开发约定

- 不要在 HTML 文件中内嵌 `<style>` 或业务 `<script>` 块
- 各页面的样式写在对应的 `src/<name>-style.css` 中
- 各页面的业务逻辑写在对应的 `src/<name>-game.js` 中
- `src/ds.js` 由 `/ds-act-workflow` 工具管理，不要手动修改其内容
- `src/game.js` 以 `type="module"` 加载，动态注入 HTML 时禁止在字符串中写 `onclick="fn()"`，改用 `addEventListener` 绑定（原因：模块内函数不在全局作用域，字符串 onclick 调用会静默失效）

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
````

## 追加段（已存在时追加）

> ⚠️ 追加前先检查文件中是否已存在 `由 ds-act-workflow 模式0 整理生成` 字样——若存在则跳过追加，避免重复写入。

````markdown

## 项目结构

本项目遵循以下目录结构约定（由 ds-act-workflow 模式0 整理生成）：

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

## 脚本加载顺序（重要）

每个 HTML 文件中脚本必须按以下顺序加载，否则业务逻辑会因依赖未就绪而失效：

1. SDK-LOADER（`</head>` 前）— 大神平台初始化
2. `src/ds.js` — 大神业务封装
3. `src/game.js`（或 `src/<name>-game.js`）— 该页面对应的业务逻辑（必须在 ds.js 之后）

## 开发约定

- 不要在 HTML 文件中内嵌 `<style>` 或业务 `<script>` 块
- 各页面的样式写在对应的 `src/<name>-style.css` 中
- 各页面的业务逻辑写在对应的 `src/<name>-game.js` 中
- `src/ds.js` 由 `/ds-act-workflow` 工具管理，不要手动修改其内容
- `src/game.js` 以 `type="module"` 加载，动态注入 HTML 时禁止在字符串中写 `onclick="fn()"`，改用 `addEventListener` 绑定（原因：模块内函数不在全局作用域，字符串 onclick 调用会静默失效）
````

## 不变量

- **幂等标记串**：`由 ds-act-workflow 模式0 整理生成`（写与查必须一致，否则幂等检测失效）
- **加载顺序三步**：SDK-LOADER → `src/ds.js` → `src/game.js`（顺序不可变，否则业务逻辑依赖未就绪）
- **type=module 约定**：`src/game.js` 以 `type="module"` 加载是硬性要求，由此引出"禁止字符串 onclick → 改用 addEventListener"的开发约定（模块作用域内函数不自动挂 `window`）

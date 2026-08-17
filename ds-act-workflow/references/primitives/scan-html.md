# 原语：scan-html

> 无状态 HTML 结构扫描。对每个 HTML 文件返回原始结构化结果，**不做任何语义识别**。
>
> 被 inject / structure / audit / ad-preview 等能力引用，消除"扫描 HTML"在 7+ 文件中的重复。

## 依赖

- 无（纯读取操作）

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| HTML 文件集合 | 调用方 | 是 | — | 前置传递（glob `*.html`，排除 `node_modules`、`dist`） |

## 出参

对每个 HTML 文件返回以下结构化清单：

| 字段 | 内容 | 说明 |
|------|------|------|
| `filePath` | 文件路径 | 相对当前工作目录 |
| `comments` | 所有 HTML 注释清单 | 每项含位置（行号 / 字符偏移）+ 原始内容；**原样返回，不识别 `[DS:XXX:START]` 等 Marker 模式** |
| `styleBlocks` | 内嵌 `<style>` 块清单 | 每项含位置 + 内容 |
| `inlineScriptBlocks` | 内嵌 `<script>` 块清单（无 src） | 每项含位置 + 内容 |
| `externalScriptBlocks` | 外链 `<script>` 块清单（有 src） | 每项含位置 + src + 内容（若有） |
| `scriptTags` | `<script>` 标签清单 | 每项含 src（若有）+ type 属性（若有）+ 位置 |
| `headRange` | `<head>` 位置 | 起止行号 / 偏移 |
| `bodyRange` | `<body>` 位置 | 起止行号 / 偏移 |

> `inlineScriptBlocks` 与 `externalScriptBlocks` 按 `src` 属性有无区分；`scriptTags` 是两者的并集视图，额外保留 `type` 属性（如 `type="module"`）。

## 能做什么

- 读取 HTML 文件，解析出上述结构化清单
- 返回所有 HTML 注释（`<!-- ... -->`）的原始内容与位置
- 区分内嵌 `<style>` 块、内嵌 `<script>` 块、外链 `<script>` 块
- 报告 `<head>` / `<body>` 的位置区间，供 inject 定位注入点

## 不能做什么

- **不修改文件**——只读，不写入、不重排、不删除
- **不判断框架**——框架识别是 `detect-framework` 的职责
- **不做 Marker 语义识别**——只返回原始注释清单，不匹配 `[DS:XXX:START]` / `[DS:SDK-LOADER:START]` 等模式，不判定注释是否为 DS Marker
- **不做 Cocos 启动块豁免**——是否为 Cocos 启动代码的判定由调用方（结合 `detect-framework` 的 `IS_COCOS` 结果）自行做
- **不解析注释内容的业务含义**——注释是 SDK-LOADER 边界、还是 NAV-BAR 标记、还是普通注释，一律原样返回

## 与 contracts 的关系

scan-html 返回"所有注释"的原始清单，**不依赖 contracts 的 Marker 语义**。能力文件拿到注释清单后，按 `contracts/ds-js-markers.md` 的 Marker 模式（`[DS:XXX:START]` / `[DS:XXX:END]`）和 `contracts/sdk-loader.md` 的 SDK-LOADER 模式（`[DS:SDK-LOADER:START]` / `[DS:SDK-LOADER:END]`）**自行匹配**。

这样 primitives 不依赖 contracts 的语义——Marker 语法变了只改 contracts，scan-html 的"返回所有注释"逻辑不变。

## 幂等性

- 纯读取，任意次数重入结果一致（前提：文件未被外部修改）

## 组合

| 方向 | 能力 | 关系 | 必须/推荐 |
|------|------|------|-----------|
| 下游 | inject | inject 用注释清单匹配 SDK-LOADER / Marker，用 head/body 定位注入点 | 推荐 |
| 下游 | structure | structure 用 style/script 块清单决定提取目标 | 推荐 |
| 下游 | audit | audit 用注释清单校验 Marker 块齐全 | 推荐 |
| 下游 | ad-preview | ad-preview 用 script 标签清单定位注入点 | 推荐 |

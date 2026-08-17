# 前置检查扫描结果 — evals/audits 硬引用

> 重构前置检查（spec 第 237-238 行）：扫描 evals 与 audits 中对 `references/` 路径的硬编码引用，判断迁移是否会导致引用失效。
>
> 扫描日期：2026-07-07　扫描方式：grep（只读）

## 1. evals/evals.json 扫描结果

**命中条数：2**（均为 `expected_output` 字段中的 `references/` 路径引用）

| eval id | 行号 | 引用内容 | 上下文 |
|---------|------|----------|--------|
| 38 | 306 | `references/react.md` | expected_output："ds.js 内容遵循 references/react.md 的接入模式" |
| 40 | 326 | `references/vue.md` | expected_output："ds.js 内容遵循 references/vue.md 的接入模式" |

补充检查：
- `ds-js-template` 关键字：**无命中**
- 行号引用（`:\d+`）：**无命中**
- 产物路径（`src/ds.js`）：多处出现，但属不变产物路径，不受重构影响

## 2. references/audits/*.md 扫描结果

**命中条数：5**（分布在 2 个文件，共引用 5 个不同的 `references/` 路径）

| 文件 | 行号 | 引用内容 | 说明 |
|------|------|----------|------|
| act-sdk.md | 5 | `references/ds-act-sdk-api.md` | 审查依据声明 |
| act-sdk.md | 33 | `references/ds-act-sdk-api.md` | 校验提示中要求对照的文件 |
| index.md | 5 | `references/inject.md`、`references/deploy.md` | 调用方说明 |
| index.md | 329 | `references/game-data.md`、`references/server-storage/04-cms-register.md` | 引用语义说明 |

补充检查：
- `ds-js-template` 关键字：**无命中**
- 行号引用（如 `references/ds-js-template.js:42` 形式）：**无命中**

## 3. 结论

**结论：不能直接安全迁移，需同步修正以下文件中的 `references/` 路径引用。**

依据 spec 文件映射表（第 242-263 行），所有命中路径在重构后均会改变位置：

| 命中路径 | 新位置 | 影响文件 |
|----------|--------|----------|
| `references/react.md` | 框架拆分 → contracts/ds-js-markers.md + 能力文件框架分支 | evals.json (id 38) |
| `references/vue.md` | 框架拆分 → contracts/ds-js-markers.md + 能力文件框架分支 | evals.json (id 40) |
| `references/ds-act-sdk-api.md` | contracts/ds-act-sdk-api.md（内容不变，路径变） | audits/act-sdk.md (×2) |
| `references/inject.md` | capabilities/inject.md | audits/index.md |
| `references/deploy.md` | capabilities/deploy.md | audits/index.md |
| `references/game-data.md` | 合并入 capabilities/game-storage.md | audits/index.md |
| `references/server-storage/04-cms-register.md` | capabilities/game-storage.md 附属 | audits/index.md |

### 需同步修正的文件清单

1. **evals/evals.json** — 2 处（id 38 的 `references/react.md`、id 40 的 `references/vue.md`）。注意：spec 第 296-298 行要求"不改 prompt 和 expected_output"做不退化验证，故这两处是否修正需与 evals 验证策略协调——若保持原文则 eval 仍可跑（路径仅是 expected_output 描述性文本，非执行依赖），但语义会与新结构漂移。
2. **references/audits/act-sdk.md** — 2 处（第 5、33 行的 `references/ds-act-sdk-api.md` → `contracts/ds-act-sdk-api.md`）。
3. **references/audits/index.md** — 2 处（第 5 行 inject/deploy、第 329 行 game-data/server-storage）。

### 不受影响项

- 产物路径 `src/ds.js`、`public/index.html` 等：不变，无需修正。
- `ds-js-template.js` 行号引用：扫描无命中，无需修正。
- 其余 14 个 audits/*.md 文件：无 `references/` 路径命中，无需修正。

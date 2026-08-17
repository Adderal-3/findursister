## Why

现有 `server-storage` 流程只覆盖「用户维度」数据：每个 recordKey 都挂在某个登录 uid 名下，靠 `queryUid + allowGuestRead` 只能只读别人的私有数据。运营的很多小游戏需要「多人共写共读、不按读者 uid 分片」的公共数据——公共帖吧的投稿/评论/点赞、UGC 展示墙、晒单、投票、全服共创等。mini-game-data-sdk 已迭代出 datahub-table（公共表）能力（`tableUpdate/tableDelete/tableIncrNumber/tableFindOne/tableFindList/tablePage`），god-cms 后台也新增了「数据表」tab，但本 skill 尚无对应的识别、设计、注册、代码生成与审查流程。

## What Changes

- 在 `references/server-storage/` 下新增 `common-table/` 子目录，承载公共表全流程文档与工具。
- **Vendored（自有维护）**：把服务端团队 `datahub-table-designer` skill 的核心内容（`schema.md`、`index-matching.md`、`scripts/validate.js`、`examples/*.json`）复制进 `common-table/`，脱离外部 skill 依赖，出问题时本仓库可自行定位维护。
- **开放式识别（triage）**：不预设封闭场景清单。先读懂运营项目的实际业务，再据其真实情况询问用户是否需要公共表；判定内核为「存在多人共写共读、非 uid 分片的数据」。文档同时给出一批**已有业务示例作为扫描启发**（帖吧/广场、投稿、评论、点赞、留言、弹幕、UGC 展示墙、全服共创、晒单、投票、世界 boss 累计计数等），命中示例即提示用户「要接公共表吗？」，但示例仅辅助扫描、不构成封闭清单。
- **表/索引设计**：复用 vendored 的字段/权限位/索引规则，产出可直接导入的 TableConfig JSON（每张表含 6 个内置字段 `__create_time/__update_time/__delete_time/__create_uid/__delete_uid/__under_review`，且必须建立能命中所有查询的索引）。
- **硬门禁**：每条查询（conditions+sorts）必须命中某索引前缀，用 vendored `validate.js` 自动证明索引覆盖，不绿不放行。
- **CMS 注册引导**：仿现有 `04-cms-register.md`，引导用户把 TableConfig JSON 导入 god-cms「小游戏管理 → 数据管理 → 数据表」tab。
- **代码生成**：生成独立文件 `game-common-table.js`，复用 `game-server-storage.js` 的同一个 `setGameId`（无用户存储时自行兜底初始化），封装 `table*` 调用。
- **类型声明（d.ts）**：公共表生成 `table.d.ts`（表字段类型 → 供 AI 生成读写代码时比对、IDE 提示，零构建依赖）；用户维度存储同步补一步「第 2.5 步：`storage-keys.d.ts`」——由锁定字段表产出单 `UserStorageKeys` interface，供代码生成阶段比对每个 recordKey 值类型，防 `*_LIST` 字段被误 `JSON.stringify`/`parse`、防对象漏 stringify。
- **SDK 版本基线上调**：`table*` 接口起始版本为 `0.1.0`，同时将其定为全仓库统一 SDK 基线；审查规则的版本门禁由 `0.0.9` 提升为「≥ `0.1.0` 无条件阻断」，与是否用到公共表能力无关。
- **审查规则**：新增公共表专项审查（索引命中、`tableIncrNumber` 仅限 NUMBER 非内置字段、点赞类表 `creatorOnlyModify=false`、`ne` 不走索引、`pageSize/limit≤50`、`page×pageSize≤50000` 等）。
- **流程接入**：在 mode 5-B 用户维度改造完成后自动触发一次开放式 triage，并在 5-B 完成菜单加手动入口；公共表流程可独立到达（即使项目未接用户存储，前置检查登录态）。

## Capabilities

### New Capabilities
- `common-table-storage`: 小游戏公共表（datahub-table）的识别、表/索引设计、TableConfig JSON 生成与索引覆盖校验、god-cms 数据表 tab 注册引导、`game-common-table.js` 代码生成、以及公共表专项代码审查的完整流程。

### Modified Capabilities
<!-- 无：game-data.md / server-storage 流程当前未以 openspec spec 形式沉淀，故不产生 delta spec。 -->

## Impact

- **新增文档**：`references/server-storage/common-table/`（triage、table-design、index-matching、table-config-json、table-d-ts、code-gen、cms-register、api-reference）。
- **Vendored 文件**：`common-table/scripts/validate.cjs`、`common-table/examples/*.json`（源自 `.claude/skills/datahub-table-designer/`；校验器落地为 `.cjs` 以强制 CommonJS 加载）。
- **修改**：`references/game-data.md`（mode 5-B 接入新步骤 + 完成菜单入口 + 新增 5-C 公共表路径）；`references/audits/index.md` 与 `references/audits/`（新增公共表专项审查条目 + server-storage 审查加 d.ts 值类型匹配检查）。
- **用户维度存储流程的兼容性增补（非破坏）**：新增 `server-storage/02.5-storage-keys-d-ts.md`（第 2.5 步类型声明），并在 `00-intake.md`/`02-best-practices.md` 增加对 `storage-keys.d.ts` 的引用与 `*_LIST` 值类型对照说明——仅新增类型声明步骤与对照提示，不改动原有读写/同步核心逻辑与生成物结构。
- **全局审查规则调整**：`audit-rules.md`、`audits/server-storage.md`、`server-storage/02-best-practices.md`、`server-storage/99-api-reference.md` 中 SDK 版本由 `0.0.9` 统一提升至 `0.1.0`。
- **生成物（运营项目侧）**：新增 `game-common-table.js` 与 `table.d.ts`，与既有 `game-server-storage.js`/`storage-keys.d.ts` 共存、共用 `setGameId`。
- **依赖**：mini-game-data-sdk `0.1.0`（含 datahub-table 接口的起始版本，且为全仓库统一基线）；god-cms「数据表」tab。
- **无核心破坏性变更**：用户维度存储的读写/同步核心逻辑与既有生成物不变；仅新增类型声明步骤、值类型对照提示与 SDK 版本基线上调。

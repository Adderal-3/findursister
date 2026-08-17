## Context

`server-storage` 现有流程（mode 5-B，6 步）只处理用户维度数据：`obfuscatedWriteData/batchReadData` 按登录 uid 分片，`getBillboardRank` 只读聚合。公共帖吧、UGC 墙、投票、晒单等场景需要「多人共写共读、非 uid 分片」的数据，现有能力无法覆盖。

mini-game-data-sdk 新增 datahub-table 接口：`tableUpdate`（不传 id 即新增）、`tableDelete`（逻辑删）、`tableIncrNumber`（原子自增）、`tableFindOne/FindList/Page`（conditions+sorts+分页）。每张表在 god-cms「小游戏管理 → 数据管理 → 数据表」tab 建立，含 6 个内置字段（`__create_time/__update_time/__delete_time/__create_uid/__delete_uid/__under_review`）。

服务端团队已有 `datahub-table-designer` skill 承载表/索引设计规则与校验器。因其归属服务端、故障需回溯外部团队，本 change 将其核心内容 vendored 进本仓库自有维护。

## Goals / Non-Goals

**Goals:**
- 在 `server-storage` 流程后新增一条完整的公共表接入链路：开放式识别 → 表/索引设计 → JSON 生成 → 索引覆盖校验 → CMS 注册引导 → 代码生成 → 专项审查。
- 把 datahub-table-designer 的核心内容（schema、index-matching、validate.js、examples）vendored 进 `references/server-storage/common-table/`，脱离外部 skill 依赖。
- 识别逻辑基于运营项目实际业务，而非预设封闭场景清单。
- 生成独立的 `game-common-table.js`，复用既有 `setGameId`。
- 索引覆盖用校验器强门禁，防止运行时 `PARAM_ERROR`。

**Non-Goals:**
- 不改动用户维度存储（mode 5-A/5-B）的读写/同步核心逻辑与既有生成物结构；对该流程的改动仅限于新增「第 2.5 步类型声明（`storage-keys.d.ts`）」与 `*_LIST` 值类型对照提示（兼容性增补，见 D8）。
- 不实现服务端 datahub-table 接口本身（由 SDK/服务端提供）。
- 不做公共表数据的运营后台可视化（由 god-cms 提供）。
- 不删除或替换外部 `datahub-table-designer` skill（仅 vendored 复制其内容）。

## Decisions

### D1：目录结构——`references/server-storage/common-table/` 子目录
公共表是与用户维度并列的另一套体系（JSON 格式、CMS tab、SDK 接口、审查规则全不同）。放子目录便于集中维护、与现有 `00-intake ~ 04-cms-register` 平级区隔。
- **备选**：混进现有 `server-storage/` 平铺。否决——两套 JSON 格式（Key 配置 flat array vs TableConfig）极易混淆。

### D2：Vendored 而非委派外部 skill
按用户明确要求：datahub-table-designer 归服务端，故障要回外部团队定位。将 `schema.md`、`index-matching.md`、`scripts/validate.js`、`examples/*.json` 复制进 `common-table/`，本仓库自有维护。
- **备选**：运行时调用外部 skill。否决——耦合外部依赖、无法自主定位问题。
- **代价**：外部 skill 若更新规则，需人工同步。在 vendored 文件顶部标注来源与同步说明。

### D3：开放式识别（triage），非关键词清单
运营生成的小游戏代码事先未知。`00-triage.md` 先让 agent 读懂项目实际业务，再据其真实情况询问用户是否需要公共表。场景示例（帖吧/晒单/投票/UGC 墙/全服共创…）仅作启发，判定内核为「多人共写共读、非 uid 分片」。
- **备选**：固定关键词匹配触发。否决——覆盖不全、误判运营未知业务。

### D4：独立 `game-common-table.js`，复用 setGameId
公共表代码与用户存储解耦，独立文件按「每个业务几张表」组织更清晰。复用 `game-server-storage.js` 全局 `setGameId`（只调一次）；若项目未接用户存储，本文件兜底调用一次 `setGameId`。加载顺序：`game-server-storage.js`（若存在）先于 `game-common-table.js`。
- **备选**：塞进 `game-server-storage.js` 单文件。否决——两类数据语义差异大，独立文件更利于识别/维护。

### D5：索引覆盖强门禁——vendored validate.cjs
每条 `tableFindOne/List/Page` 的 conditions+sorts 必须命中某索引前缀（复刻 `IndexMatchChecker` 语义），否则后端直接 `PARAM_ERROR`。设计阶段用 vendored 校验器（源自外部 `scripts/validate.js`，落地为 `validate.cjs` 以强制 CommonJS 加载）对「表配置 + 查询场景」双检查（结构 + 索引覆盖），不全绿不进入 CMS 注册。
- 规则要点：`ne` 永不走索引；单查询最多 1 个 range/in；eq 前缀连续；排序方向全同或全反；`limit/pageSize≤50`；`page×pageSize≤50000`。

### D6：CMS 注册引导——仿 04-cms-register，导向「数据表」tab
复用现有引导话术骨架，路径改为 god-cms「小游戏管理 → 数据管理 → 数据表」tab 的导入入口；区分测试/正式环境；对齐 `__FIELDS_NOT_REGISTERED__` 式的未注册标记机制（如 `__TABLE_NOT_REGISTERED__`）。

### D7：流程接入点
mode 5-B 用户维度改造完成后自动触发一次开放式 triage；同时在「5-B 审查完成后」菜单新增一项手动入口；公共表流程可独立到达。前置检查：内置 `__create_uid` 依赖登录态，triage 时确认项目已具备登录态。

### D8：类型声明（d.ts）——公共表 `table.d.ts` + 用户存储 `storage-keys.d.ts`
两类存储的读写代码均由 AI 生成，最大失误源是值类型误判：`*_LIST`（`number[]`/`string[]`/`boolean[]`）被当 STRING 误 `JSON.stringify`/`parse`，或对象漏 stringify。为此各产出一份零构建依赖、不需 import 的 `.d.ts` 作为类型对照锚点：
- **公共表**：`03.5-table-d-ts.md` 由 TableConfig 产出 `table.d.ts`（表字段类型），`04-code-gen.md` 生成读写代码时对照，审查（`common-table.md` B 档）据此校验。
- **用户存储**：新增「第 2.5 步」`02.5-storage-keys-d-ts.md`，由锁定字段表产出单 `UserStorageKeys` interface，`02-best-practices.md` 生成代码时对照，`audits/server-storage.md` B 档新增值类型匹配检查。
- **为何触及用户存储流程**：`*_LIST` 类型误判在用户维度存储同样高发，且 `storage-keys.d.ts` 与 `table.d.ts` 是同一套「d.ts 作类型锚点」机制的两端，一并落地才自洽。改动仅新增声明步骤与对照提示，不动原有读写/同步逻辑与生成物结构（见 Non-Goals 修订）。
- **备选**：仅公共表出 `table.d.ts`、用户存储不动。否决——用户存储同样受 `*_LIST` 误判困扰，且两端机制割裂反而更难维护。

### D9：SDK 版本基线统一为 0.1.0
`table*` 接口起始于 `0.1.0`；同时将 `0.1.0` 定为全仓库统一 SDK 基线，审查版本门禁由「建议升级到 `0.0.9`」改为「≥ `0.1.0` 无条件阻断」，与是否用公共表无关。理由：低版本调用 `table*` 时 `req.tableUpdate` 为 `undefined` 直接抛 `TypeError`，且维持多基线徒增分叉。影响面为所有引入 SDK 的项目，属有意的全局收敛。

## Risks / Trade-offs

- **Vendored 内容与外部 skill 漂移** → 在 vendored 文件顶部标注来源路径 + 同步时间；后续外部规则变更需人工比对更新。
- **两套 JSON 格式混淆**（Key 配置 flat vs TableConfig 嵌套） → 子目录隔离 + 文档显式对比表 + 审查阶段校验格式归属。
- **agent 索引设计出错致运行时全查询失败** → validate.cjs 作为不可跳过的门禁；文档标红「打不中索引是报错不是变慢」。
- **点赞类表 `creatorOnlyModify` 误设 true** → 别人无法自增 like_count。审查规则专项检查：被 `tableIncrNumber` 跨用户操作的字段所在表必须 `creatorOnlyModify=false`。
- **未接用户存储时 setGameId 缺失** → `game-common-table.js` 兜底初始化 + 审查检查加载顺序与初始化存在性。
- **深分页** → `page×pageSize≤50000` 写入设计约束与审查规则。

## Migration Plan

- 纯新增，无数据迁移。
- 现有项目不受影响；新流程仅在用户主动/triage 命中并确认后触发。
- 回滚：删除 `common-table/` 目录与 `game-data.md`/`audits` 的接入片段即可，用户维度流程不受牵连。

## Resolved Questions

- **god-cms「数据表」tab 的导入 JSON 与 datahub-table-designer 的 tableSave TableConfig 完全同构**——直接参考 `datahub-table-designer` 的实现，`table-config-json.md` 以其为准。
- **mini-game-data-sdk 含 datahub-table（table*）接口的起始版本为 `0.1.0`**——`game-common-table.js` 与 API reference 按此版本引入 SDK。
- **未注册标记 `__TABLE_NOT_REGISTERED__` 与现有 `__FIELDS_NOT_REGISTERED__` 无冲突**——两者独立共存，分别对应公共表与用户维度字段的注册状态。

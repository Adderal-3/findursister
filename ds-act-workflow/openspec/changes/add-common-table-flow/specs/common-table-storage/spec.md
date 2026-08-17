## ADDED Requirements

### Requirement: 公共表能力的 Vendored 文档目录
本 skill SHALL 在 `references/server-storage/common-table/` 下自有维护公共表（datahub-table）全流程文档与工具，其中表/字段/索引规则、索引匹配算法、校验器、样例 MUST 从 `datahub-table-designer` skill vendored 复制，且不依赖该外部 skill 的运行时存在；校验器落地文件名 MUST 为 `validate.cjs`（强制 CommonJS 加载），其来源为外部 `scripts/validate.js`。

#### Scenario: 目录与 vendored 文件齐备
- **WHEN** 公共表流程被触发
- **THEN** `references/server-storage/common-table/` 目录存在，且包含 vendored 的字段/类型/规则速查（源自 `schema.md`）、索引匹配规则（源自 `index-matching.md`）、索引覆盖校验器 `validate.cjs`（源自 `scripts/validate.js`）、以及表配置与查询场景样例（源自 `examples/*.json`）

#### Scenario: vendored 文件标注来源
- **WHEN** 打开任一 vendored 文件
- **THEN** 文件顶部标注来源路径（`.claude/skills/datahub-table-designer/...`）与同步说明，便于后续人工比对更新

### Requirement: 开放式公共表需求识别
流程 SHALL 通过读懂运营项目的实际业务来识别是否需要公共表，而非匹配预设的封闭场景清单；判定内核为「存在多人共写共读、非 uid 分片的数据」。文档 SHALL 附带一批已有业务示例作为扫描启发（帖吧/广场、投稿、评论、点赞、留言、弹幕、UGC 展示墙、全服共创、晒单、投票、世界 boss 累计计数等），示例仅辅助扫描、MUST NOT 作为封闭清单限制识别范围。

#### Scenario: 示例命中即提示
- **WHEN** 项目业务命中示例（如出现帖吧/投稿/评论/点赞/弹幕/晒单/投票等特征）
- **THEN** agent 提示用户「要接公共表吗？」并说明可用公共表处理该业务

#### Scenario: 基于实际项目询问
- **WHEN** 用户维度存储改造完成、进入 triage
- **THEN** agent 先分析当前项目的实际业务，再结合其真实情况询问用户是否需要接入公共表，不得仅凭固定关键词自动断定

#### Scenario: 未命中示例但业务需要
- **WHEN** 项目业务不在示例清单内但实际存在多人共写共读数据
- **THEN** agent 仍应识别该需求并向用户提出接入公共表的建议

#### Scenario: 登录态前置检查
- **WHEN** 用户确认接入公共表
- **THEN** 流程校验项目具备登录态（内置 `__create_uid` 依赖登录），缺失时提示先接入登录

### Requirement: 表与索引设计及内置字段
公共表设计 SHALL 复用 vendored 规则产出 TableConfig；每张表除业务字段外 MUST 含 6 个系统内置字段（`__create_time`、`__update_time`、`__delete_time`、`__create_uid`、`__delete_uid`、`__under_review`），且业务字段不得以 `__` 开头、不得重复声明内置字段；每张表 MUST 为其所有查询场景建立可命中的索引。

#### Scenario: 内置字段不重复声明
- **WHEN** 生成 TableConfig 的 `fields`
- **THEN** 仅包含业务字段，6 个内置字段不写入 `fields`，但可在 `indexes` 中被引用

#### Scenario: 权限位按语义设置
- **WHEN** 表中某 NUMBER 字段需被任意用户通过 `tableIncrNumber` 跨用户自增（如点赞数）
- **THEN** 该表 `creatorOnlyModify` MUST 设为 `false`，否则非创建者无法自增

#### Scenario: 每条查询有对应索引
- **WHEN** 列出该表的全部查询场景（conditions + sorts）
- **THEN** 每条查询都能被某个索引前缀服务，否则补索引或调整查询

### Requirement: 索引覆盖强门禁校验
在生成 TableConfig JSON 后、引导 CMS 注册前，流程 SHALL 使用 vendored `validate.cjs` 对「表配置 + 查询场景」执行结构校验与索引覆盖校验；MUST 复刻 `IndexMatchChecker` 语义；校验未全部通过 MUST NOT 进入 CMS 注册步骤。

#### Scenario: 校验通过才放行
- **WHEN** 校验器对所有查询场景报告命中索引且结构合法
- **THEN** 流程进入 CMS 注册引导

#### Scenario: 校验失败阻断
- **WHEN** 某查询未命中任何索引（如使用了 `ne`、双 range、eq 前缀断裂、排序方向混合、索引长度不足）
- **THEN** 流程输出失败原因并回到索引设计或查询调整，MUST NOT 继续

#### Scenario: 运行时约束纳入设计
- **WHEN** 设计查询与分页
- **THEN** 遵守 `ne` 永不走索引、单查询最多 1 个 range/in、`limit/pageSize≤50`、`page×pageSize≤50000` 等约束

### Requirement: TableConfig JSON 生成规范
流程 SHALL 提供公共表专属的 JSON 格式规范文档，明确 TableConfig（`tableKey`/`displayName`/`fields`/`indexes`/`creatorOnly*`）结构，并与用户维度 Key 配置的 flat array JSON 显式区分，避免混淆。

#### Scenario: 输出可直接导入的 TableConfig
- **WHEN** 表与索引设计完成且校验通过
- **THEN** 输出 JSON 数组，每元素为一张表的 TableConfig，`fieldMeta` 与 `fieldType` 严格匹配，索引不手写 `indexName`/`__delete_time`

#### Scenario: 两套格式不混淆
- **WHEN** 项目同时接了用户维度存储与公共表
- **THEN** 文档明确区分 Key 配置 JSON（flat `{key,name,type,defaultValue}`）与 TableConfig JSON（嵌套 `fields`/`indexes`），生成时不得混用

### Requirement: god-cms 数据表 tab 注册引导
流程 SHALL 仿现有 `04-cms-register.md` 引导用户将 TableConfig JSON 导入 god-cms「小游戏管理 → 数据管理 → 数据表」tab，区分测试/正式环境，并在用户暂缓注册时写入未注册标记。

#### Scenario: 引导导入数据表 tab
- **WHEN** TableConfig JSON 生成完毕
- **THEN** 输出后台路径（数据表 tab 的导入入口）、测试与正式环境地址，并询问用户是否现在注册

#### Scenario: 暂缓注册标记
- **WHEN** 用户选择先跳过注册
- **THEN** 在 `game-common-table.js` 顶部写入未注册标记（如 `__TABLE_NOT_REGISTERED__`），并附上待导入的 TableConfig JSON，审查阶段据此提醒

### Requirement: 类型声明（d.ts）作为读写代码的类型锚点
流程 SHALL 为两类存储各产出一份零构建依赖、无需 import 的类型声明文件，供 AI 生成读写代码时比对字段值类型、供 IDE 提示，防止 `*_LIST`（`number[]`/`string[]`/`boolean[]`）字段被误当 STRING 做 `JSON.stringify`/`JSON.parse`、以及对象漏 stringify：公共表由 TableConfig 产出 `table.d.ts`；用户维度存储在原流程中新增「第 2.5 步」由锁定字段表产出含单 `UserStorageKeys` interface 的 `storage-keys.d.ts`。此为兼容性增补，MUST NOT 改动用户维度存储的读写/同步核心逻辑与既有生成物结构。

#### Scenario: 公共表生成 table.d.ts 并被下游对照
- **WHEN** TableConfig 生成完毕、进入代码生成
- **THEN** 产出 `table.d.ts` 描述各表字段类型，`game-common-table.js` 的读写代码与审查（公共表专项 B 档）均以其为字段类型比对依据

#### Scenario: 用户存储新增第 2.5 步生成 storage-keys.d.ts
- **WHEN** mode 5-B 第 2 步同步策略确认后、第 3 步代码生成前
- **THEN** 由锁定字段表产出 `storage-keys.d.ts`（单 `UserStorageKeys` interface），代码生成阶段据此比对每个 recordKey 值类型，且原有 6 步的读写/同步逻辑不变

#### Scenario: *_LIST 值类型校验
- **WHEN** 生成或审查任一 `*_LIST`（数组）字段的读写代码
- **THEN** 校验其直传数组、未 `JSON.stringify`/`JSON.parse`；标注存 JSON 的 STRING 字段则校验写前 stringify、读后 parse 配对

### Requirement: game-common-table.js 代码生成
流程 SHALL 生成独立文件 `game-common-table.js` 封装 `table*` 调用，复用 `game-server-storage.js` 的同一个 `setGameId`；当项目未接用户维度存储时，该文件 MUST 兜底调用一次 `setGameId`；加载顺序上 `game-common-table.js` MUST 在已初始化 `setGameId` 之后执行。

#### Scenario: 与用户存储共存复用初始化
- **WHEN** 项目已存在 `game-server-storage.js`
- **THEN** `game-common-table.js` 直接使用 `req = MiniGameDataSdk.RequestManager`，不重复 `setGameId`，且 `<script>` 位于 `game-server-storage.js` 之后

#### Scenario: 无用户存储时兜底初始化
- **WHEN** 项目未接用户维度存储、仅接公共表
- **THEN** `game-common-table.js` 自行调用一次 `setGameId({ devMiniGameId, proMiniGameId })` 后再调用 `table*`

#### Scenario: 封装典型操作
- **WHEN** 生成投稿/评论/点赞等操作代码
- **THEN** 分别用 `tableUpdate`（新增/更新）、`tableFindList/tablePage`（列表/分页查询）、`tableIncrNumber`（点赞自增）、`tableDelete`（逻辑删除），且查询的 conditions+sorts 与已注册索引一致

### Requirement: 公共表专项代码审查
流程 SHALL 新增公共表专项审查规则，纳入现有审查体系（`references/audits/`）；仅当项目存在 `game-common-table.js` 时加载。

#### Scenario: 索引命中审查
- **WHEN** 审查 `game-common-table.js` 中的 `tableFindOne/List/Page` 调用
- **THEN** 校验其 conditions+sorts 能命中已注册索引，命不中则标记为阻断项

#### Scenario: incrNumber 字段审查
- **WHEN** 审查 `tableIncrNumber` 调用
- **THEN** 校验 `fieldKey` 为 NUMBER 类型且非内置字段（不以 `__` 开头），且该表 `creatorOnlyModify=false`

#### Scenario: 分页与初始化审查
- **WHEN** 审查分页调用与初始化
- **THEN** 校验 `pageSize/limit≤50`、`page×pageSize≤50000`，以及 `setGameId` 已在调用前执行、加载顺序正确，并检查是否残留 `__TABLE_NOT_REGISTERED__` 标记

### Requirement: 流程接入 mode 5-B
公共表流程 SHALL 在 mode 5-B 用户维度改造完成后自动触发一次开放式 triage，并在「5-B 审查完成后」菜单提供手动入口；且 MUST 可独立到达（即使项目未接用户维度存储）。

#### Scenario: 用户存储完成后自动 triage
- **WHEN** mode 5-B 用户维度存储审查通过
- **THEN** 流程自动进入公共表开放式 triage

#### Scenario: 菜单手动入口
- **WHEN** 用户处于「5-B 审查完成后」菜单
- **THEN** 存在一项手动进入公共表接入的选项

#### Scenario: 独立到达
- **WHEN** 项目选择本地存档或未接用户维度存储、但需要公共表
- **THEN** 用户仍可单独进入公共表流程（前置检查登录态）

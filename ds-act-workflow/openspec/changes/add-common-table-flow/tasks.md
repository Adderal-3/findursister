## 1. Vendored 目录与工具

- [x] 1.1 创建 `references/server-storage/common-table/` 目录结构
- [x] 1.2 Vendored 复制 `datahub-table-designer/references/schema.md` → `common-table/01-table-design.md`（顶部标注来源路径 + 同步时间），补充权限位设置指引
- [x] 1.3 Vendored 复制 `datahub-table-designer/references/index-matching.md` → `common-table/02-index-matching.md`（顶部标注来源；确认 TableConfig 与 god-cms 数据表 tab 导入格式完全同构）
- [x] 1.4 Vendored 复制 `datahub-table-designer/scripts/validate.js` → `common-table/scripts/validate.cjs`（顶部标注来源；落地为 `.cjs` 强制 CommonJS 加载）
- [x] 1.5 Vendored 复制 `datahub-table-designer/examples/table_config.example.json` 与 `queries.example.json` → `common-table/examples/`（顶部标注来源）

## 2. 识别与流程文档

- [x] 2.1 编写 `common-table/00-triage.md`：开放式识别（读懂实际业务 + 询问），内核「多人共写共读、非 uid 分片」，附示例扫描启发清单（帖吧/投稿/评论/点赞/留言/弹幕/UGC 墙/全服共创/晒单/投票/世界 boss 计数等），并说明示例非封闭清单
- [x] 2.2 在 `00-triage.md` 中加入登录态前置检查（`__create_uid` 依赖登录）
- [x] 2.3 编写 `common-table/03-table-config-json.md`：TableConfig JSON 格式规范（`tableKey`/`displayName`/`fields`/`indexes`/`creatorOnly*`），含 6 个内置字段说明，并给出与用户维度 Key 配置 flat array JSON 的显式对比区分表

## 3. 索引覆盖门禁

- [x] 3.1 在 `03-table-config-json.md` 或 `02-index-matching.md` 中写明校验器调用方式（`node common-table/scripts/validate.cjs <table-config.json> <queries.json>`）
- [x] 3.2 明确门禁规则：校验未全绿 MUST NOT 进入 CMS 注册；列出常见失败原因（ne / 双 range / eq 前缀断裂 / 排序方向混合 / 索引长度不足）
- [x] 3.3 写明运行时约束：`limit/pageSize≤50`、`page×pageSize≤50000`、单查询最多 1 个 range/in

## 4. CMS 注册引导

- [x] 4.1 编写 `common-table/05-cms-register.md`：仿 `04-cms-register.md` 骨架，路径改为 god-cms「小游戏管理 → 数据管理 → 数据表」tab 导入入口，区分测试/正式环境
- [x] 4.2 定义暂缓注册标记机制 `__TABLE_NOT_REGISTERED__`（写入 `game-common-table.js` 顶部 + 附待导入 JSON），确认与现有 `__FIELDS_NOT_REGISTERED__` 不冲突

## 5. 代码生成

- [x] 5.1 编写 `common-table/04-code-gen.md`：生成独立 `game-common-table.js` 的规则（`req = MiniGameDataSdk.RequestManager`，复用 setGameId）
- [x] 5.2 定义无用户存储时的兜底 `setGameId` 逻辑与加载顺序（`game-common-table.js` 在 `game-server-storage.js` 之后、`<script type="module">`），SDK 按 `0.1.0` 引入
- [x] 5.3 编写典型操作封装模板：投稿/更新（`tableUpdate`）、列表/分页（`tableFindList`/`tablePage`）、点赞自增（`tableIncrNumber`）、逻辑删除（`tableDelete`），查询与已注册索引对齐
- [x] 5.4 编写 `common-table/99-api-reference.md`：table* API 字典（`tableUpdate/tableDelete/tableIncrNumber/tableFindOne/tableFindList/tablePage` 参数、`QueryOp`、`SortRule`、`TableDataResponse`、`TableRecord`），Vendored 自你提供的 TS 签名
- [x] 5.5 编写 `common-table/03.5-table-d-ts.md`：由 TableConfig 产出 `table.d.ts`（表字段类型声明，零构建依赖、无需 import），供 `04-code-gen.md` 生成读写代码时比对、IDE 提示，公共表专项审查据此校验字段类型

## 6. 专项审查

- [x] 6.1 新增公共表专项审查文档（`references/audits/common-table.md` 或并入现有），仅当存在 `game-common-table.js` 时加载
- [x] 6.2 审查条目：查询 conditions+sorts 命中已注册索引；`tableIncrNumber` 字段为 NUMBER 非内置且表 `creatorOnlyModify=false`；`pageSize/limit≤50`、`page×pageSize≤50000`；setGameId 已初始化 + 加载顺序；残留 `__TABLE_NOT_REGISTERED__` 提醒；字段值类型与 `table.d.ts` 匹配
- [x] 6.3 在 `references/audits/index.md` 加载清单中登记公共表专项条目

## 7. 流程接入

- [x] 7.1 修改 `references/game-data.md` mode 5-B：用户维度审查通过后自动进入公共表开放式 triage；并新增 5-C 公共表路径
- [x] 7.2 在「5-B 审查完成后」菜单新增手动进入公共表接入的选项
- [x] 7.3 说明公共表流程可独立到达（本地存档/未接用户存储也可进入，前置检查登录态）

## 8. 用户存储兼容增补（d.ts + SDK 版本基线）

> 本段为 change 实施中确认必要的兼容性增补：`storage-keys.d.ts` 与公共表 `table.d.ts` 属同一套「d.ts 作类型锚点」机制两端，一并落地；SDK 版本基线统一。均不改动用户维度存储读写/同步核心逻辑与生成物结构。

- [x] 8.1 新增 `references/server-storage/02.5-storage-keys-d-ts.md`：由锁定字段表产出单 `UserStorageKeys` interface 的 `storage-keys.d.ts`（零构建依赖、无需 import）
- [x] 8.2 在 `references/server-storage/00-intake.md` 尾部、`02-best-practices.md` 输入项与生成规则中引用 `storage-keys.d.ts`，补 `*_LIST` 直传数组 / STRING 存 JSON 配对的值类型对照说明
- [x] 8.3 在 `references/game-data.md` mode 5-B 步骤表插入「第 2.5 步：类型声明」
- [x] 8.4 `audits/server-storage.md` B 档新增「字段值类型与 `storage-keys.d.ts` 匹配」检查
- [x] 8.5 SDK 版本基线统一为 `0.1.0`：更新 `audit-rules.md`、`audits/server-storage.md` 的版本门禁为「≥ `0.1.0` 无条件阻断」，并同步 `02-best-practices.md`、`99-api-reference.md` CDN 示例版本

## 9. 验证与收尾

- [x] 9.1 用 vendored `validate.cjs` 跑通 examples（table_config + queries）确认校验器可用
- [x] 9.2 全文自检：两套 JSON 格式区分清晰、vendored 文件均标注来源；用户维度存储读写/同步核心逻辑与既有生成物结构未变（仅新增第 2.5 步类型声明、值类型对照提示与 SDK 版本基线上调）
- [x] 9.3 更新 `evals/evals.json`：新增至少 1 条公共表正向用例（识别 → 生成 TableConfig + game-common-table.js）与 1 条审查负向用例（查询不命中索引 / incrNumber 表 creatorOnlyModify=true）

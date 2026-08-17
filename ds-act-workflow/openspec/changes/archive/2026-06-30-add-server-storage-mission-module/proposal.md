## Why

服务端存储方案（mini-game-data-sdk）目前只支持跨设备读写与排行榜，无法把玩家的数值进度直接驱动大神活动的任务系统与奖励发放。运营要为小游戏配置「数值达到 N 完成任务、自动发奖」时，缺少从字段定义到 CMS 任务模块的端到端引导，配置极易出错。同时，写入服务端后页面常因异步未刷新而显示旧值。

## What Changes

- **NUMBER key 数值任务开关**：服务端存储字段确认阶段，对 `NUMBER` 类型字段（仅 NUMBER，其他类型一律不可）询问是否配置为「数值任务」（本数值达到阈值 N 即完成任务）。
- **导出 JSON 携带 `missionEnabled`**：被标记为数值任务的 NUMBER key，在 DataHub 批量导入 JSON 中携带 `missionEnabled: true`，后端导入即自动开启该 key 的「任务统计」，无需手动切 CMS 开关。
- **ds-act-sdk 依赖门控**：接入服务端存储时先询问是否需要「小游戏数值任务与奖励发放」。选「是」→ 确认是否已接入 ds-act-sdk（mode6）活动；未接入则先引导完成 ds-act-sdk 接入再回到服务端存储。选「否」→ 不引入任务能力，不依赖 ds-act-sdk。
- **CMS 任务模块配置引导**：新增图1→图2 端到端引导。图1（小游戏侧：数值管理→任务操作）复制「外部(游戏/CC)任务类型」与「第三方任务扩展字段」；图2（活动侧：ds-act-sdk 的 actId 对应活动→管理模块）新增模块并粘贴；若已存在该类型模块则引导编辑并确认对应数据是否已复制。
- **写入成功后同步页面（通用规则）**：所有 key 写入成功后，必须将写入成功的数值状态同步刷新到页面，避免异步数据显示问题。新增为强制最佳实践规则。
- **`missionEnabled` 字段文档化**：在 DataHub Key JSON 规范文档中补充 `missionEnabled` 字段说明（仅 NUMBER 适用）。
- **SKILL.md 描述更新**：mode5 服务端存储描述补「小游戏数值任务与奖励发放」。

## Capabilities

### New Capabilities
- `server-storage-mission-module`: 服务端存储 NUMBER key 的数值任务能力——数值任务开关、`missionEnabled` 导出、ds-act-sdk 依赖门控、CMS 任务模块配置引导、写入成功后同步页面规则。

### Modified Capabilities
<!-- 无既有 spec 的需求变更 -->

## Impact

- 文档（skill 引导内容）：
  - `references/server-storage/00-intake.md`：开头加「是否配数值任务」门控 + ds-act-sdk 依赖检查；NUMBER key 标记数值任务。
  - `references/server-storage/02-best-practices.md`：新增「写入成功后同步页面」规则。
  - `references/server-storage/04-cms-register.md`：JSON 携带 `missionEnabled` + 图1→图2 任务模块配置引导。
  - `references/server-storage/json-key-comment.md`：文档化 `missionEnabled` 字段。
  - `SKILL.md`：line 128 mode5 描述补「小游戏数值任务与奖励发放」。
- 依赖：数值任务路径依赖已接入 ds-act-sdk（mode6）的活动（actId）。
- 无应用运行时代码改动；仅 skill 引导文档内容。

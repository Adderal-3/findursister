## ADDED Requirements

### Requirement: 数值任务能力门控

服务端存储引导流程开始时，系统 SHALL 询问用户是否需要「小游戏数值任务与奖励发放」。该能力 SHALL 依赖已接入 ds-act-sdk（mode6）的活动。

#### Scenario: 用户需要数值任务且已接入 ds-act-sdk
- **WHEN** 用户在服务端存储引导开头选择「需要小游戏数值任务与奖励发放」，并确认已接入 ds-act-sdk 活动
- **THEN** 系统继续服务端存储流程，并记录该活动的 actId 供后续 CMS 任务模块引导使用

#### Scenario: 用户需要数值任务但未接入 ds-act-sdk
- **WHEN** 用户选择「需要数值任务」但确认尚未接入 ds-act-sdk 活动
- **THEN** 系统 SHALL 引导用户先完成 ds-act-sdk（mode6）活动接入，完成后再回到服务端存储引导

#### Scenario: 用户不需要数值任务
- **WHEN** 用户选择「不需要小游戏数值任务与奖励发放」
- **THEN** 系统 SHALL 走正常服务端存储流程，不引入任务能力，不依赖 ds-act-sdk 活动接入

### Requirement: NUMBER key 数值任务标记

在字段确定阶段，系统 SHALL 仅对 `NUMBER` 类型字段询问是否配置为数值任务（本数值达到阈值 N 即完成任务）。非 NUMBER 类型字段 MUST NOT 出现该询问，也不可被标记为数值任务。

#### Scenario: NUMBER 字段被询问数值任务
- **WHEN** 字段表中存在 `NUMBER` 类型字段且用户已开启数值任务能力门控
- **THEN** 系统 SHALL 对该字段询问是否配置为数值任务，并在字段表中记录其数值任务标记

#### Scenario: 非 NUMBER 字段不可配数值任务
- **WHEN** 字段为 `STRING` / `BOOLEAN` / `STRING_LIST` / `NUMBER_LIST` / `BOOLEAN_LIST` 类型
- **THEN** 系统 MUST NOT 询问其数值任务配置，且该字段不携带任何任务标记

### Requirement: 导出 JSON 携带 missionEnabled

被标记为数值任务的 NUMBER key，系统 SHALL 在 DataHub 批量导入 JSON 中为该条目添加 `missionEnabled: true`。系统 MUST 保证仅 `type` 为 `NUMBER` 的条目携带该字段。

#### Scenario: 数值任务 key 导出
- **WHEN** 生成 DataHub 批量导入 JSON 且某 NUMBER key 被标记为数值任务
- **THEN** 该条目 SHALL 包含 `"missionEnabled": true`，导入后端后自动开启该 key 的「任务统计」，无需手动在 CMS 切换开关

#### Scenario: 自检拦截非法 missionEnabled
- **WHEN** JSON 输出前自检发现某条目带 `missionEnabled` 但其 `type` 非 `NUMBER`
- **THEN** 系统 MUST 拒绝输出该 JSON 并修正后重新生成

### Requirement: CMS 任务模块配置引导

系统 SHALL 提供从小游戏侧到活动侧的端到端 CMS 任务模块配置引导（图1 复制 → 图2 粘贴），并覆盖「新增模块」与「编辑已有模块」两种情况。

#### Scenario: 小游戏侧复制任务配置
- **WHEN** 数值任务 key 已通过 missionEnabled 开启任务统计
- **THEN** 系统 SHALL 引导用户到「活动 → 小游戏管理 → 对应 minigameId → 数值管理 → 任务操作」复制「外部(游戏/CC)任务类型」与「第三方任务扩展字段」

#### Scenario: 活动侧无该类型模块
- **WHEN** 用户在 ds-act-sdk 的 actId 对应活动的「管理模块」下没有对应任务类型模块
- **THEN** 系统 SHALL 引导「新增模块 → 基于 uid 的大神用户第三方统计任务」，粘贴外部任务类型与第三方扩展字段并设置阈值 N

#### Scenario: 活动侧已有该类型模块
- **WHEN** 用户在该活动管理模块下已存在对应任务类型模块
- **THEN** 系统 SHALL 引导用户编辑该模块，并确认「外部任务类型 / 第三方扩展字段」是否已正确复制进来

### Requirement: 写入成功后同步页面

所有 key 写入服务端成功后，系统 SHALL 要求将写入成功的数值状态同步刷新到页面对应 UI，避免异步数据显示问题。该规则适用于全部写入，不限于数值任务 key。

#### Scenario: 写入成功刷新 UI
- **WHEN** `obfuscatedWriteData` 或 `obfuscatedBatchWriteData` 写入成功
- **THEN** 业务代码 SHALL 用写入成功回包的数值状态刷新页面对应显示，禁止仅做乐观更新或不刷新

### Requirement: missionEnabled 字段文档化

DataHub Key JSON 规范文档 SHALL 收录 `missionEnabled` 字段说明，标明其类型、适用范围与后端行为。

#### Scenario: 规范文档收录 missionEnabled
- **WHEN** 查阅 `json-key-comment.md`
- **THEN** 文档 SHALL 说明 `missionEnabled` 为布尔字段、仅 `NUMBER` 类型适用、为 `true` 时后端导入即开启该 key 的任务统计

### Requirement: 数值任务代码标记与审查

生成 `game-server-storage.js` 时，存在数值任务字段的项目 SHALL 在文件顶部注释写入 `__MISSION_KEYS__` 标记。审查阶段 SHALL 据此校验 ds-act-sdk 依赖，并检查所有写入成功后是否同步页面。

#### Scenario: 生成数值任务标记
- **WHEN** 字段表存在「数值任务: ✅」字段且生成 `game-server-storage.js`
- **THEN** 文件顶部注释 SHALL 包含 `// __MISSION_KEYS__: [<逗号分隔的任务 key>]`；无数值任务字段时 MUST NOT 生成该行

#### Scenario: 审查校验数值任务依赖 ds-act-sdk
- **WHEN** 审查发现 `game-server-storage.js` 顶部含 `__MISSION_KEYS__` 但被审查 HTML 未引入 ds-act-sdk
- **THEN** 审查 SHALL 阻断（A 档），并引导用户先完成 mode6 ds-act-sdk 接入

#### Scenario: 审查校验写入成功后同步页面
- **WHEN** 审查发现写入调用成功分支内未见任何 UI 刷新或本地状态回写
- **THEN** 审查 SHALL 输出警告（B 档），提示用写入回包的数值状态刷新页面

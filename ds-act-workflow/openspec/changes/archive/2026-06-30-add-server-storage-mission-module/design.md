## Context

服务端存储引导是一套 8 步流程（`references/server-storage/`），从字段确定 → 同步策略 → 代码生成 → 榜单 UI → CMS 字段注册 → 审查。本次新增「数值任务模块」横跨字段确认、CMS 注册、最佳实践、JSON 规范四处，且与既有的 ds-act-sdk（mode6）活动接入产生依赖关系。任务模块由大神 CMS 后台 + ds-act-sdk 活动共同承载，前端 H5 不直接写任务接口——玩家数值写入 mini-game-data-sdk 后，后端据 `missionEnabled` 的 key 自动推送任务完成事件并发奖。

## Goals / Non-Goals

**Goals:**
- 仅对 `NUMBER` 类型字段提供数值任务能力；其他类型一律不可配置。
- 数值任务路径明确依赖 ds-act-sdk 活动，未接入时引导先接入，避免半成品配置。
- 不需要任务能力的用户完全不被 ds-act-sdk 依赖打扰。
- 端到端 CMS 配置引导（图1 复制 → 图2 粘贴），覆盖「新增模块」与「已有模块编辑」两种情况。
- 所有 key 写入成功后强制同步页面，消除异步显示问题。

**Non-Goals:**
- 不改动 mini-game-data-sdk 库本身的 API。
- 不在前端实现任务进度查询/领奖 UI（任务面板/回流任务由 mode6 ds-act-sdk 负责）。
- 不支持「累加型」「最小值型」等其他任务类型——当前仅 `minigame_common_task_max`（达到阈值 N）。
- 不引入新的代码运行时依赖；本次仅修改 skill 引导文档。

## Decisions

### D1：数值任务仅限 NUMBER，开关时机在字段确认阶段
在 `00-intake.md` 锁定字段表时，对每个 `NUMBER` key 询问是否配为数值任务。非 NUMBER 字段不出现该询问。
- 理由：任务类型 `minigame_common_task_max` 语义是「数值达到 N」，只有数值字段成立；提前在字段阶段决定可一次性带入 04 的导出 JSON。
- 备选：在 04 CMS 注册阶段才问 → 否决，字段表与 JSON 不同源易遗漏。

### D2：`missionEnabled: true` 进 DataHub 批量导入 JSON
被标记数值任务的 NUMBER key，导入 JSON 增加 `missionEnabled: true`。后端导入即开启该 key 的「任务统计」（已确认后端支持），生成 `外部任务类型 = minigame_common_task_max` 与 `第三方扩展字段 = { gameId, missionId: <key> }`。
- 理由：免去用户手动逐个切 CMS 开关。
- `missionEnabled` 仅对 NUMBER 合法；JSON 自检阶段须校验「带 missionEnabled 的条目 type 必须为 NUMBER」。

### D3：ds-act-sdk 依赖门控放在服务端存储流程开头
进入服务端存储引导即询问「是否需要小游戏数值任务与奖励发放」：
```
是 → 确认已接入 ds-act-sdk(mode6)活动?
      ├─ 是 → 继续，记录 actId 供图2 引导
      └─ 否 → 引导先去 mode6 接入活动，完成后回来
否 → 正常存储流程，不引入任务、不依赖 ds-act-sdk
```
- 理由：图2「指定活动」= ds-act-sdk 接入时填的 actId 对应活动；没有活动则任务模块无处挂载。
- 备选：在 CMS 注册阶段才检查依赖 → 否决，用户可能已生成代码才发现缺活动，返工成本高。

### D4：CMS 配置引导覆盖「新增」与「已有」两路
图2 活动侧管理模块：
- 无该类型模块 → 新增模块 → 基于 uid 的大神用户第三方统计任务 → 粘贴两项 → 设阈值 N。
- 已有该类型模块 → 引导编辑 → 确认「外部任务类型 / 第三方扩展字段」是否已复制进来。
- 理由：同一活动可能已配过任务模块，盲目新增会重复。

### D5：「写入成功后同步页面」作为通用强制规则
范围是所有 key（非仅任务 key）。规则：`obfuscatedWriteData` / `obfuscatedBatchWriteData` 成功回调后，用写入成功的数值状态刷新页面对应 UI，禁止只做乐观更新或不刷新。
- 理由：服务端写入是异步，页面若不以写入成功结果为准会显示旧值；任务/发奖场景尤其需要数值与服务端一致。
- 落点：`02-best-practices.md` 新增一条规则 + `00-intake`/`04` 视情提示。

## Risks / Trade-offs

- [后端 `missionEnabled` 行为与文档不符（如字段名/语义偏差）] → 在 `json-key-comment.md` 明确「仅 NUMBER 适用、导入即开启任务统计」，并保留图1 手动开关路径作为兜底说明。
- [用户跳过 ds-act-sdk 接入直接配任务] → 门控在流程开头强制确认，未接入即中断并引导。
- [写入同步规则被理解为"每次都重新拉取"造成额外请求] → 规则措辞为「用写入成功回包的数值状态刷新」，优先复用回包，不强制额外 read。
- [已有任务模块被重复新增] → D4 双路引导显式要求先检查已有模块。

## Migration Plan

纯文档（skill 引导）变更，无运行时迁移。已接入服务端存储的旧项目：路径 D（`game-server-storage.js` 已存在）追加「新增数值任务」分支即可，不影响既有字段。

## Open Questions

- `第三方扩展字段` 中 `gameId` 取值来源：是 miniGameId 还是另一个 gameId？图1 显示为独立 `gameId`，引导文案需注明从 CMS 任务统计配置弹窗直接复制，而非让用户手填，规避混淆。

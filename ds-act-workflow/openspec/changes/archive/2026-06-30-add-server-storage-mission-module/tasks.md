## 1. 流程门控与字段标记（00-intake.md）

- [x] 1.1 在服务端存储引导开头新增「是否需要小游戏数值任务与奖励发放」询问
- [x] 1.2 选「是」时增加 ds-act-sdk 接入确认；未接入则引导先去 mode6 接入活动再返回
- [x] 1.3 选「否」时明确不引入任务能力、不依赖 ds-act-sdk
- [x] 1.4 字段确定阶段对 NUMBER key 增加「是否配为数值任务」询问，记录到字段表
- [x] 1.5 明确非 NUMBER 类型不出现该询问、不可标记数值任务
- [x] 1.6 路径 D（已存在 game-server-storage.js）追加「新增数值任务」分支

## 2. 导出 JSON 与 CMS 引导（04-cms-register.md）

- [x] 2.1 在 5.2 批量导入 JSON 规则中加入：数值任务 NUMBER key 携带 `missionEnabled: true`
- [x] 2.2 在 5.2.5 输出后自检加入「带 missionEnabled 的条目 type 必须为 NUMBER」校验
- [x] 2.3 新增图1 引导：小游戏管理→对应 minigameId→数值管理→任务操作，复制外部任务类型与第三方扩展字段
- [x] 2.4 新增图2 引导：全平台活动列表→ds-act-sdk 的 actId 对应活动→管理模块
- [x] 2.5 图2 覆盖「无该类型模块→新增模块并粘贴、设阈值 N」分支
- [x] 2.6 图2 覆盖「已有该类型模块→编辑并确认数据已复制」分支
- [x] 2.7 注明 gameId/扩展字段直接从 CMS 任务统计弹窗复制，避免手填

## 3. 写入同步规则（02-best-practices.md）

- [x] 3.1 新增强制规则：所有 key 写入成功后用回包数值状态同步刷新页面
- [x] 3.2 在「常见问题与正确写法」补一条对应反例/正解

## 4. JSON 规范文档（json-key-comment.md）

- [x] 4.1 在 2.1 通用字段表加入 `missionEnabled`（布尔、仅 NUMBER 适用、导入即开启任务统计）
- [x] 4.2 补一个带 missionEnabled 的 NUMBER 示例条目

## 5. SKILL 描述更新（SKILL.md）

- [x] 5.1 mode5 服务端存储描述（line 128）补「小游戏数值任务与奖励发放」

## 6. 校验

- [x] 6.1 运行 `openspec validate add-server-storage-mission-module` 通过
- [x] 6.2 通读改动文档，确认门控分支与图1→图2 引导前后一致

## 7. 审查（audit）扩展

- [x] 7.1 `02-best-practices.md` 代码模板加 `__MISSION_KEYS__` 顶部标记（仅 MISSION_ENABLED）
- [x] 7.2 `audits/server-storage.md` A 档加「数值任务依赖 ds-act-sdk」阻断 + 提醒输出
- [x] 7.3 `audits/server-storage.md` B 档加「写入成功后同步页面」警告 + autofix 提示
- [x] 7.4 `audits/index.md`「服务端存储专项的额外入口」段补注：server-storage.md A 档含数值任务依赖 ds-act-sdk、B 档含写入成功后同步页面（规则 #15）
- [x] 7.5 重新运行 `openspec validate` 通过

## 8. 自测 evals

- [x] 8.1 evals.json 新增门控（需要/不需要数值任务）两条（id 82、83，rebase 后重编号）
- [x] 8.2 新增 NUMBER 标记+导出 missionEnabled、非 NUMBER 拒绝两条（id 84、85）
- [x] 8.3 新增 CMS 图1→图2 配置引导一条（id 86）
- [x] 8.4 新增写入同步审查、mission 依赖 ds-act-sdk 审查两条（id 87、88）
- [x] 8.5 校验 evals.json 合法（共 96 条，含 git-gate 89–96 重编号修复重复 id）

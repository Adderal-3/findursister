# 第 5 步：CMS 字段注册（代码生成完成后必做）

> 目标：在大神 CMS 后台把字段表里的所有 recordKey 注册好，代码才能真正写入和读取数据。
> 这一步必须在内网验证之前完成——字段没注册，SDK 调用会静默失败或返回空值。
> 输入：第 1 步锁定的字段表。

---

## 5.1 生成注册清单（文字）

根据锁定的字段表，输出「待注册字段清单」：

```
📋 需要在 CMS 后台注册以下字段（共 N 个）：

| 序号 | recordKey | 类型 | 说明 | 是否关联排行榜 | 客态可读 |
|------|-----------|------|------|--------------|----------|
| 1 | bake_num | number | 当前点数 | 否 | 否 |
| 2 | lifetime_points | number | 历史累计点数 | ✅ 是（需关联榜单） | ✅ 是 |
| 3 | prestige_level | number | 飞升等级 | 否 | 否 |
| 4 | buildings_json | string | 建筑列表（JSON序列化） | 否 | 否 |
| 5 | last_save | number | 最后存档时间戳 | 否 | 否 |
```

---

## 5.2 生成 DataHub 批量导入 JSON（强制规则）

⚠️ **本节为 CMS 批量导入 JSON 的唯一格式规范，Agent 必须逐条遵守，不得跳过任何字段。**

### 5.2.1 生成前自检（Agent 内部执行，不输出给用户）

在输出 JSON 之前，Agent 须在内存中完成以下检查：

1. **每个 recordKey 都确定好了 defaultValue 吗？** 参考字段表中该字段的代码默认值、第 3 步代码中的初始值、`DEFAULTS` 对象中的值。
2. **type 值只能为以下 6 种之一：** `STRING` / `NUMBER` / `BOOLEAN` / `STRING_LIST` / `NUMBER_LIST` / `BOOLEAN_LIST`（全大写，严格匹配）。
3. **key 值符合正则 `^[A-Za-z0-9_-]{1,64}$` 吗？** 只允许字母、数字、下划线、短横线。
4. **name 非空字符串吗？** 不能为空、null 或纯空格。

### 5.2.2 JSON 字段映射（逐字段对照）

从第 1 步的字段表到 JSON，按以下映射**逐一生成每条**：

| 字段表来源 | JSON 字段 | 说明 | 必填 |
|-----------|----------|------|------|
| `recordKey` | `key` | 字段标识符，只允许 `[A-Za-z0-9_-]` | ✅ 必填 |
| 字段用途说明 | `name` | 中文可读名，非空 | ✅ 必填 |
| SDK 类型 | `type` | **必须大写**：`NUMBER` / `STRING` / `BOOLEAN` / `NUMBER_LIST` / `STRING_LIST` / `BOOLEAN_LIST` | ✅ 必填 |
| 代码默认值 | `defaultValue` | 类型必须与 type 匹配，见下表 | ✅ 必填 |
| 客态可读（字段表标记） | `allowGuestRead` | 布尔值；字段表标记「客态可读: ✅」时设为 `true`，否则**不输出此字段**（不填默认不开启） | ❌ 可选 |
| 数值任务（字段表标记） | `missionEnabled` | 布尔值；字段表「数值任务: ✅」时设为 `true`，导入后端即自动开启该 key 的「任务统计」。**仅 `type: NUMBER` 可携带此字段**；未标记的字段**不输出此字段** | ❌ 可选 |

> ⚠️ **强制规则 — 不可跳过**：上方映射表中 `missionEnabled` 和 `allowGuestRead` 标注为「可选」，**但「可选」仅指"当字段表未标记时可不输出"**。如果字段表中「数值任务」列标了 ✅，则 `missionEnabled: true` **实际上等价于必填**——生成该条目时不可因"可选"二字而省略。`allowGuestRead` 同理。

> 📋 **生成每条 JSON 时，逐列对照字段表：数值任务列为 ✅ → 加 `missionEnabled: true`；客态可读列为 ✅ → 加 `allowGuestRead: true`。不允许跳过任何标记列。

### 5.2.3 defaultValue 类型匹配规则（严格对照）

| type | defaultValue 的 JSON 类型 | 示例 |
|---|---|---|
| `STRING` | string | `""`, `"玩家"` |
| `NUMBER` | number | `0`, `100` |
| `BOOLEAN` | boolean | `true`, `false` |
| `STRING_LIST` | string[] | `[]` |
| `NUMBER_LIST` | number[] | `[]` |
| `BOOLEAN_LIST` | boolean[] | `[]` |

> ⚠️ **defaultValue 必须填写**，不能省略。没有默认值概念的字段（如每次变动的 `score`）填 `0` 或 `""`。后端 `parseAndValidateDefaultValue()` 对 null 视为未设置，但不填字段本身也会触发校验失败。

### 5.2.4 输出模板

在输出 JSON 之前，必须先打印以下核对结果（**必须可见，不可省略**）：

```
🔍 输出前核对：
  · 字段表共 [N] 条
  · 数值任务标记 ✅ 的 key：[逐一列出；无则写"无"]
  · 客态可读标记 ✅ 的 key：[逐一列出；无则写"无"]
  → 已确认：每个 ✅ 列对应的 JSON 条目均已加对应字段
```

然后输出 JSON 模板：

```
📋 DataHub 批量导入 JSON（可直接复制到后台「批量导入键值对设计」功能）：

[此处输出标准 JSON 数组]
```

JSON 每条须包含 `key`、`name`、`type`、`defaultValue` 四个字段；客态可读字段额外加 `allowGuestRead: true`；数值任务字段（仅 NUMBER）额外加 `missionEnabled: true`。示例格式：

```json
[
  { "key": "bake_num", "name": "当前点数", "type": "NUMBER", "defaultValue": 0 },
  { "key": "lifetime_points", "name": "历史累计点数", "type": "NUMBER", "defaultValue": 0, "allowGuestRead": true },
  { "key": "task_score", "name": "任务积分", "type": "NUMBER", "defaultValue": 0, "missionEnabled": true },
  { "key": "nickname", "name": "用户昵称", "type": "STRING", "defaultValue": "玩家" },
  { "key": "passed", "name": "是否通关", "type": "BOOLEAN", "defaultValue": false },
  { "key": "unlocked_levels", "name": "已解锁关卡列表", "type": "STRING_LIST", "defaultValue": [] },
  { "key": "daily_scores", "name": "每日得分记录", "type": "NUMBER_LIST", "defaultValue": [] },
  { "key": "feature_flags", "name": "功能开关列表", "type": "BOOLEAN_LIST", "defaultValue": [] }
]
```

> ⚠️ Agent 输出时必须根据第 1 步的实际字段表生成，禁止输出以上示例或任何与字段表不匹配的 JSON。

### 5.2.5 输出后自检（必须可见输出，不可省略）

JSON 输出完毕后，必须打印以下自检结果：

```
✅ 逐条核对完成：
  [1] key / name / type / defaultValue 齐全
  [2] type 全大写枚举值（NUMBER / STRING / BOOLEAN / *_LIST）
  [3] defaultValue 类型与 type 匹配
  [4] key 符合正则 [A-Za-z0-9_-]{1,64}
  [5] name 非空字符串
  [6] 客态可读标记 ✅ 的字段 → allowGuestRead: true；未标记的字段 → 无
  [7] 数值任务标记 ✅ 的 NUMBER 字段 → missionEnabled: true；非 NUMBER 绝不携带
```

**任一项不通过 → 立即撤回 JSON，纠正后重新输出完整 JSON + 自检，不得跳过。**

---

## 5.3 输出注册引导

JSON 输出后，输出引导文字：

```
上方 JSON 已可复制。

后台录入路径：
  测试环境：https://god-cms-test.gameyw.netease.com/cms/
  活动 → 小游戏管理 → 选择游戏 → 数值管理 → 「批量导入键值对设计」→ 粘贴 → 导入

请问现在方便录入吗？
  [Y] 我现在去录入，录完告诉我
  [N] 先跳过，后面再录（审查阶段会提醒）
```

**用户选 N 时：**
- 代码中 `GAME_ID_CONFIG` 和 `BILLBOARD_CONFIG` 保持现有占位符不变
- 在 `game-server-storage.js` 顶部注释写入 `__FIELDS_NOT_REGISTERED__` 标记
- 附录已生成的 DataHub JSON，方便后续粘贴

---

## 5.4 引导进入后台

```
请按以下步骤在 CMS 后台注册字段：

【测试环境（现在必做）】
🔗 https://god-cms-test.gameyw.netease.com/cms/
操作路径：活动 → 小游戏管理 → 找到对应游戏 → 数值管理

在「数值管理」页面：
  1. 粘贴上方 JSON 到「批量导入键值对设计」→ 点击导入
  2. [若有排行榜字段] 在「榜单配置」中新建榜单，关联对应字段
     ⚠️ 新建完成后，复制「榜单 ID」告诉 Agent，Agent 会自动更新代码

【正式环境（上线前必做，现在可跳过）】
🔗 https://god-cms.gameyw.netease.com/cms/
操作路径相同，重复一遍所有字段和榜单的创建步骤。
正式环境的 billboardId 同样告诉 Agent。
```

---

## 5.4.1 数值任务模块配置（仅当存在 missionEnabled 字段）

> **仅当字段表存在「数值任务: ✅」字段时执行。** 前提：用户已通过 `## 1.0.0` 门控确认接入 ds-act-sdk（mode6）活动并提供了 `ACT_ID`。
> 目标：把携带 `missionEnabled` 的 key 与 ds-act-sdk 活动的任务模块对接，完成「数值达到 N → 完成任务 → 发奖」。
> 前置：上方批量导入 JSON 已导入成功（`missionEnabled: true` 已让后端自动开启该 key 的「任务统计」）。

整体分两步：**图1 小游戏侧复制** → **图2 活动侧粘贴**。

### 第 1 步（图1）：小游戏侧复制任务配置

```
🔗 测试环境：https://god-cms-test.gameyw.netease.com/cms/
   正式环境：https://god-cms.gameyw.netease.com/cms/

操作路径：活动 → 小游戏管理 → 找到对应 minigameId 小游戏 → 数值管理 → 任务操作

对每个数值任务 key（带 missionEnabled），打开其「任务统计配置」弹窗，复制两项：
  1. 外部(游戏/CC)任务类型  → 点弹窗内「复制」按钮（通常形如 minigame_common_task_max）
  2. 第三方任务扩展字段      → 点弹窗内「复制」按钮，内容形如：
       {
         "gameId": "xxxxxxxx",
         "missionId": "<你的 key 名>"
       }
```

> ⚠️ **`gameId` 与 `第三方任务扩展字段` 一律从「任务统计配置」弹窗直接点「复制」获取，不要手填。** 弹窗里的 `gameId` 由后台生成，`missionId` 即该 key 名；手敲极易出错导致任务不触发。

### 第 2 步（图2）：活动侧粘贴到任务模块

```
操作路径：活动 → 全平台活动列表 → 找到 ds-act-sdk 接入时配置的活动（ACT_ID 对应活动）→ 管理模块
```

进入「管理模块」后，先判断该活动下是否已存在「基于 uid 的大神用户第三方统计任务」类型模块：

**情况 A — 没有该类型模块（新增）：**
```
1. 点「新增模块」
2. 任务类型选择 → 「基于 uid 的大神用户第三方统计任务」
3. 数据来源选「数据中台」
4. 把图1 复制的「外部(游戏/cc)任务类型」粘贴到对应输入框
5. 把图1 复制的「第三方任务扩展字段」粘贴到对应输入框 → 点「JSON 格式校验」确认通过
6. 填写「任务周期内执行次数：阈值（即 N）」= 你的数值任务完成门槛
7. 保存
```

**情况 B — 已存在该类型模块（编辑）：**
```
1. 找到已有的「基于 uid 的大神用户第三方统计任务」模块 → 点编辑
2. 核对「外部(游戏/cc)任务类型」与「第三方任务扩展字段」是否就是图1 复制的那两项
   · 不一致或为空 → 粘贴更新，并「JSON 格式校验」
   · 已正确复制进来 → 确认阈值 N 无误即可
3. 保存
```

完成后，该 key 写入数值达到阈值 N 时即自动完成任务并发奖。

> **多个数值任务 key：** 逐个 key 重复图1→图2（每个 key 对应一个任务模块）。
> **测试 + 正式：** 两个环境都要各配一遍（minigameId 与活动均按环境区分）。

---

## 5.5 确认后的检查

用户确认完成后，输出状态摘要：

```
✅ 已收到确认

当前 ID 填写状态：
  · GAME_ID_CONFIG.devMiniGameId：[已填 / 占位符待填]
  · GAME_ID_CONFIG.proMiniGameId：[已填 / 占位符待填 ⚠️ 上线前必须补]
  · BILLBOARD_CONFIG.devBillboardId：[已填 / 无排行榜 / 占位符待填]
  · BILLBOARD_CONFIG.proBillboardId：[已填 / 无排行榜 / 占位符待填 ⚠️ 上线前必须补]

提醒：
  · 字段类型创建后通常不可更改，如有疑问请先在测试环境确认

进入第 6 步：代码审查 →
```

---

## 5.6 注册完成后的下一步

字段注册确认完成后，读取 `{skill_dir}/references/audits/index.md`（服务端存储专项节）执行第 6 步代码审查。

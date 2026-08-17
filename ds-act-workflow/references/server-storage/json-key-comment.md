# DataHub Key 配置 — JSON 批量导入格式说明

本文档说明「批量导入键值对设计」功能所接受的 JSON 格式。所有字段定义均与后端 DictSaveParam / ValidationRules / RateLimitSaveParam 的服务端校验逻辑保持一致。

---

## 1. 顶层结构

顶层必须是 **JSON 数组**，每个元素是一个 Key 的完整配置。

```json
[
  { "key": "xxx", "name": "xxx", "type": "STRING", ... },
  { "key": "yyy", "name": "yyy", "type": "NUMBER", ... }
]
```

**约束：**
- 顶层必须是数组（`[...]`），不能是对象 `{}`
- 数组不能为空（长度 ≥ 1）
- 非数组或空数组都会在校验阶段被直接拒绝

---

## 2. 字段总览

### 2.1 通用字段（所有 type 共用）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `key` | `string` | ✅ | 业务 Key，正则 `^[A-Za-z0-9_-]{1,64}$`。服务端仅在**新建**时校验此正则；编辑已有 Key 时不允许修改 key 名 |
| `name` | `string` | ✅ | 运营展示名称（服务端字段 `displayName`，`@NotBlank`），非空字符串 |
| `type` | `string` | ✅ | 数据类型，必须为以下枚举之一：`STRING` / `NUMBER` / `BOOLEAN` / `STRING_LIST` / `NUMBER_LIST` / `BOOLEAN_LIST`。注意后端 `DataValueType.valueOf()` 严格匹配，大小写必须完全一致 |
| `defaultValue` | 见 2.2 | ❌ | 默认值，**类型必须与 `type` 匹配**（见下表）。不填或为 null 表示无默认值 |
| `description` | `string` | ❌ | 描述文字，后端无任何长度/格式限制 |
| `validationEnabled` | `boolean` | ❌ | 校验总开关，缺省视为 `false`。**仅当为 `true` 时，才会构建并发送校验规则到后端**；为 `false` 或未设置时，即使写了 `min`/`max` 等校验字段也会被静默忽略 |
| `rateLimitEnabled` | `boolean` | ❌ | 写入频控开关，缺省视为 `false` |
| `missionEnabled` | `boolean` | ❌ | 数值任务开关，缺省视为 `false`。**仅 `type: "NUMBER"` 适用**，其他类型携带此字段会被拒绝。为 `true` 时，后端导入即自动开启该 Key 的「任务统计」（等价于 CMS 数值管理里手动开启任务统计开关），写入该 Key 时会推送「数值达到阈值 N 完成任务」事件到任务系统。后续仍需在对应活动的任务模块里完成挂载（见 `04-cms-register.md` 5.4.1） |

### 2.2 defaultValue 类型匹配表

| type | defaultValue 的 JSON 类型 | 示例 |
|---|---|---|
| `STRING` | `string` | `"hello"` |
| `NUMBER` | `number` (finite) | `0`, `100`, `3.14` |
| `BOOLEAN` | `boolean` | `true`, `false` |
| `STRING_LIST` | `string[]` | `["a", "b"]` |
| `NUMBER_LIST` | `number[]` (元素均为 finite) | `[1, 2, 3]` |
| `BOOLEAN_LIST` | `boolean[]` | `[true, false]` |

> **注意：** `null` 不是合法的 defaultValue。后端 `parseAndValidateDefaultValue()` 会检查 JSON 解析结果是否为 null，null 等同于未设置。

---

## 3. 校验字段（按 type 分类）

校验字段的生效条件是 `validationEnabled: true`。

### 3.1 `type: "STRING"` — 文本校验

对应后端 `StringValidationRules`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `minLength` | `integer` | 最小长度 |
| `maxLength` | `integer` | 最大长度 |
| `sensitiveWordFilter` | `boolean` | 是否开启敏感词过滤 |
| `pattern` | `string` | 正则表达式（Java 正则语法，非 JS 语法） |

```json
{
  "key": "title",
  "name": "称号",
  "type": "STRING",
  "defaultValue": "新手",
  "validationEnabled": true,
  "minLength": 1,
  "maxLength": 20,
  "sensitiveWordFilter": true
}
```

### 3.2 `type: "NUMBER"` — 数字校验

对应后端 `NumberValidationRules`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `min` | `number` | 最小值 |
| `max` | `number` | 最大值 |
| `step` | `number` | 步长精度（1 = 整数，0.1 = 一位小数，10 = 10的倍数，5 = 5的倍数） |

```json
{
  "key": "score",
  "name": "最高分",
  "type": "NUMBER",
  "defaultValue": 0,
  "validationEnabled": true,
  "min": 0,
  "max": 999999,
  "step": 1
}
```

### 3.3 `type: "BOOLEAN"` — 开关

**无校验字段。** 后端 `BooleanValidationRules` 仅有一个 `enabled` 开关，无子规则。

```json
{
  "key": "passed",
  "name": "是否通关",
  "type": "BOOLEAN",
  "defaultValue": false
}
```

> 此类型不需要写 `validationEnabled`。

### 3.4 `type: "STRING_LIST" | "NUMBER_LIST" | "BOOLEAN_LIST"` — 列表校验

对应后端 `ListValidationRules`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `minItems` | `integer` | 最少元素个数 |
| `maxItems` | `integer` | 最多个元素数 |
| `uniqueItems` | `boolean` | 元素是否不允许重复 |

```json
{
  "key": "reward_ids",
  "name": "已领取奖励ID",
  "type": "STRING_LIST",
  "defaultValue": [],
  "validationEnabled": true,
  "maxItems": 100,
  "uniqueItems": true
}
```

---

## 4. 频控字段

频控字段的生效条件是 `rateLimitEnabled: true`。

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `rateLimitSeconds` | `integer` | ✅ | 时间窗口（秒），必须为正整数，后端 `RateLimitSaveParam.timeWindowSeconds` |
| `rateLimitMaxRequests` | `integer` | ✅ | 窗口内最大请求次数，必须为正整数，后端 `RateLimitSaveParam.maxRequests` |

**两个字段在 `rateLimitEnabled: true` 时必须同时存在且为正整数**，缺一或非正整数都会造成校验失败。

当 `rateLimitEnabled` 为 `false` 或未设置时：
- 如果该 Key 已存在频控规则 → 导入会**删除**已有频控（后端 `syncRateLimitForDict` 中 `rateLimitEnabled=false` 时调用 `deleteRateLimitIfPresent`）
- 如果该 Key 没有频控规则 → 无操作

```json
{
  "key": "score",
  "name": "最高分",
  "type": "NUMBER",
  "defaultValue": 0,
  "rateLimitEnabled": true,
  "rateLimitSeconds": 60,
  "rateLimitMaxRequests": 20
}
```

---

## 4.5 数值任务字段（missionEnabled）

`missionEnabled` 仅对 `type: "NUMBER"` 生效，为 `true` 时后端导入即开启该 Key 的「任务统计」。

```json
{
  "key": "task_score",
  "name": "任务积分",
  "type": "NUMBER",
  "defaultValue": 0,
  "missionEnabled": true
}
```

> ⚠️ 非 NUMBER 类型携带 `missionEnabled` 会被拒绝。开启后还需到对应活动的任务模块完成挂载（外部任务类型 + 第三方扩展字段 + 阈值 N），详见 `04-cms-register.md` 的 5.4.1。

---

## 5. 完整示例（覆盖所有 6 种 type）

```json
[
  {
    "key": "nickname",
    "name": "用户昵称",
    "type": "STRING",
    "defaultValue": "玩家",
    "description": "用户在本游戏中的昵称",
    "validationEnabled": true,
    "minLength": 1,
    "maxLength": 20,
    "sensitiveWordFilter": true,
    "rateLimitEnabled": true,
    "rateLimitSeconds": 60,
    "rateLimitMaxRequests": 5
  },
  {
    "key": "highest_score",
    "name": "最高分",
    "type": "NUMBER",
    "defaultValue": 0,
    "description": "用户在本游戏中的最高得分",
    "validationEnabled": true,
    "min": 0,
    "max": 99999999,
    "step": 1,
    "rateLimitEnabled": true,
    "rateLimitSeconds": 10,
    "rateLimitMaxRequests": 50
  },
  {
    "key": "is_premium",
    "name": "是否付费用户",
    "type": "BOOLEAN",
    "defaultValue": false,
    "description": "标记用户是否已付费"
  },
  {
    "key": "unlocked_levels",
    "name": "已解锁关卡列表",
    "type": "STRING_LIST",
    "defaultValue": [],
    "description": "用户已解锁的关卡ID列表",
    "validationEnabled": true,
    "maxItems": 200,
    "uniqueItems": true
  },
  {
    "key": "daily_scores",
    "name": "每日得分记录",
    "type": "NUMBER_LIST",
    "defaultValue": [],
    "description": "最近7天每日得分",
    "validationEnabled": true,
    "minItems": 0,
    "maxItems": 7
  },
  {
    "key": "feature_flags",
    "name": "功能开关列表",
    "type": "BOOLEAN_LIST",
    "defaultValue": [false, false, false],
    "description": "三个功能模块的开启状态"
  }
]
```

---

## 6. 校验失败行为

前端采用 **前置全量校验**（`validateImportPayload` 函数）：

1. 先校验 JSON 格式是否合法 → 不合法直接拒绝，返回具体错误行
2. 再逐条校验每条 Key 的必填字段、类型匹配、校验字段类型、频控字段完整性
3. **所有错误一次性聚合返回**，不会出现"修一个错再报下一个"的情况
4. **任一错误存在 → 全部不提交**（全量校验，无部分提交）

校验通过后：
- 弹出二次确认弹窗，展示"将覆盖（N 个）"与"将新增（M 个）"两个分组的 Key 列表
- 用户确认后才串行逐条调用服务端 `dict/save` 接口提交

---

## 7. 服务端行为要点

了解这些有助于理解 JSON 中各字段的作用：

1. **dict/save 支持 upsert**：同一个 `dictKey` 新建/编辑走同一个接口，不需要区分
2. **valueType 变更保护**：如果已存在该 Key 且有用户数据，**不允许修改 valueType**，导入时会失败
3. **频控规则自动同步**：`dict/save` 成功后会自动调用 `syncRateLimitForDict` 处理频控，`rateLimitEnabled=true` 时创建/更新频控规则，`false` 时删除已有规则
4. **defaultValue 存储**：JSON 中的 `defaultValue` 通过 `JSON.stringify` 转为字符串后传到后端，后端再反序列化为 Java 对象存入 MongoDB。导出时反向操作会自动还原类型
5. **validationRules 存储**：后端将 `validationRules` JSON 字符串反序列化为 `ValidationRules` POJO 后存为 MongoDB 内嵌文档
6. **dictKey 可重复导入**：同一 Key 多次导入 = upsert，会覆盖所有字段（默认值/校验/频控），等同于编辑已有 Key

---

## 8. 字段对照表（JSON ←→ 后端）

| JSON 字段 | 后端 DictSaveParam 字段 | 后端类型 | 存储位置 |
|---|---|---|---|
| `key` | `dictKey` | `String @NotBlank` | `DataDict.dictKey` |
| `name` | `displayName` | `String @NotBlank` | `DataDict.displayName` |
| `type` | `valueType` | `String @NotBlank` | `DataDict.valueType` (enum) |
| `defaultValue` | `defaultValue` | `String` (JSON) | `DataDict.defaultValue` (Object) |
| `description` | `description` | `String` | `DataDict.description` |
| `validationEnabled` + 校验字段 | `validationRules` | `String` (JSON → POJO) | `DataDict.validationRules` |
| `rateLimitEnabled` + 频控字段 | 隐式 (通过 `syncRateLimitForDict` 传给 `RateLimitSaveParam`) | — | `RateLimitRule` 独立集合 |

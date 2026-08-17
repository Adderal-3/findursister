<!--
  ⚠️ VENDORED 文件 — 请勿随意手改
  来源：.claude/skills/datahub-table-designer/datahub-table-designer/references/schema.md
  同步时间：2026-07-07
  说明：datahub-table-designer 由服务端团队维护。本文件是其内容的自有副本，
        脱离外部 skill 依赖，便于本仓库自行定位与维护。外部规则若更新，需人工比对同步。
        本副本额外补充了「权限位设置指引」一节（源自 datahub-table-designer/SKILL.md 第 4 步）。
-->

# 公共表（datahub table）配置 schema 速查

导入入口：god-cms「小游戏管理 → 数据管理 → 数据表」tab 的导入功能（TableConfig 与服务端 `POST /minigame/datahub/table/save` 完全同构，upsert：DDL 先建集合 `{tableKey}_{gameId}` + 索引，再存配置）。

## 顶层结构（每个表 = 数组一个元素）

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `tableKey` | string | 是 | `^[a-zA-Z0-9_-]{1,64}$`（字母数字下划线连字符） |
| `displayName` | string | 是 | 1–64 字符 |
| `description` | string | 否 | ≤512 字符。强烈建议写清存什么+查询场景 |
| `creatorOnlyRead` | boolean | 否 | 新建默认 false |
| `creatorOnlyModify` | boolean | 否 | 新建默认 true |
| `creatorOnlyDelete` | boolean | 否 | 新建默认 true |
| `fields` | array | 是 | 1–64 个用户字段 |
| `indexes` | array | 否 | 0–32 个 |

## 内置字段（系统自动加，不要写进 fields，可在 indexes 引用）

| fieldKey | fieldType | nullable | 含义 |
|---|---|---|---|
| `__create_time` | NUMBER | false | 创建时间戳 |
| `__update_time` | NUMBER | false | 更新时间戳 |
| `__delete_time` | NUMBER | false | 逻辑删除时间，0=活跃 |
| `__create_uid` | STRING | true | 创建人 UID |
| `__delete_uid` | STRING | true | 删除人 UID |
| `__under_review` | BOOLEAN | false | 审核状态 |

查询时软删除过滤 `__delete_time == 0` 由运行时自动注入。每个索引 DDL 自动在末尾追加 `__delete_time:ASC`（已存在则跳过），**配置里不要手写**。

> uid 用 `__create_uid`、时间用 `__create_time`，**不要**自己再造 user_id / create_time 字段——浪费且查询会绕过权限/缓存逻辑。

## field 结构

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `fieldKey` | string | 是 | `^[a-zA-Z0-9_]{1,64}$`（注意：无连字符），不能以 `__` 开头，表内唯一 |
| `fieldType` | string | 是 | 枚举值之一（见下） |
| `fieldDisplayName` | string | 是 | 1–64 字符 |
| `nullable` | boolean | 否 | 默认 false |
| `fieldMeta` | object | 否 | 校验规则，必须与 fieldType 匹配（见下） |

### fieldType 枚举（DataValueType）

`STRING` / `NUMBER` / `BOOLEAN` / `NULL` / `STRING_LIST` / `NUMBER_LIST` / `BOOLEAN_LIST` / `ENUM`

### fieldMeta（ValidationRules）—— 按 fieldType 严格匹配

只启用与类型对应的那一组规则，其它不要出现或 enabled=false。

**STRING → stringRules**
```json
{ "stringRules": { "enabled": true, "minLength": 1, "maxLength": 50, "sensitiveWordFilter": true, "pattern": "^[a-zA-Z0-9_]+$" } }
```
- `pattern` 为 Java 正则。`sensitiveWordFilter` 控制是否过敏感词。

**NUMBER → numberRules**
```json
{ "numberRules": { "enabled": true, "min": 0.0, "max": 999999.0, "step": 1.0 } }
```
- `step`：1=整数，0.1=一位小数，10=10 的倍数。

**STRING_LIST / NUMBER_LIST / BOOLEAN_LIST → listRules**
```json
{ "listRules": { "enabled": true, "minItems": 1, "maxItems": 10, "uniqueItems": true, "stringItemRules": {...} } }
```
- 子项规则 `stringItemRules` / `numberItemRules` / `booleanItemRules` 结构同上，按列表元素类型选一个。

**ENUM → enumRules（必须）**
```json
{ "enumRules": { "enabled": true, "allowedValues": ["RED", "GREEN", "BLUE"] } }
```
- `enabled` 必须 true，`allowedValues` 必须非空。

**BOOLEAN** → 不需要 fieldMeta。

### 类型 ↔ 规则对应表

| fieldType | 允许的规则 | 禁止的规则 |
|---|---|---|
| STRING | stringRules | numberRules/listRules/enumRules |
| NUMBER | numberRules | stringRules/listRules/enumRules |
| BOOLEAN | 无 | 全部 |
| STRING_LIST | listRules(+stringItemRules) | stringRules/numberRules/enumRules |
| NUMBER_LIST | listRules(+numberItemRules) | 同上 |
| BOOLEAN_LIST | listRules(+booleanItemRules) | 同上 |
| ENUM | enumRules（必填） | stringRules/numberRules/listRules |
| NULL | 不校验 | — |

## index 结构

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `fields` | array | 是 | ≥1 个，有序 |
| `unique` | boolean | 否 | 默认 false |
| `description` | string | 否 | 建议写清对应哪条查询 |

**IndexField**：

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `fieldKey` | string | 是 | 必须引用已存在的用户字段或内置字段 |
| `direction` | string | 是 | `ASC` 或 `DESC` |

约束：
- 索引字段组合（fieldKey+direction 序列）不能与其它索引完全重复。
- `indexName` 由服务端自动生成（`idx_f1_asc_f2_desc[_u]`），配置里**不要写**。

## 运行时查询约束（设计时需据此校验查询场景）

- 查询端点：`/v1/mini-game/datahub/table/{find-one,find-list,page,update,delete,incry-number}`
- 条件操作符 op：`eq` / `ne` / `gt` / `lt` / `gte` / `lte` / `in`
- find-list `limit` 1–50（默认 50）
- page：`page` 1–1000，`pageSize` 1–50（默认 20），**page×pageSize ≤ 50000**（防深分页）
- **核心**：find-one/find-list/page 执行前过 `IndexMatchChecker`，查询+排序不命中任一索引前缀则抛 `PARAM_ERROR`。匹配规则见 `02-index-matching.md`。
- 全索引 eq 覆盖才走缓存；否则穿透 Mongo。list 仅首页缓存。

## 权限位设置指引（设计第 4 步必做）

三个权限位直接影响"谁能读/改/删"，公共表最容易踩坑的地方就在这里：

- **`creatorOnlyRead`**：true 时读取自动注入 `__create_uid == 当前用户` 过滤且跳过缓存。适合"只看我的"且数据私有的表。**公开广场/帖吧类表设 false**（大家都要看到彼此的投稿）。
- **`creatorOnlyModify`**：true 时只有创建者能 `update` / `incry-number`。**点赞数这种要被别人原子自增的字段所在的表，必须设 false**（否则别人加不了赞）。这是公共表最常见的错误。
- **`creatorOnlyDelete`**：true 时只有创建者能删。评论/点赞通常 true（自己能删自己的）。
- 新建默认 `false / true / true`。

判定口诀：
- 广场展示（帖子/投稿/评论）→ 读公开 `creatorOnlyRead=false`。
- 有字段要被"别人"自增（点赞数/热度）→ 该表 `creatorOnlyModify=false`。
- 只能删自己发的 → `creatorOnlyDelete=true`。

## 权限位语义（运行时）

- `creatorOnlyRead=true`：读取注入 `__create_uid==当前用户` 过滤，跳过缓存。
- `creatorOnlyModify=true`：update / incry-number 仅创建者可操作。
- `creatorOnlyDelete=true`：delete（软删除）仅创建者可操作。
- delete 一律软删除（`__delete_time=now`、`__delete_uid`），幂等。

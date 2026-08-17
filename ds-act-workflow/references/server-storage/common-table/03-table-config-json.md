# 公共表接入 · 第 3 步：TableConfig JSON 生成 + 索引覆盖门禁

> 目标：把第 1、2 步设计好的表/字段/索引，产出可直接导入 god-cms「数据表」tab 的 TableConfig JSON，并用校验器 `scripts/validate.cjs` 强制证明每条查询都能命中索引。**校验不全绿，不得进入 CMS 注册（第 5 步）。**

---

## 3.0 两套 JSON 千万别混淆 ⚠️

本 skill 有**两套完全不同**的批量导入 JSON，格式、导入入口、用途都不一样：

| | 用户维度 Key 配置 JSON | 公共表 TableConfig JSON（本文件） |
|---|---|---|
| 顶层元素 | 一个 **Key**（flat 扁平对象） | 一张 **表**（含 `fields`/`indexes` 的嵌套对象） |
| 结构 | `{ key, name, type, defaultValue, ... }` | `{ tableKey, displayName, fields:[...], indexes:[...], creatorOnly* }` |
| 字段类型键名 | `type` | `fieldType`（在每个 field 内） |
| 校验规则 | 平铺（`minLength`/`min`/`maxItems`…） | 嵌套 `fieldMeta.{stringRules/numberRules/...}` |
| 导入入口 | 数据管理 →「批量导入键值对设计」 | 数据管理 →「数据表」tab 导入 |
| 规范文档 | `../json-key-comment.md`、`../04-cms-register.md` | 本文件 + `01-table-design.md` |

> 生成时先问自己：我在生成的是「用户 Key」还是「公共表」？两者不可混用，字段名（`type` vs `fieldType`）、结构（flat vs 嵌套）都不同。

---

## 3.1 TableConfig JSON 结构

顶层是 **JSON 数组**，每个元素是一张表。字段约束详见 `01-table-design.md`，速记：

```json
[
  {
    "tableKey": "plaza_comment",
    "displayName": "广场评论",
    "description": "说明存什么 + 有哪些查询场景 + 每个索引对应哪条查询（对后人维护极重要）",
    "creatorOnlyRead": false,
    "creatorOnlyModify": false,
    "creatorOnlyDelete": true,
    "fields": [
      { "fieldKey": "post_id", "fieldType": "STRING", "fieldDisplayName": "投稿ID", "nullable": false },
      {
        "fieldKey": "text", "fieldType": "STRING", "fieldDisplayName": "评论内容", "nullable": false,
        "fieldMeta": { "stringRules": { "enabled": true, "minLength": 1, "maxLength": 200, "sensitiveWordFilter": true } }
      }
    ],
    "indexes": [
      {
        "unique": false,
        "description": "按投稿查评论、时间倒序",
        "fields": [
          { "fieldKey": "post_id", "direction": "ASC" },
          { "fieldKey": "__create_time", "direction": "DESC" }
        ]
      }
    ]
  }
]
```

生成时的硬规则（详见 `01-table-design.md`）：
- **6 个内置字段不写进 `fields`**（`__create_time/__update_time/__delete_time/__create_uid/__delete_uid/__under_review` 由系统自动加），但**可以在 `indexes` 里引用**。
- 业务 `fieldKey` 不能以 `__` 开头，正则 `^[a-zA-Z0-9_]{1,64}$`（**无连字符**）。
- `fieldMeta` 必须与 `fieldType` 严格匹配；`ENUM` 必须有 `enumRules.allowedValues` 非空。
- 索引**不要**手写 `indexName`；**不要**在索引末尾加 `__delete_time`（DDL 自动追加）。
- `tableKey` 正则 `^[a-zA-Z0-9_-]{1,64}$`（**可含连字符**，与 fieldKey 不同）。

---

## 3.2 索引覆盖门禁（必做，不可跳过）

**运行时铁律：** `tableFindOne/FindList/Page` 执行前会过 `IndexMatchChecker`，查询的 conditions+sorts **打不中任何索引前缀 → 后端直接抛 `PARAM_ERROR` 拒绝**。不是变慢，是**报错**。所以设计阶段必须先证明索引覆盖。

### 3.2.1 准备两份文件

1. `table-config.json`：上面生成的 TableConfig 数组。
2. `queries.json`：把每张表的**所有查询场景**列出来（对照 `examples/queries.example.json`）：

```json
[
  {
    "tableKey": "plaza_comment",
    "queries": [
      {
        "name": "查某投稿的评论列表-时间倒序",
        "conditions": [ { "fieldKey": "post_id", "op": "eq" } ],
        "sorts": [ { "fieldKey": "__create_time", "direction": "DESC" } ]
      }
    ]
  }
]
```

### 3.2.2 跑校验器

```bash
node references/server-storage/common-table/scripts/validate.cjs <table-config.json> <queries.json>
```

- 退出码 `0` = 全绿；`1` = 有错误。
- 校验器做两类检查：**结构校验**（字段/类型/规则/索引引用）+ **索引覆盖校验**（每条查询命中哪个索引、是否全 eq 覆盖走缓存）。

### 3.2.3 门禁规则

- ✅ **全绿** → 进入第 4 步代码生成 / 第 5 步 CMS 注册。
- ❌ **有红** → **MUST NOT 进入 CMS 注册**。回到 `01/02` 调整索引或查询，直到全绿。**不要靠肉眼判断索引覆盖**——匹配规则有 5 条细节，人眼极易漏。

### 3.2.4 常见"未命中索引"原因（照着排查）

| 报错原因 | 根因 | 解法 |
|---|---|---|
| 含 `ne` 操作符 | `ne` 永不走索引 | 改用反向枚举/状态字段 + `eq` |
| 双区间字段 | 一个查询里 range 了两个字段（如 `time>x AND score>y`） | 只留一个做 range，另一个改 eq 或拆查询 |
| eq 前缀断裂 | 索引 `(a,b,c)` 但查 `a=1 and c=2` 跳过 b | eq 字段必须落在索引连续前缀内 |
| 排序方向混合 | 索引 `(a ASC,b DESC)` 但 `sort a ASC,b ASC` | 排序方向要么全同向、要么全反向 |
| 索引剩余长度不足 | 区间字段占位后，排序字段排不下 | range/in 字段**不要再显式 sort**（靠索引方向自然有序） |
| 全表扫描 | conditions 和 sorts 都空 | 至少给一个 condition 或 sort |

---

## 3.3 运行时约束（写进设计，也会在审查阶段复查）

- `find-list` 的 `limit`：**1–50**（默认 50）。
- `page` 分页：`page` 1–1000，`pageSize` **1–50**（默认 20），且 **`page × pageSize ≤ 50000`**（防深分页）。排行榜类大表若真要深翻，用游标/时间窗分页，别靠 page 硬翻。
- 单查询**最多 1 个** range/in 区间字段。
- `ne` 永不走索引，需求阶段就消掉。

全绿后进入 `03.5-table-d-ts.md` 生成 `table.d.ts` 类型声明，再进入 `04-code-gen.md` 生成 `game-common-table.js`。

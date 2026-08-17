# API 参考：mini-game-data-sdk 公共表（datahub-table）

> **定位：** 公共表 `table*` 接口的纯 API 字典。接入流程走 `00-triage.md` 起的分步流程，遇到具体参数疑问来查此文件。
> 最低 SDK 版本：**0.2.1**（含 datahub-table 接口；`0.2.0` 起移除了 `index.css`，不要再引入样式表；`0.2.1` 修复了 `act.ds.163.com` 投放域名识别问题）。

---

## 引入 SDK 资源

与用户维度存储共用同一份 SDK。若项目已接用户存储（`game-server-storage.js` 已引入 SDK），**无需重复引入**。独立接入公共表时，在含 DS Marker 的 HTML 文件 `<head>` 中添加（版本 ≥ `0.2.1`，不引入 `index.css`）：

```html
<script src="https://ds.res.netease.com/online/pkg/mini-game-data-sdk/0.2.1/index.js"></script>
```

初始化 `setGameId` 全局只调一次（详见 `04-code-gen.md`）：

```javascript
const req = MiniGameDataSdk.RequestManager;
req.setGameId({ devMiniGameId: 'YOUR_DEV_ID', proMiniGameId: 'YOUR_PRO_ID' });
```

---

## 公共类型

```typescript
/** 查询操作符：等于/不等于/大于/小于/大于等于/小于等于/在...之中 */
type QueryOp = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in';

/** 查询条件（op 为 in 时 value 为数组） */
interface QueryCondition { fieldKey: string; op: QueryOp; value: any; }

/** 排序规则 */
interface SortRule { fieldKey: string; direction: 'ASC' | 'DESC'; }

/** 表记录，含内置字段 _id，其余字段由业务泛型定义 */
type TableRecord<T> = T & { _id: string };

/** 公共表统一响应结构 */
interface TableDataResponse<T> {
  list?: TableRecord<T>[];   // findList / page 用
  record?: TableRecord<T>;   // findOne / update 用
  newValue?: any;            // incrNumber 用（自增后的新值）
  page?: number;             // page 用
  pageSize?: number;         // page 用
  total?: number;            // page 用（总数）
}
```

> **重要：** `_id` 是记录主键，`tableUpdate`（更新/删除）与 `tableIncrNumber` 都靠它定位记录。新增后从 `record._id` 拿到。
> **重要：** `op` 为 `ne` 时永远不走索引，会被后端拒绝——查询条件不要用 `ne`（详见 `02-index-matching.md`）。

---

## tableUpdate — 新增 / 更新记录

不传 `id` = 新增；传 `id` = 更新该 `_id` 的记录。业务字段放在 `data` 内，字符串字段 SDK 自动 XSS 转义。

```javascript
// 新增（投稿）
const post = await req.tableUpdate({
  tableKey: 'submission',
  data: { faction: '好蛋', job_name: '魔法师', skills: ['火球', '冰冻'], like_count: 0 },
});
const postId = post.record._id;

// 更新（传 id）
await req.tableUpdate({ tableKey: 'submission', id: postId, data: { job_name: '大魔法师' } });
```

**参数（`TableUpdateParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tableKey` | string | ✅ | 表标识 |
| `id` | string | ❌ | 记录 `_id`，不传则新增 |
| `data` | `Record<string, any>` | ✅ | 业务字段 Map（fieldKey → value） |

**返回：** `TableDataResponse`，取 `result.record`（含 `_id` 及各业务字段）。

> `creatorOnlyModify=true` 的表，更新只有创建者可操作；跨用户改（如别人的投稿）会被拒。

---

## tableDelete — 逻辑删除记录

软删除（写 `__delete_time`/`__delete_uid`），幂等。

```javascript
await req.tableDelete({ tableKey: 'plaza_like', id: likeId });
```

**参数（`TableDeleteParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tableKey` | string | ✅ | 表标识 |
| `id` | string | ✅ | 记录 `_id` |

> `creatorOnlyDelete=true` 的表，只有创建者能删。

---

## tableIncrNumber — 字段原子自增 ⭐ 点赞/计数

对某条记录的某个 **NUMBER 且非内置** 字段做原子自增（`delta` 可为负）。这是点赞/热度计数的正确姿势——绕开乐观锁并发冲突。

```javascript
// 点赞：给投稿的 like_count +1
const incr = await req.tableIncrNumber({
  tableKey: 'submission',
  id: postId,
  fieldKey: 'like_count',
  delta: 1,
});
console.log('最新点赞数：', incr.newValue);
```

**参数（`TableIncrNumberParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tableKey` | string | ✅ | 表标识 |
| `id` | string | ✅ | 记录 `_id` |
| `fieldKey` | string | ✅ | 要自增的字段，**必须 NUMBER 类型且非内置字段**（不以 `__` 开头） |
| `delta` | number | ✅ | 增量（可为负） |

**返回：** `TableDataResponse`，取 `result.newValue`（自增后的新值）。

> ⚠️ **点赞类字段所在的表 `creatorOnlyModify` 必须为 `false`**，否则非创建者（别人）无法自增，点不了赞。

---

## tableFindOne — 条件查单条

```javascript
const r = await req.tableFindOne({
  tableKey: 'submission',
  conditions: [{ fieldKey: '_id', op: 'eq', value: postId }],
});
console.log(r.record);
```

**参数（`TableFindOneParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tableKey` | string | ✅ | 表标识 |
| `conditions` | `QueryCondition[]` | ❌ | 查询条件 |
| `sorts` | `SortRule[]` | ❌ | 排序 |

**返回：** `result.record`。

---

## tableFindList — 条件查列表（limit ≤ 50）

```javascript
const r = await req.tableFindList({
  tableKey: 'plaza_comment',
  conditions: [{ fieldKey: 'post_id', op: 'eq', value: postId }],
  sorts: [{ fieldKey: '__create_time', direction: 'DESC' }],
  limit: 50,
});
r.list.forEach(c => console.log(c.text));
```

**参数（`TableFindListParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tableKey` | string | ✅ | 表标识 |
| `conditions` | `QueryCondition[]` | ❌ | 查询条件 |
| `sorts` | `SortRule[]` | ❌ | 排序 |
| `limit` | number | ❌ | 返回条数上限，**最大 50**（默认 50） |

**返回：** `result.list`（`TableRecord[]`）。

---

## tablePage — 条件分页查询（pageSize ≤ 50）

```javascript
const r = await req.tablePage({
  tableKey: 'submission',
  page: 1,
  pageSize: 20,
  sorts: [{ fieldKey: '__create_time', direction: 'DESC' }],
});
console.log(`共 ${r.total} 条，第 ${r.page} 页`);
r.list.forEach(p => console.log(p.job_name));
```

**参数（`TablePageParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `tableKey` | string | ✅ | 表标识 |
| `conditions` | `QueryCondition[]` | ❌ | 查询条件 |
| `sorts` | `SortRule[]` | ❌ | 排序 |
| `page` | number | ✅ | 页码，从 1 开始，**最大 1000** |
| `pageSize` | number | ✅ | 每页条数，**最大 50** |

**返回：** `result.list` / `result.total` / `result.page` / `result.pageSize`。

> ⚠️ `page × pageSize ≤ 50000`（深分页上限）。

---

## 注意事项

- **查询必须命中索引**：`findOne/findList/page` 的 `conditions + sorts` 必须命中某个已注册索引前缀，否则后端抛 `PARAM_ERROR`。设计阶段用 `scripts/validate.cjs` 证明覆盖（见 `03-table-config-json.md`）。
- **`ne` 永不走索引**：查询条件不要用 `ne`。
- **单查询最多 1 个 range/in**：不要在一个查询里 range 两个字段。
- **range/in 字段不要再显式 sort**：区间查询天然按该字段有序，方向由索引方向决定。
- **`_id` 定位**：更新/删除/自增都靠 `_id`，新增后从 `record._id` 保存。
- **权限位**：`creatorOnlyRead/Modify/Delete` 决定谁能读/改/删，设计见 `01-table-design.md`。

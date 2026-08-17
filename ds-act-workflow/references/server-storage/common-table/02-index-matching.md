<!--
  ⚠️ VENDORED 文件 — 请勿随意手改
  来源：.claude/skills/datahub-table-designer/datahub-table-designer/references/index-matching.md
  同步时间：2026-07-07
  说明：datahub-table-designer 由服务端团队维护，本文件是其内容的自有副本。
        god-cms「数据表」tab 导入的 TableConfig 与服务端 tableSave 格式完全同构，
        故本套匹配规则对 god-cms 数据表同样适用。外部规则若更新，需人工比对同步。
-->

# IndexMatchChecker 索引匹配规则

datahub table 的 find-one/find-list/page 在执行查询前，会用 `IndexMatchChecker` 判断"查询条件 + 排序"能否被某个索引服务。**全不命中 → 抛 PARAM_ERROR，查询不执行。** 本文档是这套规则的精确翻译，校验器 `scripts/validate.cjs` 按此实现。

源码：`god-mini-game-service/.../service/datahub/IndexMatchChecker.java`。

## 总体流程

对表的每个索引逐个判断能否服务该查询，任一通过即放行。优先返回"全 eq 覆盖"的索引（走缓存），否则返回首个通过的索引（穿透 Mongo），全不通过则报错。

## 单索引匹配算法（matchesOneIndex）

设索引字段序列为 `indexFields = [f1, f2, ..., fn]`，每个 fi 有 fieldKey 和 direction(ASC/DESC)。

### 1. 分类过滤条件

把查询 conditions 按 op 分四组（用 fieldKey 集合）：
- `sEq`：op = eq
- `sRange`：op ∈ {gt, lt, gte, lte}
- `sIn`：op = in
- `sNe`：op = ne

任意 condition 的 fieldKey/op 为 null、或 op 不是合法枚举 → 该索引不命中。

### 2. Rule 0：ne 永远不走索引

`!sNe.isEmpty()` → 不命中。

**设计含义**：查询里只要有一个 `ne`，这条查询注定被拒。要么用反向枚举/状态字段 + eq 替代，要么在需求阶段消掉。

### 3. Rule 5：filter + sort 不能同时为空

filters 和 sorts 都空 → 不命中（全表扫描）。

### 4. Rule 1：eq 前缀

求最大 `k`，使索引前 `[f1..fk]` 每个字段都在 `sEq` 中（按索引顺序连续，遇第一个不在 sEq 的就停）。

然后检查：`sEq` 中每个字段都必须落在这个前缀 `{f1..fk}` 内。如果有 eq 字段在索引里但不在前缀连续段内（比如索引 `(a,b,c)` 查 `a=1 and c=2` 跳过了 b）→ 不命中。

### 5. Rule 2：单区间位

合并 `sRange ∪ sIn`：
- 若 size > 1 → 不命中（两个区间字段，如 `time>x AND score>y`）。
- 若 size == 1：该区间字段必须等于 `indexFields[k]`（紧接 eq 前缀之后的位置，0-based = k）。不等 → 不命中。若 `k >= n`（索引长度不足以容纳区间位）→ 不命中。记 `intervalConsumed = true`。
- 若 size == 0：无区间，`intervalConsumed = false`。

### 6. Rule 3：排序后缀

排序起始位置：`sortStartIdx = intervalConsumed ? k+1 : k`。

先把 sorts 里"同时是 eq 字段"的项剔除（对 eq 字段排序是冗余的，忽略）。剩下的叫 `effectiveSorts`。

**注意：只剔除 eq 字段，不剔除区间字段。** 如果某字段同时是 range/in 区间字段又在 sorts 里，它不会被剔除，会占用 effectiveSorts 一位，而此时 sortStartIdx 已经因区间消费而 +1，极易导致"剩余长度不足"被拒。**结论：range/in 字段不要再显式 sort——区间查询天然按该字段有序，方向由索引方向决定。**

若 effectiveSorts 非空：
- `sortStartIdx + effectiveSorts.size() <= n`，否则索引剩余长度不足 → 不命中。
- 逐个对齐：`effectiveSorts[i].fieldKey == indexFields[sortStartIdx+i].fieldKey`，否则字段不匹配 → 不命中。
- 方向一致性：对每个对齐位置，比较 `sortAsc`（sort direction == ASC）与 `idxAsc`（index direction == ASC）。**所有位置必须要么全同向、要么全反向**。混合（一部分同向一部分反向）→ 不命中。

### 7. 通过

以上全过 → 该索引可服务查询。

## 全 eq 覆盖（决定是否走缓存）

在某个索引 matchesOneIndex 通过的前提下，再判断"全 eq 覆盖"：
- filters 里不能有任何 range/in/ne（只能有 eq）。
- 索引的**每个**字段都有对应 eq 值。
- eq 字段数 == 索引字段数（没有多余 eq 字段）。

满足 → 走缓存（find-one 直查缓存，list 仅首页缓存）。否则穿透 Mongo。

## 示例

设索引 `I = (a ASC, b DESC, c ASC)`：

| 查询 conditions | sorts | 命中 I？ | 说明 |
|---|---|---|---|
| a=1 | — | ✅ 全eq | k=1, 无区间无排序, 全eq覆盖 |
| a=1, b=2 | — | ✅ 全eq | k=2 |
| a=1, b=2, c=3 | — | ✅ 全eq | k=3 |
| a=1, c=3 | — | ❌ | c 不在前缀（b 未 eq） |
| a=1, b>5 | — | ✅ 非全eq | k=1, 区间在 b 位(k=1)✓ |
| a=1, b>5, c>9 | — | ❌ | 双区间 |
| b=2 | — | ❌ | eq 不从索引首位起（a 未 eq） |
| a=1 | b DESC | ✅ | k=1, sortStart=1, b 对齐, 全反向 |
| a=1 | b DESC, c ASC | ❌ | b 反向、c 同向，混合方向 |
| a=1 | b ASC, c ASC | ❌ | b 同向、c 同向？b:sortASC vs idx DESC=反向；c:sortASC vs idx ASC=同向 → 混合 ❌ |
| a=1 | c ASC | ❌ | 跳过 b，sortStart=1 但 effectiveSorts[0]=c ≠ indexFields[1]=b |
| — | a ASC | ✅ 非全eq | filter空但sort非空，k=0, sortStart=0, a对齐同向 |
| — | — | ❌ | 全表扫描 |
| a!=1 | — | ❌ | ne 不走索引 |

## 设计含义清单

- 要支持"按 X 倒序取最新 N 条" → 索引 `(X DESC)`，查询 sort=X DESC、无 condition。
- 要"防重复" → 唯一索引覆盖判重字段，查询用 eq 命中全部字段（全 eq 覆盖）。
- 要"按用户查、再按某字段排序" → 索引 `(creator ASC, sortField DESC/ASC)`，condition eq creator，sort 该字段且方向与索引一致或全反。
- 要"按时间范围 + 某字段 eq" → 索引 `(eqField ASC, timeField DESC)`，condition eq eqField + range timeField，区间落在 k+1 位。
- 绝不用 ne；绝不在一个查询里 range 两个字段；绝不让 eq 字段跳过索引中间字段。

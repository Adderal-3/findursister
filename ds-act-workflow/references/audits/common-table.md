# 公共表专项审查（common-table）

> 加载条件：仅当项目存在 `game-common-table.js`（根目录或 `src/` 下）时加载并执行本子文档；不存在则整节静默跳过、不参与判定。
>
> 本子文档校验公共表（datahub-table）接入的合规性，配合 `references/server-storage/common-table/` 流程使用。

---

## 审查前提

先确认 `game-common-table.js` 存在。存在则读取该文件、所有含 DS Marker 的 HTML 文件、以及第 3 步锁定的 TableConfig（若在工程内）进行以下检查。

---

## A 档（阻断项，必须修复）

- [ ] **SDK 引入**：含 DS Marker 的 HTML `<head>` 中存在 `mini-game-data-sdk`（版本 ≥ `0.2.1`）的 JS `<script>`。缺失 → 阻断（`MiniGameDataSdk is not defined`）。若项目已因用户存储引入，此项与用户存储审查共用，不重复报错。
- [ ] **SDK 版本 ≥ 0.2.1 且无 index.css**：CDN 版本号 < `0.2.1` → 阻断并引导升级到 `0.2.1`（文案与 `server-storage.md` 共用：不升级的话，小游戏投放到 act.ds.163.com 域名会有问题）；同时若残留 `mini-game-data-sdk/${version}/index.css` 的 `<link>` → 阻断并要求删除（`0.2.0` 起 SDK 不再附带样式表，其 CSS 会污染宿主页面与其他 SDK）。
- [ ] **setGameId 已初始化**：`MiniGameDataSdk.RequestManager.setGameId(` 在任一 `table*` 调用之前执行。既可来自 `game-server-storage.js`（走过 5-B），也可来自 `game-common-table.js` 的兜底段（独立接入）。两者都无 → 阻断。
- [ ] **gameId 非占位符**：独立接入时兜底段的 `GAME_ID_CONFIG.devMiniGameId` 不是占位符 `__DEV_MINI_GAME_ID__`（未替换 = 阻断：SDK 路由不到数据表）。
- [ ] **加载顺序**：`game-common-table.js` 在 `game-server-storage.js`（若存在）之后、`game.js` 之前。顺序错 → 阻断（`CommonTable` 未定义 / setGameId 晚于调用）。
- [ ] **script type="module"**：`<script src="...game-common-table.js">` 带 `type="module"`。缺失 → 阻断（部署后 CDN 未重写，资源 404，`window.CommonTable` 未挂载）。
- [ ] **查询命中索引**：每个 `req.tableFindOne/tableFindList/tablePage` 调用的 `conditions + sorts` 必须能命中该表已注册索引前缀（复刻 `IndexMatchChecker` 语义，规则见 `common-table/02-index-matching.md`）。命不中 → 阻断（运行时后端抛 `PARAM_ERROR`，查询全失败）。
  - 逐条检查：无 `ne`；单查询最多 1 个 range/in；eq 字段落在索引连续前缀；排序方向全同或全反；range/in 字段未再显式 sort。
- [ ] **tableIncrNumber 字段合法**：`fieldKey` 为 **NUMBER 类型且非内置字段**（不以 `__` 开头）。否则 → 阻断。
- [ ] **点赞类表 creatorOnlyModify=false**：被 `tableIncrNumber` 跨用户自增的字段（如 `like_count`）所在表，其 TableConfig `creatorOnlyModify` 必须为 `false`。若为 `true` → 阻断（非创建者无法自增，别人点不了赞）。
- [ ] **点击写操作登录态保护**：由点击事件触发的 `tableUpdate` / `tableIncrNumber` / `tableDelete` 必须用 `withPrecheck` 包裹（同用户存储 `saveFull` 规则）。未包裹 → 阻断。

---

## B 档（警告项，建议修复）

- [ ] **分页约束**：`tablePage` 的 `pageSize ≤ 50`、`page ≤ 1000`、`page × pageSize ≤ 50000`；`tableFindList` 的 `limit ≤ 50`。超限 → 警告（运行时会被拒或深分页失败）。
- [ ] **_id 定位**：`tableUpdate`(带 id) / `tableDelete` / `tableIncrNumber` 的 `id` 来源于此前新增记录的 `record._id` 或查询结果，而非硬编码。
- [ ] **未注册标记残留**：`game-common-table.js` 顶部若仍有 `__TABLE_NOT_REGISTERED__` 标记 → 警告：CMS 数据表尚未注册，上线前必须完成注册并移除标记。
- [ ] **字段类型与 `table.d.ts` 匹配**（防 STRING_LIST 当 STRING 存、防对象数组塞进 STRING_LIST）：对照 `src/table.d.ts`（第 3.5 步生成，无 `src/` 则在项目根目录），检查读写代码里每个字段类型是否对齐。重点：`*_LIST`（TS 里是 `string[]`/`number[]`/`boolean[]`）写入**直接传数组、不得 `JSON.stringify`**，读取**直接当数组用、不得 `JSON.parse`**；**datahub-table 无 OBJECT 类型**，对象/对象数组只能用 `STRING` 字段存 `JSON.stringify`（读后 `JSON.parse`）。若发现①对 `*_LIST` 字段 `JSON.stringify`/`JSON.parse`，或②把对象数组写进 `STRING_LIST` 字段（服务端 stringItemRules 会拒绝对象）→ 警告。若项目缺 `table.d.ts` → 提示补生成（见 `common-table/03.5-table-d-ts.md`）。
- [ ] **读写后 UI 与服务端同步**：调用方（`game.js` / 业务脚本）在写操作（`tableUpdate`/`tableIncrNumber`/`tableDelete`）成功后，应用服务端返回结果或重新拉取的数据更新 UI，而非仅本地乐观 +1/-1 或改 DOM。若发现写操作只在本地改状态、不以服务端返回为准 → 警告（client-server 数据易脱节，用户在不同入口看到的计数会不一致）。

---

## 校验输出

失败项按统一格式（见 `index.md` 步骤 5）：

```
❌ [common-table] 出错了
    文件：game-common-table.js:42
    问题：tableIncrNumber 对 submission.like_count 自增，但该表 creatorOnlyModify=true
    你需要：把 submission 表的 creatorOnlyModify 改为 false 并重新导入数据表
```

通过项：

```
✅ [common-table] 通过（共 N 项）
```

---

## 已知错误检测表（并入审查报告步骤 5）

| 错误写法 | 状态 |
|---|---|
| `game-common-table.js` 存在但含 DS Marker 的 HTML 未引入 mini-game-data-sdk（≥0.2.1） | [✅ 已引入 / ❌ 缺失] |
| `table*` 调用前 `setGameId` 未初始化 | [✅ 已初始化 / ❌ 缺失] |
| `game-common-table.js` 的 `<script>` 缺 `type="module"` | [✅ 已带 / ❌ 缺失] |
| `game-common-table.js` 加载晚于 `game.js`，或早于 `game-server-storage.js` | [✅ 顺序正确 / ❌ 顺序错误] |
| `tableFindOne/List/Page` 查询不命中任何已注册索引 | [✅ 全命中 / ❌ 发现，位置：xxx] |
| `tableIncrNumber` 的 fieldKey 非 NUMBER 或为内置字段 | [✅ 合法 / ❌ 发现，位置：xxx] |
| 被 `tableIncrNumber` 自增的字段所在表 `creatorOnlyModify=true` | [✅ 已设 false / ❌ 发现] |
| 点击触发的 `tableUpdate/tableIncrNumber/tableDelete` 未用 `withPrecheck` 包裹 | [✅ 已包裹 / ❌ 未包裹，位置：xxx] |
| `tablePage` pageSize>50 / page>1000 / page×pageSize>50000，或 `tableFindList` limit>50 | [✅ 合规 / ⚠️ 发现，位置：xxx] |
| `game-common-table.js` 残留 `__TABLE_NOT_REGISTERED__`（数据表未注册） | [✅ 已移除 / ⚠️ 仍存在] |

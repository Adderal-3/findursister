# 公共表接入 · 第 4 步：代码生成（game-common-table.js）

> 目标：生成独立文件 `game-common-table.js`，封装 `table*` 调用，复用用户维度存储的同一个 `setGameId`。
> 前置：第 3 步 `validate.cjs` 已全绿，且第 3.5 步 `table.d.ts` 已生成。

---

## 4.1 为什么是独立文件

公共表与用户维度存储语义差异大（无主 vs 按 uid），按「每个业务几张表」组织到独立文件 `game-common-table.js` 更清晰、易维护。它与既有 `game-server-storage.js` 共存，**共用同一个 `setGameId`**。

---

## 4.2 setGameId 复用与兜底

`setGameId` 全局只调用一次即可，后续所有接口（含 `table*`）自动使用。`00-triage.md` 的「基础设施就绪」前置已经确认过 SDK 与 gameId 的来源，这里据此二选一：

- **项目已接用户维度存储**（存在 `game-server-storage.js`，走过 5-B）：`setGameId` 已在其中调用，`game-common-table.js` **直接用 `req = MiniGameDataSdk.RequestManager`，删掉下方兜底段、不重复调 setGameId**。
- **独立接入公共表**（无 `game-server-storage.js`）：由 `game-common-table.js` 顶层**兜底调用一次 `setGameId`**。此时 miniGameId 已在 triage 前置里向用户问到，**必须把真实值填进 `GAME_ID_CONFIG`，不要留占位符**（占位符 = SDK 路由不到数据表，审查阶段阻断）。

---

## 4.3 加载顺序（关键，错了全挂）

```
<head> 内（版本 ≥ 0.2.1，不再引入 index.css，与其他 SDK 同级）：
  mini-game-data-sdk index.js  (0.2.1)

</body> 前：
  game-server-storage.js  （若有，先加载，内含 setGameId）
  game-common-table.js    （后加载，type="module"）
  game.js                 （最后，调用方）
```

- `game-common-table.js` 的 `<script>` **必须带 `type="module"`**——部署平台只对 `type="module"` 的相对路径脚本做 CDN 重写，缺失会导致上线后 404、`window.CommonTable` 未挂载。
- `game-common-table.js` 必须在 `game-server-storage.js`（若存在）之后、`game.js` 之前。
- SDK 的 `<head>` 引入：若走过 5-B，已由 5-B 注入，本步不重复；若独立接入，triage 前置已引导注入，本步只需确认存在。

---

## 4.4 game-common-table.js 模板

```javascript
/*
 * game-common-table.js — 公共表（datahub-table）业务封装
 * 依赖 mini-game-data-sdk >= 0.2.1
 *
 * __TABLE_NOT_REGISTERED__   ← 仅当用户暂缓 CMS 注册时保留此标记（见 05-cms-register.md），
 *                               注册完成后删除本行。审查阶段据此提醒。
 */
(function (global) {
  'use strict';
  const req = MiniGameDataSdk.RequestManager;

  // ── 初始化：复用用户存储的 setGameId；仅当独立接入（无 game-server-storage.js）时才兜底调用 ──
  // 若已存在 game-server-storage.js（其中已 setGameId），删除下面这段兜底。
  // 若独立接入，把 __DEV/__PRO 占位符替换为 triage 前置里问到的真实 miniGameId。
  const GAME_ID_CONFIG = {
    devMiniGameId: '__DEV_MINI_GAME_ID__',
    proMiniGameId: '__PRO_MINI_GAME_ID__',
  };
  if (!global.__DS_GAME_ID_SET__) {
    req.setGameId(GAME_ID_CONFIG);
    global.__DS_GAME_ID_SET__ = true;
  }

  const CommonTable = {
    // ── 投稿：新增一条 submission ──
    async createSubmission(data) {
      const r = await req.tableUpdate({ tableKey: 'submission', data });
      return r.record; // 含 _id
    },

    // ── 分页拉取最新投稿（命中索引：__create_time DESC）──
    async listLatestSubmissions(page = 1, pageSize = 20) {
      const r = await req.tablePage({
        tableKey: 'submission',
        page, pageSize,
        sorts: [{ fieldKey: '__create_time', direction: 'DESC' }],
      });
      return { list: r.list || [], total: r.total || 0 };
    },

    // ── 查某投稿的评论列表（命中索引：post_id ASC, __create_time DESC）──
    async listComments(postId) {
      const r = await req.tableFindList({
        tableKey: 'plaza_comment',
        conditions: [{ fieldKey: 'post_id', op: 'eq', value: postId }],
        sorts: [{ fieldKey: '__create_time', direction: 'DESC' }],
        limit: 50,
      });
      return r.list || [];
    },

    // ── 发评论 ──
    async addComment(postId, text, nick, avatar) {
      const r = await req.tableUpdate({
        tableKey: 'plaza_comment',
        data: { post_id: postId, text, nick, avatar },
      });
      return r.record;
    },

    // ── 点赞：写点赞记录（防重复靠唯一索引）+ 原子自增投稿 like_count ──
    async likePost(postId) {
      const like = await req.tableUpdate({ tableKey: 'plaza_like', data: { post_id: postId } });
      await req.tableIncrNumber({
        tableKey: 'submission', id: postId, fieldKey: 'like_count', delta: 1,
      });
      return like.record._id; // 保存 likeId 供取消赞用
    },

    // ── 取消赞：删点赞记录 + like_count -1 ──
    async unlikePost(postId, likeId) {
      await req.tableDelete({ tableKey: 'plaza_like', id: likeId });
      await req.tableIncrNumber({
        tableKey: 'submission', id: postId, fieldKey: 'like_count', delta: -1,
      });
    },
  };

  global.CommonTable = CommonTable;
})(window);
```

> 以上为**示例结构**，Agent 须根据第 1–3 步实际锁定的表/字段/索引生成，禁止照抄示例表名。

---

## 4.5 生成规则清单（逐条遵守）

1. `req = MiniGameDataSdk.RequestManager`，静态类不 `new`。
2. **不重复 setGameId**：已有 `game-server-storage.js`（走过 5-B）则删兜底段直接复用；独立接入则保留兜底段，并把占位符换成真实 miniGameId。
3. 每个 `tableFindOne/FindList/Page` 调用的 `conditions + sorts` **必须与已注册索引对齐**（对照第 2、3 步）。
4. **对照 `table.d.ts` 比对每个字段的类型**（第 3.5 步生成，防止把 `STRING_LIST` 当 `STRING` 存这类错误）：
   - 写入 `tableUpdate` 的 `data` 里，`STRING_LIST`/`NUMBER_LIST`/`BOOLEAN_LIST` 字段**直接传数组**，**禁止 `JSON.stringify`**——服务端按 listRules 逐项校验，stringify 后会变成"含一个 JSON 字符串的数组"，minItems/maxItems/stringItemRules 全部错位。
   - 读取后 `*_LIST` 字段**直接当数组用**，**禁止 `JSON.parse`**。
   - **datahub-table 无 `OBJECT` 类型**：要存对象 / 对象数组（如 `[{name,desc}]`）只能用 `STRING` 字段存 `JSON.stringify` 后的字符串，读取后 `JSON.parse`。`table.d.ts` 里这类字段会标成具体结构类型（如 `Skill[]`）并注明"存 STRING/JSON"，据此写 stringify/parse；**切勿把对象数组塞进 `STRING_LIST`**（会被 stringItemRules 拒绝）。
   - 生成每个读写方法前，回看 `table.d.ts` 对应 interface，确认字段名、类型、可选性都对得上。
5. 点赞/计数用 `tableIncrNumber`（原子），**不要**先读再写。
6. 新增记录后从 `r.record._id` 拿主键，更新/删除/自增靠它。
7. 写操作（`tableUpdate/tableIncrNumber/tableDelete`）由点击触发时用 `withPrecheck` 包裹（登录态保护）。
8. `<script src="game-common-table.js" type="module">`，位于 `game-server-storage.js` 之后。
9. **读写操作后，用服务端返回的数据更新 UI，保持 client-server 一致**（常见遗漏点）：
   - 核心原则：写操作（增删改）成功后，不要在本地乐观地 +1/-1 或直接改 DOM 就完事，要用**服务端返回的结果**（或写完后重新拉取的最新数据）来刷新界面。本地猜测值和服务端真实状态容易脱节——并发写、写失败、服务端去重等都会导致不一致。
   - **创建/新增** → 用返回的新记录刷新列表，让新条目出现
   - **更新（点赞/计数等）** → 以服务端返回的最新计数为准更新显示，而非本地 +1
   - **删除** → 确认服务端删除成功后再从列表移除
   - 如果项目有列表 + 详情两层视图，两处都要用同一份服务端数据同步，避免从详情返回列表时数字对不上
   - 实用做法：在列表渲染时重新拉取可见条目的最新计数，而不是只在首次加载时拉一次
10. 若用户暂缓 CMS 注册，顶部保留 `__TABLE_NOT_REGISTERED__` 标记（见 `05-cms-register.md`）。

生成完毕后进入 `05-cms-register.md` 引导注册。

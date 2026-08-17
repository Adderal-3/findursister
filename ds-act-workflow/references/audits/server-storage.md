# 服务端存储专项审查（mode 5-B 专用）

> 仅在用户接入了 `mini-game-data-sdk` 时执行此节。
> 扫描 `src/game-server-storage.js` 和调用处（`src/game.js` 等）。

**A 档（必须通过，否则阻断）：**

- [ ] **登录态前置检查存在**（服务端存储调用前必须有登录态保护，缺失 = 阻断：未登录用户调用 `saveFull`/`loadFull` 会触发 SDK 鉴权失败弹"网络异常"，数据也无法正确按 uid 落库）
  - **启动时读存档路径**：`ServerStorage.loadFull()` 必须在 `initApp()`（或等价的 DS 初始化函数）完成之后调用；`initApp` 内须有登录态确认逻辑（`await window.dsLogin.hasLoggedIn()` 或 `await window.ds.ready()` + `checkLogined`）
  - **点击触发写存档路径**：业务代码中由点击事件触发的 `ServerStorage.saveFull()` 调用，必须用 `withPrecheck(callback)` 包裹；`withPrecheck` 函数本身不能被空函数覆盖（检测 `withPrecheck = async function ... { callback() }` 这类直接执行 callback 的覆盖写法 = 阻断：等于禁用了所有点击预检）
  - **`withPrecheck` 覆盖检测**：扫描 `ds.js` 中是否存在 `withPrecheck =` 重新赋值语句，若赋值体为直接执行 callback 的空实现（无 `ds.callHandler('checkLogined')` / `openLoginPage` / `openSquareUrl` 分支）→ 阻断
- [ ] **`mini-game-data-sdk` JS 的 `<script>` 在 `<head>` 中加载**（与其他 SDK 同级，`</head>` 之前。违反 = SDK 全局未就绪，业务代码调用时报 `MiniGameDataSdk is not defined`）
- [ ] **`mini-game-data-sdk` 版本 ≥ 0.2.1（强制，无条件阻断）**：只要项目引入了 `mini-game-data-sdk`，CDN 路径版本号必须 ≥ `0.2.1`，与是否用到 `table*` 能力无关、与项目是否投放 act 域名无关（静态审查无法判断投放域名，必须全量阻断）。检测到 `0.2.0` 及以下 → 阻断，输出升级引导：

  ```
  ❌ mini-game-data-sdk 版本过低（当前 x.x.x），需升级到 0.2.1

  不升级的话，小游戏投放到 act.ds.163.com 域名会有问题。

  1. 把 HTML 里 CDN 地址版本号改成 0.2.1：
     https://ds.res.netease.com/online/pkg/mini-game-data-sdk/0.2.1/index.js
  2. （若有 index.css 的 <link>，一并删除——0.2.0 起已不需要样式表）
  ```
- [ ] **不存在 `mini-game-data-sdk/${version}/index.css` 的 `<link>`（0.2.0 起移除，须删除）**：`0.2.0` 起 SDK 不再附带样式表，历史项目常残留 `<link rel="stylesheet" href="...mini-game-data-sdk/x.x.x/index.css">`。检测到该 `<link>` → 阻断并要求删除该行（其 CSS 会污染宿主页面与其他 SDK 的样式表现）
- [ ] **`game-server-storage.js` 的 `<script>` 在 `</body>` 前，且位于 `game.js` 等业务脚本之前**（作为封装层，须先于调用方加载；无需放 `<head>`，SDK 已提前就绪）
- [ ] **`game-server-storage.js` 的 `<script>` 带 `type="module"`**（缺失 = 阻断：部署平台只对 `type="module"` 的相对路径脚本做 CDN 重写，缺该属性会导致上线后请求 `https://wp-test.ds.163.com/minigame/{uuid}/game-server-storage.js` 返回 404）
- [ ] 嵌套对象/对象数组字段写入前有 `JSON.stringify`，读取后有 `JSON.parse`（违反 = 数据静默截断）
- [ ] `setGameId()` 只在初始化位置调用一次，没有在循环或点击事件中重复调用
- [ ] `ServerStorage` 用 `var` 挂全局，不是 ES module export（`export const ServerStorage` 或 `export default` = 阻断）
- [ ] **`window.ServerStorage = ServerStorage` 显式挂载存在**（IIFE return 之后必须追加此句，作为双重保险防止变量遮蔽和浏览器缓存问题。缺失 = 阻断）
- [ ] 存在 `last_save` 或类似时间戳字段（放置类必须）
- [ ] `GAME_ID_CONFIG.devMiniGameId` 不是占位符 `__DEV_MINI_GAME_ID__`（未替换 = 阻断：SDK 无法路由到正确数据表）
- [ ] 若有排行榜：`BILLBOARD_CONFIG.devBillboardId` 不是占位符 `__DEV_BILLBOARD_ID__`（未替换 = 阻断：排行榜接口必然报错）
- [ ] `game-server-storage.js` 顶部注释**不含** `__FIELDS_NOT_REGISTERED__`（有此标记 = CMS 字段尚未录入，输出提醒 + 重新提供 DataHub JSON）
- [ ] **数值任务依赖 ds-act-sdk**：若 `game-server-storage.js` 顶部注释**含** `__MISSION_KEYS__: [...]`（即配置了数值任务），则被审查的 HTML 文件**必须**已引入 `ds-act-sdk`（`<head>` 中存在 `ds-act-sdk.min.js`）。缺失 = 阻断：数值任务的「指定活动」就是 ds-act-sdk 接入的活动，未接入则任务模块无处挂载、数值达标也不会完成任务/发奖（引导用户走 mode6 接入 ds-act-sdk）

**`__FIELDS_NOT_REGISTERED__` 触发时的提醒输出：**

```
⚠️ 检测到 CMS 数据字段尚未在后台录入

字段未注册时 SDK 接口会静默失败，数据无法真正写入和读取。

请到后台录入以下字段：
  测试环境：https://god-cms-test.gameyw.netease.com/cms/
  路径：活动 → 小游戏管理 → 选择游戏 → 数值管理 → 「批量导入键值对设计」

DataHub 批量导入 JSON（复制粘贴后导入）：
[重新输出第 4.5.1b 步生成的完整 JSON 数组]

录入完成后告诉我，继续后续流程。
```

**`__MISSION_KEYS__` 存在但未接入 ds-act-sdk 时的阻断输出：**

```
❌ 检测到数值任务（__MISSION_KEYS__: [...]）但页面未接入 ds-act-sdk

数值任务的「指定活动」就是 ds-act-sdk 接入时配置的活动。未接入 ds-act-sdk：
  · 任务模块无活动可挂载
  · 玩家数值达到阈值 N 也不会完成任务、不会发奖

请先完成大神活动接入（mode 6 / ds-act-sdk），再回到服务端存储流程。
随后到 CMS 按 04-cms-register.md 5.4.1 完成图1→图2 任务模块配置。
```

**C 档（上线前必须修复，测试阶段警告）：**

- [ ] `GAME_ID_CONFIG.proMiniGameId` 不是占位符 `__PRO_MINI_GAME_ID__`（仍是占位符 = 上线前阻断）
- [ ] 若有排行榜：`BILLBOARD_CONFIG.proBillboardId` 不是占位符 `__PRO_BILLBOARD_ID__`（上线前阻断）

> **C 档说明：** 测试阶段（当前）使用 dev 值是正确的，审查输出「⚠️ 上线前必须替换为正式环境 ID」提示即可，不阻断当前流程。

**B 档（警告，建议修复）：**

- [ ] **字段值类型与 `storage-keys.d.ts` 匹配**（第 2.5 步生成，防 `*_LIST` 当 STRING 存、防对象漏 stringify）：对照 `src/storage-keys.d.ts`（无 `src/` 则在项目根目录）的 `UserStorageKeys` interface，逐个 recordKey 检查读写代码里的值类型。重点：`number[]`/`string[]`/`boolean[]`（`*_LIST`）字段**直传数组、不得 `JSON.stringify`**，读取**直接当数组用、不得 `JSON.parse`**；标了"存 STRING/JSON"的字段（如 `buildings_json`）写前 `JSON.stringify`、读后 `JSON.parse` 配对（用户存储**无 OBJECT 类型**，嵌套结构只能用 STRING 存 JSON）。若发现①对 `*_LIST` 字段 `JSON.stringify`/`JSON.parse`，或②对象/对象数组直接写进 STRING key 却没 stringify → 警告。若项目缺 `storage-keys.d.ts` → 提示补生成（见 `server-storage/02.5-storage-keys-d-ts.md`）。
- [ ] `loadFull` 有 `catch`，失败时不阻塞游戏（无 `catch` 或 catch 里 `throw` = 警告）
- [ ] 字段加载时有 `?? defaults[k]` 兜底（直接用 `cloud[k]` 无兜底 = 警告）
- [ ] 同时写入的 key 数量 ≤ 20（使用 `obfuscatedBatchWriteData`；超出分批循环，每批 ≤ 20）
- [ ] `getUserRank` 与 `getBillboardRank` 同时存在时，使用 `Promise.all` 并行（串行 = 警告）
- [ ] 无冗余存储 `user_uid` / `nick` / `icon` 字段（服务端自动补全）
- [ ] 有排行榜时：`openLeaderboard` / `closeLeaderboard` 已显式挂载到 `window`（HTML 内联 `onclick` 只在 `window` 查找函数，未挂载 = `ReferenceError`）
- [ ] **写入成功后同步页面**（规则 #15）：写入调用（`saveFull` / `obfuscatedWriteData` / `obfuscatedBatchWriteData`）成功后，回调/`await` 之后应有 UI 刷新或本地状态回写。若写入成功分支内**未见**任何渲染/状态更新（纯 fire-and-forget 写入，写完不刷新）= 警告：页面可能显示与服务端不一致的旧值，数值任务/发奖场景尤其明显

**autofix 支持：**

| 问题 | autofix |
|------|---------|
| 无 `last_save` 字段 | 在 `saveFull` 中自动插入 `last_save: Date.now()` |
| loadFull 无 catch | 自动添加 catch + toast 兜底 |
| 字段无 `?? defaults[k]` | 提示用户补充 DEFAULTS 对象和兜底逻辑 |
| `Promise.all` 未并行 | 自动将串行改为 `Promise.all` |
| 写入成功后未刷新页面（规则 #15） | 提示用户在写入成功回调中以回包数值状态刷新对应 UI（不自动改，需业务方确认刷新点） |

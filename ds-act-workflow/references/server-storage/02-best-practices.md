# 第 3 步：代码生成 + 强制最佳实践

> 目标：生成 `src/game-server-storage.js` 并改造业务代码，默认套用 14 条规则。
> 用户无需做任何选择——默认即正确。
> 输入：第 1 步字段表 + 第 2 步同步配置 + 第 2.5 步 `storage-keys.d.ts`。
>
> **注意：** `game-server-storage.js` 是否已存在的判断在第 1 步 `1.0 前置路由`（路径 D）中已完成，此处直接生成即可。
>
> **对照类型声明**：生成每个 recordKey 的读写代码前，回看第 2.5 步的 `storage-keys.d.ts`：`*_LIST` 字段（`number[]`/`string[]`/`boolean[]`）**直传数组、禁止 `JSON.stringify`/`JSON.parse`**；序列化列标了 JSON 的字段实为 `STRING`，**写前 `JSON.stringify`、读后 `JSON.parse`** 配对（用户存储无 OBJECT 类型）。

---

## 3.0 生成前：收集必要配置 ID

**在写任何代码之前**，先把 miniGameId 确认清楚，避免生成后反复修改。

### 询问 miniGameId

> **SDK 新特性：** `setGameId` 现在接受 `{ devMiniGameId, proMiniGameId }` 对象，SDK 内部通过 `IS_PRODUCTION` 自动选择对应环境的 ID，代码里不需要再手动写 `if (isProd)` 判断。

输出以下提问：

```
生成代码需要两个 miniGameId（SDK 内部自动按环境切换）：
  · devMiniGameId：测试环境游戏 ID
  · proMiniGameId：正式环境游戏 ID

你现在有这些 ID 吗？

  A. 已有测试环境 ID，请填写：_____
     正式环境 ID（可以先跳过，用占位符）：_____（或留空）

  B. 还没有，帮我去后台获取
     路径：https://god-cms-test.gameyw.netease.com/cms/
           活动 → 小游戏管理 → 找到对应游戏 → 复制游戏 ID
     获取后回来告诉我

  C. 都没有，先用占位符，后面再填

回复 A/B/C 或直接粘贴 ID：
```

**处理逻辑：**

| 用户回复 | 代码中的值 |
|----------|-----------|
| 提供了测试 ID `xxx`，正式 ID `yyy` | `devMiniGameId: 'xxx'`，`proMiniGameId: 'yyy'` |
| 只有测试 ID `xxx` | `devMiniGameId: 'xxx'`，`proMiniGameId: '__PRO_MINI_GAME_ID__'` |
| 都没有 / 先跳过 | `devMiniGameId: '__DEV_MINI_GAME_ID__'`，`proMiniGameId: '__PRO_MINI_GAME_ID__'` |

收到后继续生成代码。

---

### 3.0.1 询问是否需要客态读取

**仅当字段表中存在「客态可读: ✅」字段时**（即第 1 步用户标记了客态读取需求），询问：

```
你的字段表中 [xxx, yyy] 标记了「客态可读」，这意味着可以传入 queryUid 查看指定玩家的数据。

请确认：queryUid 从哪里获取？（SDK 内部不传或传当前登录用户 uid 时，仍读取自己的数据）

  A. 从 URL 参数获取，如 ?uid=xxx（常见于排行榜跳转）
  B. 从业务逻辑中传入（如点击某玩家头像时动态传入）
  C. 其他方式：___

另外，请确认这些字段已开启客态读取（二选一）：
  1. 推荐：在 CMS 批量导入 JSON 时，对应字段加 "allowGuestRead": true（第 5 步 CMS 注册会自动为你生成）
  2. CMS 后台手动：活动 → 小游戏管理 → 对应小游戏 key 配置 → 编辑 → 客态读取开关
  （所有客态可读字段必须全部开启，否则接口返回错误码 200100）

已开启？[Y/已开启 / 还没开启，先生成代码占位]
```

**处理逻辑：**
- 用户确认已开启或先占位 → 在 3.2 代码模板中额外生成 `loadForUser(queryUid)` 函数
- 字段表中无客态可读字段 → 静默跳过此步，不生成 `loadForUser`

---

## 3.1 15 条强制规则

Agent 生成代码时**自动应用所有规则**，不询问用户。

### A 档：不可 override（违反必出 bug）

| # | 规则 | 为什么 |
|---|------|--------|
| 0 | **`mini-game-data-sdk` JS（版本 ≥ 0.2.1，不再需要 index.css）必须放在 `<head>` 中预加载；`game-server-storage.js` 放在 `</body>` 前，位于 `game.js` 等业务脚本之前，且 `<script>` 必须带 `type="module"`** | `mini-game-data-sdk` 是第三方 SDK 库，放 `<head>` 同步阻塞加载，确保全局 `MiniGameDataSdk` 在任何业务脚本执行前已就绪。`0.2.0` 起移除了 `index.css`（其样式会污染宿主页面与其他 SDK），不要再引入。`0.2.1` 修复了 `act.ds.163.com` 投放域名识别问题，低于 0.2.1 投放到该域名会有问题。`game-server-storage.js` 是业务封装层，按正常惯例放 `</body>` 前即可，只需保证它在 `game.js` 之前，`const req = MiniGameDataSdk.RequestManager` 在 IIFE 顶层直接取引用完全安全。**`type="module"` 是部署平台识别为 CDN 替换资源的硬性条件，缺失 → 上线后请求 404** |
| 1 | 复杂结构（对象/对象数组）一律 `JSON.stringify` 存，读时 `JSON.parse` | SDK 仅支持 number/string/boolean 及一维数组；嵌套对象写入会被**静默截断**，读出来是空对象，但不报错，极难排查 |
| 2 | 必备 `last_save: Date.now()` 字段 | 放置类离线收益计算的唯一依据；没有它就无法知道玩家离线了多久 |
| 3 | `setGameId()` 仅在初始化时调用一次 | 多次调用会重置 SDK 内部状态，导致后续请求携带错误的 gameId |
| 4 | 全局变量挂 `var ServerStorage`，不用 ES module export | ES module export 的对象引用在 `Object.assign` 场景下会失效（新对象替换了旧引用，外部持有的 ServerStorage 还是空壳）。`var` 挂全局最稳 |
| 5 | **IIFE 返回后必须追加 `window.ServerStorage = ServerStorage`** | 纯 `var ServerStorage = (function() { ... })()` 在非严格模式下确实会挂全局，但若上游脚本存在 `'use strict'` 或其他变量遮蔽，可能仍访问不到。显式 `window.ServerStorage` 提供双重保险，浏览器缓存旧版 HTML 时也能通过 console 快速验证挂载是否成功（直接 `console.log(window.ServerStorage)`） |
| 15 | **所有 key 写入成功后，必须用写入成功的数值状态同步刷新页面对应 UI**（不限数值任务字段，全部写入均适用） | 服务端写入是异步的。页面若只做乐观更新或干脆不刷新，会显示与服务端不一致的旧值；数值任务/发奖场景尤其严重（数值已达标但页面没变，用户以为没生效）。正确做法：在 `obfuscatedWriteData` / `obfuscatedBatchWriteData` 成功回调里，以写入成功回包的数值状态刷新页面对应显示，回包即权威值，优先复用回包、不必额外再 read |

### B 档：可 override（最佳实践，违反不必崩溃）

用户如需跳过某条 B 档规则，在第 1 步自然语言声明即可，例如："我不需要迁移 localStorage"。声明后，在生成代码时跳过对应规则，并记录到 `docs/data-storage.md` 的"已 override 规则"小节。

| # | 规则 | 为什么 | override 条件 |
|---|------|--------|--------------|
| 6 | 不冗余存 `user_uid` / `nick` / `icon` | 排行榜 SDK 自动从大神账号补全，自己存反而增加同步负担且可能过期 | "我有自定义用户信息需求" |
| 7 | 放置类：离线收益封顶 24h，cps 在 load 完成后用恢复后状态重算 | 防玩家手动调时钟导致一夜暴富；cps 要在 buildings 加载完成后重算，不能用 load 前的旧值 | "我的游戏没有离线收益机制" |
| 8 | 写入改用 `obfuscatedBatchWriteData`，每批次 ≤ 20 条 | 新 SDK 提供批量加密写入接口，单次最多 20 条，比逐条调用大幅减少网络请求和延迟；逐条循环写是旧写法，不推荐 | "我只有 1 条字段需要写（单条用 `obfuscatedWriteData` 即可）" |
| 9 | load 失败兜底：toast "网络异常，已离线运行"，不阻塞游戏 | SDK 失败不应白屏；要让玩家知道在离线模式下运行，同时游戏要能继续 | "我有自定义错误 UI" |
| | **⚠️ perSecond 游戏分支（有 `perSecond`/`bakePerSecond`/`产出速率`/`每秒自动增加`/`getPerSecond` 特征）**：load 失败改为**返回 null + 不启动游戏循环**（I2），而非 DEFAULTS 兜底离线运行。理由：perSecond 游戏断网离线玩会 CPS 自动涨→联网 saveFull 盖云端（clobber）。详见 `02b-idle-game-storage.md` | |
| 10 | load 时每个字段用 `cloud[k] ?? defaults[k]` | 新增字段时老存档没有这个 key，不加默认值会拿到 `undefined`，后续计算报错 | 无（此规则极少需要跳过） |
| 11 | 自动生成 `migrateFromLocalStorage(oldKey)` | 已有 localStorage 存档的老用户数据不能丢；迁移函数只跑一次，幂等安全 | "这是全新游戏，没有老存档" |
| 12 | 保存采用 diff 去重（与上次快照比，仅写变更字段） | 减少 SDK 调用量；放置类每 30s 存一次，全量写会造成不必要的网络请求 | "我的字段数量 ≤ 3，全量写可接受" |
| 13 | `getUserRank` 与 `getBillboardRank` 用 `Promise.all` 并行 | 榜单面板打开时两个接口都要调，串行等待会让用户感觉加载慢 | "我只用其中一个接口" |
| 14 | 排行榜返回的 `nick` / `icon` 直接用，不二次清洗 | 服务端已统一处理；再清洗反而可能破坏正常字符 | 无 |

---

> **perSecond 游戏路由**：第 2 步 `01-sync-strategy.md` 2.1 识别到放置/点击类特征（`cps`/`bakePerSecond`/`产出速率`/`每秒自动增加`/`perSecond`/`getPerSecond`）时，在套用下方 14 条通用规则之上，**额外读 `02b-idle-game-storage.md`** 应用 perSecond 存档增强（`_loadedOK` 闸门 / 不 fallback 离线 / 写后快照 / 重试限次 / cloud-empty 基于 records）。无此特征的游戏跳过 02b。

## 3.2 生成 game-server-storage.js

基于字段表和同步配置生成文件。文件放在与 `ds.js`（或 `src/game.js`）同级目录。

> **数值任务标记（仅 MISSION_ENABLED=true）：** 字段表存在「数值任务: ✅」字段时，在文件顶部注释生成 `// __MISSION_KEYS__: [<逗号分隔的任务 key>]`。该标记供第 6 步审查校验「数值任务必须接入 ds-act-sdk」。无数值任务字段时**不生成**此行。

**文件模板（根据字段表动态填充）：**

```javascript
// game-server-storage.js — 服务端数据存储封装模块
// 依赖：mini-game-data-sdk（已在 HTML 文件中引入）
// 此文件由 ds-act-workflow 自动生成
// __MISSION_KEYS__: [task_score]   ← 仅当 MISSION_ENABLED=true 时生成；列出所有数值任务 key，供审查校验 ds-act-sdk 依赖。无数值任务时整行省略

/* ========== 环境配置 ========== */
// SDK 通过内部 IS_PRODUCTION 自动选择对应环境，无需手动切换
const GAME_ID_CONFIG = {
  devMiniGameId: '__DEV_MINI_GAME_ID__',  // 测试环境 miniGameId
  proMiniGameId: '__PRO_MINI_GAME_ID__',  // 正式环境 miniGameId
};

// 排行榜 ID（如有排行榜字段，SDK 同样自动按环境选择）
const BILLBOARD_CONFIG = {
  devBillboardId: '__DEV_BILLBOARD_ID__', // 测试环境榜单 ID
  proBillboardId: '__PRO_BILLBOARD_ID__', // 正式环境榜单 ID
};

var ServerStorage = (() => {
  const req = MiniGameDataSdk.RequestManager;
  req.setGameId(GAME_ID_CONFIG); // 规则 #3：只调用一次，SDK 自动按环境选 ID

  // 字段默认值（规则 #10：老存档缺失字段时的兜底值）
  const DEFAULTS = {
    // [由字段表生成，示例：]
    bake_num: 0,
    lifetime_points: 0,
    prestige_level: 0,
    buildings_json: '[]',  // 规则 #1：嵌套对象序列化为 string
    last_save: 0,          // 规则 #2：离线收益必备
  };

  // 上次保存的快照（用于 diff 去重，规则 #12）
  let _lastSnapshot = null;

  /* ========== 读取 ========== */
  async function loadFull() {
    try {
      const keys = Object.keys(DEFAULTS);
      const result = await req.batchReadData({ keys });
      const cloud = result.records.reduce((acc, r) => {
        acc[r.recordKey] = r.value;
        return acc;
      }, {});

      // 规则 #10：缺失字段用默认值兜底
      const merged = {};
      for (const k of keys) {
        merged[k] = cloud[k] ?? DEFAULTS[k];
      }

      // 规则 #1：反序列化
      // [根据字段表，对标记为 JSON.stringify 的字段自动生成：]
      if (merged.buildings_json) {
        try { merged.buildings = JSON.parse(merged.buildings_json); }
        catch { merged.buildings = []; }
      }

      // 规则 #7（放置类）：离线收益计算
      // [如有离线收益需求，在此处计算，封顶 24h]
      // const now = Date.now();
      // const offlineMs = Math.min(now - merged.last_save, 24 * 3600 * 1000);
      // merged.bake_num += calcOfflineGain(merged, offlineMs); // cps 用加载后状态重算

      _lastSnapshot = JSON.stringify(merged);
      return merged;
    } catch (e) {
      // 规则 #9：失败不阻塞游戏
      console.warn('[ServerStorage] load 失败，已离线运行：', e.message);
      return { ...DEFAULTS };
    }
  }

  /* ========== 写入（diff 去重 + 批量加密写入） ========== */
  async function saveFull(state) {
    // [根据字段表生成映射，示例：]
    const current = {
      bake_num: state.bakeNum,
      lifetime_points: state.lifetimePoints,
      prestige_level: state.prestigeLevel,
      buildings_json: JSON.stringify(state.buildings), // 规则 #1
      last_save: Date.now(),                           // 规则 #2
    };

    // 规则 #12：diff 去重，只写变更字段
    const snapshot = JSON.stringify(current);
    if (snapshot === _lastSnapshot) return; // 无变化不存
    const prev = _lastSnapshot ? JSON.parse(_lastSnapshot) : {};
    _lastSnapshot = snapshot;

    const changed = Object.entries(current).filter(([k, v]) => prev[k] !== v);
    if (changed.length === 0) return;

    // 规则 #8：使用批量加密写入，每批次 ≤ 20 条
    const BATCH = 20;
    for (let i = 0; i < changed.length; i += BATCH) {
      await req.obfuscatedBatchWriteData({
        items: changed.slice(i, i + BATCH).map(([recordKey, value]) => ({ recordKey, value })),
      });
    }
  }

  /* ========== 排行榜 ========== */
  // SDK 通过 BILLBOARD_CONFIG 中的 devBillboardId/proBillboardId 自动选择环境
  async function getRank(page = 1, pageSize = 10) {
    return req.getBillboardRank({ ...BILLBOARD_CONFIG, page, pageSize });
  }

  async function getUserRank() {
    return req.getUserRank({ ...BILLBOARD_CONFIG });
  }

  // 规则 #13：并行拉取榜单 + 个人排名
  async function loadLeaderboard() {
    const [rankList, myRank] = await Promise.all([
      getRank(),
      getUserRank(),
    ]);
    return { rankList: rankList.records, myRank };
  }

  /* ========== 旧存档迁移（规则 #11） ========== */
  // [仅当分支 A 检测到 localStorage 存档时生成此函数]
  async function migrateFromLocalStorage(oldKey) {
    const migrated = localStorage.getItem('__ss_migrated__');
    if (migrated) return;

    const raw = localStorage.getItem(oldKey);
    if (!raw) return;

    try {
      const old = JSON.parse(raw);
      // [根据字段表映射旧字段到新 recordKey]
      await saveFull(old);
      localStorage.setItem('__ss_migrated__', '1');
      console.log('[ServerStorage] localStorage 存档迁移完成');
    } catch (e) {
      console.warn('[ServerStorage] 迁移失败：', e.message);
    }
  }

  return { loadFull, saveFull, getRank, getUserRank, loadLeaderboard, migrateFromLocalStorage };
})();

window.ServerStorage = ServerStorage; // 规则 #5：显式挂载，双重保险
```

**⚠️ 条件生成：若字段表中有「客态可读」字段，在 IIFE 的 `return` 之前追加以下函数，并将 `loadForUser` 加入 return 导出：**

```javascript
  /* ========== 客态读取（仅当字段表有客态可读字段时生成） ========== */
  // 读取指定用户数据；queryUid 为空或等于当前登录用户时退化为读自己数据
  // 前提：keys 中所有字段已在 CMS 后台开启「客态读取」（allowGuestRead: true）
  async function loadForUser(queryUid) {
    // [仅包含字段表中标记「客态可读」的 key，例如：]
    const clientReadableKeys = [/* 'lifetime_points', ... */];
    try {
      const result = await req.batchReadData({ keys: clientReadableKeys, queryUid });
      return result.records.reduce((acc, r) => {
        acc[r.recordKey] = r.value ?? DEFAULTS[r.recordKey];
        return acc;
      }, {});
    } catch (e) {
      console.warn('[ServerStorage] loadForUser 失败：', e.message);
      return {};
    }
  }
```

---

## 3.3 HTML 引用注入

新增页面选择步骤（同模式6，候选为含 DS Marker 的文件），用户选择后遍历注入。

在每个选中的 HTML 文件中，确保引入顺序：

```html
<!-- <head> 中预加载 SDK 库（版本 ≥ 0.2.1，不再引入 index.css） -->
<script src="https://ds.res.netease.com/online/pkg/mini-game-data-sdk/0.2.1/index.js"></script>

<!-- ⚠️ 必须 type="module"：相对路径脚本若缺该属性，部署平台不会重写为 CDN 地址 -->
<script type="module" src="src/game-server-storage.js"></script>

<!-- 业务主逻辑 -->
<script type="module" src="src/game.js"></script>
```

---

## 3.4 业务代码改造

在业务代码入口（`DOMContentLoaded` 或游戏初始化函数）加载存档，并在关键节点调用存档：

```javascript
// 游戏初始化
async function init() {
  // 规则 #11（分支 A 项目）：先迁移旧存档（函数内部有幂等保护，只有首次才真正执行）
  // 必须在 loadFull 之前：迁移会把旧 localStorage 数据写入服务端，
  // 之后 loadFull 才能读到正确的云端数据；顺序反了会导致旧数据覆盖云端存档
  await ServerStorage.migrateFromLocalStorage('旧localStorage的key名');

  const saved = await ServerStorage.loadFull();

  // 将存档恢复到内存状态
  game.bakeNum = saved.bake_num;
  game.lifetimePoints = saved.lifetime_points;
  game.prestigeLevel = saved.prestige_level;
  game.buildings = saved.buildings || [];
  // ... 其余字段 ...

  // 启动同步（策略来自 01-sync-strategy.md 的配置）
  // [根据同步配置插入对应触发器代码]
}
```

---

## 3.5 安全提示

如果字段表中有「进排行榜」的字段，生成代码后追加以下提示：

```
⚠️ 安全提示：
字段 [lifetime_points] 进入了排行榜，存在被客户端篡改（刷分）的风险。

建议措施（按重要性）：
  1. 关键数值用 ds-act-sdk 的服务端校验任务接口（mode 6）
  2. 客户端做合理性校验：单次增量超过阈值则丢弃
  3. 服务端排行榜接入后台风控（需联系 SDK 团队配置）

如果游戏只是娱乐展示性质，可忽略本提示。
```

---

## 3.6 代码生成完成后的流程

代码生成完毕后，**先生成榜单 UI（若有），再执行 CMS 字段注册**：

1. **若字段表有进榜字段 → 读取 `03-leaderboard.md`** 继续第 4 步榜单 UI 生成；无排行榜字段则跳过第 4 步

2. **读取 `04-cms-register.md`**（5.1 → 5.2）执行第 5 步 CMS 字段注册：
   - 输出字段清单
   - 输出 DataHub 批量导入 JSON
   - 询问用户是否现在录入
   - **若字段表中有「客态可读」字段**，在字段清单末尾追加提醒：
     ```
     ⚠️  以下字段需要开启客态读取（否则 loadForUser 调用会返回 200100 错误）：
       · [字段名1]
       · [字段名2]
     开启方式（二选一）：
       1. 推荐：批量导入 JSON 时，对应字段条目加 "allowGuestRead": true（已在上方 JSON 中为你生成）
       2. CMS 后台手动：活动 → 小游戏管理 → 对应小游戏 key 配置 → 编辑 → 客态读取开关
     ```

3. **CMS 注册完成（或跳过）后** → 进入第 6 步审查

---

## 3.7 override 规则的记录

如用户在第 1 步声明跳过了某些 B 档规则，在生成代码后告知：

```
已应用 override（以下 B 档规则已跳过）：
  · 规则 #11（旧档迁移）：用户声明无旧存档，已跳过
  · 规则 #7（离线收益封顶）：用户声明无离线收益机制，已跳过

这些决策将记录到 docs/data-storage.md 的「已 override 规则」小节。
```

# 第 3b 步：每秒自动产出（perSecond）游戏的存档增强

> 目标：为「有每秒自动产出（perSecond / bakePerSecond / 产出速率 / getPerSecond / 每秒自动增加）」的游戏补齐 clobber 防护与写入可靠性增强。
> 前置：第 1 步字段表已锁定 + 第 2 步同步策略已确认 + 已读 `02-best-practices.md` 14 条通用规则。
> 适用判定：第 2 步 `01-sync-strategy.md` 2.1 游戏类型识别命中放置/点击类（特征关键词：`cps` / `bakePerSecond` / `产出速率` / `每秒自动增加` / `perSecond` / `getPerSecond`）。
> **无此特征的游戏跳过本文件**，走 02 通用模板即可。

---

## 3b.1 为什么 perSecond 游戏需要额外防护

perSecond 游戏（放置/点击/挂机类）有三条 clobber 风险链，是其他类型（回合制/关卡/卡牌）不具备的：

| 风险链 | 触发场景 | 为什么 perSecond 游戏独有 |
|---|---|---|
| **断网离线 clobber** | 断网→loadFull 失败→DEFAULTS 兜底玩→CPS 自动涨→联网 saveFull 盖云端 | perSecond 游戏断网也能"玩"（CPS 自动产出），且默认值起步会产出新数据。无 CPS 的游戏断网玩无产出，盖回去的仍是旧数据 |
| **close-time CPS 丢失** | 关页面时 saveFull 异步被卸载掐断→最后窗口的 CPS 增量丢 | perSecond 游戏每秒都在涨，任何窗口都有增量。无 CPS 的游戏关页面时状态不变，无增量可丢 |
| **瞬时写失败丢 delta** | 网络抖动→obfuscatedBatchWriteData 失败→该 delta 被跳过 | perSecond 游戏每 30s 存一次，窗口内增量持续累积。其他类型存档频率低、增量离散 |

因此 perSecond 游戏在 02 通用 14 规则之上，**额外应用以下 5 条增强**。这些增强不 override 通用规则，而是在其上加层。

---

## 3b.2 增强规则（A 档，不可 override）

| # | 增强规则 | 为什么 | 02 通用规则的关系 |
|---|---|---|---|
| I1 | **`_loadedOK` 闸门**：loadFull 成功前，所有 saveFull 直接 return（no-op） | 堵"断网→DEFAULTS 兜底玩→联网盖云端"clobber 源头。loadFull 失败时 `_loadedOK` 保持 false，即使 module 顶层的 setInterval 触发 saveFull 也 no-op | 加层于规则 #9（规则 #9 决定 load 失败时返回什么，I1 决定失败后 saveFull 行为） |
| I2 | **load 失败不启动游戏循环**：loadFull 失败返回 `null`，业务 init 检测后不启动 gameLoop | perSecond 游戏离线运行必 clobber（CPS 自动涨）。与规则 #9 的"DEFAULTS 兜底离线运行"分支：规则 #9 适用于无 CPS 游戏（断网玩无产出），I2 适用于 perSecond 游戏 | **override 规则 #9**：perSecond 游戏不走 DEFAULTS 兜底离线运行，改为不启动。须在 `docs/data-storage.md` 记录此 override |
| I3 | **写成功后才更新 `_lastSnapshot`**：saveFull 的 `_lastSnapshot` 在 `obfuscatedBatchWriteData` 成功后才更新，失败时保持旧值 | 失败不污染 diff 基线，下次 saveFull 仍重试该 delta（否则失败字段被标记"已存"，永不重试） | 加层于规则 #12（规则 #12 是"diff 去重"，I3 是"diff 基线何时更新"） |
| I4 | **重试限次**：`scheduleRetry` 最多重试 6 次（1s→2s→4s→8s→16s→30s），到限停止 + 连续失败 toast 限频 | 无限重试耗电耗流量；限次后停止，用户感知到存档异常可手动重开 | 02 通用模板未限次，本增强补限次 |
| I5 | **cloud-empty 判定基于原始 records**：`isCloudEmpty` 判断 `result.records.length === 0`（loadFull 返回的原始记录数），非 DEFAULTS 兜底后的合并态 | loadFull 失败返回 DEFAULTS 时，合并态的 `last_save===0 && total_clicks===0` 会误判为"云端空"→触发 migrate。基于原始 records 则 loadFull 失败时 records 不可得，不误触发 | 仅当启用规则 #11 迁移时相关；加层于规则 #11 的迁移闸门 |

---

## 3b.3 模板补丁（叠加在 02 通用模板之上）

以下代码片段替换/补充 `02-best-practices.md` 3.2 模板的对应部分。Agent 生成 `game-server-storage.js` 时，识别为 perSecond 游戏后套用。

### 3b.3.1 变量声明（模板 `let _lastSnapshot = null;` 之后追加）

```javascript
  // ===== perSecond 增强变量（I1/I3/I4）=====
  let _loadedOK = false;        // I1：loadFull 成功前 saveFull 全 no-op
  let _lastSaveOK = true;       // I4：连续失败标志（false 时已 toast，成功后恢复）
  let _retryTimer = null;       // I4：重试定时器
  let _retryCount = 0;          // I4：重试次数
  let _pendingState = null;     // 指向最近一次待写入的 state 引用（retry 时重新 buildCurrent 取最新值）
  let _lastCloudEmpty = false;  // I5：原始 records 是否为空（loadFull 内设，isCloudEmpty 读）
```

### 3b.3.2 loadFull（替换模板的 loadFull）

```javascript
  async function loadFull() {
    try {
      const keys = Object.keys(DEFAULTS);
      const result = await req.batchReadData({ keys });
      const records = (result && result.records) || [];

      // I5：基于原始 records 空否（非合并态值推断）
      _lastCloudEmpty = records.length === 0;

      const cloud = {};
      records.forEach(function (r) { cloud[r.recordKey] = r.value; });

      // 规则 #10：缺失字段用默认值兜底
      const merged = {};
      for (const k of keys) { merged[k] = cloud[k] ?? DEFAULTS[k]; }

      // 规则 #1：反序列化（同 02 通用模板）
      // [根据字段表生成]

      _loadedOK = true;                       // I1：仅成功才解锁写入
      _lastSnapshot = JSON.stringify(merged); // I3：成功后才设快照
      _retryCount = 0;
      if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
      return merged;
    } catch (e) {
      // I2（override 规则 #9）：失败不 fallback 离线运行；_loadedOK 保持 false → saveFull no-op
      console.warn('[ServerStorage] load 失败：', e && e.message);
      toast('网络异常，请检查网络后重开');
      return null;  // 返回 null，由业务 init 决定不启动游戏循环
    }
  }
```

### 3b.3.3 isCloudEmpty（仅启用规则 #11 迁移时生成）

```javascript
  // I5：基于 loadFull 的原始 records 空否（非合并态启发式）
  function isCloudEmpty() {
    return _lastCloudEmpty;
  }
```

### 3b.3.4 scheduleRetry + saveFull（替换模板的 saveFull）

```javascript
  // I4：限次重试（1s→2s→4s→8s→16s→30s，共 6 次）
  function scheduleRetry() {
    var MAX_RETRY = 6;
    if (_retryCount > MAX_RETRY) {
      console.warn('[ServerStorage] 重试已达上限(' + MAX_RETRY + ')，停止重试');
      return;
    }
    if (_retryTimer) return;
    var delay = Math.min(1000 * Math.pow(2, _retryCount - 1), 30000);
    _retryTimer = setTimeout(function () {
      _retryTimer = null;
      if (_pendingState) saveFull(_pendingState).catch(function (e) {
        console.warn('[ServerStorage] 重试仍失败：', e && e.message);
      });
    }, delay);
  }

  async function saveFull(state) {
    if (!_loadedOK) return; // I1：加载未完成禁止写

    // [同 02 通用模板：buildCurrent + diff 去重]
    const current = { /* 字段表映射 */ };
    const snapshot = JSON.stringify(current);
    if (snapshot === _lastSnapshot) return; // 规则 #12：无变化不存

    const prev = _lastSnapshot ? JSON.parse(_lastSnapshot) : {};
    const changed = Object.entries(current).filter(function (kv) { return prev[kv[0]] !== kv[1]; });
    if (changed.length === 0) { _lastSnapshot = snapshot; return; }

    _pendingState = state; // 记录最新待写引用，retry 时据此重算

    try {
      // 规则 #8：批量加密写入，每批次 ≤ 20 条
      const BATCH = 20;
      for (let i = 0; i < changed.length; i += BATCH) {
        await req.obfuscatedBatchWriteData({
          items: changed.slice(i, i + BATCH).map(function (kv) {
            return { recordKey: kv[0], value: kv[1] };
          }),
        });
      }
      // I3：写入成功后才更新快照（不提前，失败时下次仍重试这些字段）
      _lastSnapshot = snapshot;
      _retryCount = 0;
      _lastSaveOK = true;
      if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
      _pendingState = null;
    } catch (e) {
      _retryCount++;
      // I4：连续失败 toast 限频（_lastSaveOK 为 false 后不重复提示，成功后恢复）
      if (_retryCount >= 2 && _lastSaveOK) { _lastSaveOK = false; toast('存档同步失败，请检查网络'); }
      if (_retryCount > 6) {  // 对齐 scheduleRetry 内 MAX_RETRY=6；到限不再调度，避免日志说"将重试"却未重试
        console.warn('[ServerStorage] save 失败（第' + _retryCount + '次），已达重试上限，停止重试：', e && e.message);
      } else {
        console.warn('[ServerStorage] save 失败（第' + _retryCount + '次），将指数退避重试：', e && e.message);
        scheduleRetry();
      }
    }
  }
```

> **return 导出**：`return` 时将 `isCloudEmpty` 加入（仅启用迁移时）。其余同 02 通用模板。

---

## 3b.4 业务改造补丁（叠加在 02 通用 3.4 之上）

### 3b.4.1 Bootstrap 顺序（perSecond 游戏专用）

```javascript
async function init() {
  // 乐观渲染：init 最开头先用默认 game 填充 UI（道具列表等静态配置始终有内容），
  // 避免 await loadFull 期间初次进入界面为空
  renderAllTabs();
  updateUI();

  // [站外门禁 / 登录门禁：按项目实际情况，见 ds.js initLogin / withPrecheck]

  // I1/I2：loadFull 成功才继续
  const saved = await ServerStorage.loadFull();
  if (!saved) {
    // I2：loadFull 失败（云端不可达），不启动游戏循环
    console.warn('[game] loadFull 失败，不启动游戏循环');
    return;
  }

  // [规则 #11 迁移：仅启用迁移时，isCloudEmpty 为真才 migrate]
  if (ServerStorage.isCloudEmpty && ServerStorage.isCloudEmpty()) {
    await ServerStorage.migrateFromLocalStorage('旧localStorage的key名');
  }

  // 恢复内存状态
  Object.assign(game, saved);

  // 离线收益 calc：必须用 cloud.last_save（非 localStorage 旧值）
  const now = Date.now();
  const offlineSec = Math.floor((now - game.lastTime) / 1000); // game.lastTime 由 cloud.last_save 映射而来
  if (offlineSec > 0 && game.totalClicks > 0) {
    const capped = Math.min(offlineSec, 8 * 3600); // 封顶 8h（按项目配置，规则 #7 默认 24h）
    const offlineGain = getPerSecond() * capped;   // perSecond 用加载后状态重算
    game.points += offlineGain;
    // ... 累计统计 ...
  }

  // 启动同步触发器（第 2 步配置）+ gameLoop
}
```

### 3b.4.2 离线收益必须读 cloud.last_save

perSecond 游戏的离线收益 calc（`offlineSec = now - last_save`）是 close-time CPS 自愈的关键（见 3b.5）。**必须读 `cloud.last_save`**（经 `mapCloudToState` 映射为 `game.lastTime`），不能读 localStorage 的旧 `lastTime`——否则 last_save 不可靠时自愈失效。

---

## 3b.5 close-time CPS 自愈（涌现性质）

perSecond 游戏关页面时未同步的 CPS 增量，**不需要本地缓存兜底**，由以下三者合力自愈：

```
① 写可靠性（I3 写后快照 + I4 限次重试）→ last_save 可靠（成功才更新）
② 关键节点立即存（第 2 步：购买/升级/成就/每日重置）→ 离散动作不落入 at-risk 窗口
③ 离线 calc 用 cloud.last_save → close-time 未同步的 CPS 增量因 last_save 滞后被补回
   (offlineSec = now - cloud.last_save，含断档期 + 离开期)
```

→ **残余丢失** = 关键节点 saveFull 失败 + 关前重试未成功的**离散动作**（罕见；CPS 部分由 ③ 自愈）。要彻底消除需本地缓冲 + LWW = 引入双写一致性复杂度，与 server-wins 原则冲突，故接受。

> **无 perSecond 的游戏不适用**：无 CPS 产出的游戏关页面时状态不变，无 close-time 增量可丢，也无机线收益 calc 自愈机制。本节仅对 perSecond 游戏成立。

---

## 3b.6 override 记录

应用 I2（load 失败不启动游戏循环）时，须在 `docs/data-storage.md` 记录：

```
已应用 override（perSecond 游戏增强）：
  · 规则 #9（load 失败兜底离线运行）：perSecond 游戏改为不启动游戏循环（I2），
    理由：perSecond 游戏断网离线玩必 clobber（CPS 自动涨→联网盖云端），
    与规则 #9 适用于无 CPS 游戏的"断网玩无产出"场景不同。
```

---

## 3b.7 自检

1. `_loadedOK` 闸门已加（I1）：loadFull catch 中 `_loadedOK` 保持 false
2. loadFull 失败返回 `null`（I2）：业务 init 检测 `if (!saved) return`
3. `_lastSnapshot` 写后更新（I3）：saveFull catch 中不更新
4. `scheduleRetry` 限次 6（I4）：到限 return
5. `isCloudEmpty` 基于 `records.length === 0`（I5）：非合并态
6. 离线 calc 读 `cloud.last_save`（映射为 `game.lastTime`）：非 localStorage

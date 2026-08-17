# 第 2 步：同步策略（Agent 推荐 + 用户确认）

> 目标：确定「何时存档」，避免用户自己拍脑袋决定。
> 输入：第 1 步锁定的字段表（游戏类型从中推断）。
> 输出：同步触发器配置。

---

## 2.1 游戏类型识别

扫描业务代码，按以下特征判断游戏类型（可多个匹配）：

| 特征关键词 / 代码模式 | 识别为游戏类型 |
|----------------------|--------------|
| `cps` / `bakePerSecond` / `产出速率` / 建筑列表 / 每秒自动增加 | 放置 / 点击类（Idle/Clicker） |
| `gameOver` / `endGame` / `结算弹窗` / `得分` / `生命值归零` | 回合制 / 局末类 |
| `levelUp` / `stageComplete` / `通关` / `nextLevel` | 关卡类 |
| `card` / `deck` / `技能` / `角色` / `装备` / `状态buff` | 卡牌 / RPG 类 |

---

## 2.2 推荐策略表

根据识别的游戏类型，按下方推荐：

### 放置 / 点击类（有 CPS 自动产出）

```
基于你的游戏类型（放置/点击类，有自动产出），推荐同步策略：

  ✅ [推荐] 节流同步
    · 每 30 秒一次定时存档（setInterval）
    · 切后台时立即存（visibilitychange: hidden）
    · 关页面时立即存（beforeunload / pagehide）
    · 关键节点立即存：飞升、购买建筑、解锁成就

  备选：关键节点同步
    只在飞升/购买时存，不做定时存档
    ⚠️ 普通点击累积的数据丢失风险较高，不推荐

确认采用推荐策略？[Y/n]
```

**代码模板：**

```javascript
const SYNC_INTERVAL = 30 * 1000; // 30s

// 定时存档
setInterval(() => ServerStorage.saveFull(state), SYNC_INTERVAL);

// 切后台 / 关页面
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    ServerStorage.saveFull(state);
  }
});
window.addEventListener('pagehide', () => ServerStorage.saveFull(state)); // iOS 兜底

// 关键节点（示例：飞升）
function prestige() {
  // ... 飞升逻辑 ...
  ServerStorage.saveFull(state); // 立即存
}
```

> **close-time CPS 自愈**：放置类游戏关页面时未同步的 CPS（每秒自动产出）增量，**不需要本地缓存兜底**，由三者合力自愈：① 写可靠性（`_lastSnapshot` 写后更新 + 限次重试，见 `02b-idle-game-storage.md`）保证 `last_save` 可靠 → ② 关键节点立即存覆盖离散动作 → ③ 下次启动离线收益 calc `offlineSec = now - cloud.last_save` 补回断档期 + 离开期产出。残余丢失仅"关键节点 saveFull 失败 + 关前重试未成功"的离散动作（罕见）。**前提：离线 calc 必须读 `cloud.last_save`（非 localStorage 旧值）**，详见 `02b-idle-game-storage.md` 3b.4.2 / 3b.5。

---

### 回合制 / 局末类（有游戏结束逻辑）

```
基于你的游戏类型（回合制/局末），推荐同步策略：

  ✅ [推荐] 局末同步 + 兜底
    · 每局游戏结束时立即存（gameOver / endGame 回调）
    · 关页面时兜底存（beforeunload / pagehide）

确认采用推荐策略？[Y/n]
```

**代码模板：**

```javascript
// 局末存档
function onGameOver(finalScore) {
  state.score = finalScore;
  ServerStorage.saveFull(state);
}

// 关页面兜底
window.addEventListener('pagehide', () => ServerStorage.saveFull(state));
```

---

### 关卡类（有关卡通关 / levelUp）

```
基于你的游戏类型（关卡类），推荐同步策略：

  ✅ [推荐] 关卡完成立即存 + 定时兜底
    · 通关时立即存（levelComplete 回调）
    · 每 60 秒定时兜底（单局时间较长时防丢档）
    · 关页面时兜底存

确认采用推荐策略？[Y/n]
```

**代码模板：**

```javascript
function onLevelComplete(level) {
  state.levelCurrent = level;
  ServerStorage.saveFull(state);
}

setInterval(() => ServerStorage.saveFull(state), 60 * 1000);
window.addEventListener('pagehide', () => ServerStorage.saveFull(state));
```

---

### 卡牌 / RPG 类（操作密集）

```
基于你的游戏类型（卡牌/RPG），推荐同步策略：

  ✅ [推荐] 操作即同步（带 debounce）
    · 每次状态变更 200ms 后存一次（防抖，避免过频）
    · 关页面时立即存（绕过防抖，确保最后状态保存）

确认采用推荐策略？[Y/n]
```

**代码模板：**

```javascript
let saveTimer = null;
function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => ServerStorage.saveFull(state), 200);
}

// 在关键状态变更后调用 debouncedSave()

window.addEventListener('pagehide', () => {
  clearTimeout(saveTimer);
  ServerStorage.saveFull(state); // 关页面不等 debounce
});
```

---

## 2.3 iOS webview 注意事项

iOS webview 中 `beforeunload` 不可靠，推荐用 `pagehide` 作为兜底（已在上方所有模板中包含）。

`visibilitychange` 在大神 App 切后台时会正确触发，可以放心使用。

---

## 2.4 输出：同步配置

用户确认后，输出同步配置（用于第 3 步代码生成）：

```
✅ 同步策略已确认

游戏类型：[识别结果]
触发器列表：
  - setInterval: 30000ms（放置类）/ 60000ms（关卡类）/ 无（其他）
  - visibilitychange: hidden
  - pagehide
  - 关键节点：[列表，如 prestige / onGameOver / onLevelComplete]
存档节流：[有/无，及间隔]
```

---

## 2.5 进入第 3 步

同步策略确认后，读取 `02-best-practices.md` 继续生成代码。

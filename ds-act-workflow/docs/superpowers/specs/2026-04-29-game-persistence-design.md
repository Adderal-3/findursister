# 设计文档：模式6 — 游戏数据持久化

**日期：** 2026-04-29  
**项目：** ds-act-skills  
**作者：** brainstorming session

---

## 背景

ds-act-skills 现有 6 个模式（MODE 0-5）。其中 MODE 5 游戏行为埋点负责上报单场对局日志（trackEvent），但玩家的跨会话进度/状态（关卡、分数、道具库存等）目前完全存在内存变量中，页面刷新即丢失，没有任何持久化机制。

本设计新增 **MODE 6：游戏数据持久化**，扫描业务代码识别需要持久化的状态变量，自动生成独立的 `game-storage.js` 模块并插入存取调用。

---

## 目标

- 扫描业务代码，语义识别跨会话状态变量
- 生成独立的 `game-storage.js`（AES-GCM 加密 + localStorage，零第三方依赖）
- 在业务代码中自动插入 `GameStorage.save()` / `GameStorage.load()` 调用
- 预留后端接口 TODO，当前不实现远端存储

---

## 设计约束

| 约束 | 说明 |
|------|------|
| 存储方案 | 原生 localStorage，无第三方依赖 |
| 加密方案 | Web Crypto API AES-GCM，Chrome 37+，零依赖，原生异步 |
| 存储 Key | 从 URL pathname 中提取游戏唯一 ID（UUID 格式），如 pathname `/minigame/a59a93c3-c2b4-4d1c-9886-a4f38db382e3/index.html` → key `a59a93c3-c2b4-4d1c-9886-a4f38db382e3` |
| 加密 Key 派生 | PBKDF2 从游戏 ID 派生，不同活动页存档互相隔离、互不可解密 |
| 后端接口 | 预留 TODO 注释，当前不实现 |
| 与 MODE 5 关系 | 互相独立，MODE 5 上报单场对局日志，MODE 6 持久化跨会话进度 |

---

## 架构

### 产物

**1. `game-storage.js`（新增文件）**

独立 IIFE 模块，挂载到 `window.GameStorage`，对业务代码暴露三个方法：

```javascript
GameStorage.save(state)   // 异步，加密后写入 localStorage
GameStorage.load()        // 异步，读取并解密，返回 state 对象或 null
GameStorage.clear()       // 同步，清除存档
```

**2. 业务代码插入点**

在用户确认的状态变量的存取位置插入调用，例如：
- 游戏初始化时：插入 `GameStorage.load()` 恢复进度
- 关键节点（通关、存档触发）时：插入 `GameStorage.save(state)`

---

### `game-storage.js` 完整结构

```javascript
// game-storage.js — 游戏数据持久化模块
// 依赖：Web Crypto API（Chrome 37+），无第三方依赖
const GameStorage = (() => {
  // 从 URL pathname 中提取游戏唯一 ID（UUID），作为存储 key
  // 例：/minigame/a59a93c3-c2b4-4d1c-9886-a4f38db382e3/index.html → a59a93c3-c2b4-4d1c-9886-a4f38db382e3
  const _uuidMatch = window.location.pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const STORAGE_KEY = _uuidMatch ? _uuidMatch[0] : window.location.pathname.replace(/\/$/, '');

  // PBKDF2 派生加密密钥（从 STORAGE_KEY 派生，不硬编码）
  async function deriveKey() {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(STORAGE_KEY), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode('ds-game-storage'), iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // AES-GCM 加密
  async function encrypt(plaintext) {
    const key = await deriveKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, enc.encode(plaintext)
    );
    // 拼接 iv + ciphertext，Base64 存储
    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);
    return btoa(combined.reduce((s, b) => s + String.fromCharCode(b), ''));
  }

  // AES-GCM 解密
  async function decrypt(base64) {
    const key = await deriveKey();
    const combined = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, ciphertext
    );
    return new TextDecoder().decode(plaintext);
  }

  return {
    async save(state) {
      try {
        const encrypted = await encrypt(JSON.stringify(state));
        localStorage.setItem(STORAGE_KEY, encrypted);
      } catch (e) {
        console.warn('[GameStorage] save failed:', e);
      }
    },

    async load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(await decrypt(raw));
      } catch (e) {
        console.warn('[GameStorage] load failed, clearing corrupt data:', e);
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    },

    clear() {
      localStorage.removeItem(STORAGE_KEY);
    },

    // TODO: 接入后端接口时实现以下方法，替换 save/load 的存取逻辑
    // async saveRemote(state) { /* POST /api/progress, body: state */ },
    // async loadRemote() { /* GET /api/progress, return state or null */ },
  };
})();
```

---

## MODE 6 交互流程

### 步骤 1：前置检查

检查 `game-storage.js` 是否已存在于项目中。

- ✅ 不存在 → 继续步骤 2
- ⚠️ 已存在 → 提示：

```
⚠️ 检测到项目中已存在 game-storage.js，继续将覆盖现有文件。
是否继续？(y/n)
```

> 注：不检查 ds.js 是否存在，持久化功能与 ds.js 无依赖关系。

---

### 步骤 2：扫描 + 语义识别状态变量

**扫描范围（同 MODE 5）：**

| 框架 | 扫描范围 |
|------|---------|
| HTML | `src/` 下所有 `.js`、`.ts` + `index.html` 内联 `<script>`；若无 `src/` 则扫当前目录（排除 `node_modules`、`.git`） |
| React | `src/` 下所有 `.js`、`.ts`、`.jsx`、`.tsx` |
| Vue | `src/` 下所有 `.js`、`.ts`、`.vue` |

**识别目标：跨会话状态变量**

语义标准：在多个函数/生命周期中被读写、且在游戏核心进度中有意义的变量。

| 典型变量 | 类型 |
|---------|------|
| `score`、`highScore` | 分数 |
| `level`、`stage`、`chapter` | 关卡 |
| `hp`、`lives`、`energy` | 资源 |
| `coins`、`gems`、`points` | 货币 |
| `unlockedStages`、`achievements` | 解锁内容 |
| `inventory`、`items` | 道具库存 |

**排除：** 纯 UI 状态（`isModalOpen`、`currentTab`）、临时计算变量、单场对局内的临时分数（已由 MODE 5 上报）。

**识别结果为空时：** 输出提示并退出：

```
未找到需要持久化的状态变量。建议检查业务代码是否在扫描范围内，或手动调用 GameStorage.save() / GameStorage.load()。
```

**输出识别结果表格：**

```
## 游戏状态变量识别结果（持久化用）

| # | 变量名 | 位置 | 类型推断 | 建议持久化 |
|---|--------|------|---------|----------|
| 1 | score | game.js:12 | number | ✅ 是 |
| 2 | level | game.js:13 | number | ✅ 是 |
| 3 | inventory | game.js:15 | object | ✅ 是 |
| 4 | isModalOpen | ui.js:8 | boolean | ❌ 否（UI状态） |

请确认需要持久化的变量（输入编号，如 1,2,3）：
💡 默认推荐：已标记「✅ 是」的全部
```

---

### 步骤 3：展示插入点 + 确认

对用户选择的变量，识别两类插入点：

1. **load 点**：游戏初始化时（`init()`、`DOMContentLoaded`、组件 `mounted` 等）
2. **save 点**：关键状态变更后（通关、存档、关卡完成、奖励领取等）

展示代码预览，例如：

```javascript
// game.js — 初始化时 load（插入前）
function init() {
  score = 0;
  level = 1;
  startGame();
}

// game.js — 初始化时 load（插入后）
async function init() {
  const saved = await GameStorage.load();
  score = saved ? saved.score : 0;
  level = saved ? saved.level : 1;
  startGame();
}
```

```javascript
// game.js — 通关时 save（插入前）
function onLevelComplete() {
  level++;
  showLevelUpScreen();
}

// game.js — 通关时 save（插入后）
async function onLevelComplete() {
  level++;
  showLevelUpScreen();
  await GameStorage.save({ score, level, inventory }); // ← 持久化进度
}
```

然后询问：

```
是否自动插入以上持久化代码，并生成 game-storage.js？

  [A] 全部插入
  [B] 选择性插入（逐个确认）

输入 A 或 B：
```

---

### 步骤 4：生成文件 + 插入完成报告

1. 在项目根目录（或 `src/` 目录，与 `ds.js` 同级）生成 `game-storage.js`
2. 在 `index.html` 中于业务脚本之前添加引用：`<script src="game-storage.js"></script>`
3. 在业务代码中插入 `load` / `save` 调用

输出报告：

```
## 💾 游戏数据持久化完成

### 新增文件
  - game-storage.js（AES-GCM 加密，Web Crypto API，零依赖）

### 修改文件
| 文件 | 改动 |
|------|------|
| index.html | 新增 <script src="game-storage.js"> 引用 |
| game.js:12 | init() 中插入 GameStorage.load() |
| game.js:88 | onLevelComplete() 中插入 GameStorage.save() |

### 验证方式
1. 触发存档操作（如通关）
2. 打开 DevTools → Application → Local Storage
3. 确认存在 key = /minigame/xxx 的加密条目
4. 刷新页面，确认进度已恢复

### TODO：接入后端接口
game-storage.js 末尾预留了 saveRemote / loadRemote 方法的 TODO 注释。
接入后端时实现这两个方法，并在 save/load 中替换调用即可，业务代码无需修改。
```

---

## 设计决策

| 决策 | 原因 |
|------|------|
| Web Crypto API 而非 CryptoJS | 零依赖，浏览器原生，Chrome 37+ 全覆盖，H5 活动页场景完全够用 |
| PBKDF2 派生 key 而非硬编码 | 不同活动页存档隔离，避免跨页面解密；无需在代码中暴露密钥 |
| STORAGE_KEY 取 pathname 中的 UUID | 游戏 ID 即业务唯一标识，语义明确；正则提取 UUID，降级时回退到完整 pathname；测试/正式同一域名下的不同活动不互相干扰 |
| iv 随机生成并与密文一起存储 | AES-GCM 标准做法，防止重放攻击 |
| load 失败时清除损坏数据 | 防止因数据损坏导致游戏永久无法启动 |
| game-storage.js 独立文件 | 后续换后端实现只改这一个文件，业务代码零感知 |
| 不依赖 ds.js | 持久化是独立功能，不应强制要求先接入大神 SDK |
| 后端接口仅预留 TODO | 方案未定，不过早设计；当前 localStorage 足够满足需求 |

---

## 影响范围

- `SKILL.md` 模式选择菜单：新增 `[6] 💾 游戏数据持久化` 入口
- `references/game-storage.md`：新增 MODE 6 执行文件
- 不影响现有 MODE 0-5 逻辑

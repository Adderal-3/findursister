# 游戏数据持久化（MODE 6）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `SKILL.md` 中新增模式6（游戏数据持久化），扫描业务代码语义识别跨会话状态变量，生成 `game-storage.js`（AES-GCM 加密 + localStorage）并自动插入存取调用。

**Architecture:** 纯 markdown skill 文档修改，无运行时代码。修改内容分两处：① `SKILL.md` 模式选择菜单新增 `[6]` 入口；② 新增 `references/game-storage.md` 文件，包含 MODE 6 完整执行步骤（前置检查、扫描识别、插入确认、完成报告）。复用现有框架检测逻辑，不新增任何基础设施。

**Tech Stack:** Markdown，无代码框架。

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `SKILL.md` | 修改 | 模式选择菜单加 `[6]`，路由表加对应行 |
| `references/game-storage.md` | 新增 | MODE 6 完整执行文件 |

---

### Task 1：SKILL.md 模式选择菜单新增模式6入口

**Files:**
- Modify: `SKILL.md`（模式选择菜单部分）

- [ ] **Step 1: 读取 SKILL.md，确认当前菜单末尾内容**

  读取 `SKILL.md`，找到模式选择菜单，确认末尾是：
  ```
    [5] 🎮 游戏行为埋点
        扫描业务代码，语义识别交互/流程/结果/奖励节点，生成 trackEvent 调用并插入

  输入 0、1、2、3、4 或 5：
  ```

- [ ] **Step 2: 在菜单中追加模式6入口**

  将：
  ```
    [5] 🎮 游戏行为埋点
        扫描业务代码，语义识别交互/流程/结果/奖励节点，生成 trackEvent 调用并插入

  输入 0、1、2、3、4 或 5：
  ```

  改为：
  ```
    [5] 🎮 游戏行为埋点
        扫描业务代码，语义识别交互/流程/结果/奖励节点，生成 trackEvent 调用并插入

    [6] 💾 游戏数据持久化
        扫描业务代码，识别跨会话状态变量，生成 game-storage.js（AES-GCM 加密）并插入存取调用

  输入 0、1、2、3、4、5 或 6：
  ```

- [ ] **Step 3: 在路由表中追加模式6行**

  找到路由表（`用户选择后，读取对应模式文件并执行：` 下方的表格），在末尾追加一行：

  将：
  ```
  | 5 | `~/.claude/skills/ds-act-skills/references/game-log.md` |
  ```

  改为：
  ```
  | 5 | `~/.claude/skills/ds-act-skills/references/game-log.md` |
  | 6 | `~/.claude/skills/ds-act-skills/references/game-storage.md` |
  ```

- [ ] **Step 4: 验证修改**

  确认 `SKILL.md` 中：
  1. 菜单包含 `[6] 💾 游戏数据持久化` 条目
  2. 提示语改为"输入 0、1、2、3、4、5 或 6："
  3. 路由表有 `| 6 | ... game-storage.md |` 行

- [ ] **Step 5: Commit**

  ```bash
  git add SKILL.md
  git commit -m "feat: add mode 6 entry to skill menu"
  ```

---

### Task 2：新增 references/game-storage.md

**Files:**
- Create: `references/game-storage.md`

- [ ] **Step 1: 创建文件，写入完整 MODE 6 内容**

  创建 `references/game-storage.md`，内容如下：

  ````markdown
  # 六、游戏数据持久化模式（MODE 6: GAME_STORAGE）

  ### 步骤 1：前置检查

  检查项目中是否已存在 `game-storage.js`（根目录或 `src/` 目录下）。

  - ✅ 不存在 → 继续步骤 2
  - ⚠️ 已存在 → 输出以下提示，等待用户确认：

  ```
  ⚠️ 检测到项目中已存在 game-storage.js，继续将覆盖现有文件。
  是否继续？(y/n)
  ```

  用户输入 `n` 则终止；输入 `y` 则继续步骤 2。

  > 注：不检查 ds.js 是否存在，持久化功能与 ds.js 无依赖关系。

  ---

  ### 步骤 2：扫描 + 语义识别状态变量

  **框架检测方式：** 读取 `package.json`，依赖中含 `react` 则为 React 项目，含 `vue` 则为 Vue 项目，无 `package.json` 或均不含则为 HTML 项目。

  **扫描范围（按框架）：**

  | 框架 | 扫描范围 |
  |------|---------|
  | HTML | `src/` 下所有 `.js`、`.ts` 文件 + `index.html` 中的内联 `<script>` 脚本；若无 `src/` 目录则扫当前目录所有 `.js`、`.ts` 文件（排除 `node_modules`、`.git`） |
  | React | `src/` 下所有 `.js`、`.ts`、`.jsx`、`.tsx` 文件 |
  | Vue | `src/` 下所有 `.js`、`.ts`、`.vue` 文件 |

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

  > ⚠️ 与 MODE 5 的区别：
  > - MODE 5 识别的是**单场对局行为节点**（trackEvent 日志上报，每次触发都上报）
  > - MODE 6 识别的是**跨会话进度变量**（持久化存储，跨页面刷新保留）
  > 请在输出时明确标注"持久化"目的，避免用户混淆。

  **识别结果为空时：** 输出以下提示并终止：

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

  用户输入编号后进入步骤 3。

  ---

  ### 步骤 3：展示插入点 + 确认

  对用户选择的变量，识别两类插入点：

  1. **load 点**：游戏初始化时（`init()`、`DOMContentLoaded`、组件 `mounted` 等）
  2. **save 点**：关键状态变更后（通关、存档、关卡完成、奖励领取等）

  **插入规则：**
  - `load` 调用插在初始化赋值之前，用存档值覆盖默认值
  - `save` 调用插在触发行之后，确认状态已更新再存档

  展示代码预览示例（init load）：

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

  展示代码预览示例（通关 save）：

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

  展示所有选中变量的插入点预览后，询问：

  ```
  是否自动插入以上持久化代码，并生成 game-storage.js？

    [A] 全部插入
    [B] 选择性插入（逐个确认）

  输入 A 或 B：
  ```

  - 选 **A**：直接插入全部选中变量的存取调用，进入步骤 4
  - 选 **B**：逐个插入点询问"是否插入此处的存取调用？(y/n)"，收集确认列表后批量插入，进入步骤 4

  ---

  ### 步骤 4：生成 game-storage.js + 插入业务代码 + 完成报告

  **4.1 生成 game-storage.js**

  在项目根目录生成以下文件（若项目有 `src/ds.js`，则生成在 `src/game-storage.js`，保持与 ds.js 同级）：

  ```javascript
  // game-storage.js — 游戏数据持久化模块
  // 依赖：Web Crypto API（Chrome 37+），无第三方依赖
  const GameStorage = (() => {
    // 从 URL pathname 中提取游戏唯一 ID（UUID），作为存储 key
    // 例：/minigame/a59a93c3-c2b4-4d1c-9886-a4f38db382e3/index.html → a59a93c3-c2b4-4d1c-9886-a4f38db382e3
    const _uuidMatch = window.location.pathname.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    const STORAGE_KEY = _uuidMatch ? _uuidMatch[0] : window.location.pathname.replace(/\/$/, '');

    // PBKDF2 派生加密密钥（从游戏 ID 派生，不硬编码）
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
      return btoa(String.fromCharCode(...combined));
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

  **4.2 修改 index.html，添加 script 引用**

  在 `index.html` 中，找到业务脚本的第一个 `<script src>` 引用之前，插入：

  ```html
  <script src="game-storage.js"></script>
  ```

  若 `game-storage.js` 生成在 `src/` 下，则引用改为：

  ```html
  <script src="src/game-storage.js"></script>
  ```

  **4.3 在业务代码中插入存取调用**

  按步骤 3 中用户确认的插入点，逐一修改业务代码文件，插入 `GameStorage.load()` / `GameStorage.save()` 调用。

  **4.4 输出完成报告**

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
  3. 确认存在 key = [游戏UUID] 的加密条目（值为 Base64 密文，非明文）
  4. 刷新页面，确认进度已恢复

  ### TODO：接入后端接口
  game-storage.js 末尾预留了 saveRemote / loadRemote 方法的 TODO 注释。
  接入后端时实现这两个方法，并在 save/load 中替换调用即可，业务代码无需修改。
  ```
  ````

- [ ] **Step 2: 验证文件内容**

  确认 `references/game-storage.md` 中包含：
  1. 步骤1-4 的完整流程
  2. `game-storage.js` 完整代码（含 UUID 提取、deriveKey、encrypt、decrypt、save、load、clear、TODO 注释）
  3. 扫描范围表格（HTML/React/Vue 三框架）
  4. 识别结果表格示例
  5. 代码预览示例（load 插入、save 插入）
  6. 完成报告模板

- [ ] **Step 3: Commit**

  ```bash
  git add references/game-storage.md
  git commit -m "feat: add MODE 6 game storage reference file"
  ```

---

### Task 3：验证整体结构

**Files:**
- Read: `SKILL.md`
- Read: `references/game-storage.md`

- [ ] **Step 1: 验证 SKILL.md 菜单完整性**

  读取 `SKILL.md`，确认：
  1. 菜单包含 `[6] 💾 游戏数据持久化` 条目，描述为"扫描业务代码，识别跨会话状态变量，生成 game-storage.js（AES-GCM 加密）并插入存取调用"
  2. 提示语为"输入 0、1、2、3、4、5 或 6："
  3. 路由表包含 `| 6 | ~/.claude/skills/ds-act-skills/references/game-storage.md |`

- [ ] **Step 2: 验证 game-storage.md 关键内容**

  读取 `references/game-storage.md`，确认：
  1. 标题为 `# 六、游戏数据持久化模式（MODE 6: GAME_STORAGE）`
  2. 步骤1前置检查含已存在文件的覆盖确认逻辑
  3. 步骤2扫描范围表格含三框架
  4. `STORAGE_KEY` 使用 UUID 正则提取（`/[0-9a-f]{8}-[0-9a-f]{4}-...`）
  5. 步骤4含完整 `game-storage.js` 代码
  6. 步骤4含 `index.html` script 引用插入说明
  7. 步骤4含 TODO 后端接口注释

- [ ] **Step 3: 最终 Commit**

  ```bash
  git add SKILL.md references/game-storage.md
  git commit -m "feat: complete MODE 6 game data persistence"
  ```

---

## Self-Review

### Spec 覆盖检查

| Spec 要求 | 对应 Task |
|----------|----------|
| SKILL.md 菜单新增 [6] 入口 | Task 1 |
| 路由表新增 game-storage.md | Task 1 Step 3 |
| 前置检查（已存在时覆盖确认） | Task 2 步骤1 |
| 不依赖 ds.js | Task 2 步骤1注释 |
| 三框架扫描范围 | Task 2 步骤2扫描范围表格 |
| 语义识别跨会话状态变量 + 排除 UI 状态 | Task 2 步骤2识别目标 |
| 识别为空时友好提示退出 | Task 2 步骤2空结果提示 |
| 用户确认变量编号 | Task 2 步骤2输出表格 |
| 展示 load/save 代码预览 | Task 2 步骤3代码示例 |
| [A]全部插入 / [B]选择性插入 | Task 2 步骤3询问 |
| game-storage.js 完整代码（UUID key 提取） | Task 2 步骤4.1 |
| PBKDF2 派生加密 key | Task 2 步骤4.1 deriveKey |
| AES-GCM 加解密 + Base64 存储 | Task 2 步骤4.1 encrypt/decrypt |
| load 失败时清除损坏数据 | Task 2 步骤4.1 load catch |
| index.html script 引用插入 | Task 2 步骤4.2 |
| 完成报告（含验证方式） | Task 2 步骤4.4 |
| TODO 后端接口注释 | Task 2 步骤4.1 + 4.4 |
| 不影响现有 MODE 0-5 | 只新增文件和菜单行，不修改现有内容 |

### 类型/命名一致性

- `GameStorage` — Task 1 菜单描述、Task 2 代码全文一致
- `STORAGE_KEY` — Task 2 步骤4.1 代码内部一致
- `game-storage.md` — Task 1 路由表与 Task 2 文件路径一致
- `MODE 6: GAME_STORAGE` — 菜单描述与章节标题一致
- `save(state)` / `load()` / `clear()` — 步骤3预览与步骤4.1代码一致

### Placeholder 扫描

无 TBD/TODO 未完成项。后端 TODO 是有意设计的预留注释，已在 spec 中说明。✅

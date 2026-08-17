# 游戏行为埋点（MODE 5）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `SKILL.md` 中新增模式5（游戏行为埋点），扫描业务代码语义识别游戏关键节点，生成并自动插入 `trackEvent` 调用。

**Architecture:** 纯 markdown skill 文档修改，无运行时代码。修改内容分两处：①模式选择菜单新增 `[5]` 入口；②新增"五、游戏行为埋点模式（MODE 5: GAME_LOG）"章节，包含4个步骤。复用现有框架检测逻辑，不新增任何基础设施。

**Tech Stack:** Markdown，无代码框架。

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `SKILL.md` | 修改 | ①模式选择菜单加 `[5]`；②末尾加 MODE 5 章节 |

---

### Task 1：模式选择菜单新增模式5入口

**Files:**
- Modify: `SKILL.md`（模式选择菜单部分，约第51-66行）

- [ ] **Step 1: 读取 SKILL.md，确认当前菜单内容**

  确认菜单末尾是"输入 1、2、3 或 4："这一行。

- [ ] **Step 2: 修改菜单，加入模式5**

  将菜单中的：
  ```
    [4] 📱 接入微信小程序
        在现有 ds.js 上改造 withPrecheck 绕过 ulink，注入 JSSDK、URS Cookie 联登、自定义分享

  输入 1、2、3 或 4：
  ```

  改为：
  ```
    [4] 📱 接入微信小程序
        在现有 ds.js 上改造 withPrecheck 绕过 ulink，注入 JSSDK、URS Cookie 联登、自定义分享

    [5] 🎮 游戏行为埋点
        扫描业务代码，语义识别交互/流程/结果/奖励节点，生成 trackEvent 调用并插入

  输入 1、2、3、4 或 5：
  ```

- [ ] **Step 3: 验证修改**

  确认 SKILL.md 中菜单包含 `[5]` 且提示语改为"输入 1、2、3、4 或 5："。

- [ ] **Step 4: Commit**

  ```bash
  git add SKILL.md
  git commit -m "feat: add mode 5 entry to skill menu"
  ```

---

### Task 2：新增 MODE 5 章节主体

**Files:**
- Modify: `SKILL.md`（在"## 五、部署模式"之前插入新章节，或在文件末尾 `## 六、常见问题与正确写法` 之前插入）

- [ ] **Step 1: 确认插入位置**

  在 SKILL.md 中找到 `## 五、部署模式（MODE 3: DEPLOY）` 这一行（当前的"五"是部署模式）。新章节需要**重新编号**：原五→六，原六→七，新 MODE 5 章节为五。

  > 注意：SKILL.md 的章节标题编号（一二三四五六）与 MODE 编号（1234）是分开的。当前：
  > - 二 = MODE 1 INJECT
  > - 三 = MODE 2 AUDIT  
  > - 四 = MODE 4 MINIAPP
  > - 五 = MODE 3 DEPLOY
  > - 六 = 常见问题
  >
  > 新增后：五 = MODE 5 GAME_LOG，原五改为六，原六改为七。

- [ ] **Step 2: 将原"五、部署模式"标题改为"六、部署模式"**

  将：
  ```
  ## 五、部署模式（MODE 3: DEPLOY）
  ```
  改为：
  ```
  ## 六、部署模式（MODE 3: DEPLOY）
  ```

- [ ] **Step 3: 将原"六、常见问题"标题改为"七、常见问题"**

  将：
  ```
  ## 六、常见问题与正确写法
  ```
  改为：
  ```
  ## 七、常见问题与正确写法
  ```

- [ ] **Step 4: 在原"五、部署模式"（现"六"）之前插入新的 MODE 5 章节**

  插入以下完整内容：

  ````markdown
  ## 五、游戏行为埋点模式（MODE 5: GAME_LOG）

  ### 步骤 1：前置检查

  检查当前项目是否已接入 ds.js（即存在 `src/ds.js` 或根目录 `ds.js`，且包含 `trackEvent` 函数）。

  - ✅ 已接入 → 继续步骤 2
  - ❌ 未找到 → 输出以下提示并终止：

  ```
  ❌ 未找到 ds.js，请先运行模式1完成基础接入后再使用游戏行为埋点功能
  ```

  ---

  ### 步骤 2：扫描 + 语义识别

  **扫描范围（按框架）：**

  | 框架 | 扫描范围 |
  |------|---------|
  | HTML | `src/` 下所有 `.js`、`.ts` 文件 + `index.html` 中的内联 `<script>` 脚本；若无 `src/` 目录则扫当前目录所有 `.js`、`.ts` 文件（排除 `node_modules`、`.git`） |
  | React | `src/` 下所有 `.js`、`.ts`、`.jsx`、`.tsx` 文件 |
  | Vue | `src/` 下所有 `.js`、`.ts`、`.vue` 文件 |

  框架检测方式同模式1（读取 `package.json` 判断 react/vue，无则为 HTML 项目）。

  **语义识别：** 阅读扫描到的代码，用语义理解识别以下四类游戏关键节点：

  | 节点类型 | 说明 | 典型代码语义 |
  |---------|------|------------|
  | **交互** | 关键按钮点击 | `withPrecheck` 包裹的回调、关键 click handler（开始/抽奖/兑换等） |
  | **流程** | 游戏开始/重开 | 初始化游戏状态、重置关卡、倒计时开始等 |
  | **结果** | 通关/失败/超时 | 分数达标判断、gameOver 调用、倒计时归零等 |
  | **奖励** | 获得道具/领取/兑换 | 后端奖励回调成功、道具数量增加、兑换码生成等 |

  > ⚠️ 交互节点与模式2的点击预检列表外观相似，但目的不同：
  > - 模式2问的是"**是否已用 withPrecheck 包裹**"（登录预检）
  > - 模式5问的是"**是否已加 trackEvent 埋点**"（行为日志）
  > 请在输出时明确标注"埋点"目的，避免用户混淆。

  **识别结果为空时：** 输出以下提示并终止：

  ```
  未找到游戏行为节点。建议检查业务代码是否在扫描范围内，或手动在关键位置添加 trackEvent 调用。
  ```

  **输出识别结果表格：**

  ```
  ## 游戏行为节点识别结果（埋点用）

  | # | 位置 | 代码片段 | 节点类型 | 推荐 eventId | 推荐参数 |
  |---|------|---------|---------|------------|---------|
  | 1 | engine.js:45 | `withPrecheck(() => startGame())` | 交互 | `click_start` | `{}` |
  | 2 | engine.js:120 | `if (score >= target) { showWinScreen() }` | 结果-通关 | `game_win` | `{ score, level }` |
  | 3 | api.js:88 | `onRewardSuccess(res)` | 奖励 | `get_reward` | `{ rewardId, count }` |
  | 4 | game.js:200 | `gameOver()` | 结果-失败 | `game_over` | `{ score }` |

  请选择需要埋点的节点（输入编号，如 1,2,3）：
  💡 默认推荐：全部
  ```

  用户输入编号后进入步骤 3。

  ---

  ### 步骤 3：展示示例 + 确认插入

  对用户选择的每个节点，展示插入前后的代码对比。

  **插入规则：`trackEvent` 调用统一插在触发行之后**，确认事件已发生再上报，避免后续逻辑异常导致误报。

  示例（结果-通关节点）：
  ```javascript
  // engine.js:120 — 插入前
  if (score >= target) {
    showWinScreen();
  }

  // engine.js:120 — 插入后
  if (score >= target) {
    showWinScreen();
    trackEvent('game_win', { score: score, level: currentLevel }); // ← 埋点：游戏通关
  }
  ```

  示例（交互节点，withPrecheck 内）：
  ```javascript
  // engine.js:45 — 插入前
  startBtn.addEventListener('click', function() {
    withPrecheck(() => startGame());
  });

  // engine.js:45 — 插入后
  startBtn.addEventListener('click', function() {
    withPrecheck(() => {
      startGame();
      trackEvent('click_start', {}); // ← 埋点：点击开始
    });
  });
  ```

  展示所有选中节点的代码示例后，询问：

  ```
  是否自动插入以上埋点代码？

    [A] 全部插入
    [B] 选择性插入（逐个确认）

  输入 A 或 B：
  ```

  - 选 **A**：直接插入全部选中节点的 `trackEvent` 调用，进入步骤 4
  - 选 **B**：逐节点询问"是否插入此节点的埋点？(y/n)"，收集确认列表后批量插入，进入步骤 4

  ---

  ### 步骤 4：插入完成报告

  完成插入后，输出报告：

  ```
  ## 🎮 游戏行为埋点完成

  | # | 位置 | eventId | 状态 |
  |---|------|---------|------|
  | 1 | engine.js:45 | click_start | ✅ 已插入 |
  | 2 | engine.js:120 | game_win | ✅ 已插入 |
  | 3 | api.js:88 | get_reward | ✅ 已插入 |
  | 4 | game.js:200 | game_over | ⏭️ 已跳过 |

  💡 验证方式：触发对应游戏操作，在 NS 日志平台搜索 EVENT_ACTION = [你的 EVENT_ACTION 配置值]，确认对应 eventId 有上报记录。
  ```

  ---
  ````

- [ ] **Step 5: 验证章节结构**

  确认 SKILL.md 中：
  1. 存在 `## 五、游戏行为埋点模式（MODE 5: GAME_LOG）`
  2. 原部署模式标题变为 `## 六、部署模式（MODE 3: DEPLOY）`
  3. 原常见问题标题变为 `## 七、常见问题与正确写法`
  4. 模式选择菜单中有 `[5] 🎮 游戏行为埋点` 且提示语为"输入 1、2、3、4 或 5："

- [ ] **Step 6: Commit**

  ```bash
  git add SKILL.md
  git commit -m "feat: add MODE 5 game behavior logging to ds-act-skills"
  ```

---

## Self-Review

### Spec 覆盖检查

| Spec 要求 | 对应 Task |
|----------|----------|
| 模式选择菜单新增 [5] 入口 | Task 1 |
| 前置检查 ds.js 存在 | Task 2 步骤1 |
| HTML 扫描范围：.js/.ts + 内联脚本 + 无src/容错 | Task 2 步骤2中扫描范围表格 |
| React/Vue 扫描范围 | Task 2 步骤2中扫描范围表格 |
| 语义识别四类节点 | Task 2 步骤2节点类型表格 |
| 交互节点措辞与模式2明确区分 | Task 2 步骤2的⚠️注意说明 |
| 识别为空时友好提示退出 | Task 2 步骤2空结果提示 |
| 用户选择节点编号 | Task 2 步骤2输出表格 |
| 展示代码示例（含withPrecheck内埋点示例）| Task 2 步骤3 |
| 埋点插在触发行之后 | Task 2 步骤3插入规则 |
| [A]全部插入 / [B]选择性插入，无C选项 | Task 2 步骤3 |
| 插入完成报告 | Task 2 步骤4 |
| 不影响现有模式1-4 | 只新增章节，不修改现有内容 |

### 类型/命名一致性

- `trackEvent` — 全文一致
- `withPrecheck` — 全文一致
- `MODE 5: GAME_LOG` — 菜单与章节标题一致
- `eventId` — 表格列名与代码示例一致

### Placeholder 扫描

无 TBD/TODO/占位符。所有步骤含完整内容。✅

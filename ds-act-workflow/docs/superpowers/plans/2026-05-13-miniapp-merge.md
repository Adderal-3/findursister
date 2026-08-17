# Miniapp Merge into Mode 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将模式4（微信小程序）合并进模式1，URS 登录组件默认加载，`withPrecheck` 改用 `checkLogined` 直接查询 SDK 登录状态。

**Architecture:** 修改 `ds-js-template.js` 增加 `isWechatMiniProgram`、`initLogin` 函数并重构 `withPrecheck`/`initApp`；更新三个框架注入指令文件（html.md/react.md/vue.md）自动注入微信 JSSDK + URS 脚本；清理 SKILL.md 菜单和 inject.md 流程；标记 miniapp.md 废弃。

**Tech Stack:** Markdown 指令文件，JavaScript 模板（`ds-js-template.js`）

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `references/ds-js-template.js` | 修改：新增 MINIAPP-DETECT 块、`initLogin`、重构 `withPrecheck`/`initApp`/`initShare`/`initUlink` |
| `references/html.md` | 修改：SDK-LOADER 步骤前增加 JSSDK + URS 注入子步骤 |
| `references/react.md` | 修改：同 html.md，针对 Document.tsx/index.html |
| `references/vue.md` | 修改：同 html.md，针对 index.html |
| `references/inject.md` | 修改：步骤2模块列表 + 步骤7后续菜单 |
| `SKILL.md` | 修改：移除模式4、更新模式1描述、重新编号 [5]→[4] [6]→[5]、更新映射表 |
| `references/miniapp.md` | 修改：文件头添加 deprecated 说明 |

---

## Task 1：ds-js-template.js — 新增 `isWechatMiniProgram` + `initLogin`

**Files:**
- Modify: `references/ds-js-template.js`

- [ ] **Step 1：在 CONFIG 块之后插入 MINIAPP-DETECT 块**

在 `/* [DS:CONFIG:END] */` 与 `/* [DS:JSSDK:START] */` 之间插入：

```js
/* [DS:MINIAPP-DETECT:START] */
function isWechatMiniProgram() {
  return navigator.userAgent.toLowerCase().includes('miniprogram');
}
/* [DS:MINIAPP-DETECT:END] */
```

- [ ] **Step 2：在 JSSDK 块内 `dsInit` 函数之后添加 `initLogin`**

在 `/* [DS:JSSDK:END] */` 之前（紧接 `dsInit` 函数结尾的 `}` 之后）插入：

```js
async function initLogin() {
  if (window.ds && window.ds.isGodlike) {
    await dsInit();
    return;
  }
  window.dsLogin = new Ulogin.default({
    env: 'production',
    loginSuccess: function() {},
    loginFail: function() {},
  });
  var loginResult = await window.dsLogin.hasLoggedIn();
  if (loginResult) { userInfo = loginResult.user; window.userInfo = userInfo; }
  // 小程序未登录 → 跳转登录页（页面离开，后续 JS 不再有意义）
  if (isWechatMiniProgram() && (!userInfo || !userInfo.uid)) {
    wx.miniProgram.navigateTo({ url: '/pages/login/index' });
  }
}
```

- [ ] **Step 3：确认插入内容正确**

读取文件，确认：
1. `[DS:MINIAPP-DETECT:START/END]` 出现在 CONFIG 和 JSSDK 块之间
2. `initLogin` 函数出现在 `dsInit` 之后、`[DS:JSSDK:END]` 之前
3. 文件其余内容未变动

- [ ] **Step 4：Commit**

```bash
git add references/ds-js-template.js
git commit -m "feat(template): add isWechatMiniProgram and initLogin functions"
```

---

## Task 2：ds-js-template.js — 重构 `initShare`、`initUlink`、`withPrecheck`、`initApp`

**Files:**
- Modify: `references/ds-js-template.js`

- [ ] **Step 1：更新 `initShare`（在 DS:SHARE 块内，函数开头插入小程序分支）**

将：
```js
function initShare() {
  var link = window.location.href;
  if (window.ds && window.ds.isGodlike) {
```

替换为：
```js
function initShare() {
  if (isWechatMiniProgram()) {
    wx.miniProgram.postMessage({
      data: {
        pageId: window.location.pathname,
        shareConfig: {
          title: SHARE_TITLE,
          imageUrl: SHARE_ICON,
          url: window.location.href,
        },
      },
    });
    return;
  }
  var link = window.location.href;
  if (window.ds && window.ds.isGodlike) {
```

- [ ] **Step 2：更新 `initUlink`（在 DS:ULINK 块内，函数开头新增小程序跳过）**

将：
```js
function initUlink() {
  if (window.ds && window.ds.isGodlike) return;
```

替换为：
```js
function initUlink() {
  if (window.ds && window.ds.isGodlike) return;
  if (isWechatMiniProgram()) return;
```

- [ ] **Step 3：替换整个 `withPrecheck` 函数（DS:CLICK-PRECHECK 块内）**

将：
```js
function withPrecheck(callback) {
  if (!window.ds || !window.ds.isGodlike) {
    openSquareUrl();
    return;
  }
  if (!userInfo || !userInfo.uid || userInfo.uid === -9999) {
    window.ds.ready().then(function() {
      window.ds.callHandler('openLoginPage');
    });
    return;
  }
  if (typeof callback === 'function') callback();
}
```

替换为：
```js
async function withPrecheck(callback) {
  // 分支1：大神App内 → checkLogined 直接查询 SDK，避免时序依赖
  if (window.ds && window.ds.isGodlike) {
    await window.ds.ready();
    var res = await window.ds.callHandler('checkLogined');
    if (!res.result['isLogined']) {
      window.ds.callHandler('openLoginPage');
      return;
    }
    if (typeof callback === 'function') callback();
    return;
  }
  // 分支2：小程序环境 → 检查联登状态
  if (isWechatMiniProgram()) {
    if (!userInfo || !userInfo.uid) {
      wx.miniProgram.navigateTo({ url: '/pages/login/index' });
      return;
    }
    if (typeof callback === 'function') callback();
    return;
  }
  // 分支3：普通浏览器始终走 ulink
  openSquareUrl();
}
```

同步更新 DS:CLICK-PRECHECK 块的注释说明：

将：
```js
/**
 * withPrecheck(callback)
 * 统一点击前置检查，三条分支：
 *   1. 大神 App 外 → openSquareUrl() via ulink，引导进入 App
 *   2. 大神 App 内 + 未登录 → ds.callHandler('openLoginPage') 弹登录弹窗
 *   3. 大神 App 内 + 已登录 → 执行 callback 业务逻辑
 */
```

替换为：
```js
/**
 * withPrecheck(callback)
 * 统一点击前置检查，三条分支：
 *   1. 大神 App 内 → checkLogined 查询登录状态，未登录弹登录页，已登录执行 callback
 *   2. 微信小程序 → 检查 URS 联登状态，未登录跳转小程序登录页，已登录执行 callback
 *   3. 普通浏览器 → openSquareUrl() via ulink，引导进入大神 App
 */
```

- [ ] **Step 4：替换 `initApp` 函数**

将：
```js
async function initApp() {
  await dsInit();
  initShare();
  initUlink();
  // 业务逻辑从此处开始
}
```

替换为：
```js
async function initApp() {
  initShare();        // 自己判断环境
  initUlink();        // 自己判断环境（小程序内跳过）
  await initLogin();  // 自己判断环境，小程序未登录则跳转
  // 业务逻辑从此处开始
}
```

- [ ] **Step 5：确认整体结构**

读取文件，按顺序确认以下 marker 存在且函数正确：
1. `[DS:CONFIG]` → CONFIG 变量不变
2. `[DS:MINIAPP-DETECT]` → `isWechatMiniProgram`
3. `[DS:JSSDK]` → `dsInit` + `initLogin`（新增）
4. `[DS:NS-LOG]` → `trackEvent` 不变
5. `[DS:SHARE]` → `initShare` 开头有 miniapp 分支
6. `[DS:ULINK]` → `initUlink` 开头有 miniapp 跳过
7. `[DS:CLICK-PRECHECK]` → `async function withPrecheck` 三分支
8. `initApp` → 三行顺序调用
9. `[DS:EXPORTS]` → 导出列表不变

- [ ] **Step 6：Commit**

```bash
git add references/ds-js-template.js
git commit -m "feat(template): refactor withPrecheck/initApp/initShare/initUlink for miniapp+URS support"
```

---

## Task 3：html.md — 新增 JSSDK + URS 注入步骤

**Files:**
- Modify: `references/html.md`

- [ ] **Step 1：在 `4-HTML-3：生成 SDK-LOADER` 步骤开头插入新的子步骤**

在 `## 4-HTML-3：生成 SDK-LOADER` 标题之后、`读取 \`{skill_dir}/references/sdk-loader-template.html\`` 之前，插入：

```markdown
### 3.0 注入第三方依赖脚本

在 `</head>` 标签之前（SDK-LOADER 之前）注入以下脚本。每项按去重规则检查：已存在则跳过，不存在才注入。

```html
<!-- 微信小程序 JSSDK -->
<script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
<!-- URS 登录组件 -->
<link rel="stylesheet" href="https://g.166.net/pkg/universal-login/latest/index.css">
<script type="text/javascript" src="https://g.166.net/pkg/universal-login/latest/index.umd.min.js"></script>
```

| 标签 | 跳过条件 |
|------|---------|
| `jweixin-1.6.0.js` | 已存在含 `jweixin` 的 script |
| `universal-login/latest/index.css` | 已存在含 `universal-login` 的 link |
| `universal-login/latest/index.umd.min.js` | 已存在含 `universal-login` 的 script |

---
```

- [ ] **Step 2：在 `4-HTML-7：注入结果摘要` 的文件变更表中新增一行**

在 `| index.html | ✅ 已注入 SDK-LOADER |` 这行之后插入：

```markdown
| index.html | ✅ 已注入微信 JSSDK + URS 登录组件 |
```

- [ ] **Step 3：Commit**

```bash
git add references/html.md
git commit -m "feat(html): add WeChat JSSDK + URS login scripts injection step"
```

---

## Task 4：react.md — 新增 JSSDK + URS 注入步骤

**Files:**
- Modify: `references/react.md`

- [ ] **Step 1：在 `4-React-1：生成 SDK-LOADER` 步骤开头插入新的子步骤**

在 `## 4-React-1：生成 SDK-LOADER` 标题之后、`检查项目：` 之前，插入：

```markdown
### 1.0 注入第三方依赖脚本

在 `</head>` 标签之前（SDK-LOADER 之前）注入以下脚本，目标文件与 SDK-LOADER 相同（`src/Document.tsx` 的 `<head>` 或 `index.html`）。每项按去重规则检查：已存在则跳过，不存在才注入。

```html
<!-- 微信小程序 JSSDK -->
<script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
<!-- URS 登录组件 -->
<link rel="stylesheet" href="https://g.166.net/pkg/universal-login/latest/index.css">
<script type="text/javascript" src="https://g.166.net/pkg/universal-login/latest/index.umd.min.js"></script>
```

| 标签 | 跳过条件 |
|------|---------|
| `jweixin-1.6.0.js` | 已存在含 `jweixin` 的 script |
| `universal-login/latest/index.css` | 已存在含 `universal-login` 的 link |
| `universal-login/latest/index.umd.min.js` | 已存在含 `universal-login` 的 script |

---
```

- [ ] **Step 2：在 `4-React-8：注入结果摘要` 的文件变更表中新增一行**

在 `| index.html / Document.tsx | ✅ 已注入 SDK-LOADER |` 之后插入：

```markdown
| index.html / Document.tsx | ✅ 已注入微信 JSSDK + URS 登录组件 |
```

- [ ] **Step 3：Commit**

```bash
git add references/react.md
git commit -m "feat(react): add WeChat JSSDK + URS login scripts injection step"
```

---

## Task 5：vue.md — 新增 JSSDK + URS 注入步骤

**Files:**
- Modify: `references/vue.md`

- [ ] **Step 1：在 `4-Vue-1：生成 SDK-LOADER` 步骤开头插入新的子步骤**

在 `## 4-Vue-1：生成 SDK-LOADER` 标题之后、`注入到 \`index.html\`` 之前，插入：

```markdown
### 1.0 注入第三方依赖脚本

在 `index.html` 的 `</head>` 标签之前（SDK-LOADER 之前）注入以下脚本。每项按去重规则检查：已存在则跳过，不存在才注入。

```html
<!-- 微信小程序 JSSDK -->
<script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
<!-- URS 登录组件 -->
<link rel="stylesheet" href="https://g.166.net/pkg/universal-login/latest/index.css">
<script type="text/javascript" src="https://g.166.net/pkg/universal-login/latest/index.umd.min.js"></script>
```

| 标签 | 跳过条件 |
|------|---------|
| `jweixin-1.6.0.js` | 已存在含 `jweixin` 的 script |
| `universal-login/latest/index.css` | 已存在含 `universal-login` 的 link |
| `universal-login/latest/index.umd.min.js` | 已存在含 `universal-login` 的 script |

---
```

- [ ] **Step 2：在 `4-Vue-8：注入结果摘要` 的文件变更表中新增一行**

在 `| index.html | ✅ 已注入 SDK-LOADER |` 之后插入：

```markdown
| index.html | ✅ 已注入微信 JSSDK + URS 登录组件 |
```

- [ ] **Step 3：Commit**

```bash
git add references/vue.md
git commit -m "feat(vue): add WeChat JSSDK + URS login scripts injection step"
```

---

## Task 6：inject.md — 更新模式1步骤

**Files:**
- Modify: `references/inject.md`

- [ ] **Step 1：更新步骤2模块列表，新增小程序能力说明**

将步骤2的模块表：
```markdown
| 模块 | 说明 |
|------|------|
| NS 日志埋点 | `trackEvent` 必须保留，提供日志提示词示例 |
| ulink 跳转 | `openSquareUrl`、`initUlink` |
| JSSDK 端能力 | `dsInit`、`userInfo`、`godlikeInfo`、登录流程 |
| 移动端分享 | `initShare`、`onUpdateShareMenu`，提供 dsjssdk 提示词 |
```

替换为：
```markdown
| 模块 | 说明 |
|------|------|
| NS 日志埋点 | `trackEvent` 必须保留，提供日志提示词示例 |
| ulink 跳转 | `openSquareUrl`、`initUlink`（大神App外 + 普通浏览器） |
| JSSDK 端能力 | `dsInit`、`userInfo`、`godlikeInfo`、`initLogin`（三环境登录） |
| 移动端分享 | `initShare`、`onUpdateShareMenu`，提供 dsjssdk 提示词 |
| 微信小程序支持 | `isWechatMiniProgram`、URS Cookie 联登、`wx.miniProgram` 分享 |
```

同步更新步骤2开头的模块列表（emoji 行）：

将：
```
  1️⃣ NS日志埋点  — 记录用户在哪个页面点了什么按钮
  2️⃣ ulink跳转   — 站外用户点击时，引导进入大神APP
  3️⃣ JSSDK端能力 — 获取用户登录状态、是否在APP内
  4️⃣ 移动端分享  — 微信/QQ等渠道分享时显示标题和图标
```

替换为：
```
  1️⃣ NS日志埋点    — 记录用户在哪个页面点了什么按钮
  2️⃣ ulink跳转     — 站外用户点击时，引导进入大神APP
  3️⃣ JSSDK端能力   — 获取用户登录状态、是否在APP内（三环境：大神App/小程序/普通浏览器）
  4️⃣ 移动端分享    — 微信/QQ等渠道分享时显示标题和图标
  5️⃣ 微信小程序支持 — URS Cookie 联登、小程序内分享、绕过 ulink
```

- [ ] **Step 2：更新步骤7后续菜单，移除 [4] 接入微信小程序**

将步骤7中的后续菜单：
```
  [3] 🚀 构建并打包 → 生成 deploy.zip 上传大神平台
  [4] 📱 接入微信小程序 → 添加联登/分享支持
  [5] 🎮 游戏行为埋点 → 在关键节点插入 trackEvent
  [Q] 退出
```

替换为：
```
  [3] 🚀 构建并打包 → 生成 deploy.zip 上传大神平台
  [4] 🎮 游戏行为埋点 → 在关键节点插入 trackEvent
  [Q] 退出
```

- [ ] **Step 3：Commit**

```bash
git add references/inject.md
git commit -m "feat(inject): update mode 1 module list and post-inject menu"
```

---

## Task 7：SKILL.md — 菜单重构与重新编号

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1：更新模式1描述**

将：
```
  [1] 🏃 接入大神功能
      生成 ds.js（NS日志、ulink、登录、分享），清理旧文件，自动完成审查
```

替换为：
```
  [1] 🏃 接入大神功能
      生成 ds.js（NS日志、ulink、登录、分享、小程序支持），清理旧文件，自动完成审查
```

- [ ] **Step 2：移除模式4条目**

删除：
```
  [4] 📱 接入微信小程序
      在现有 ds.js 上改造 withPrecheck 绕过 ulink，注入 JSSDK、URS Cookie 联登、自定义分享

```

- [ ] **Step 3：将 [5] 重新编号为 [4]**

将：
```
  [5] 🎮 游戏行为埋点
      扫描业务代码，语义识别交互/流程/结果/奖励节点，生成 trackEvent 调用并插入
```

替换为：
```
  [4] 🎮 游戏行为埋点
      扫描业务代码，语义识别交互/流程/结果/奖励节点，生成 trackEvent 调用并插入
```

- [ ] **Step 4：将 [6] 重新编号为 [5]**

将：
```
  [6] 💾 游戏数据持久化
      扫描业务代码，识别跨会话状态变量，生成 game-storage.js（AES-GCM 加密）并插入存取调用
```

替换为：
```
  [5] 💾 游戏数据持久化
      扫描业务代码，识别跨会话状态变量，生成 game-storage.js（AES-GCM 加密）并插入存取调用
```

- [ ] **Step 5：更新输入提示行**

将：
```
输入 0、1、2、3、4、5 或 6：
```

替换为：
```
输入 0、1、2、3、4 或 5：
```

- [ ] **Step 6：更新文件映射表**

将：
```markdown
| 选择 | 读取文件 |
|------|---------|
| 0 | `{skill_dir}/references/structure.md` |
| 1 | `{skill_dir}/references/inject.md` |
| 2 | `{skill_dir}/references/audit.md` |
| 3 | `{skill_dir}/references/deploy.md` |
| 4 | `{skill_dir}/references/miniapp.md` |
| 5 | `{skill_dir}/references/game-log.md` |
| 6 | `{skill_dir}/references/game-storage.md` |
```

替换为：
```markdown
| 选择 | 读取文件 |
|------|---------|
| 0 | `{skill_dir}/references/structure.md` |
| 1 | `{skill_dir}/references/inject.md` |
| 2 | `{skill_dir}/references/audit.md` |
| 3 | `{skill_dir}/references/deploy.md` |
| 4 | `{skill_dir}/references/game-log.md` |
| 5 | `{skill_dir}/references/game-storage.md` |
```

- [ ] **Step 7：Commit**

```bash
git add SKILL.md
git commit -m "feat(skill): remove mode 4, renumber modes, update mode 1 description"
```

---

## Task 8：miniapp.md — 标记废弃

**Files:**
- Modify: `references/miniapp.md`

- [ ] **Step 1：在文件最顶部插入废弃说明**

在 `# 四、小程序支持模式（MODE 4: MINIAPP）` 标题之前插入：

```markdown
> ⚠️ **已废弃（Deprecated）**：小程序支持已并入模式1（inject），本文档仅作历史参考。
> 新项目请直接运行 /ds-act-workflow 选择 [1] 接入大神功能。

---

```

- [ ] **Step 2：Commit**

```bash
git add references/miniapp.md
git commit -m "docs(miniapp): mark as deprecated, merged into mode 1"
```

---

## 验证清单（全部 Task 完成后执行）

- [ ] 读取 `SKILL.md`：菜单无 [4] 微信小程序，[4] 为游戏行为埋点，[5] 为游戏数据持久化，映射表无 miniapp.md 行
- [ ] 读取 `references/inject.md`：步骤2模块表包含"微信小程序支持"行，步骤7后续菜单无 [4] 接入微信小程序
- [ ] 读取 `references/ds-js-template.js`：
  - `[DS:MINIAPP-DETECT]` 块存在，包含 `isWechatMiniProgram`
  - `initLogin` 函数存在于 `[DS:JSSDK]` 块内
  - `initShare` 开头有 `if (isWechatMiniProgram())` 分支
  - `initUlink` 有 `if (isWechatMiniProgram()) return;`
  - `withPrecheck` 为 `async function`，使用 `checkLogined`，无 `userInfo.uid === -9999`
  - `initApp` 为三行顺序调用
- [ ] 读取 `references/html.md`：`4-HTML-3` 步骤内有子步骤 `### 3.0 注入第三方依赖脚本`
- [ ] 读取 `references/react.md`：`4-React-1` 步骤内有子步骤 `### 1.0 注入第三方依赖脚本`
- [ ] 读取 `references/vue.md`：`4-Vue-1` 步骤内有子步骤 `### 1.0 注入第三方依赖脚本`
- [ ] 读取 `references/miniapp.md`：文件顶部有 deprecated 说明

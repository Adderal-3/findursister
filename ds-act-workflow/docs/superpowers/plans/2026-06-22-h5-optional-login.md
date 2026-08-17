# H5 环境可选登录支持 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `withPrecheck` 的 H5 分支支持可选登录引导——`H5_LOGIN_ENABLED = true` 时未登录弹 URS 登录框，`false` 时保持当前 `openSquareUrl()` 行为。

**Architecture:** 在 `withPrecheck` 分支3（普通浏览器）内部根据 `H5_LOGIN_ENABLED` 二分。新增 CONFIG 变量 + 步骤3询问。三框架（HTML/React/Vue）同步改造，React/Vue 补齐 `initLogin`/`isWechatMiniProgram`/三分支/`dsLogin` 类型声明，App 内分支统一为 `checkLogined` callHandler。

**Tech Stack:** 纯文档/模板改造（`references/` 下 `.js`/`.md` 文件），无运行时代码。

## Global Constraints

- `H5_LOGIN_ENABLED` 默认 `false`，向后兼容
- `H5_LOGIN_ENABLED = false` 时分支3行为与当前完全一致（`openSquareUrl()`）
- 分支1（大神 App）和分支2（微信小程序）逻辑不变
- 三框架 `withPrecheck` 逻辑对齐：三分支 + `H5_LOGIN_ENABLED` 二分
- React/Vue App 内分支从 `userInfo['uid']` 改为 `checkLogined` callHandler
- `dsLogin.show()` 为用户确认的 URS 登录弹框方法名

---

## File Structure

| 文件 | 职责 | 改造类型 |
|------|------|----------|
| `references/ds-js-template.js` | HTML 项目 ds.js 模板 | 修改：CONFIG 块 + CLICK-PRECHECK 块 |
| `references/inject.md` | 模式1主流程 | 修改：步骤3 新增询问 |
| `references/html.md` | HTML 项目代码模板 | 修改：占位符表 + CONFIG 智能处理 |
| `references/react.md` | React 项目代码模板 | 修改：ds.d.ts + useDsInit + useDsUlink |
| `references/vue.md` | Vue 项目代码模板 | 修改：同 react.md |
| `references/audit-rules.md` | 审查规则 | 修改：CLICK-PRECHECK 块 + JSSDK 块 + CONFIG 块 |
| `SKILL.md` | 技能主文档 | 修改：FAQ 新增条目 |

---

### Task 1: ds-js-template.js — CONFIG 块新增 H5_LOGIN_ENABLED

**Files:**
- Modify: `references/ds-js-template.js:1-10`

**Interfaces:**
- Produces: `var H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};` 在 CONFIG 块中，供 withPrecheck 闭包引用

- [ ] **Step 1: 在 CONFIG 块末尾新增 H5_LOGIN_ENABLED 变量**

在 `references/ds-js-template.js` 第9行 `var IS_COCOS = {IS_COCOS};` 之后、第10行 `/* [DS:CONFIG:END] */` 之前插入：

```javascript
var H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};
```

修改后 CONFIG 块应为：

```javascript
/* [DS:CONFIG:START] */
var EVENT_ACTION   = '{EVENT_ACTION}';
var EVENT_CATEGORY = '{EVENT_CATEGORY}';
var APP_KEY        = '{APP_KEY}';
var SHARE_TITLE    = '{SHARE_TITLE}';
var SHARE_DESC     = '{SHARE_DESC}';
var SHARE_ICON     = '{SHARE_ICON}';
var SQUARE_ID      = '{SQUARE_ID}';
var IS_COCOS       = {IS_COCOS};
var H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};
/* [DS:CONFIG:END] */
```

- [ ] **Step 2: 验证文件语法正确**

Run: `node -c references/ds-js-template.js`
Expected: 无报错（`-c` 只检查语法，占位符 `{H5_LOGIN_ENABLED}` 在 JS 中是合法的表达式——花括号被解析为块语句，不会语法错误）

> 注：`node -c` 对含 `{PLACEHOLDER}` 的 JS 文件可能报错，因为 `{IS_COCOS}` 等占位符不是合法 JS 值。此步可跳过或改为目视检查。目视确认 CONFIG 块新增了 `H5_LOGIN_ENABLED` 行即可。

- [ ] **Step 3: Commit**

```bash
git add references/ds-js-template.js
git commit -m "feat: ds-js-template CONFIG 块新增 H5_LOGIN_ENABLED 变量"
```

---

### Task 2: ds-js-template.js — withPrecheck 分支3二分

**Files:**
- Modify: `references/ds-js-template.js:206-231`（`[DS:CLICK-PRECHECK]` 块的 `withPrecheck` 函数体）

**Interfaces:**
- Consumes: `H5_LOGIN_ENABLED`（Task 1 产出）、`window.dsLogin`（`initLogin()` 已初始化）、`openSquareUrl`（已有）
- Produces: `withPrecheck` 分支3根据 `H5_LOGIN_ENABLED` 二分

- [ ] **Step 1: 修改 withPrecheck 函数的分支3**

将 `references/ds-js-template.js` 中 `withPrecheck` 函数的分支3部分（当前为 `// 分支3：普通浏览器始终走 ulink` + `openSquareUrl();`）替换为二分逻辑。

修改前（分支3部分）：

```javascript
    // 分支3：普通浏览器始终走 ulink
    openSquareUrl();
  };
}
```

修改后（分支3部分）：

```javascript
    // 分支3：普通浏览器
    if (H5_LOGIN_ENABLED) {
      // 支持模式：实时查询登录状态，未登录弹 URS 登录框
      var loggedIn = await window.dsLogin.hasLoggedIn();
      if (loggedIn) {
        if (typeof callback === 'function') callback(...args);
        return;
      }
      window.dsLogin.show();  // 弹 URS 登录框，登录成功后页面 reload
      return;
    }
    // 不支持模式：引导回大神 App
    openSquareUrl();
  };
}
```

同时更新 withPrecheck 上方的 JSDoc 注释，将 `*   3. 普通浏览器 → openSquareUrl() via ulink，引导进入 App` 改为：

```javascript
 *   3. 普通浏览器 → H5_LOGIN_ENABLED=true 时未登录弹 dsLogin.show()，已登录执行 callback；
 *      H5_LOGIN_ENABLED=false 时 openSquareUrl() via ulink，引导进入 App
```

- [ ] **Step 2: 目视确认三分支结构完整**

确认 `withPrecheck` 函数包含：
1. 分支1：`window.ds && window.ds.isGodlike` → `checkLogined` + `openLoginPage`
2. 分支2：`isWechatMiniProgram() && typeof window.wx !== 'undefined'` → `userInfo.uid` 检查
3. 分支3：`H5_LOGIN_ENABLED` 二分 → `dsLogin.hasLoggedIn()` + `dsLogin.show()` 或 `openSquareUrl()`

- [ ] **Step 3: Commit**

```bash
git add references/ds-js-template.js
git commit -m "feat: withPrecheck 分支3根据 H5_LOGIN_ENABLED 二分"
```

---

### Task 3: inject.md — 步骤3 新增 H5 支持询问

**Files:**
- Modify: `references/inject.md:146-174`

**Interfaces:**
- Produces: `H5_LOGIN_ENABLED` 变量值（`true`/`false`），供步骤5占位符替换使用

- [ ] **Step 1: 在 EVENT_ACTION/EVENT_CATEGORY 询问之后新增 H5 支持询问**

在 `references/inject.md` 第151行（`EVENT_CATEGORY` 行）之后、第153行（`**CONFIG 块智能处理（新增）：**`）之前，插入 H5 支持询问块：

```markdown

**H5 登录支持询问：**

```
H5 环境是否支持未登录用户使用？

  [A] 不支持（默认）— 未登录用户点击时引导回大神 App（当前行为）
  [B] 支持 — 未登录用户点击时弹出 URS 登录框，登录后页面刷新，已登录用户正常使用

输入 A 或 B（默认 A）：
```

| 回答 | 变量值 |
|------|--------|
| A 或回车 | `H5_LOGIN_ENABLED = false` |
| B | `H5_LOGIN_ENABLED = true` |

```

- [ ] **Step 2: 在 CONFIG 块智能处理部分新增 H5_LOGIN_ENABLED 处理**

在 `references/inject.md` 第156行（`- EVENT_ACTION / EVENT_CATEGORY → 使用用户新输入的值（覆盖）`）之后，新增一行：

```markdown
- `H5_LOGIN_ENABLED` → 使用用户新输入的值（覆盖，反映用户偏好）
```

- [ ] **Step 3: 在自动提取的配置项表中新增 H5_LOGIN_ENABLED**

在第174行（`| IS_COCOS | 前置扫描 1a...`）之后，新增一行：

```markdown
| `H5_LOGIN_ENABLED` | 步骤3 用户选择 | `false` |
```

- [ ] **Step 4: 在 CONFIG 块智能处理输出示例中新增 H5_LOGIN_ENABLED**

在第164行（`  EVENT_CATEGORY: [新输入的值] — 更新`）之后，新增一行：

```markdown
  H5_LOGIN_ENABLED: [新值] — 更新（用户偏好）
```

- [ ] **Step 5: Commit**

```bash
git add references/inject.md
git commit -m "feat: inject.md 步骤3 新增 H5 登录支持询问"
```

---

### Task 4: html.md — 占位符表 + CONFIG 智能处理更新

**Files:**
- Modify: `references/html.md:190-221`

**Interfaces:**
- Consumes: `H5_LOGIN_ENABLED` 变量值（Task 3 产出）
- Produces: `{H5_LOGIN_ENABLED}` 占位符替换规则

- [ ] **Step 1: 在占位符表中新增 H5_LOGIN_ENABLED**

在 `references/html.md` 第199行（`| {IS_COCOS} | ...`）之后，新增一行：

```markdown
| `{H5_LOGIN_ENABLED}` | 步骤3 用户选择（`true` / `false`），不询问用户；以用户选择**覆盖**已有值 |
```

- [ ] **Step 2: 在 CONFIG 块智能处理中新增 H5_LOGIN_ENABLED**

在第210行（`- IS_COCOS → 始终以最新前置扫描结果覆盖...`）之后，新增一行：

```markdown
- `H5_LOGIN_ENABLED` → 使用步骤3用户选择的值（**覆盖**，反映用户偏好）
```

- [ ] **Step 3: 在 CONFIG 智能处理输出示例中新增 H5_LOGIN_ENABLED**

在第220行（`  IS_COCOS: [新值] — 更新（环境检测，始终覆盖）`）之后，新增一行：

```markdown
  H5_LOGIN_ENABLED: [新值] — 更新（用户偏好）
```

- [ ] **Step 4: Commit**

```bash
git add references/html.md
git commit -m "feat: html.md 占位符表 + CONFIG 智能处理新增 H5_LOGIN_ENABLED"
```

---

### Task 5: react.md — ds.d.ts 补充 Ulogin/dsLogin 类型声明

**Files:**
- Modify: `references/react.md:110-142`（ds.d.ts 类型声明块）

**Interfaces:**
- Produces: `Ulogin` / `dsLogin` 的 TypeScript 类型声明，供 useDsInit.ts 和 useDsUlink.ts 引用

- [ ] **Step 1: 在 ds.d.ts 的 Window interface 中补充 Ulogin 和 dsLogin 类型**

在 `references/react.md` 第139行（`onMobileShareReady?: ...`）之后、第140行（`}`）之前，插入：

```typescript
    Ulogin?: { default: new (opts: { env: string; loginSuccess: () => void; loginFail: () => void }) => { hasLoggedIn(): Promise<{ user: Record<string, unknown> } | null>; show(): void } };
    dsLogin?: { hasLoggedIn(): Promise<{ user: Record<string, unknown> } | null>; show(): void };
```

- [ ] **Step 2: Commit**

```bash
git add references/react.md
git commit -m "feat: react.md ds.d.ts 补充 Ulogin/dsLogin 类型声明"
```

---

### Task 6: react.md — useDsInit.ts 补齐 isWechatMiniProgram + initLogin

**Files:**
- Modify: `references/react.md:147-184`（4-React-3 步骤）

**Interfaces:**
- Consumes: `dsInit`（已有）、`userInfo`（已有）、`Ulogin.default`（Task 5 类型声明）
- Produces: `isWechatMiniProgram()` 函数、`initLogin()` 函数，导出 `initLogin`

- [ ] **Step 1: 在 useDsInit.ts 中新增 isWechatMiniProgram 和 initLogin 函数**

在 `references/react.md` 第178行（`}` — dsInit 函数结束）之后、第180行（`export function useDsInit()`）之前，插入：

```typescript

function isWechatMiniProgram(): boolean {
  return navigator.userAgent.toLowerCase().includes('miniprogram');
}

async function initLogin(): Promise<void> {
  if (window.ds && window.ds.isGodlike) {
    await dsInit();
    return;
  }
  window.dsLogin = new Ulogin.default({
    env: 'production',
    loginSuccess: function() {},
    loginFail: function() {},
  });
  const loginResult = await window.dsLogin.hasLoggedIn();
  if (loginResult) { Object.assign(userInfo, loginResult.user); }
  // 小程序未登录 → 跳转登录页
  if (isWechatMiniProgram() && typeof window.wx !== 'undefined' && !userInfo['uid']) {
    wx.miniProgram.navigateTo({ url: '/pages/login/index' });
  }
}
```

- [ ] **Step 2: 更新 useDsInit 导出，新增 initLogin**

将第180-182行：

```typescript
export function useDsInit() {
  return { userInfo, godlikeInfo, dsInit };
}
```

改为：

```typescript
export function useDsInit() {
  return { userInfo, godlikeInfo, dsInit, initLogin };
}
```

- [ ] **Step 3: Commit**

```bash
git add references/react.md
git commit -m "feat: react.md useDsInit 补齐 isWechatMiniProgram + initLogin"
```

---

### Task 7: react.md — useDsUlink.ts withPrecheck 三分支 + H5_LOGIN_ENABLED

**Files:**
- Modify: `references/react.md:305-378`（4-React-6 步骤的 ULINK + CLICK-PRECHECK 块）

**Interfaces:**
- Consumes: `isWechatMiniProgram`（Task 6 产出）、`userInfo`（已有）、`H5_LOGIN_ENABLED`（新增常量）、`window.dsLogin`（Task 6 initLogin 初始化）
- Produces: `withPrecheck` 三分支 + `H5_LOGIN_ENABLED` 二分

- [ ] **Step 1: 更新 useDsUlink.ts 的 import 语句**

将 `references/react.md` 第307行：

```typescript
import { userInfo } from './useDsInit';
```

改为：

```typescript
import { userInfo, isWechatMiniProgram } from './useDsInit';
```

- [ ] **Step 2: 在 useDsUlink.ts 中新增 H5_LOGIN_ENABLED 常量**

在第309行（`const SQUARE_ID = '{SQUARE_ID}';`）之后，新增：

```typescript
const H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};
```

- [ ] **Step 3: 替换 withPrecheck 函数为三分支 + H5_LOGIN_ENABLED**

将 `references/react.md` 第343-374行（`/* [DS:CLICK-PRECHECK:START] */` 到 `/* [DS:CLICK-PRECHECK:END] */`）替换为：

```typescript
/* [DS:CLICK-PRECHECK:START] */
/**
 * withPrecheck(callback) — thunk 模式
 *
 * ⚠️ BREAKING：返回 async 包装函数，必须作为事件处理器直接绑定。
 * 旧调用模式 `() => withPrecheck(() => fn())`、`function() { withPrecheck(...) }`、内联 `onclick="withPrecheck(...)"` 在新签名下静默失效。
 *
 * 用作事件处理器时自动透传事件参数给 callback。
 *
 * 三条分支：
 *   1. 大神 App 内 → checkLogined 查询登录状态，未登录弹登录页，已登录执行 callback
 *   2. 微信小程序 → 检查 URS 联登状态，未登录跳转小程序登录页，已登录执行 callback
 *   3. 普通浏览器 → H5_LOGIN_ENABLED=true 时未登录弹 dsLogin.show()，已登录执行 callback；
 *      H5_LOGIN_ENABLED=false 时 openSquareUrl() 引导进入 App
 */
function withPrecheck<T extends unknown[]>(
  callback: (...args: T) => void,
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    // 分支1：大神App内
    if (window.ds && window.ds.isGodlike) {
      await window.ds.ready();
      const res = await window.ds.callHandler('checkLogined');
      if (!res.result['isLogined']) {
        window.ds.callHandler('openLoginPage');
        return;
      }
      if (typeof callback === 'function') callback(...args);
      return;
    }
    // 分支2：微信小程序
    if (isWechatMiniProgram() && typeof window.wx !== 'undefined') {
      if (!userInfo['uid']) {
        wx.miniProgram.navigateTo({ url: '/pages/login/index' });
        return;
      }
      if (typeof callback === 'function') callback(...args);
      return;
    }
    // 分支3：普通浏览器
    if (H5_LOGIN_ENABLED) {
      const loggedIn = await window.dsLogin.hasLoggedIn();
      if (loggedIn) {
        if (typeof callback === 'function') callback(...args);
        return;
      }
      window.dsLogin.show();
      return;
    }
    openSquareUrl();
  };
}
/* [DS:CLICK-PRECHECK:END] */
```

- [ ] **Step 4: Commit**

```bash
git add references/react.md
git commit -m "feat: react.md withPrecheck 三分支 + H5_LOGIN_ENABLED + checkLogined"
```

---

### Task 8: vue.md — 同步 React 改造

**Files:**
- Modify: `references/vue.md:108-153`（ds.d.ts + useDsInit）、`references/vue.md:270-348`（useDsUlink）

**Interfaces:**
- 同 Task 5-7，但 Vue 用 `reactive` 代替 `const`

- [ ] **Step 1: Vue ds.d.ts 补充类型声明**

`references/vue.md` 第110行写明"与 React 4-React-2 完全相同内容"。由于 React 版已改（Task 5），Vue 引用 React 内容，无需额外修改。确认第110行仍为：

```markdown
与 React 4-React-2 完全相同内容。
```

> 如果 Vue 模板是独立内联 ds.d.ts 内容（非引用），则需同步补充。检查确认：vue.md 第110行是引用 React，无需改动。

- [ ] **Step 2: Vue useDsInit.ts 补齐 isWechatMiniProgram + initLogin**

在 `references/vue.md` 第147行（`}` — dsInit 函数结束）之后、第149行（`export function useDsInit()`）之前，插入（注意 Vue 用 `reactive`，`userInfo` 是 reactive 对象，`Object.assign` 直接可用）：

```typescript

function isWechatMiniProgram(): boolean {
  return navigator.userAgent.toLowerCase().includes('miniprogram');
}

async function initLogin(): Promise<void> {
  if (window.ds && window.ds.isGodlike) {
    await dsInit();
    return;
  }
  window.dsLogin = new Ulogin.default({
    env: 'production',
    loginSuccess: function() {},
    loginFail: function() {},
  });
  const loginResult = await window.dsLogin.hasLoggedIn();
  if (loginResult) { Object.assign(userInfo, loginResult.user); }
  // 小程序未登录 → 跳转登录页
  if (isWechatMiniProgram() && typeof window.wx !== 'undefined' && !userInfo['uid']) {
    wx.miniProgram.navigateTo({ url: '/pages/login/index' });
  }
}
```

- [ ] **Step 3: Vue useDsInit 导出新增 initLogin**

将第149-151行：

```typescript
export function useDsInit() {
  return { userInfo, godlikeInfo, dsInit };
}
```

改为：

```typescript
export function useDsInit() {
  return { userInfo, godlikeInfo, dsInit, initLogin };
}
```

- [ ] **Step 4: Vue useDsUlink.ts 更新 import**

将第276行：

```typescript
import { userInfo } from './useDsInit';
```

改为：

```typescript
import { userInfo, isWechatMiniProgram } from './useDsInit';
```

- [ ] **Step 5: Vue useDsUlink.ts 新增 H5_LOGIN_ENABLED 常量**

在第278行（`const SQUARE_ID = '{SQUARE_ID}';`）之后，新增：

```typescript
const H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};
```

- [ ] **Step 6: Vue withPrecheck 替换为三分支**

将第312-343行（`/* [DS:CLICK-PRECHECK:START] */` 到 `/* [DS:CLICK-PRECHECK:END] */`）替换为与 Task 7 Step 3 完全相同的内容。

- [ ] **Step 7: Commit**

```bash
git add references/vue.md
git commit -m "feat: vue.md 同步 React 改造（ds.d.ts + useDsInit + useDsUlink）"
```

---

### Task 9: audit-rules.md — CLICK-PRECHECK 块 + CONFIG 块 + JSSDK 块更新

**Files:**
- Modify: `references/audit-rules.md:23-29`（CONFIG 块）、`31-41`（JSSDK 块）、`67-79`（CLICK-PRECHECK 块）、`95-98`（React/Vue EXPORTS 块）

**Interfaces:**
- Consumes: `H5_LOGIN_ENABLED` 变量、`dsLogin.show()`/`hasLoggedIn()` 调用、`initLogin()`/`isWechatMiniProgram()` 函数

- [ ] **Step 1: CONFIG 块新增 H5_LOGIN_ENABLED 检查**

在 `references/audit-rules.md` 第29行（`SQUARE_ID` 检查行）之后，新增：

```markdown
- [ ] `H5_LOGIN_ENABLED` 为 `true` 或 `false`（缺失则视为 `false`，向后兼容）
```

- [ ] **Step 2: JSSDK 块新增 React/Vue initLogin/isWechatMiniProgram 检查**

在第40行（`未登录时有 openLoginPage 兜底`）之后，新增：

```markdown
- [ ] **React/Vue：** `initLogin()` 函数存在（大神App内调 dsInit，其余走 Ulogin.hasLoggedIn）
- [ ] **React/Vue：** `isWechatMiniProgram()` 函数存在
- [ ] **React/Vue：** `dsLogin` 初始化存在（`new Ulogin.default({...})`）
- [ ] **React/Vue：** `ds.d.ts` 含 `Ulogin` / `dsLogin` 类型声明
```

- [ ] **Step 3: CLICK-PRECHECK 块更新分支3检查**

将第71行：

```markdown
- [ ] 分支 1：`!window.ds || !window.ds.isGodlike` 判断后调用 `openSquareUrl()`
```

改为：

```markdown
- [ ] 分支 3（普通浏览器）：`H5_LOGIN_ENABLED = false` 时调用 `openSquareUrl()`；`H5_LOGIN_ENABLED = true` 时调用 `dsLogin.hasLoggedIn()` 查询登录状态，未登录调用 `dsLogin.show()`
```

> 注：当前第71行描述的是"分支1"但内容是 H5 分支的检查（`!window.ds || !window.ds.isGodlike` 判断后 `openSquareUrl()`），实际对应的是分支3。改为分支3的描述。

- [ ] **Step 4: CLICK-PRECHECK 块新增 H5_LOGIN_ENABLED 检查项**

在第74行（`分支 3：有 typeof callback === 'function' 守卫...`）之后，新增：

```markdown
- [ ] `H5_LOGIN_ENABLED = true` 时：`dsLogin.hasLoggedIn()` 调用存在（实时查询登录状态）
- [ ] `H5_LOGIN_ENABLED = true` 时：`dsLogin.show()` 调用存在（未登录弹 URS 登录框）
- [ ] **React/Vue：** App 内分支使用 `checkLogined` callHandler（非 `userInfo['uid']` 魔法数字判断）
```

- [ ] **Step 5: React/Vue EXPORTS 块更新**

将第96行：

```markdown
- [ ] `useDsInit` 返回 `{ userInfo, godlikeInfo }`
```

改为：

```markdown
- [ ] `useDsInit` 返回 `{ userInfo, godlikeInfo, dsInit, initLogin }`
```

- [ ] **Step 6: Commit**

```bash
git add references/audit-rules.md
git commit -m "feat: audit-rules 新增 H5_LOGIN_ENABLED + React/Vue initLogin 检查项"
```

---

### Task 10: SKILL.md — FAQ 新增 H5_LOGIN_ENABLED 条目

**Files:**
- Modify: `SKILL.md:198`（FAQ 表末尾）

**Interfaces:**
- 无

- [ ] **Step 1: 在 FAQ 表末尾新增 H5_LOGIN_ENABLED 条目**

在 `SKILL.md` 第198行（`batchReadData` 客态读取行）之后，新增一行：

```markdown
| ❌ H5 环境下 `withPrecheck` 未检查 `H5_LOGIN_ENABLED` 配置 | ✅ 根据 `H5_LOGIN_ENABLED` 选择 `dsLogin.show()`（支持模式）或 `openSquareUrl()`（不支持模式） | `H5_LOGIN_ENABLED = true` 时应弹 URS 登录框引导登录，`false` 时引导回大神 App；不检查配置会导致支持模式下未登录用户被错误引导回 App |
```

- [ ] **Step 2: Commit**

```bash
git add SKILL.md
git commit -m "feat: SKILL.md FAQ 新增 H5_LOGIN_ENABLED 条目"
```

---

### Task 11: 验证 — 全局一致性检查

**Files:**
- Read-only: 所有修改过的文件

- [ ] **Step 1: 确认 ds-js-template.js 三分支结构完整**

读取 `references/ds-js-template.js` 的 `[DS:CLICK-PRECHECK]` 块，确认：
1. 分支1：`window.ds && window.ds.isGodlike` → `checkLogined` + `openLoginPage` ✅
2. 分支2：`isWechatMiniProgram() && typeof window.wx !== 'undefined'` → `userInfo.uid` 检查 ✅
3. 分支3：`H5_LOGIN_ENABLED` 二分 → `dsLogin.hasLoggedIn()` + `dsLogin.show()` 或 `openSquareUrl()` ✅
4. CONFIG 块含 `var H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};` ✅

- [ ] **Step 2: 确认 react.md / vue.md withPrecheck 与 HTML 模板逻辑一致**

对比三框架的 `withPrecheck`：
1. 分支1：都用 `checkLogined` callHandler ✅
2. 分支2：都用 `isWechatMiniProgram()` + `userInfo.uid` 检查 ✅
3. 分支3：都根据 `H5_LOGIN_ENABLED` 二分 ✅
4. React/Vue 都有 `H5_LOGIN_ENABLED` 常量 ✅
5. React/Vue 都从 `useDsInit` 导入 `isWechatMiniProgram` ✅

- [ ] **Step 3: 确认 inject.md 询问流程完整**

读取 `references/inject.md` 步骤3，确认：
1. `EVENT_ACTION` / `EVENT_CATEGORY` 询问之后有 H5 支持询问 ✅
2. CONFIG 块智能处理含 `H5_LOGIN_ENABLED` 覆盖 ✅
3. 自动提取配置项表含 `H5_LOGIN_ENABLED` ✅

- [ ] **Step 4: 确认 audit-rules.md 检查项覆盖完整**

读取 `references/audit-rules.md`，确认：
1. CONFIG 块含 `H5_LOGIN_ENABLED` 检查 ✅
2. JSSDK 块含 React/Vue `initLogin`/`isWechatMiniProgram`/`dsLogin` 检查 ✅
3. CLICK-PRECHECK 块含分支3 H5_LOGIN_ENABLED 二分检查 ✅
4. CLICK-PRECHECK 块含 React/Vue `checkLogined` 检查 ✅
5. EXPORTS 块含 `initLogin` 导出检查 ✅

- [ ] **Step 5: 确认 html.md 占位符表和 CONFIG 智能处理**

读取 `references/html.md` 4-HTML-4，确认：
1. 占位符表含 `{H5_LOGIN_ENABLED}` ✅
2. CONFIG 块智能处理含 `H5_LOGIN_ENABLED` 覆盖 ✅
3. 输出示例含 `H5_LOGIN_ENABLED` ✅

- [ ] **Step 6: 确认 SKILL.md FAQ 新增条目**

读取 `SKILL.md` FAQ 末尾，确认含 `H5_LOGIN_ENABLED` 条目 ✅

- [ ] **Step 7: 最终提交（如有遗漏修复）**

```bash
git add -A
git commit -m "chore: H5 可选登录支持 — 一致性修复" || echo "无需修复"
```

# 设计文档：H5 环境可选登录支持

**日期：** 2026-06-22
**状态：** 待审核

---

## 背景

当前 `ds-act-workflow` 模式1（注入）的 `withPrecheck` 函数有三条分支：

| 分支 | 环境 | 未登录行为 | 已登录行为 |
|------|------|-----------|-----------|
| 1 | 大神 App 内（`window.ds.isGodlike`） | 弹登录页 `openLoginPage` | 执行 callback |
| 2 | 微信小程序（`isWechatMiniProgram() && window.wx`） | 跳小程序登录页 | 执行 callback |
| 3 | 普通浏览器（H5） | `openSquareUrl()` 引导回大神 App | **同样 `openSquareUrl()`——无论登录与否都引导回 App** |

H5 环境默认不支持：未登录时预检一定通过不了，强制引导回大神 App。大神 App 和微信小程序默认支持登录引导。

**需求：** H5 环境改为可选支持：
- **不支持**（默认，`H5_LOGIN_ENABLED = false`）：行为与当前完全一致——`openSquareUrl()` 引导回大神 App
- **支持**（`H5_LOGIN_ENABLED = true`）：未登录时弹 URS 登录框（`dsLogin.show()`），登录成功后页面 reload（与大神 App 行为一致），已登录时正常执行 callback

---

## 目标

1. `withPrecheck` 的 H5 分支根据 `H5_LOGIN_ENABLED` 配置选择行为
2. 三框架（HTML/React/Vue）同步改造，逻辑对齐
3. `H5_LOGIN_ENABLED = false` 时行为与当前完全一致（向后兼容）
4. 审查规则同步更新，覆盖 H5 登录支持检查

## 不变的内容

- 三分支结构不变（App / 小程序 / 普通浏览器），H5 支持仅在分支3内部二分
- `H5_LOGIN_ENABLED = false` 时分支3走 `openSquareUrl()`，与当前完全一致
- 分支1（大神 App）和分支2（微信小程序）逻辑不变
- `initLogin()` 中 `dsLogin` 初始化逻辑不变（HTML 模板已有）
- `openSquareUrl()` / `initUlink()` 不变
- 模式0/2/3/4/5/6 不受影响

---

## 变更详情

### 1. 新增配置变量 `H5_LOGIN_ENABLED`

#### 1.1 CONFIG 块新增

`ds-js-template.js` 的 `[DS:CONFIG:START]` 块新增：

```javascript
var H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};  // H5 环境登录支持：true=未登录弹URS登录 / false=引导回大神App（默认）
```

#### 1.2 步骤3 新增询问

在模式1步骤3（游戏圈子询问）的 `EVENT_ACTION` / `EVENT_CATEGORY` 询问之后，新增：

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

#### 1.3 CONFIG 块智能处理（已存在 ds.js 时）

与 `IS_COCOS` 同级处理：
- `H5_LOGIN_ENABLED` → 使用用户新输入的值（**覆盖**，反映用户偏好）

#### 1.4 占位符替换

| 占位符 | 替换为 |
|--------|--------|
| `{H5_LOGIN_ENABLED}` | `true` 或 `false` |

---

### 2. withPrecheck 逻辑改造

#### 2.1 HTML 模板（ds-js-template.js）

`[DS:CLICK-PRECHECK]` 块的分支3改造为内部二分：

```javascript
function withPrecheck(callback) {
  return async function(...args) {
    // 分支1：大神App内 → checkLogined 直接查询 SDK
    if (window.ds && window.ds.isGodlike) {
      await window.ds.ready();
      var res = await window.ds.callHandler('checkLogined');
      if (!res.result['isLogined']) {
        window.ds.callHandler('openLoginPage');
        return;
      }
      if (typeof callback === 'function') callback(...args);
      return;
    }
    // 分支2：小程序环境 → 检查联登状态
    if (isWechatMiniProgram() && typeof window.wx !== 'undefined') {
      if (!userInfo || !userInfo.uid) {
        wx.miniProgram.navigateTo({ url: '/pages/login/index' });
        return;
      }
      if (typeof callback === 'function') callback(...args);
      return;
    }
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

**关键点：**
- `H5_LOGIN_ENABLED` 是 CONFIG 块的 `var`，withPrecheck 闭包内直接可见
- 实时调用 `dsLogin.hasLoggedIn()` 查询登录状态（不依赖 `initLogin()` 缓存的 `userInfo`）
- 未登录调用 `dsLogin.show()` 弹登录框，登录成功后 URS 组件触发页面 reload，callback 不执行
- 已登录执行 callback，与 App/小程序分支一致
- `H5_LOGIN_ENABLED = false` 时走 `openSquareUrl()`，行为与当前完全一致

#### 2.2 React / Vue 模板补齐

React/Vue 模板当前只有两分支（App 内 + 其他→`openSquareUrl()`），且缺少 `initLogin`/`isWechatMiniProgram`/`dsLogin` 初始化。本次改造补齐为三分支 + `H5_LOGIN_ENABLED`，与 HTML 模板对齐。

**a) `useDsInit.ts` 补齐 `isWechatMiniProgram()` + `initLogin()`：**

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

`useDsInit` 导出新增 `initLogin`：

```typescript
export function useDsInit() {
  return { userInfo, godlikeInfo, dsInit, initLogin };
}
```

**b) `useDsUlink.ts` 补齐 `withPrecheck` 三分支 + `H5_LOGIN_ENABLED`：**

```typescript
const H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};

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
```

> **注意：** `isWechatMiniProgram` 和 `initLogin` 从 `useDsInit` 导入。`useDsUlink.ts` 需新增 `import { isWechatMiniProgram, userInfo } from './useDsInit'`。

**c) `ds.d.ts` 补充类型声明：**

```typescript
Ulogin?: { default: new (opts: { env: string; loginSuccess: () => void; loginFail: () => void }) => { hasLoggedIn(): Promise<{ user: Record<string, unknown> } | null>; show(): void } };
dsLogin?: { hasLoggedIn(): Promise<{ user: Record<string, unknown> } | null>; show(): void };
```

**d) 应用入口调用 `initLogin`：**

React/Vue 模板需在应用入口调用 `await initLogin()`。在模板中说明：

```typescript
// React: App.tsx 的 useEffect 中
const { initLogin } = useDsInit();
useEffect(() => { initLogin(); }, []);

// Vue: App.vue 的 onMounted 中
const { initLogin } = useDsInit();
onMounted(() => { initLogin(); });
```

#### 2.3 React/Vue App 内分支变更

React/Vue 模板的 `withPrecheck` App 内分支从 `userInfo['uid']` 判断改为 `checkLogined` callHandler，与 HTML 模板对齐：

```typescript
// 旧（React/Vue）
const uid = userInfo['uid'] as number | undefined;
if (!uid || uid === -9999) {
  window.ds.ready().then(() => window.ds!.callHandler('openLoginPage'));
  return;
}

// 新（与 HTML 模板对齐）
await window.ds.ready();
const res = await window.ds.callHandler('checkLogined');
if (!res.result['isLogined']) {
  window.ds.callHandler('openLoginPage');
  return;
}
```

**理由：** `checkLogined` 是 JSSDK 原生 API，直接查询 SDK 登录状态，比 `userInfo['uid']` 魔法数字判断更准确，且三框架逻辑统一。

---

### 3. inject.md 步骤改造

#### 3.1 步骤3 新增 H5 支持询问

如第1.2节所述，在 `EVENT_ACTION` / `EVENT_CATEGORY` 询问之后新增 H5 支持询问。

#### 3.2 步骤5（代码生成）占位符替换

`html.md` 的 4-HTML-4（生成 ds.js）占位符表新增 `{H5_LOGIN_ENABLED}`。

`react.md` 和 `vue.md` 的对应步骤同步新增 `{H5_LOGIN_ENABLED}` 占位符。

#### 3.3 CONFIG 块智能处理更新

`html.md` 的 4-HTML-4.1（CONFIG 块智能处理）更新：
- `H5_LOGIN_ENABLED` → 使用用户新输入的值（**覆盖**，与 `IS_COCOS` 同级处理）

#### 3.4 React/Vue 模板新增/修改步骤

| 步骤 | 改造内容 |
|------|----------|
| 4-React-2（ds.d.ts） | 补充 `Ulogin` / `dsLogin` 类型声明 |
| 4-React-3（useDsInit.ts） | 补齐 `isWechatMiniProgram()` + `initLogin()` 函数，导出 `initLogin` |
| 4-React-6（useDsUlink.ts） | `withPrecheck` 改为三分支 + `H5_LOGIN_ENABLED`；新增 `H5_LOGIN_ENABLED` 常量；App 内分支改为 `checkLogined` |
| 4-Vue-2（ds.d.ts） | 同 React |
| 4-Vue-3（useDsInit.ts） | 同 React |
| 4-Vue-6（useDsUlink.ts） | 同 React |

---

### 4. 审查规则改造

#### 4.1 audit-rules.md CLICK-PRECHECK 块更新

**新增检查项：**

| 检查项 | 规则 |
|--------|------|
| `H5_LOGIN_ENABLED` 变量存在于 `[DS:CONFIG:START]` 块中 | 缺失则视为 `false`（向后兼容） |
| 分支3（普通浏览器）内部有 `H5_LOGIN_ENABLED` 判断 | `true` 时走 `dsLogin.hasLoggedIn()` + `dsLogin.show()`；`false` 时走 `openSquareUrl()` |
| `H5_LOGIN_ENABLED = true` 时 `dsLogin.show()` 调用存在 | 未登录时弹 URS 登录框 |
| `H5_LOGIN_ENABLED = true` 时 `dsLogin.hasLoggedIn()` 调用存在 | 实时查询登录状态 |

**修改现有检查项（第71行）：**

当前：
> `分支 1：!window.ds || !window.ds.isGodlike 判断后调用 openSquareUrl()`

改为：
> `分支 3（普通浏览器）：H5_LOGIN_ENABLED = false 时调用 openSquareUrl()；H5_LOGIN_ENABLED = true 时调用 dsLogin.hasLoggedIn() 查询登录状态，未登录调用 dsLogin.show()`

#### 4.2 audit-rules.md JSSDK 块更新（React/Vue）

React/Vue 模板补齐 `initLogin` 后，审查规则新增：

| 检查项 | 规则 |
|--------|------|
| `initLogin()` 函数存在（React/Vue） | 补齐后必须存在 |
| `dsLogin` 初始化存在 | `new Ulogin.default({...})` |
| `isWechatMiniProgram()` 函数存在 | 补齐后必须存在 |
| `ds.d.ts` 含 `Ulogin` / `dsLogin` 类型声明 | 补齐后必须存在 |
| App 内分支使用 `checkLogined` callHandler | 与 HTML 模板对齐 |

#### 4.3 SKILL.md FAQ 更新

新增 FAQ 条目：

| 错误写法 | 正确写法 | 原因 |
|----------|----------|------|
| ❌ H5 环境下 `withPrecheck` 未检查 `H5_LOGIN_ENABLED` | ✅ 根据 `H5_LOGIN_ENABLED` 选择 `dsLogin.show()` 或 `openSquareUrl()` | `H5_LOGIN_ENABLED = true` 时应弹 URS 登录框，`false` 时引导回大神 App |

---

### 5. 受影响文件清单

| 文件 | 改造内容 |
|------|----------|
| `references/ds-js-template.js` | `[DS:CONFIG]` 新增 `H5_LOGIN_ENABLED`；`[DS:CLICK-PRECHECK]` 分支3二分 |
| `references/html.md` | 4-HTML-4 占位符表新增 `{H5_LOGIN_ENABLED}`；CONFIG 块智能处理更新 |
| `references/react.md` | 4-React-2 补 `Ulogin`/`dsLogin` 类型；4-React-3 补 `isWechatMiniProgram`+`initLogin`；4-React-6 `withPrecheck` 三分支+`H5_LOGIN_ENABLED`+`checkLogined` |
| `references/vue.md` | 同 react.md |
| `references/inject.md` | 步骤3 新增 H5 支持询问 |
| `references/audit-rules.md` | CLICK-PRECHECK 块新增 H5_LOGIN_ENABLED 检查项；JSSDK 块新增 initLogin/dsLogin 检查项（React/Vue） |
| `SKILL.md` | FAQ 新增 H5_LOGIN_ENABLED 条目 |

---

## 向后兼容

| 场景 | 行为 |
|------|------|
| 已有项目未含 `H5_LOGIN_ENABLED` | 审查规则视为 `false`（默认），行为与当前完全一致 |
| 已有项目重新运行模式1 | `H5_LOGIN_ENABLED` 写入 CONFIG 块，默认 `false`，用户可选 `true` |
| `H5_LOGIN_ENABLED = false` | 分支3走 `openSquareUrl()`，与当前行为完全一致 |
| React/Vue 已有项目 | 补齐 `initLogin`/`isWechatMiniProgram` 后，`withPrecheck` 从两分支变三分支。App 内分支从 `userInfo['uid']` 判断改为 `checkLogined` callHandler |

---

## 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| React/Vue `withPrecheck` App 内分支从 `userInfo['uid']` 改为 `checkLogined` | **BREAKING**：App 内登录判断方式变化 | `checkLogined` 是 JSSDK 原生 API，比 `userInfo['uid']` 更准确；三框架逻辑统一 |
| `dsLogin.show()` 方法名 | URS universal-login 组件 API 需确认 | 用户确认为 `dsLogin.show()`；项目中已有 `dsLogin.hasLoggedIn()` 先例；实现时需验证 |
| React/Vue 补齐 `initLogin` 后，应用入口需调用 | 开发者需手动在入口调用 `await initLogin()` | 在模板中明确说明调用位置 |
| React/Vue 补齐小程序分支 | 新增 `isWechatMiniProgram` 函数和小程序分支 | 与 HTML 模板对齐，逻辑已验证 |

---

## 验证清单

### HTML 项目

- [ ] `H5_LOGIN_ENABLED = false`（默认）：H5 环境点击 → `openSquareUrl()`，行为与当前一致
- [ ] `H5_LOGIN_ENABLED = true`：H5 环境未登录点击 → `dsLogin.show()` 弹登录框
- [ ] `H5_LOGIN_ENABLED = true`：H5 环境已登录点击 → 执行 callback
- [ ] `H5_LOGIN_ENABLED = true`：登录成功后页面 reload，再次点击执行 callback
- [ ] 大神 App 内：行为不变（`checkLogined` + `openLoginPage`）
- [ ] 微信小程序：行为不变（`userInfo.uid` 检查 + 跳登录页）
- [ ] 已有项目无 `H5_LOGIN_ENABLED`：审查视为 `false`，行为不变

### React/Vue 项目

- [ ] `withPrecheck` 三分支结构正确（App / 小程序 / 普通浏览器）
- [ ] App 内分支使用 `checkLogined` callHandler
- [ ] `initLogin()` 函数存在且被应用入口调用
- [ ] `isWechatMiniProgram()` 函数存在
- [ ] `ds.d.ts` 含 `Ulogin` / `dsLogin` 类型声明
- [ ] `H5_LOGIN_ENABLED` 配置生效

### 审查规则

- [ ] `H5_LOGIN_ENABLED` 缺失时审查视为 `false`
- [ ] `H5_LOGIN_ENABLED = true` 时审查检查 `dsLogin.show()` 和 `hasLoggedIn()` 调用
- [ ] React/Vue 审查检查 `initLogin`/`dsLogin`/`isWechatMiniProgram` 存在

# 设计文档：模式4合并到模式1 + URS 登录默认化

**日期：** 2026-05-13
**状态：** 待审核

---

## 背景

当前工具有两个独立模式：

- **模式1**（inject）：注入 ds.js 基础能力（NS日志、ulink、JSSDK、分享）
- **模式4**（miniapp）：在已有 ds.js 上改造小程序支持（需先完成模式1）

两阶段操作增加了摩擦。同时，URS 登录组件（universal-login）只在小程序场景下才初始化，导致站外用户（普通浏览器/微信内浏览器）无法复用 Cookie 登录态。

---

## 目标

1. 模式4并入模式1，一次注入覆盖全部环境（大神App内、小程序、大神App外）
2. URS 登录组件默认加载，在大神App外静默检测登录态（有 Cookie 自动填充 `userInfo`）
3. 微信小程序行为保持不变（联登 + 分享 + 绕过 ulink）

---

## 不变的内容

- 模式0、2、3、5、6 的逻辑不变
- `ds-js-template.js` 的 CONFIG 块、NS日志、ulink、分享函数整体结构不变
- `dsInit`（大神App内初始化）逻辑不变
- 审查规则（audit.md）不变（已包含小程序相关检查项）

---

## 变更详情

### 1. SKILL.md — 菜单结构

**移除模式4条目：**

```
[4] 📱 接入微信小程序
    在现有 ds.js 上改造 withPrecheck 绕过 ulink，注入 JSSDK、URS Cookie 联登、自定义分享
```

**更新模式1描述：**

```
[1] 🏃 接入大神功能
    生成 ds.js（NS日志、ulink、登录、分享、小程序支持），清理旧文件，自动完成审查
```

**文件映射表：** 移除 `4 → miniapp.md` 行。

---

### 2. inject.md — 模式1流程

**步骤2（模块选择）：** 说明文案中新增"小程序联登 + 分享"作为默认包含的能力，无需单独询问。

**步骤5（代码生成）：** 各框架模板文件（html.md / react.md / vue.md）将额外注入：

- 微信 JSSDK 脚本
- universal-login 脚本 + 样式
- ds.js 含 `isWechatMiniProgram` 函数

**步骤7（完成后菜单）：** 移除 `[4] 📱 接入微信小程序` 选项。

---

### 3. ds-js-template.js — 核心逻辑变更

#### 3.1 新增 `isWechatMiniProgram` 函数

插入位置：CONFIG 块之后、JSSDK 块之前（新增 `[DS:MINIAPP-DETECT]` marker 区域）。

```js
/* [DS:MINIAPP-DETECT:START] */
function isWechatMiniProgram() {
  return navigator.userAgent.toLowerCase().includes("miniprogram");
}
/* [DS:MINIAPP-DETECT:END] */
```

#### 3.2 更新 `withPrecheck`

大神App内分支改用 `checkLogined`（s1，>= 1.4.0）直接查询 SDK 登录状态，消除对 `userInfo.uid === -9999` 魔法数字的依赖和时序问题。函数改为 `async`：

```js
async function withPrecheck(callback) {
  // 分支1：大神App内 → checkLogined 直接查询 SDK
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
  // 分支3: 普通浏览器始终走 ulink
  openSquareUrl();
}
```

#### 3.3 新增 `initLogin`，更新 `initApp` 和 `initUlink`

**`initApp`：零分支，顺序调用**（`initShare` 和 `initUlink` 先执行，`initLogin` 最后）：

```js
async function initApp() {
  initShare();        // 自己判断环境
  initUlink();        // 自己判断环境（小程序内跳过）
  await initLogin();  // 自己判断环境，小程序未登录则跳转
  // 业务逻辑从此处开始
}
```

**新增 `initLogin`**（插入位置：JSSDK 块内，替代原 `dsInit` 的直接调用）：

```js
async function initLogin() {
  if (window.ds && window.ds.isGodlike) {
    await dsInit();
    return;
  }
  window.dsLogin = new Ulogin.default({
    env: "production",
    loginSuccess: function() {},
    loginFail: function() {},
  });
  var loginResult = await window.dsLogin.hasLoggedIn();
  if (loginResult) { userInfo = loginResult.user; window.userInfo = userInfo; }
  // 小程序未登录 → 跳转登录页（页面离开，后续 JS 不再有意义）
  if (isWechatMiniProgram() && (!userInfo || !userInfo.uid)) {
    wx.miniProgram.navigateTo({ url: "/pages/login/index" });
  }
}
```

**更新 `initUlink`**（新增小程序跳过逻辑）：

```js
function initUlink() {
  if (window.ds && window.ds.isGodlike) return;
  if (isWechatMiniProgram()) return;  // 小程序内不需要 ulink
  // 原有逻辑不变...
}
```

#### 3.4 更新 `initShare`（小程序分享分支）

在现有 `initShare` 函数开头插入小程序分支：

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
  // 原有 Godlike / MobileShare 逻辑不变...
}
```

---

### 4. html.md / react.md / vue.md — HTML 注入变更

在 SDK-LOADER 注入步骤中，新增以下脚本（位置：SDK-LOADER 之前，`</head>` 之前）：

```html
<!-- 微信小程序 JSSDK -->
<script
  type="text/javascript"
  src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"
></script>
<!-- URS 登录组件 -->
<link
  rel="stylesheet"
  href="https://g.166.net/pkg/universal-login/latest/index.css"
/>
<script
  type="text/javascript"
  src="https://g.166.net/pkg/universal-login/latest/index.umd.min.js"
></script>
```

去重规则与现有 SEO 标签一致：已存在则跳过，不存在才注入。

---

### 5. miniapp.md — 标记废弃

文件头部新增说明：

```
> ⚠️ **已废弃（Deprecated）**：小程序支持已并入模式1（inject），本文档仅作历史参考。
> 新项目请直接运行 /ds-act-workflow 选择 [1] 接入大神功能。
```

---

## 不需要改的文件

- `audit.md` — 已包含对 `isWechatMiniProgram`、`withPrecheck` 小程序分支的检查
- `deploy.md` — 与本次无关
- `game-log.md` / `game-storage.md` — 与本次无关
- `sdk-loader-template.html` — 与本次无关

---

## 验证清单

改造完成后，模式1生成的代码应通过以下场景验证：

- [ ] **大神App内（未登录）**：`checkLogined` 返回 `isLogined: false`，触发 `openLoginPage`，不依赖 `userInfo` 时序
- [ ] **大神App内（已登录）**：`checkLogined` 返回 `isLogined: true`，`withPrecheck` 执行 callback
- [ ] **大神App外（无 Cookie）**：`hasLoggedIn()` 返回 null，`withPrecheck` 触发 `openSquareUrl()`
- [ ] **大神App外（有 URS Cookie）**：`hasLoggedIn()` 返回用户信息，`userInfo.uid` 有值（NS 日志打点生效），`withPrecheck` 仍触发 `openSquareUrl()`
- [ ] **微信小程序（已登录）**：`hasLoggedIn()` 返回用户信息，`withPrecheck` 执行 callback
- [ ] **微信小程序（未登录）**：`hasLoggedIn()` 返回 null，跳转 `/pages/login/index`
- [ ] 模式4选项从主菜单消失
- [ ] 模式1完成后的后续菜单无 `[4]` 选项

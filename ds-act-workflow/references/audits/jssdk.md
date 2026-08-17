# JSSDK 块

> ⚠️ 该块内容必须额外调用 `/dsjssdk` 技能进行深度校验，以下为基础结构检查项：

- [ ] `dsInit()` 函数存在
- [ ] `window.ds.isGodlike` 判断存在（勿用 import 的 `isGodlike`）
- [ ] `await window.ds.ready()` 在所有 `callHandler` 之前
- [ ] `getGodlikeInfo` 调用存在
- [ ] `getMyInfo` 调用存在
- [ ] 未登录时有 `openLoginPage` 兜底
- [ ] **React/Vue：** `initLogin()` 函数存在（大神App内调 dsInit，其余走 Ulogin.hasLoggedIn）
- [ ] **React/Vue：** `isWechatMiniProgram()` 函数存在
- [ ] **React/Vue：** `dsLogin` 初始化存在（`new Ulogin.default({...})`）
- [ ] **React/Vue：** `ds.d.ts` 含 `Ulogin` / `dsLogin` 类型声明

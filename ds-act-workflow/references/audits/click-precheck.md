# CLICK-PRECHECK 块

- [ ] `withPrecheck` 函数存在
- [ ] `withPrecheck` 实现为 thunk 模式：返回 `async function(...args)` 包装函数，callback 调用为 `callback(...args)`（透传事件参数）
- [ ] 分支 3（普通浏览器）：`H5_LOGIN_ENABLED = false` 时调用 `openSquareUrl()`；`H5_LOGIN_ENABLED = true` 时调用 `dsLogin.hasLoggedIn()` 查询登录状态，未登录调用 `dsLogin.show()`
- [ ] 分支 2（微信小程序）：`isWechatMiniProgram() && typeof window.wx !== 'undefined'` 判断后检查 `userInfo.uid`，未登录调用 `wx.miniProgram.navigateTo({ url: '/pages/login/index' })` 跳转小程序登录页
- [ ] 分支 2：`wx.miniProgram.navigateTo` 调用前有 `typeof window.wx !== 'undefined'` 守卫（禁止直接调用）
- [ ] 分支 3：有 `typeof callback === 'function'` 守卫后再执行 `callback(...args)`
- [ ] `H5_LOGIN_ENABLED = true` 时：`dsLogin.hasLoggedIn()` 调用存在（实时查询登录状态）
- [ ] `H5_LOGIN_ENABLED = true` 时：`dsLogin.show()` 调用存在（未登录弹 URS 登录框）
- [ ] **React/Vue：** App 内分支使用 `checkLogined` callHandler（非 `userInfo['uid']` 魔法数字判断）
- [ ] 需预检的点击事件已通过 `withPrecheck` 包裹，未包裹的经用户确认无需预检（无遗漏）
- [ ] ⚠️ 若 `callback()` 无 `...args` 透传 → 建议升级到 thunk 模式以保留 click event（警告，不阻断）
- [ ] ❌ **旧调用模式（BREAKING 静默失效）**：调用方使用 `function() { withPrecheck(...) }`、`() => withPrecheck(...)` 箭头函数变体、或内联 `onclick="withPrecheck(...)"` 模式 → thunk 返回后从未被调用，预检和 callback 静默失效。必须迁移为 `withPrecheck(fn)` 直接作为 handler（阻断项）
- [ ] 事件委托模式识别：`document.addEventListener("click", withPrecheck(function(e) { if (!e.target.closest(...)) return; ... }))` 算已包裹，不得误判为未包裹（withPrecheck 在外层，预检先于命中判断执行）
- [ ] 多个同类元素或动态注入元素应使用事件委托（`document` 级 + `closest()` 命中判断），而非逐个 `addEventListener`（后者对动态注入元素会漏绑）

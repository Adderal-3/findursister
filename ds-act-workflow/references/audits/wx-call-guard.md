# wx 调用前置检查

> 扫描所有业务代码中直接调用 `wx.` 成员的代码。

- [ ] 所有 `wx.miniProgram.*`（`postMessage` / `navigateTo` / `redirectTo` 等）调用前，同一函数作用域内有 `typeof window.wx !== 'undefined'`（或语义等价）存在性判断（缺则 ⚠️ WARNING）

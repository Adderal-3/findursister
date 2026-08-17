## 1. ds-js-template.js 改造

- [x] 1.1 `initShare()` 中小程序分支：`isWechatMiniProgram()` 内部追加 `typeof window.wx !== 'undefined'` 检查，`wx.miniProgram.postMessage` 调用包裹在 window.wx 存在性判断内
- [x] 1.2 `initLogin()` 中 `wx.miniProgram.navigateTo` 调用：追加 `typeof window.wx !== 'undefined'` 守卫
- [x] 1.3 `withPrecheck()` 中 `wx.miniProgram.navigateTo` 调用：追加 `typeof window.wx !== 'undefined'` 守卫
- [x] 1.4 在各 `wx.` 调用点上方加注释说明 `isWechatMiniProgram()` = 环境判断，`typeof window.wx` = SDK 可用性

## 2. React / Vue 模板同步

- [x] 2.1 `references/react.md` 的 `useDsShare` 和 `withPrecheck` 相关模板同步增加 `window.wx` 存在性守卫（无需操作：React 模板无 `wx.` 调用——尚未接入小程序分支）
- [x] 2.2 `references/vue.md` 的 `useDsShare` 和 `withPrecheck` 相关模板同步增加 `window.wx` 存在性守卫（无需操作：Vue 模板无 `wx.` 调用——尚未接入小程序分支）

## 3. 审查规则同步

- [x] 3.1 `references/audit-rules.md` 新增「wx 调用前置检查」条目：所有 `wx.*` 调用必须有 `typeof window.wx !== 'undefined'` 存在性判断，缺失报告为 WARNING
- [x] 3.2 `references/audit.md` 审查报告模板的「已知错误检测」表新增对应行

## 4. 文档更新

- [x] 4.1 `SKILL.md` FAQ 表格新增「调用 `wx.*` 前没有判断 `window.wx` 是否存在」条目

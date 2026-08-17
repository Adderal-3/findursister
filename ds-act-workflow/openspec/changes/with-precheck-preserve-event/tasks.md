## 1. Core Template — ds-js-template.js

- [x] 1.1 重写 `[DS:CLICK-PRECHECK]` 块：`withPrecheck(callback)` 改为返回 `async function(...args)`，callback 调用改为 `callback(...args)`
- [x] 1.2 更新 `withPrecheck` JSDoc 注释，描述 thunk 模式和用法示例

## 2. React/Vue Template — hook/composable 代码块

- [x] 2.1 更新 `references/react.md` 中 `useDsUlink` 的 `[DS:CLICK-PRECHECK]` 块，`withPrecheck` 改为 thunk 模式
- [x] 2.2 更新 `references/vue.md` 中 `useDsUlink` 的 `[DS:CLICK-PRECHECK]` 块，`withPrecheck` 改为 thunk 模式

## 3. Injection/Fix 示例更新

- [x] 3.1 更新 `references/html.md` 步骤 6.2 修复示例：推荐 `withPrecheck(businessLogic)` 直接作为 handler
- [x] 3.2 更新 `references/react.md` 步骤 7.2 修复示例：推荐 `onClick={withPrecheck(handleClick)}`
- [x] 3.3 更新 `references/vue.md` 步骤 7.2 修复示例：推荐 `@click="withPrecheck(handleClick)"`
- [x] 3.4 更新 `references/inject.md` 步骤 6 修复示例：推荐新写法

## 4. Audit Rules

- [x] 4.1 更新 `references/audit-rules.md` CLICK-PRECHECK 块：新增 thunk 模式检查项；旧**调用模式**（静默失效）标记为阻断（❌），旧**实现模式**（无 `...args` 透传）标记为建议升级（⚠️）
- [x] 4.2 更新 `references/audit.md` 审查报告模板对应行

## 5. Documentation

- [x] 5.1 更新 `SKILL.md` 常见问题表：`withPrecheck(你的函数)` 改为描述 thunk 用法，说明 event 自动透传
- [x] 5.2 检查 `docs/superpowers/plans/` 中 `withPrecheck` 用法示例，按需更新 — **结论**：`2026-04-29-game-logging.md` 和 `2026-05-13-miniapp-merge.md` 中的 `withPrecheck(() => startGame())` 等示例为历史计划文档（描述已完成的迁移工作），非当前模板代码，无需更新。审查规则已覆盖新项目检测旧调用模式。

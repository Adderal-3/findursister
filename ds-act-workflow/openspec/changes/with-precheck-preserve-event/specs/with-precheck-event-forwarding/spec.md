<!-- 范围说明：本 spec 聚焦 withPrecheck 的行为契约与模板/审查规则。SKILL.md FAQ 和 docs/superpowers/plans/ 的文档更新属于文档同步，在 tasks.md 跟踪，不纳入功能 spec 的 Requirement。 -->

## ADDED Requirements

### Requirement: withPrecheck 返回包装函数并透传所有参数

`withPrecheck(callback)` SHALL 返回 `async (...args) => void` 包装函数。包装函数 SHALL 先执行登录预检，预检通过后调用 `callback(...args)`，将接收到的所有参数完整透传。

#### Scenario: addEventListener 使用 thunk 模式直接绑定

- **WHEN** 业务代码调用 `element.addEventListener("click", withPrecheck(businessLogic))`
- **AND** 用户点击触发 click 事件
- **THEN** `businessLogic` 被调用，且其第一个参数为触发 click 的原始 DOM MouseEvent
- **AND** 预检通过后原始事件完整传递

#### Scenario: React onClick 使用 thunk 模式直接绑定

- **WHEN** React JSX 写作 `<button onClick={withPrecheck(handleClick)}>`
- **AND** 用户点击按钮
- **THEN** 包装函数接收 React synthetic event 作为参数
- **AND** 预检通过后调用 `handleClick(event)`

#### Scenario: Vue @click 使用 thunk 模式直接绑定

- **WHEN** Vue 模板写作 `<button @click="withPrecheck(handleClick)">`
- **AND** 用户点击按钮
- **THEN** 包装函数接收原生 DOM event 作为参数
- **AND** 预检通过后调用 `handleClick(event)`

#### Scenario: 多参数透传

- **WHEN** 业务代码手动调用 `withPrecheck(handleCustom)` 返回的包装函数，传入多个参数
- **AND** `handleCustom` 签名为 `(a, b, c) => void`
- **AND** 包装函数收到 3 个参数（如 `wrapper(arg1, arg2, arg3)`）
- **THEN** `handleCustom` 被调用，且接收到的参数与包装函数收到的 `...args` 完全一致
- **AND** 参数顺序和数量保持不变

#### Scenario: 预检未通过时不调用 callback

- **WHEN** `withPrecheck(fn)` 返回的包装函数被调用
- **AND** 预检判定用户未登录（大神 App 内未登录触发 `openLoginPage`，或微信小程序环境跳转小程序登录页）
- **THEN** `fn` SHALL NOT 被调用
- **AND** 预检的登录引导逻辑正常执行

### Requirement: ds-js-template.js 的 withPrecheck 实现为 thunk 模式

HTML 项目的模板文件 `references/ds-js-template.js` 中 `[DS:CLICK-PRECHECK]` 块内的 `withPrecheck` 函数 SHALL 实现为 thunk 模式：`function withPrecheck(callback) { return async function(...args) { ... } }`。

#### Scenario: ds-js-template.js 生成代码通过审查

- **WHEN** 使用更新后的模板生成 `src/ds.js`
- **AND** 审查流程检查 CLICK-PRECHECK 块
- **THEN** `withPrecheck` 实现为 thunk 模式（返回包装函数）
- **AND** 审查规则"thunk 模式"检查项通过

### Requirement: React/Vue hook/composable 的 withPrecheck 使用泛型签名

`references/react.md` 和 `references/vue.md` 中的 `useDsUlink` hook/composable 内 `[DS:CLICK-PRECHECK]` 块的 `withPrecheck` 函数 SHALL 同步实现为 thunk 模式，类型签名使用泛型以兼容 `strictFunctionTypes`：`<T extends unknown[]>(callback: (...args: T) => void) => (...args: T) => Promise<void>`。

#### Scenario: React useDsUlink 导出 withPrecheck 签名正确

- **WHEN** React 项目使用更新后的 `useDsUlink` hook
- **AND** 在组件中调用 `<button onClick={withPrecheck(handleClick)}>`
- **THEN** TypeScript 类型检查通过
- **AND** `handleClick` 正确接收到 React.MouseEvent 参数

### Requirement: 注入/修复步骤中的推荐用法更新

HTML (`html.md` 6.2)、React (`react.md` 7.2)、Vue (`vue.md` 7.2)、注入 (`inject.md` 步骤 6) 中"选择性修复 Click Handler"的代码示例 SHALL 使用 thunk 模式作为推荐写法。

#### Scenario: HTML 注入步骤推荐写法

- **WHEN** 注入流程步骤 6 输出修复示例
- **THEN** 推荐写法为 `element.addEventListener("click", withPrecheck(businessLogic))`
- **AND** 不在示例中使用嵌套 `function() { withPrecheck(() => ...) }` 模式

#### Scenario: React 注入步骤推荐写法

- **WHEN** React 注入流程步骤 7.2 输出修复示例
- **THEN** 推荐写法为 `<button onClick={withPrecheck(handleClick)}>`
- **AND** 不在示例中使用 `() => withPrecheck(() => ...)` 模式

### Requirement: 审查规则 CLICK-PRECHECK 块包含 thunk 模式与旧调用模式检查

审查规则（`references/audit-rules.md`）CLICK-PRECHECK 块 SHALL 新增检查项：
1. `withPrecheck` 实现为 thunk 模式（返回包装函数），包装函数将 `...args` 透传给 callback
2. **旧调用模式检测（BREAKING）**：调用方使用 `function() { withPrecheck(...) }`、`() => withPrecheck(...)` 箭头函数变体、或内联 `onclick="withPrecheck(...)"` 模式时，thunk 从未被调用，预检和 callback 静默失效。此模式 SHALL 报告为需修复（❌ 阻断），而非"建议升级"
3. 旧实现模式（`withPrecheck` 直接 `callback()` 无参数透传）SHALL 报告为建议升级（⚠️ 非阻断）

#### Scenario: 审查检测到 thunk 模式实现

- **WHEN** 审查流程扫描到 `src/ds.js` 中 `withPrecheck` 返回 `function(...args)` 且 callback 调用为 `callback(...args)`
- **THEN** 审查通过，不报告任何问题

#### Scenario: 旧调用模式在新签名下静默失效（BREAKING）

- **WHEN** 旧代码使用 `element.addEventListener("click", function() { withPrecheck(() => fn()); })` 或内联 `onclick="withPrecheck(fn)"` 模式
- **AND** 升级到 thunk 模式后的 `withPrecheck`
- **THEN** `withPrecheck(() => fn())` 返回 thunk 但 thunk 从未被调用
- **AND** 预检不执行，`fn` 不被调用——**完全静默失效**

#### Scenario: 审查检测到旧调用模式（静默失效）

- **WHEN** 审查流程扫描到调用方使用 `function() { withPrecheck(...) }`、`() => withPrecheck(...)` 或 `onclick="withPrecheck(...)"` 模式
- **THEN** 审查报告输出：`❌ withPrecheck 旧调用模式在新签名下静默失效（预检和 callback 不执行），需迁移为 withPrecheck(fn) 直接作为 handler`
- **AND** 该项为阻断项

#### Scenario: 审查检测到旧实现模式（无事件透传）

- **WHEN** 审查流程扫描到 `src/ds.js` 中 `withPrecheck` 直接 `callback()` 无参数透传
- **THEN** 审查报告输出：`⚠️ withPrecheck 未透传事件参数给 callback，建议升级到 thunk 模式以保留 click event`
- **AND** 该项为警告，不阻断

## Context

当前 `withPrecheck(callback)` 是 `async function`，直接执行预检逻辑后调用 `callback()`。这导致 click 事件处理器中的原始 DOM event（以及 React synthetic event、Vue `$event`）在两层间接调用中丢失：

```
// 当前：event 被吞掉
element.addEventListener("click", function(event) {
  withPrecheck(() => businessLogic());  // event 未传入 businessLogic
});
```

根因：`withPrecheck` 不接收也不转发事件参数。每个调用方需自行捕获 `event` 并在箭头函数中显式传递，负担落在调用侧而非基础侧。

## Goals / Non-Goals

**Goals:**
- `withPrecheck` 改为 thunk 模式：接收 callback，返回 `async (...args) => void` 包装函数
- 包装函数接收所有参数（事件等），预检通过后透传给 callback
- 推荐用法从嵌套两层箭头函数简化为单层：直接作为事件处理器
- 三框架模板（HTML/React/Vue）的修复示例同步更新
- 审查规则 CLICK-PRECHECK 块同步更新

**Non-Goals:**
- 不改变预检逻辑本身（三个分支不变）
- 不改变 React/Vue hook/composable 的导出接口（仍导出 `withPrecheck`）
- 不保留旧调用模式的运行时兼容——这是 **BREAKING** 变更，旧调用模式需迁移（见 Risks）

## Decisions

### 决策 1：Thunk 模式 vs 可变参数

- **选型：Thunk 模式** — `withPrecheck(callback)` 返回 `async (...args) => void`
- **替代方案：可变参数** — `async function withPrecheck(callback, ...args)`，要求调用方手动传 event。增加调用方负担，与"不应让每个调用方自己规避"目标矛盾。
- **理由：** thunk 模式将"接收-透传"的职责从调用方移到 `withPrecheck` 内部，推荐用法变为极简的 `element.addEventListener("click", withPrecheck(businessLogic))`。

### 决策 2：返回 async 函数

- `withPrecheck` 返回 `async (...args) => void` 而非同步包装函数
- **理由：** 预检逻辑本身是异步的（`await window.ds.ready()`、`callHandler`），返回值作为事件处理器时浏览器不关心返回值，async 完全可用

### 决策 3：JS 模板 vs TS 模板分步独立更新

- `ds-js-template.js` 的 `withPrecheck` 是 HTML 项目的运行时实现，必须率先更新
- React/Vue 模板中的 `withPrecheck` 是独立的 hook/composable 实现，各自有独立的类型注解和框架约定
- 两者分步独立更新（不要求同时完成），但最终都要落地为 thunk 模式

### 决策 4：审查规则更新粒度

- audit-rules.md CLICK-PRECHECK 块的检查项从"callback() 有 typeof guard"扩展为"withPrecheck 返回包装函数且透传 ...args"
- 旧**调用模式**（`function() { withPrecheck(...) }` 或 `onclick="withPrecheck(...)"`）→ 阻断项（❌），因 thunk 静默失效
- 旧**实现模式**（`withPrecheck` 直接 `callback()` 无 `...args` 透传）→ 建议升级（⚠️ 非阻断）

## Risks / Trade-offs

- **[BREAKING] 旧调用模式静默失效**：以下两种存量调用模式在新签名下**完全失效**（预检不执行、callback 不调用），因为 `withPrecheck(fn)` 返回 thunk 但 thunk 从未被调用：
  - 内联 HTML 属性 `onclick="withPrecheck(fn)"` — 等价于 `function(event){ withPrecheck(fn) }`，thunk 返回后被丢弃
  - 旧包装模式 `element.addEventListener('click', function(){ withPrecheck(() => fn()) })` — 同理，thunk 被丢弃
  - **迁移指南**：
    - 旧包装模式 → `element.addEventListener('click', withPrecheck(fn))`（直接作为 handler）
    - 内联 `onclick="withPrecheck(fn)"` → **不能**简单替换为 `onclick="withPrecheck(fn)()"`（不合法）。必须迁移为 `<script>` 中的 `element.addEventListener` 绑定。对仅使用 HTML 内联事件的项目，这是结构性变更——需在 `<script>` 块中获取元素引用并注册监听器。
  - **审查规则**：audit-rules.md CLICK-PRECHECK 块新增检查项，检测旧调用模式（含 `function() { withPrecheck(...) }`、`() => withPrecheck(...)` 箭头函数变体、内联 `onclick="withPrecheck(...)"`）并标记为需修复（非"建议升级"）
- [Risk] React `useDsUlink` hook 的 `withPrecheck` 导出变化可能导致类型推断失败 → 使用泛型签名 `<T extends unknown[]>(callback: (...args: T) => void): (...args: T) => Promise<void>` 兼容 `strictFunctionTypes`
- [Trade-off] 旧用法迁移是 BREAKING 的，但新用法更简洁且自动保留 event — 一次性迁移成本可接受

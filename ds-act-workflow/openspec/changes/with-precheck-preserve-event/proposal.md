## Why

`withPrecheck(callback)` 只接收回调函数，不转发原始 DOM 事件（click event、React synthetic event 等），导致点击事件参数传递丢失。目前每个调用方需自行捕获并透传 event，此责任应归属于 `withPrecheck` 模板本身——它是最内层的调用边界，理应在预检通过后将原始事件交给业务回调。

## What Changes

- **BREAKING**: `withPrecheck` 改为返回一个包装函数（thunk 模式），包装函数作为实际事件处理器，将 `...args` 全部透传给业务回调。函数签名从 `async function withPrecheck(callback)` 变为 `function withPrecheck(callback): (...args) => Promise<void>`
- 推荐用法从 `element.addEventListener("click", () => withPrecheck(() => fn()))` 变为 `element.addEventListener("click", withPrecheck(fn))` — 更简洁且自动保留 event
- `references/ds-js-template.js`: 重写 [DS:CLICK-PRECHECK] 块，withPrecheck 返回包装函数
- `references/html.md` / `references/react.md` / `references/vue.md`: 更新步骤中的点击修复示例，使用新用法
- `references/inject.md`: 更新步骤 6 的修复示例
- `references/audit-rules.md`: 更新 CLICK-PRECHECK 块检查，验证 `withPrecheck` 返回包装函数模式、并检查 event 透传

## Capabilities

### New Capabilities
- `with-precheck-event-forwarding`: `withPrecheck` 将接收到的所有参数（含 click event）透传给业务回调

### Modified Capabilities
<!-- None — this is a new cross-cutting capability -->
- `audit-scope`: 审查规则 CLICK-PRECHECK 块增加对 `withPrecheck` 包装函数模式和 event 透传的检查

## Impact

- `references/ds-js-template.js` — [DS:CLICK-PRECHECK] 块重写
- `references/html.md` — 步骤 6 修复示例更新
- `references/react.md` — 步骤 7 修复示例更新  
- `references/vue.md` — 步骤 7 修复示例更新
- `references/inject.md` — 步骤 6 修复示例更新
- `references/audit-rules.md` — CLICK-PRECHECK 块检查规则更新
- `SKILL.md` — FAQ 中 `withPrecheck` 用法示例更新
- `docs/superpowers/plans/` 中各计划文件中的 `withPrecheck` 用法示例 — **结论**：历史计划文档无需更新（见 tasks.md 5.2）。**注意**：这些文档中的 `withPrecheck(() => startGame())` 等旧调用模式示例已过时，在新签名下会静默失效。开发者应参考当前模板（`references/` 下文件）而非历史计划文档中的示例。

## Context

ds-act-skills 技能在 HTML 项目模式下，会在 index.html 中注入 ds.js 的引用。当前模板使用 `type="module"` 属性，这会导致：

1. Vite 等现代构建工具将 ds.js 视为 ES Module
2. 构建后的产物可能包含模块加载代码，而 ds.js 实际是传统的 IIFE 格式
3. 在某些环境下可能导致脚本执行顺序或作用域问题

## Goals / Non-Goals

**Goals:**
- 修复 script 标签类型，使用 `type="text/javascript"` 替代 `type="module"`
- 确保 ds.js 以传统脚本方式加载，与其实际格式一致
- 避免 Vite 构建时对 ds.js 进行不必要的模块化处理

**Non-Goals:**
- 不修改 ds.js 的内容或格式
- 不修改 SDK-LOADER 的生成逻辑
- 不涉及 React/Vue 项目的模板（它们使用 hooks/composables 模式）

## Decisions

### Decision 1: 使用 `type="text/javascript"` 而非省略 type 属性

**选择:** 显式声明 `type="text/javascript"`

**理由:**
- 明确表达意图：这是一个传统 JavaScript 脚本
- 避免任何构建工具对脚本类型的猜测或默认行为差异
- 与 HTML 规范保持一致，尽管 `text/javascript` 是默认值，但显式声明更清晰

**替代方案:** 省略 type 属性（HTML5 默认就是 `text/javascript`）
- 拒绝理由：不够明确，可能被某些工具链误解

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 某些旧版浏览器可能不认识 `type="text/javascript"` | 该类型是 HTML 标准默认值，所有浏览器都支持 |
| 与现有项目的行为差异 | 这是修复行为，新注入的项目将获得正确的脚本类型 |

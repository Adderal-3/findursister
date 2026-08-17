## Why

现有模板中所有 `wx.miniProgram.*` 调用由 `isWechatMiniProgram()` 守卫——该函数检查 UA 是否含 `miniprogram`，回答的是"我在微信 WebView 里吗"而非"`window.wx` 能用吗"。Cocos 项目已跳过 `jweixin` 注入，但未来任何间接引入 `window.wx` 的第三方代码（MobileShare 是最新一例，已修复）仍可能触发 `isWechatMiniProgram()` 为 false、`window.wx` 却存在的中间态，或者新业务代码绕过 `isWechatMiniProgram` 直接调 `wx.xxx` 导致 `ReferenceError`。正确策略：用 `wx` 之前判断 `window.wx` 是否存在——不管什么环境，只管 SDK 是否就绪。

## What Changes

- `references/ds-js-template.js`：所有 `isWechatMiniProgram()` 调用点将 `wx.xxx` 包裹在 `typeof window.wx !== 'undefined'` 存在性检查内；`isWechatMiniProgram()` 函数保留不变（环境检测仍有价值，但不再作为 `wx` 调用的唯一守卫）。
- `references/react.md` / `references/vue.md`：`useDsShare` / `withPrecheck` 等 hook/composable 中相应位置的 `wx.` 调用同步增加 `window.wx` 存在性检查。
- `references/audit-rules.md`：新增一条检查——所有 `wx.` 调用必须有 `typeof window.wx !== 'undefined'`（或等价）前置判断。
- `references/audit.md`：审查报告模板增加对应行。
- `SKILL.md` FAQ：新增"使用 `wx.*` 前没有判断 `window.wx` 是否存在"条目。

非破坏性：非 Cocos 项目在微信 WebView 中 `window.wx` 由浏览器提供，判断结果为 true，行为不变。

## Capabilities

### New Capabilities
- `wx-existence-guard`：所有 `wx.miniProgram.*` 调用前必须有 `window.wx` 存在性检查，取代仅依赖 `isWechatMiniProgram()` 的 UA 判断模式。

### Modified Capabilities
（无）

## Impact

- **代码模板**：`references/ds-js-template.js`、`references/react.md`、`references/vue.md`
- **审查规则**：`references/audit-rules.md`、`references/audit.md`
- **文档**：`SKILL.md`
- **不可见风险**：新模版对旧项目无影响；旧项目若独立引入 `window.wx` 污染仍需手工修复，但审查规则可检测。

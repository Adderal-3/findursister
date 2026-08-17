## ADDED Requirements

### Requirement: 所有 wx.miniProgram 调用前判断 window.wx 存在性

模板生成的 `ds.js`（及其 React/Vue 等价代换）中，任何 `wx.miniProgram.*` 调用 SHALL 先通过 `typeof window.wx !== 'undefined'`（或语义等价表达式）确认 `window.wx` 已定义。`isWechatMiniProgram()` 的环境检测仍可用于分流逻辑，但不得作为 `wx` 调用的唯一守卫。

#### Scenario: 微信小程序 WebView 中调用分享

- **WHEN** 页面在微信小程序 WebView 中加载（UA 含 `miniprogram`，且 `window.wx` 由微信浏览器提供）
- **AND** 业务调用 `initShare()`
- **THEN** `isWechatMiniProgram()` 返回 `true`
- **AND** `typeof window.wx !== 'undefined'` 为 `true`
- **AND** `wx.miniProgram.postMessage(...)` 被正常调用

#### Scenario: 普通浏览器中 window.wx 缺失

- **WHEN** 页面在普通浏览器加载（UA 不含 `miniprogram`，且无任何第三方注入 `window.wx`）
- **AND** 业务调用 `initShare()`
- **THEN** `isWechatMiniProgram()` 返回 `false`
- **AND** 不进入 `wx.miniProgram` 调用分支（由环境分流逻辑或 window.wx 检查短路）

#### Scenario: 普通浏览器中 window.wx 被第三方污染但 UA 不含 miniprogram

- **WHEN** 页面在普通浏览器中加载，但因某种原因 `window.wx` 被定义（如第三方库注入残缺 wx）
- **AND** `isWechatMiniProgram()` 返回 `false`
- **THEN** 即使代码检查 `typeof window.wx !== 'undefined'` 为 `true`
- **AND** 由于 `isWechatMiniProgram()` 的环境分流在守卫之前，仍不会执行 `wx.miniProgram` 调用（双重保险）
- **AND** 若未来代码调整了分流顺序，`window.wx` 存在性检查仍能防止 `wx.xxx is not a function` 类 ReferenceError

#### Scenario: withPrecheck 中小程序未登录分支

- **WHEN** `withPrecheck(callback)` 判定为小程序环境（`isWechatMiniProgram() === true`）且用户未登录
- **THEN** 在调用 `wx.miniProgram.navigateTo(...)` 前 SHALL 检查 `typeof window.wx !== 'undefined'`
- **AND** 若 `window.wx` 缺失，降级为静默 no-op（不跳转、不报错）

#### Scenario: initLogin 中小程序未登录分支

- **WHEN** `initLogin()` 判定为小程序环境（`isWechatMiniProgram() === true`）且用户未登录
- **THEN** 在调用 `wx.miniProgram.navigateTo(...)` 前 SHALL 检查 `typeof window.wx !== 'undefined'`
- **AND** 若 `window.wx` 缺失，降级为静默 no-op

### Requirement: 审查规则检测裸调 wx.*

审查流程 SHALL 检查所有业务代码中直接调用 `wx.` 成员（`wx.miniProgram.*`、`wx.config` 等）的位置，确认其前置有 `typeof window.wx !== 'undefined'`（或等价）检查。缺失该检查 SHALL 报告为警告（WARNING），不阻断。

#### Scenario: 审查检测到裸调 wx.xxx

- **WHEN** 审查流程扫描到代码中包含 `wx.miniProgram.postMessage(...)` 但同一函数作用域内未出现 `typeof window.wx`
- **THEN** 审查报告输出：`⚠️ wx.miniProgram 调用前缺少 window.wx 存在性判断，位置：xxx`

#### Scenario: 审查检测到正确守卫的 wx 调用

- **WHEN** 审查流程扫描到代码中 `wx.xxx` 调用点，且同一作用域内有 `typeof window.wx !== 'undefined'` 判断
- **THEN** 审查通过该规则

#### Scenario: 审查模板生成的 ds.js

- **WHEN** 审查流程检查 `src/ds.js`（由最新模板生成）
- **THEN** 所有 `wx.` 调用点均通过 window.wx 存在性检查（模板已更新）

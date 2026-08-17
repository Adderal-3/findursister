## ADDED Requirements

### Requirement: Cocos 项目检测期标志

注入流程 SHALL 基于 `SKILL.md` 第一节 1a 规则（`cocos2d-js*.js` 文件存在 AND 任意 `.js` 包含 `_CCSettings`）判定 Cocos 项目，并将判定结果写入 `[DS:CONFIG:START]` 块的 `IS_COCOS` 静态变量（`true` / `false`）。运行期分享相关逻辑 SHALL 仅读取该静态变量，不再进行 UA 或全局对象探测。

#### Scenario: 前置扫描命中 Cocos 项目

- **WHEN** 注入流程执行 `[1] 接入大神功能`，且前置扫描的 1a Cocos 检测命中
- **THEN** 生成的 `src/ds.js` 在 `[DS:CONFIG:START]` 块内包含 `var IS_COCOS = true;`
- **AND** SDK-LOADER 注入到 `index.html` 的 `<head>` 内含 `IS_COCOS = true` 同义条件分支

#### Scenario: 前置扫描未命中 Cocos 项目

- **WHEN** 注入流程执行 `[1] 接入大神功能`，且前置扫描的 1a Cocos 检测未命中
- **THEN** 生成的 `src/ds.js` 在 `[DS:CONFIG:START]` 块内包含 `var IS_COCOS = false;`
- **AND** SDK-LOADER 与 `initShare()` 的 mobile-share 加载与初始化逻辑保持现有行为不变

### Requirement: SDK-LOADER 在 Cocos 项目跳过 MobileShare 注入

`references/sdk-loader-template.html` 注入到目标 `index.html` 后，SDK-LOADER 中负责动态加载 `mobile-share.min.js` 与注册 `window.onMobileShareReady` 的 IIFE SHALL 仅在 `IS_COCOS = false` 且 UA 不含 `Godlike` 时执行。`IS_COCOS = true` 时 IIFE SHALL 整体跳过，不创建 `<script>` 标签，不向 `window` 挂载 `onMobileShareReady`。

#### Scenario: Cocos 项目运行在普通浏览器

- **WHEN** Cocos 项目（`IS_COCOS = true`）页面在普通浏览器加载
- **THEN** SDK-LOADER 不向 `<head>` 追加 `<script src="...mobile-share.min.js">`
- **AND** `window.onMobileShareReady` 保持 `undefined`
- **AND** `window.MobileShare` 保持 `undefined`
- **AND** `window.wx` 不被 mobile-share 间接定义（不影响 Cocos 引擎对 `window.wx` 的判断）

#### Scenario: 非 Cocos 项目运行在普通浏览器

- **WHEN** 非 Cocos 项目（`IS_COCOS = false`）页面在普通浏览器加载，且 UA 不含 `Godlike`
- **THEN** SDK-LOADER 异步加载 `https://ds.res.netease.com/online/pkg/mobile-share/2.2.0/mobile-share.min.js`
- **AND** `window.onMobileShareReady` 被定义为现有规范中的回调队列实现

#### Scenario: 任意项目运行在大神 App 内

- **WHEN** UA 含 `Godlike`，无论 `IS_COCOS` 取值
- **THEN** SDK-LOADER 不加载 mobile-share（与现有规范一致）

### Requirement: initShare 在 Cocos 项目跳过 MobileShare 兜底分支

`references/ds-js-template.js` 的 `initShare()` 函数 SHALL 在 `IS_COCOS = true` 且当前不在小程序环境（`isWechatMiniProgram() === false`）且不在 Godlike App 内（`!window.ds || !window.ds.isGodlike`）时，直接 `return` 不执行 MobileShare 初始化分支，亦不触发 `onMobileShareReady` 回调。

#### Scenario: Cocos 项目在大神 App 内分享

- **WHEN** Cocos 项目（`IS_COCOS = true`）运行在大神 App 内（`window.ds.isGodlike === true`）
- **AND** 业务调用 `initShare()`
- **THEN** `initShare()` 走 Godlike 分支，调用 `window.ds.ready().then(...).callHandler('onUpdateShareMenu', {...})`
- **AND** 不进入 MobileShare 初始化逻辑

#### Scenario: Cocos 项目在普通浏览器分享

- **WHEN** Cocos 项目（`IS_COCOS = true`）运行在普通浏览器（非 Godlike、非小程序）
- **AND** 业务调用 `initShare()`
- **THEN** `initShare()` 直接 `return`，不引用 `MobileShare` 与 `onMobileShareReady`
- **AND** 不向 console 输出错误或警告

#### Scenario: 非 Cocos 项目在普通浏览器分享

- **WHEN** 非 Cocos 项目（`IS_COCOS = false`）运行在普通浏览器（非 Godlike、非小程序）
- **AND** 业务调用 `initShare()`
- **THEN** `initShare()` 走 MobileShare 分支，与现有规范一致：`typeof MobileShare !== 'undefined'` 立即 `new MobileShare(...)`，否则通过 `onMobileShareReady` 兜底

#### Scenario: Cocos 项目在小程序 WebView 内分享

- **WHEN** Cocos 项目（`IS_COCOS = true`）运行在微信小程序 WebView（`isWechatMiniProgram() === true`）
- **AND** 业务调用 `initShare()`
- **THEN** `initShare()` 走小程序分支，调用 `wx.miniProgram.postMessage({ data: { pageId, shareConfig } })`（`wx.miniProgram.*` 调用由 `wx-existence-guard` 规格的 `typeof window.wx !== 'undefined'` 守卫包裹——详见 `openspec/specs/wx-existence-guard/spec.md`）
- **AND** Cocos 豁免不影响小程序分支行为

### Requirement: 审查规则在 Cocos 项目豁免 MobileShare 分支检查

`references/audit-rules.md` 的「分享块」审查 SHALL 在 `IS_COCOS = true` 时跳过「非 Godlike 分支必须含 `onMobileShareReady` 兜底」规则。其余规则（Godlike 分支双存在、`ds.ready()` 时序、`imgUrl` 必须 `https://`、四字段非空、`squareId` 在 Godlike 分支等）保留。

#### Scenario: 审查 Cocos 项目缺失 MobileShare 分支

- **WHEN** 审查流程检查 Cocos 项目（`src/ds.js` 含 `var IS_COCOS = true;`）
- **AND** `initShare()` 中不存在 `MobileShare` / `onMobileShareReady` 引用
- **THEN** 审查通过该规则（不报阻断）
- **AND** 审查报告输出一行：`Cocos 项目 → MobileShare 分支已豁免（产品决策：浏览器分享降级为不可用）`

#### Scenario: 审查非 Cocos 项目缺失 MobileShare 分支

- **WHEN** 审查流程检查非 Cocos 项目（`src/ds.js` 含 `var IS_COCOS = false;` 或缺失该变量）
- **AND** `initShare()` 中不存在 `MobileShare` / `onMobileShareReady` 引用
- **THEN** 审查报阻断：`非 Godlike 分支缺失 MobileShare 兜底，站外用户无法分享`

#### Scenario: 审查 Cocos 项目错误注入 MobileShare

- **WHEN** 审查流程检查 Cocos 项目（`src/ds.js` 含 `var IS_COCOS = true;`）
- **AND** `index.html` 的 SDK-LOADER 中检测到 `mobile-share.min.js` 的 `<script>` 注入或动态加载逻辑
- **THEN** 审查报阻断：`Cocos 项目 SDK-LOADER 注入了 mobile-share，会污染 window.wx 触发 Cocos 进入微信小游戏分支；请重跑 [1] 接入大神功能`

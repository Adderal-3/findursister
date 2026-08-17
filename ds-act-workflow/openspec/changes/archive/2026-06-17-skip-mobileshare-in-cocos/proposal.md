## Why

Cocos Creator web-mobile 项目在大神 App 外环境注入 MobileShare SDK 后，MobileShare 内部会同步加载微信 JSSDK（`jweixin-x.x.x.js`）。Cocos 引擎启动时检测到 `window.wx` 存在，会判定当前运行环境为微信小游戏，进入小游戏代码分支，导致引擎无法正常初始化，整页白屏或资源加载失败。当前 `references/sdk-loader-template.html` 中的 SDK-LOADER 对所有非 Godlike UA 都注入 mobile-share，未对 Cocos 项目做豁免，是阻断级缺陷。

## What Changes

- SDK-LOADER 增加 Cocos 项目分支：当 `IS_COCOS = true` 时，跳过 `mobile-share/2.2.0/mobile-share.min.js` 的动态注入与 `window.onMobileShareReady` 注册。
- `references/ds-js-template.js` 的 `initShare()` 在 Cocos 项目下跳过非 Godlike 分支的 MobileShare 初始化，仅保留小程序分支与 Godlike 分支；外部浏览器分享降级为不可用（无替代 SDK，与 Cocos 引擎兼容性互斥）。
- `references/inject.md` / `references/html.md`：注入流程在生成 SDK-LOADER 与 `ds.js` 时，根据前置扫描结果（Cocos 命中）自动写入 `IS_COCOS = true` 配置位与对应分支代码；非 Cocos 项目行为不变。
- `references/audit-rules.md`：分享块审查增加 Cocos 项目特例——Cocos 项目允许缺失 MobileShare 分支，但必须保留 Godlike 分支与小程序分支；非 Cocos 项目仍要求双分支齐全。
- `references/audit.md`：审查报告新增「Cocos 项目 MobileShare 豁免」状态行。

非破坏性：非 Cocos 项目（HTML / React / Vue / 普通 H5）的 SDK-LOADER 与 `initShare` 逻辑保持完全不变。

## Capabilities

### New Capabilities
- `cocos-mobileshare-skip`: Cocos web-mobile 项目在 SDK-LOADER 与 `initShare` 中跳过 MobileShare 注入与初始化，避免微信 JSSDK 触发 Cocos 引擎进入微信小游戏分支。

### Modified Capabilities
（无：现有 spec 中未涵盖分享/SDK-LOADER 行为，不存在要修改的 capability。）

## Impact

- **代码模板**：`references/sdk-loader-template.html`（Cocos 分支条件判断）、`references/ds-js-template.js`（`initShare` Cocos 分支）、`references/inject.md`、`references/html.md`（注入流程读取 `IS_COCOS` 标志）。
- **审查规则**：`references/audit-rules.md`、`references/audit.md`（分享块审查新增 Cocos 豁免分支）。
- **依赖**：无新增第三方依赖；MobileShare CDN 在 Cocos 项目下不再加载，减少一次外部请求。
- **行为差异**：Cocos 项目在普通浏览器 / 大神 App 外 WebView 中将无法触发 MobileShare 分享面板（产品上由 Cocos 项目方接受此限制；当前并无替代方案能同时兼容 Cocos 引擎与移动端分享）。
- **现存项目**：已注入但出现 Cocos 白屏的项目，需重跑 `[1] 接入大神功能` 重新生成 SDK-LOADER 与 `ds.js`。

## Context

ds-act-workflow 通过 `references/sdk-loader-template.html` 在 `<head>` 注入 SDK-LOADER，对**所有**非 Godlike UA 的运行环境异步加载 `mobile-share/2.2.0/mobile-share.min.js`，并在 `references/ds-js-template.js` 的 `initShare()` 内提供 Godlike / MobileShare 双分支。

MobileShare SDK 内部依赖微信 JSSDK（`jweixin-x.x.x.js`），加载时会向页面注入 `window.wx`。Cocos Creator web-mobile 导出的 `cocos2d-js*.js` 引擎在启动阶段会同步检测全局环境：

```
if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
  // 进入微信小游戏分支：调用 wx.getFileSystemManager 等
}
```

由于微信小游戏 API 在浏览器中并不存在，Cocos 引擎进入该分支后会立即抛错（`wx.getFileSystemManager is not a function`）或在加载资源阶段卡住，最终表现为白屏。

当前 SDK-LOADER 与 `initShare` 模板对 Cocos 项目无任何特例处理。`SKILL.md` 一节已识别 Cocos 项目（`1a. Cocos web-mobile 检测`），并通过 `IS_COCOS` 概念在「微信 JSSDK」注入处做过豁免（见 `references/html.md:113-114, 123, 126`），但**未延伸到 MobileShare**——Cocos 项目仍会通过 SDK-LOADER 间接加载微信 JSSDK，问题依旧存在。

## Goals / Non-Goals

**Goals:**
- Cocos web-mobile 项目运行在普通浏览器或大神 App 外 WebView 时不再因 MobileShare 触发的微信 JSSDK 注入而进入小游戏分支。
- 非 Cocos 项目（HTML / React / Vue）的 SDK-LOADER 与分享行为完全不变，零回归。
- 注入流程根据前置扫描结果（`SKILL.md` 一节的 1a 检测）自动写入正确的 Cocos 分支代码，无需用户额外回答问题。
- 审查流程能准确识别 Cocos 项目并对分享块审查规则做相应豁免，避免误报「缺失 MobileShare 分支」。

**Non-Goals:**
- 不为 Cocos 项目寻找 MobileShare 的替代方案。当前不存在与 Cocos 引擎兼容、不污染 `window.wx` 的移动端分享 SDK；Cocos 项目方需接受外部浏览器分享降级为不可用。
- 不修改 Godlike 分支（大神 App 内 JSSDK 分享）逻辑：该分支不依赖微信 JSSDK，与 Cocos 引擎兼容。
- 不修改小程序分支（`isWechatMiniProgram` + `wx.miniProgram.postMessage`）逻辑：该分支只在小程序 WebView 内执行，已与 Cocos 项目无冲突（Cocos 不会在小程序 WebView 中运行）。
- 不引入新的运行时检测；继续复用 SKILL 已有的 `IS_COCOS` 静态标志（注入期决定，运行期不再判断）。

## Decisions

### 决策 1：Cocos 豁免在 SDK-LOADER 与 initShare 两处均落地，而非单点

**选择：** 在 `references/sdk-loader-template.html` 中通过 `IS_COCOS` 标志条件包裹 mobile-share `<script>` 注入；同时在 `references/ds-js-template.js` 的 `initShare()` 中也按 `IS_COCOS` 跳过非 Godlike 分支。

**为什么不只改 SDK-LOADER：** 若仅 SDK-LOADER 跳过注入，`initShare` 中仍会执行 `typeof MobileShare !== 'undefined'` 检查与 `onMobileShareReady` 兜底分支。`onMobileShareReady` 在 Cocos 分支下未被定义（因为 SDK-LOADER 未注册），落到最终的 else 分支虽然不会报错，但留下两处含义割裂的代码，未来维护者会困惑。两处同步豁免保证语义一致。

**为什么不只改 initShare：** SDK-LOADER 仍会动态创建 `<script src="mobile-share.min.js">`，浏览器仍会下载该资源、MobileShare 仍会同步加载微信 JSSDK，污染 `window.wx`。这正是问题根源。SDK-LOADER 必须从源头跳过。

### 决策 2：复用 SKILL.md 已有的 IS_COCOS 注入期标志

**选择：** 注入流程在前置扫描（`SKILL.md` 一节的 1a）命中 Cocos 时，将 `IS_COCOS` 设为 `true`，并将该标志体现在 SDK-LOADER 模板与 `ds.js` 模板的占位符替换中。运行期 `initShare()` 直接读取一个常量（`var IS_COCOS = true;` 或 `false`），不做 UA 检测。

**为什么不在运行时检测 Cocos：** Cocos 引擎自身没有可靠的运行时特征字符串，`_CCSettings` 出现的时机晚于 SDK-LOADER 执行；且 SDK-LOADER 必须在 `<head>` 同步执行，无法异步等待 Cocos 启动后再决定是否加载。注入期决策是唯一可行路径。

**为什么不抽取成新的环境变量文件：** 现有 `[DS:CONFIG:START]` 块已是配置占位符的标准位置，新增一个 `IS_COCOS` 占位符与现有 `APP_KEY` / `SHARE_TITLE` 等同级，无需额外文件或机制。

### 决策 3：Cocos 项目在浏览器外环境分享降级为静默无操作（no-op），不抛错不提示

**选择：** Cocos + 非 Godlike + 非小程序 三条件同时成立时，`initShare()` 直接 `return`，不输出 console 警告。

**为什么不输出警告：** 该分支会在每次页面打开时执行一次。生产环境下 console 噪音对业务排查无帮助；Cocos 项目方接入时已知此限制（由审查报告与文档明示），运行期再次提醒无价值。

**为什么不抛错：** 浏览器环境不能分享是产品决策，不是程序错误；抛错会污染监控面板。

### 决策 4：审查规则引入 Cocos 豁免，而非放宽全体规则

**选择：** `references/audit-rules.md` 的「分享块」检查保留「`isGodlike` 双分支必存在」「非 Godlike 分支必含 MobileShare 兜底」两条规则；新增前置条件——若 `IS_COCOS = true`，跳过「非 Godlike 分支必含 MobileShare 兜底」一条，仅校验 Godlike 分支与小程序分支（如已接入）。

**为什么不全局放宽：** 非 Cocos 项目缺失 MobileShare 兜底分支会导致站外浏览器分享失效，仍是真实缺陷，必须保留阻断级检查。

## Risks / Trade-offs

- **风险：Cocos 检测漏判** —— 前置扫描的 1a 规则要求 `cocos2d-js*.js` + `_CCSettings` 双命中。若用户魔改 Cocos 输出（重命名引擎文件 / 内联 settings），`IS_COCOS` 会被错判为 `false`，问题复现。**缓解：** 审查阶段输出「Cocos 检测结果」一行，让用户在审查报告中肉眼复核；若用户已知项目是 Cocos 但检测为 false，可手动改 `IS_COCOS` 占位符。
- **权衡：Cocos 项目浏览器分享缺失** —— Cocos 项目在大神 App 外、非小程序的普通浏览器中无法分享。已在 Goals/Non-Goals 中明确为可接受的产品取舍；`references/inject.md` 与审查报告会在 Cocos 项目上明示此限制。
- **风险：现存已部署的 Cocos 项目仍有 bug** —— 历史项目通过旧版 SDK-LOADER 注入了 mobile-share，此次模板修改仅影响新注入与重新注入。**缓解：** 在 `references/audit.md` 新增一条阻断级提示「Cocos 项目 SDK-LOADER 检测到 mobile-share 注入 → 重跑 `[1] 接入大神功能`」，用户审查存量项目时会被强制提醒。
- **权衡：增加一个静态配置占位符** —— `[DS:CONFIG:START]` 块多一个 `IS_COCOS` 字段。模板复杂度微增，但与现有 `APP_KEY` / `SHARE_TITLE` 同构，不引入新机制；远小于在运行期反复探测 Cocos 的复杂度。

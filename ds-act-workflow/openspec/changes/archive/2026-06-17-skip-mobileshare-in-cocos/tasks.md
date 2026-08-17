## 1. SDK-LOADER 模板改造

- [x] 1.1 修改 `references/sdk-loader-template.html`：在 mobile-share IIFE 外层添加 `IS_COCOS` 占位符判断，例如 `if (!{IS_COCOS} && !/Godlike/i.test(window.navigator.userAgent))`，确保 Cocos 项目下整个 IIFE 不创建 `<script>` 标签、不挂载 `window.onMobileShareReady`
- [x] 1.2 在 `references/sdk-loader-template.html` 顶部 `<!-- [DS:SDK-LOADER:START] -->` 之前增加注释行，说明 `{IS_COCOS}` 占位符的取值来源（注入流程根据前置扫描 1a 的结果替换为 `true` / `false`）

## 2. ds.js 模板改造

- [x] 2.1 修改 `references/ds-js-template.js` 的 `[DS:CONFIG:START]` 块，新增一行 `var IS_COCOS = {IS_COCOS};` 占位符（与 `APP_KEY` / `SHARE_TITLE` 同级）
- [x] 2.2 修改 `references/ds-js-template.js` 的 `initShare()` 函数：在小程序分支之后、Godlike 分支之前**或**在 else 分支（非 Godlike 分支）开头添加 `if (IS_COCOS) return;` 早退，使 Cocos 项目在普通浏览器中不进入 MobileShare 兜底逻辑；保留 `ds.ready().then(...) callHandler('onUpdateShareMenu')` 的 Godlike 分支不变
- [x] 2.3 在 `[DS:SHARE:START]` 块顶部加注释，说明 `IS_COCOS = true` 时浏览器分享降级为 no-op 的产品决策

## 3. 注入流程文档同步

- [x] 3.1 修改 `references/inject.md`：在「移动端分享」模块说明中增加 Cocos 例外条款；在注入步骤中增加占位符替换规则——根据 `SKILL.md` 第一节 1a 的扫描结果决定 `{IS_COCOS}` 替换为 `true` 或 `false`
- [x] 3.2 修改 `references/html.md` 第 4-HTML-4 节占位符替换表，新增 `{IS_COCOS}` 一行：「值取自前置扫描 1a 的判定结果（`true` / `false`），不询问用户」
- [x] 3.3 在 `references/html.md` 的 4-HTML-4.1 「CONFIG 块智能处理」中明确：`IS_COCOS` 字段始终以最新扫描结果**覆盖**已有值（与 `EVENT_ACTION` / `EVENT_CATEGORY` 同策略），因为它反映环境而非用户偏好
- [x] 3.4 React (`references/react.md`) 与 Vue (`references/vue.md`) 的 `useDsShare.ts` 模板同步：在 SHARE 块顶部增加 `IS_COCOS` 常量读取，`initShare` 的 MobileShare 分支前加 `if (IS_COCOS) return;` 早退；同时在前置说明里注明 React/Vue + Cocos 组合罕见，但仍按一致约定处理

## 4. 审查规则同步

- [x] 4.1 修改 `references/audit-rules.md` 的「分享块」一节：在「非 Godlike 分支必须含 `onMobileShareReady` 兜底」规则前加前置条件 `IF IS_COCOS === false`；新增一条 Cocos 专项检查「IF IS_COCOS === true → SDK-LOADER 不得加载 mobile-share，否则阻断」
- [x] 4.2 修改 `references/audit.md` 的审查报告模板，新增「Cocos 项目 MobileShare 豁免」状态行（仅 Cocos 项目展示）；新增一条阻断级提示「Cocos 项目 SDK-LOADER 检测到 mobile-share 注入 → 重跑 `[1] 接入大神功能`」
- [x] 4.3 复核 `SKILL.md` 第三节「常见问题与正确写法」表格：若需要新增「Cocos 项目误注入 mobile-share 导致白屏」一行，则添加；否则跳过

## 5. 验证

- [x] 5.1 拿一个 Cocos web-mobile 样例项目（含 `cocos2d-js.js` 与 `_CCSettings`）跑 `[1] 接入大神功能`：验证生成的 `index.html` 中 SDK-LOADER 不含 `mobile-share.min.js` 的 `<script>` 注入，`src/ds.js` 中 `IS_COCOS = true`，`initShare` 在浏览器路径直接 `return`
- [x] 5.2 拿一个普通 HTML 项目（无 cocos2d-js 文件）跑 `[1] 接入大神功能`：验证 SDK-LOADER 仍含 mobile-share 注入，`IS_COCOS = false`，`initShare` 行为与改造前一致
- [x] 5.3 在浏览器实际打开 Cocos 项目页面：确认 `window.wx === undefined`、`window.MobileShare === undefined`、`window.onMobileShareReady === undefined`，Cocos 引擎正常启动渲染
- [x] 5.4 跑 `[2] 审查现有代码`：Cocos 项目无「分享块缺失 MobileShare 兜底」阻断；非 Cocos 项目仍正确报告该阻断；故意在 Cocos 项目 `index.html` 残留 mobile-share 注入，验证审查抛出 Cocos 专项阻断
- [x] 5.5 在大神 App 内打开 Cocos 项目，触发分享：确认走 Godlike 分支，`onUpdateShareMenu` 被调用，标题/图标正确
- [x] 5.6 在小程序 WebView 内打开 Cocos 项目（若有此场景），触发分享：确认走 `wx.miniProgram.postMessage` 分支，配置传递正确

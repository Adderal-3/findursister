# 子模块 D：CPS 底部栏

> 本文件由 `ds-act-sdk.md` 步骤 7 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> `frontId` 已在编排器步骤 5 按需收集并写入 `sdk.configure()`，本模块无需重复询问。
>
> API 详情见 `{skill_dir}/references/contracts/ds-act-sdk-api.md` 第 4.4 节。
>
> 💡 完整配置项含义可查阅组件文档：https://fe.docs-opd.nie.netease.com/page/ds-act-business-components/cps-universal-bar
> 注意：文档中的 `loginedUser`、`onLogin` 等参数**无需传入**，SDK 已自动处理登录态注入和登录回调，业务侧不需要关心。

---

## D.1 注入 HTML 容器

遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入挂载容器：

```html
<!-- DS Act SDK CPS 底部栏容器 -->
<div id="ds-cps-bar-root"></div>
```

页面根节点需添加底部预留高度（若已有则跳过）：

```css
body { padding-bottom: var(--cps-bar-bottom, 0px); }
```

---

## D.2 生成初始化代码

在 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间追加以下代码：

```javascript
// —— CPS 底部栏（evoke 自带 DsActProvider，自动处理登录态 + frontConfig 拉取）——
window.DsActSdk.CpsUniversalBar.evoke({
  container: '#ds-cps-bar-root',
});
```

> **行为说明：**
> - 所有展示配置（下载链接、按钮模式、菜单等）均由 `frontId` 对应的后台 `frontConfig.cpsUniversalBarConfig.ext` 自动拉取，无需在代码中硬编码
> - SDK 自动注入 `loginedUser.uid`（从 `myGodlikeInfoState`）和 `onLogin`（站内 `ds.openLoginPage`，站外 `universal-login`）
> - 自动注入 CSS 变量 `--cps-bar-bottom`，卸载时清除
> - `appKey` 为空时（frontConfig 未加载或未配置）`return null` 不渲染
> - 内置关闭按钮，点击后隐藏并清除 CSS 变量

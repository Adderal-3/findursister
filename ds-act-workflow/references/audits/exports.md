# EXPORTS 块

**情形 A（ds.js 独立文件）：**
- [ ] `export { userInfo, godlikeInfo, withPrecheck, openSquareUrl }` 语句存在
- [ ] EXPORTS 块位于 `initApp()` 调用之后
- [ ] 消费方脚本有 `type="module"` 属性
- [ ] **window 挂载存在**：`window.withPrecheck`、`window.openSquareUrl`、`window.userInfo`、`window.trackEvent`
- [ ] window 挂载在 `initApp()` 之后、export 语句之前

**情形 B（全部内联，无独立 ds.js）：**
- [ ] DS 初始化代码与业务代码同处一个 `<script type="module">` 块
- [ ] 无需 `DS:EXPORTS` marker
- [ ] DS marker 块顺序在业务逻辑之前（`initApp()` 先于点击绑定）

**React/Vue：**
- [ ] `useDsInit` 返回 `{ userInfo, godlikeInfo, dsInit, initLogin }`
- [ ] `useDsUlink` 返回 `{ openSquareUrl, withPrecheck }`
- [ ] `src/ds.d.ts` 类型声明存在且与 hooks/composables 返回值一致（`Window.ds`、`Window.ns`、`Window.DsUlink`、`Window.MobileShare`、`Window.onDsUlinkReady`、`Window.onMobileShareReady`）

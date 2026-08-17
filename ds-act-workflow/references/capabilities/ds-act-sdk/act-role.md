# 子模块 A：角色绑定

> 本文件由 `ds-act-sdk.md` 步骤 7 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> API 详情见 `{skill_dir}/references/contracts/ds-act-sdk-api.md` 第 4.1 节。

---

## A.1 注入 HTML 容器

遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入挂载容器：

```html
<!-- DS Act SDK 角色绑定容器 -->
<div id="ds-role-root"></div>
```

---

## A.2 生成角色绑定代码

在 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间追加以下代码：

```javascript
// —— 角色绑定（evoke 自带 DsActProvider，自动处理登录态 + actInfo）——
window.DsActSdk.Role.evoke({
  container: '#ds-role-root',
  // placeholder: '请选择角色',  // 可选：未绑角色时的占位文案，默认 "请选择角色"
  // changeIcon: 'https://...',  // 可选：切换角色图标 URL
  // arrowIcon: 'https://...',   // 可选：未绑角色箭头图标 URL
});
```

> **行为说明：**
> - 组件挂载后展示当前已绑角色（图标+昵称+切换箭头）或占位文案
> - 点击 → 自动完成登录预检 → 未绑角时唤起选角弹窗 → 绑定成功后刷新 actInfo
> - 已绑角色且 `actInfo.switchBindingRole === true` 时显示切换入口
> - `actInfo.appKey` 为空时渲染空 div（actInfo 由 evoke 触发的 Provider 自动拉取）

---

## A.3 高级用法：evokeRoleSelection（纯逻辑唤起选角）

若业务逻辑需要**主动触发绑角**（而非通过 Role 组件点击），可使用 `evokeRoleSelection()` 纯函数：

```javascript
// ⚠️ 依赖：evokeRoleSelection 直接读写 dsActStore，需要 actInfo 已就位
// 必须先有一次 UI 组件 .evoke() 调用（Role/TaskModule/CpsUniversalBar 任一），
// 使 DsActProvider 挂载并自动拉取 actInfo，否则 store 为空绑角失败
window.DsActSdk.evokeRoleSelection({
  onBound: function () {
    console.log('[ActSdk] 绑角成功');
  },
});
```

> **API 签名：** `evokeRoleSelection(opts?: { onBound?: () => void }): Promise<void>`
>
> **行为：** 拉取角色列表 → 弹出选角弹窗 → 绑定角色 → 刷新 actInfo
>
> **依赖陷阱：** 此函数不挂载 DsActProvider，依赖 store 里 `actInfoState.appKey` 已就位。若此前无任何 UI `evoke` 调用，store 为空，`fetchRoleList` 拿不到 appKey，绑角失败。**必须先有 UI evoke。**

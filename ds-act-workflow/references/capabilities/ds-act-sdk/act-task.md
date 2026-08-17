# 子模块 B：任务弹窗

> 本文件由 `ds-act-sdk.md` 步骤 7 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> API 详情见 `{skill_dir}/references/contracts/ds-act-sdk-api.md` 第 4.3 节。

---

## B.1 询问面板触发方式

```
任务弹窗通过什么方式触发？

  [A] 自动生成入口按钮（页面右下角悬浮，推荐）
  [B] 页面上已有一个按钮/图标，点它打开面板

输入 A 或 B：
```

选 B 时，额外询问：

```
请描述一下那个按钮/图标长什么样，或者叫什么名字？
（例如："右下角的任务图标"、"顶部导航栏里写着'每日任务'的按钮"）
```

根据用户描述，在页面代码中定位对应元素，提取 CSS 选择器后继续。

```
是否在任务弹窗内展示角色绑定入口？（用户可在弹窗内查看/切换游戏角色）

  [Y] 是（showRole: true）
  [N] 否（默认，不展示）

输入 Y 或 N：
```

---

## B.2 注入 HTML 容器

遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入容器（A 模式还需插入按钮）：

```html
<!-- DS Act SDK 任务弹窗容器 -->
<div id="ds-task-root"></div>
<!-- 仅 A 模式需要，初始隐藏，登录后由 JS 显示 -->
<button id="ds-task-entry-btn" title="任务" style="display:none">任务</button>
```

A 模式还需在 `src/style.css`（不存在则内联到 `<style>`）追加按钮样式：

```css
#ds-task-entry-btn {
  position: fixed; right: 16px; bottom: 80px; z-index: 9999;
  width: 52px; height: 52px; border-radius: 50%; border: none;
  background: #ff6b35; color: #fff; font-size: 12px; font-weight: bold;
  cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.25);
  display: flex; align-items: center; justify-content: center;
}
#ds-task-entry-btn:hover { background: #e55a26; }
```

> **B 模式操作：** 不插入按钮 HTML 和样式，仅保留 `#ds-task-root` 容器。

---

## B.3 生成任务弹窗代码

**`TaskModule.evoke()` 参数说明：**

| 参数 | 是否必填 | 说明 |
|------|---------|------|
| `container` | ✅ 必填 | 面板挂载容器选择器，如 `'#ds-task-root'` |
| `title` | 可选 | 弹窗标题文字，默认 "全部任务" |
| `showRole` | 可选 | 是否在弹窗顶部展示角色选择组件，默认 `false` |
| `showClose` | 可选 | 是否显示关闭按钮，默认 `true` |

> **关键区分：** `evoke()` 是**挂载**，只调用一次；后续**显示面板**通过 `dsActStore.set(taskListPopupState, true)` 控制，两者职责分离。

在 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间追加以下代码：

```javascript
// —— 任务弹窗（evoke 自带 DsActProvider，自动处理登录态 + actInfo）——
window.DsActSdk.TaskModule.evoke({
  container: '#ds-task-root',
  // title: '任务',      // 可选：弹窗标题，默认 "全部任务"
  showRole: __SHOW_ROLE__,
});

// —— A 模式 BEGIN ——
var entryBtn = document.getElementById('ds-task-entry-btn');
if (entryBtn) {
  entryBtn.style.display = 'flex';
  entryBtn.addEventListener('click', function () {
    window.DsActSdk.dsActStore.set(window.DsActSdk.taskListPopupState, true);
  });
}
// —— A 模式 END ——

// —— B 模式 BEGIN（替换 A 模式代码块）——
// var triggerEl = document.querySelector('__TRIGGER_SELECTOR__');
// if (triggerEl) {
//   triggerEl.addEventListener('click', function () {
//     window.DsActSdk.dsActStore.set(window.DsActSdk.taskListPopupState, true);
//   });
// }
// —— B 模式 END ——
```

> **B 模式操作：** 删除 A 模式代码块，取消 B 模式代码块注释，填入选择器。

---

## B.4 填充占位符

| 占位符 | 替换为 |
|--------|--------|
| `__SHOW_ROLE__` | `true`（选 Y）或直接删除该行（选 N） |
| `__TRIGGER_SELECTOR__` | CSS 选择器字符串（仅 B 模式） |

## ADDED Requirements

### Requirement: 自包含参数收集
任务面板子模块 SHALL 自行收集 showRole（是否展示角色）和面板触发方式（A 自动按钮 / B 已有元素），不依赖入口编排器收集这些参数。

#### Scenario: 选择 A 模式
- **WHEN** 用户选择自动生成入口按钮
- **THEN** 模块生成固定悬浮按钮 HTML + 样式 + 点击事件代码

#### Scenario: 选择 B 模式
- **WHEN** 用户选择绑定已有元素
- **THEN** 模块询问元素描述，定位 CSS 选择器，生成对应点击事件代码

---

### Requirement: HTML 容器注入
任务面板子模块 SHALL 在 index.html `</body>` 前插入 `#ds-task-root` 容器和入口按钮（A 模式）。

#### Scenario: 容器和按钮插入
- **WHEN** 模块被加载执行
- **THEN** index.html 中出现 `<div id="ds-task-root"></div>` 和按钮元素（A 模式）

---

### Requirement: 代码追加到 DS:ACT-SDK 块
任务面板子模块 SHALL 将 `initActTask()` 函数和面板 evoke 代码追加到 `DS:ACT-SDK END` 之前。

#### Scenario: 代码追加
- **WHEN** 子模块执行完成
- **THEN** DS:ACT-SDK 块内出现任务面板初始化代码，包含 TaskModule.evoke 调用和面板显示控制

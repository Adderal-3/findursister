## ADDED Requirements

### Requirement: 前置检查
入口编排器 SHALL 在 `index.html` 和 `src/` 中搜索 `ds-act-sdk` / `DsActSdk`，检测是否已接入。

#### Scenario: 未接入
- **WHEN** 未找到 ds-act-sdk 相关代码
- **THEN** 继续执行后续步骤

#### Scenario: 已接入
- **WHEN** 找到 ds-act-sdk 相关代码
- **THEN** 询问用户是否覆盖，用户选否则终止

---

### Requirement: SDK 资源注入
入口编排器 SHALL 在 `index.html` 的 `<head>` 末尾注入 ds-act-sdk 的 CSS 和 JS 文件，确保在 `src/ds.js` 加载之前就位。

#### Scenario: 注入 SDK
- **WHEN** 用户确认继续
- **THEN** index.html head 末尾出现 ds-act-sdk CSS link 和 JS script 标签

---

### Requirement: 共享参数收集
入口编排器 SHALL 收集 actId（必填）、appKey（必填）、squareId（可选）、gameInfo（可选），并支持从 ds.js 中已有常量智能复用。

#### Scenario: 用户填写全部参数
- **WHEN** 用户填入 actId 和 appKey
- **THEN** 参数保存供后续步骤和子模块使用

#### Scenario: 智能复用
- **WHEN** ds.js 中已存在 APP_KEY / SQUARE_ID 常量
- **THEN** 自动读取并提示用户确认复用

---

### Requirement: 功能多选菜单
入口编排器 SHALL 展示功能多选菜单，支持 [A] 任务面板、[B] 回流任务、[C] CPS 通用悬浮栏，用户以字母组合输入选择。

#### Scenario: 多选输入
- **WHEN** 用户输入 "AC"
- **THEN** 选中任务面板和 CPS 通用悬浮栏，不选中回流任务

#### Scenario: 全选
- **WHEN** 用户输入 "ABC"
- **THEN** 三个功能全部选中

---

### Requirement: 按固定顺序加载子模块
入口编排器 SHALL 按 A → B → C 的固定顺序依次读取选中模块的 reference md 文件并执行，用户输入顺序不影响实际执行顺序。

#### Scenario: 输入 CA
- **WHEN** 用户输入 "CA"
- **THEN** 先执行 act-task.md（A），再执行 act-cps-bar.md（C）

---

### Requirement: 生成骨架代码
入口编排器 SHALL 在 `src/ds.js` 末尾生成 `DS:ACT-SDK BEGIN/END` 代码块骨架，包含 sdk 变量声明、configure 调用、登录态检测逻辑。子模块代码追加到 END 之前。

#### Scenario: 骨架生成
- **WHEN** 共享参数收集完成
- **THEN** ds.js 末尾出现 `/* ========== DS:ACT-SDK BEGIN ========== */` 和 `/* ========== DS:ACT-SDK END ========== */`，中间包含 configure 和登录检测代码

---

### Requirement: 汇总完成报告
入口编排器 SHALL 在所有子模块执行完毕后生成汇总完成报告，包含文件变更表格、配置表格、验证方式，仅列出实际选中的功能条目。

#### Scenario: 部分选择
- **WHEN** 用户只选了 A 和 C
- **THEN** 完成报告只包含任务面板和 CPS 通用悬浮栏的变更，不出现回流任务条目

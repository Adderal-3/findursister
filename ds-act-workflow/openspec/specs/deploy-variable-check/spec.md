## ADDED Requirements

### Requirement: 部署变量禁止赋值检测
系统 SHALL 在审查模式（MODE 2）的全局业务代码扫描阶段，检测所有代码文件中是否存在对 `window.DA_SQUARE_ID`、`window.DA_GROUP_ID`、`window.DA_PROJECT_ID` 的赋值操作。匹配模式为 `window\.DA_(SQUARE_ID|GROUP_ID|PROJECT_ID)\s*=`。发现赋值时 SHALL 标记为阻断项，要求用户必须删除。

#### Scenario: 代码中未对部署变量赋值
- **WHEN** 审查模式执行全局业务代码扫描
- **AND** 所有代码文件中均未发现 `window.DA_SQUARE_ID =`、`window.DA_GROUP_ID =`、`window.DA_PROJECT_ID =` 的赋值
- **THEN** 审查报告中"部署变量禁止定义检测"三项均显示 ✅ 未发现
- **AND** 审查流程正常继续

#### Scenario: 代码中对部署变量赋值
- **WHEN** 审查模式执行全局业务代码扫描
- **AND** 在某文件中发现 `window.DA_SQUARE_ID = "xxx"` 赋值
- **THEN** 审查报告中"部署变量禁止定义检测"对应项显示 ❌ 发现，并标注位置
- **AND** 该项标记为阻断项，要求用户必须删除该赋值

#### Scenario: 多个部署变量被赋值
- **WHEN** 审查模式执行全局业务代码扫描
- **AND** 在代码中发现对 `window.DA_SQUARE_ID` 和 `window.DA_GROUP_ID` 的赋值
- **THEN** 审查报告中两个对应项均显示 ❌ 发现，并分别标注位置
- **AND** 两项均标记为阻断项

### Requirement: 审查规则文件新增检查项
`references/audit-rules.md` 的 SDK-LOADER 块 SHALL 包含一条检查项：禁止对 `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID` 赋值，并注明这些变量由部署平台注入。

#### Scenario: audit-rules.md 包含禁止赋值检查项
- **WHEN** 审查模式读取 `audit-rules.md` 执行 SDK-LOADER 块校验
- **THEN** 校验项中包含"禁止定义 `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID`"的检查规则
- **AND** 该规则注明变量由部署平台注入，代码中不得赋值

### Requirement: 审查报告模板包含检测结果展示
审查报告模板的"已知错误检测"表格 SHALL 包含部署变量赋值的检测行，"全局扫描结果"部分 SHALL 包含"部署变量禁止定义检测"结果表格。

#### Scenario: 已知错误检测表格包含部署变量行
- **WHEN** 审查模式输出审查报告
- **THEN** "已知错误检测"表格中包含"代码中定义了 `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID`"的检测行

#### Scenario: 全局扫描结果包含部署变量检测表格
- **WHEN** 审查模式输出审查报告
- **THEN** "全局扫描结果"部分包含"部署变量禁止定义检测"表格
- **AND** 表格逐项列出 `window.DA_SQUARE_ID`、`window.DA_GROUP_ID`、`window.DA_PROJECT_ID` 的检测状态

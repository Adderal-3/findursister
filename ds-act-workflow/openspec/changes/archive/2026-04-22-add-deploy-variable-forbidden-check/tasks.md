## 1. 审查规则文件更新

- [ ] 1.1 在 `references/audit-rules.md` 的 SDK-LOADER 块中，在"三个维度值引用 `window.DA_*`"规则之后新增检查项：**禁止定义** `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID`（这些变量由部署平台注入，代码中不得赋值/声明，否则会导致日志异常）

## 2. SKILL.md 审查流程更新

- [ ] 2.1 在步骤 4.5 中新增 **4.5.1 部署变量禁止定义检测**子步骤，包含：扫描所有代码文件中 `window.DA_*=` 的赋值模式（`window\.DA_(SQUARE_ID|GROUP_ID|PROJECT_ID)\s*=`），注明变量由部署平台注入、严禁对 window 同名属性赋值，发现赋值必须要求用户删除
- [ ] 2.2 将原 4.5.1 重复逻辑检测编号改为 4.5.2，原 4.5.2 点击预检检查编号改为 4.5.3，步骤描述从"两项检查"改为"三项检查"

## 3. SKILL.md 审查报告模板更新

- [ ] 3.1 在"已知错误检测"表格中新增行：`代码中定义了 window.DA_SQUARE_ID / window.DA_GROUP_ID / window.DA_PROJECT_ID（部署平台注入，禁止代码定义）`
- [ ] 3.2 在"全局扫描结果"中新增"部署变量禁止定义检测"表格，逐项列出三个变量的检测状态，并附警告说明

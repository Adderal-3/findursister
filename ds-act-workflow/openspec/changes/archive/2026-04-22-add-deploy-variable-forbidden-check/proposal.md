## Why

`window.DA_SQUARE_ID`、`window.DA_GROUP_ID`、`window.DA_PROJECT_ID` 这三个变量由部署平台在发布时自动注入，代码中如果对它们赋值，会覆盖部署注入的值，导致 NS 日志的 dimension95/96/97 维度数据异常。当前审查流程缺少对此类赋值的检测，需要新增禁止定义检查。

## What Changes

- 在 `audit-rules.md` 的 SDK-LOADER 块中新增检查项：禁止对 `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID` 赋值
- 在 `SKILL.md` 审查步骤 4.5 中新增"4.5.1 部署变量禁止定义检测"，扫描所有代码文件中 `window.DA_*=` 的赋值模式
- 在 `SKILL.md` 审查报告的"已知错误检测"表格中新增对应检测行
- 在 `SKILL.md` 审查报告的"全局扫描结果"中新增"部署变量禁止定义检测"结果展示表格

## Capabilities

### New Capabilities
- `deploy-variable-check`: 审查流程中检测代码是否对部署平台注入的 `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID` 进行赋值，发现则阻断并要求删除

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- `references/audit-rules.md`：SDK-LOADER 块新增 1 条检查规则
- `SKILL.md`：步骤 4.5 新增子步骤、审查报告模板新增检测项和结果展示
- 审查流程行为变更：发现 `window.DA_*=` 赋值时标记为阻断项，必须删除

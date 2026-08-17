## Why

当前 ds-act-skills 的注入模式对所有检测到的点击事件无差别包裹 `withPrecheck`，但实际业务中只有涉及核心流程（游戏入口、抽奖、领奖等）的点击才需要预检（登录+拉起APP），而活动规则、弹窗关闭、Tab 切换等纯 UI 交互不需要也不应该包裹。同时，审查模式的文件范围只包含 DS 注入文件，导致重复逻辑检测和点击预检检查这两条规则无法实际执行——规则与执行之间存在不一致。

## What Changes

- **BREAKING** 注入步骤 0（项目探索）：点击事件检测从"无差别列出"改为"启发式标注建议（🔴建议包裹/🟢可不包裹/🟡需确认）+ 用户交互选择"
- **BREAKING** 注入步骤 6（自动修复 Click Handler）：从"全部自动包裹"改为"只包裹用户确认的点击事件"
- 审查步骤 1（确定审查目标文件）：增加"全局扫描"说明——重复逻辑检测和点击预检检查需扫描全部业务代码文件，不限于 DS 注入文件列表
- 审查规则 CLICK-PRECHECK 块：从"所有点击均通过 withPrecheck 包裹，无裸 handler"改为"需预检的点击已包裹，未包裹的经用户确认无需预检"
- 审查规则 重复逻辑检测：明确需全局扫描业务代码文件
- React/Vue 审查文件列表：补充 `src/ds.d.ts`

## Capabilities

### New Capabilities
- `click-precheck-selection`: 点击事件预检选择机制——注入时启发式标注+用户交互选择哪些点击需要 withPrecheck 包裹，审查时重新扫描+交互确认

### Modified Capabilities
- `audit-scope`: 审查模式的文件范围从"仅 DS 注入文件"扩展为"DS 注入文件 + 全局业务代码扫描（重复逻辑+点击预检）"

## Impact

- **SKILL.md**: 注入模式步骤 0、步骤 6 的描述需重写；审查模式步骤 1、步骤 5 需调整
- **references/audit-rules.md**: CLICK-PRECHECK 块规则需修改；重复逻辑检测需明确全局扫描；EXPORTS 块补充 ds.d.ts 检查
- **references/html.md**: 步骤 1.3（点击事件检测）和步骤 6（自动修复）需调整
- **references/react.md**: 步骤 1.3、步骤 7 需调整
- **references/vue.md**: 步骤 1.3、步骤 7 需调整

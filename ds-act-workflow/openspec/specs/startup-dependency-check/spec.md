## ADDED Requirements

### Requirement: 依赖技能启动前置检查
系统 SHALL 在用户选择模式之前，逐一调用 `use_skill` 检测 `appkey-naming`、`dsjssdk`、`html-security-scan` 三个依赖技能是否可用。任何一个不可用 SHALL 立即阻断流程。

#### Scenario: 所有依赖技能可用
- **WHEN** 用户启动 ds-act-skills 技能
- **AND** 三个依赖技能均可通过 `use_skill` 成功加载
- **THEN** 输出检查结果，显示三个技能均为 ✅ 可用
- **AND** 正常进入模式选择步骤

#### Scenario: 任意依赖技能不可用
- **WHEN** 用户启动 ds-act-skills 技能
- **AND** 任一依赖技能通过 `use_skill` 加载失败
- **THEN** 输出检查结果，标注不可用的技能为 ❌
- **AND** 显示该技能的下载链接
- **AND** 阻断流程，提示用户安装后重新运行 /ds-act-skills

#### Scenario: 多个依赖技能不可用
- **WHEN** 用户启动 ds-act-skills 技能
- **AND** 多个依赖技能不可用
- **THEN** 输出检查结果，逐一标注每个不可用的技能及下载链接
- **AND** 阻断流程

### Requirement: 检查时机
系统 SHALL 在"零、技能依赖说明"之后、"一、模式选择"之前执行依赖检查。

#### Scenario: 检查在模式选择前执行
- **WHEN** 用户启动 ds-act-skills 技能
- **THEN** 依赖检查在展示模式选择菜单之前完成
- **AND** 用户在选择模式时已确认所有依赖可用

#### Scenario: 小程序环境下预检跳过 ulink（新增场景）
- **WHEN** precheck 预检在微信小程序 WebView 环境下执行
- **THEN** 跳过 ulink 跳转 App 逻辑
- **AND** 预检正常通过

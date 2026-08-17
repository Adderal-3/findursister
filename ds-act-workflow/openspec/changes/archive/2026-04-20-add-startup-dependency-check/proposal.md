## Why

当前 `ds-act-skills` 依赖三个子技能（`appkey-naming`、`dsjssdk`、`html-security-scan`），但仅在"零、技能依赖说明"中以静态文档形式列出。用户启动技能后不会立即检测依赖是否可用，可能一路操作到中途才发现依赖缺失，体验差且浪费时间。需要在技能启动时主动检测依赖技能是否可用，缺失时立即阻断并给出下载指引。

## What Changes

- 在"一、模式选择"之前，新增"步骤 0.5：依赖技能前置检查"步骤
- 启动时逐一调用 `use_skill` 检测 `appkey-naming`、`dsjssdk`、`html-security-scan` 三个技能是否可用
- 任何一个技能缺失 → 立即阻断流程，不允许继续
- 缺失时给出下载链接，提示用户安装后重新运行

## Capabilities

### New Capabilities
- `startup-dependency-check`: 启动时前置检查依赖技能是否可用，缺失时立即阻断并提示下载

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **SKILL.md**: 在"零、技能依赖说明"和"一、模式选择"之间插入新的检查步骤
- **用户体验**: 启动时即可发现依赖缺失，避免中途失败
- **流程变更**: 任何依赖缺失即阻断，需用户安装后重新运行

## ADDED Requirements

### Requirement: physics 启用判定按优先级链

执行 `references/cocos-vite-integration.md` 步骤 1 判定 physics 是否启用时，skill SHALL 按以下优先级顺序决策，命中即停：(1) main 文件中 grep `CC_PHYSICS_BUILTIN` 或 `CC_PHYSICS_CANNON`；(2) `index.html` 末尾内联 `<script>` 块含 `loadScript(... 'physics...', window.boot)`；(3) 前两步都未命中且 physics 文件存在，提示用户人工确认；(4) 前两步都未命中且 physics 文件不存在，判定为不启用。skill SHALL NOT 把 `_CCSettings` 作为 physics 启用的信号源。

#### Scenario: main 文件命中 CC_PHYSICS_BUILTIN

- **WHEN** main 文件中 grep `CC_PHYSICS_BUILTIN` 找到引用
- **THEN** skill 判定 physics 为启用，停止后续判定

#### Scenario: HTML 内联块命中 loadScript physics

- **WHEN** main 文件中 grep `CC_PHYSICS_*` 都未找到，但 `index.html` 内联块含 `loadScript(... 'physics...', window.boot)`
- **THEN** skill 判定 physics 为启用，停止后续判定

#### Scenario: 兜底人工确认

- **WHEN** main 文件 grep 与 HTML 内联块都未命中，但 physics 文件存在于项目根目录
- **THEN** skill 提示用户人工确认是否启用，避免漏装

#### Scenario: 不启用判定

- **WHEN** main grep 与 HTML 内联块都未命中，且 physics 文件不存在
- **THEN** skill 判定 physics 为不启用，entry.js 不含任何 physics 相关 import

### Requirement: physics 不存在但启用信号命中报错退出

skill SHALL 在 physics 文件不存在但优先级判定 1 或 2 命中（grep CC_PHYSICS_* 或 HTML 内联 loadScript physics）时报错退出，提示"导出不完整"，不允许带着 physics 启用信号进入步骤 2。

#### Scenario: 启用信号但文件缺失

- **WHEN** main 文件 grep `CC_PHYSICS_BUILTIN` 命中但项目根目录不存在 `physics*.js` 文件
- **THEN** skill 报错退出"导出不完整：检测到 physics 启用信号但 physics 文件缺失"

### Requirement: 排错章节说明 physics 误判修复路径

`references/cocos-vite-integration.md` 排错章节 SHALL 包含一条针对"settings 文件里没找到 CC_PHYSICS_*，被判成不启用，但实际项目用物理引擎"的诊断条目，明确指出 `CC_PHYSICS_*` 由 Cocos 编译期注入到 main 文件不在 settings 里，并指引读者按步骤 1 的优先级判定重新执行。

#### Scenario: 排错章节存在 physics 误判条目

- **WHEN** 用户在文档排错章节查找 physics 误判
- **THEN** 文档存在该条目，包含信号源澄清（main 文件而非 settings）与修复路径（按优先级判定）

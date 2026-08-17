## ADDED Requirements

### Requirement: 编排器集中收集所有子模块配置

`ds-act-sdk.md` 步骤 4（功能多选）完成后，编排器 SHALL 在步骤 5 中一次性收集所有选中功能所需的配置参数，包括触发方式、showRole、asId、frontId 等，再进入代码生成步骤。

#### Scenario: 仅选 A（任务面板），无 CPS 下载任务

- **WHEN** 用户选择功能 A，步骤 5 开始
- **THEN** 编排器依次询问：触发方式（A/B）→ showRole（Y/N）→ 是否有 CPS 下载任务（Y/N，选 N）
- **THEN** 不询问 frontId

#### Scenario: 选 A 且有 CPS 下载任务

- **WHEN** 用户选择功能 A，步骤 5 开始，用户确认有 CPS 下载任务
- **THEN** 编排器在问完 showRole 后询问是否有 CPS 下载任务，用户选 Y
- **THEN** 检查骨架代码中 `sdk.configure()` 是否已配置 frontId
- **THEN** 未配置时引导用户填入 frontId 并写入骨架代码

#### Scenario: 同时选 A（有 CPS 下载任务）和 C，frontId 只询问一次

- **WHEN** 用户选择功能 A + C，步骤 5 中 A 环节收集了 frontId
- **THEN** C 环节检查 frontId 时发现已配置，直接跳过，不重复询问

#### Scenario: 仅选 B（回流任务）

- **WHEN** 用户选择功能 B，步骤 5 开始
- **THEN** 编排器依次询问：asId → 触发时机（A 登录后 / B 点击 / C 手动）
- **THEN** 触发时机选 B 时额外询问触发元素描述并提取选择器

#### Scenario: 仅选 C（CPS 通用悬浮栏）

- **WHEN** 用户选择功能 C，步骤 5 开始
- **THEN** 编排器检查 frontId 是否已配置（步骤 3 或 A 环节）
- **THEN** 未配置时引导用户填入 frontId

---

### Requirement: 子模块为纯代码生成，无用户交互

`act-task.md`、`act-task-checker.md`、`act-cps-bar.md` 三个子模块 SHALL 不包含任何向用户询问配置的步骤，所有参数均由编排器在步骤 5 收集完毕后传入。

#### Scenario: act-task.md 直接按参数生成代码

- **WHEN** 编排器加载 act-task.md 时，触发方式 / showRole / frontId 已确定
- **THEN** act-task.md 直接执行 HTML 容器注入 → 代码生成 → 占位符填充，无交互步骤

#### Scenario: act-task-checker.md 直接按参数生成代码

- **WHEN** 编排器加载 act-task-checker.md 时，asId / 触发时机 / 选择器已确定
- **THEN** act-task-checker.md 直接执行代码生成 → 占位符填充，无交互步骤

#### Scenario: act-cps-bar.md 直接按参数生成代码

- **WHEN** 编排器加载 act-cps-bar.md 时，frontId 已确认配置
- **THEN** act-cps-bar.md 直接执行 HTML 容器注入 → evoke 代码生成，无交互步骤

---

### Requirement: frontId 在整个流程中最多询问一次

整个 MODE 6 流程 SHALL 确保 frontId 配置最多被用户填写一次，无论选择了多少个需要 frontId 的功能。

#### Scenario: 多功能同时需要 frontId

- **WHEN** 用户选择了多个需要 frontId 的功能（如 A 有 CPS 下载任务 + C）
- **THEN** frontId 在第一个需要时被询问并写入骨架代码
- **THEN** 后续功能检测到已配置后直接复用，不再询问

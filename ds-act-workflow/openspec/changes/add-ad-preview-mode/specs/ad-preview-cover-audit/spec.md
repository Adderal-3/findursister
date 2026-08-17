## ADDED Requirements

### Requirement: 遮罩残留审查规则接入主审查链
系统 SHALL 在审查规则加载清单（`references/audits/index.md`）中新增"互动广告调试遮罩残留审查"，作为**始终触发**项（无条件扫描所有 HTML，不限于已接入大神的页面），对应规则文件 `references/audits/ad-preview-cover.md`。

#### Scenario: 审查链加载遮罩残留规则
- **WHEN** 执行 mode 2 审查或 mode 3 部署前置审查
- **THEN** 系统始终加载并执行遮罩残留审查规则
- **AND** 扫描范围覆盖项目内所有 HTML 文件

### Requirement: 残留遮罩阻断
系统 SHALL 扫描所有 HTML，检测是否残留 marker `[DS:AD-PREVIEW-COVER:START]` / `[DS:AD-PREVIEW-COVER:END]` 或 class `ds-act-ad-preview-cover`。检测到任一即 SHALL 标记为 🔴 阻断项，提示用户运行 mode 8 移除遮罩。

#### Scenario: 检测到遮罩残留
- **WHEN** 审查扫描发现 `ds-act-ad-preview-cover` class 或 `[DS:AD-PREVIEW-COVER]` marker
- **THEN** 系统输出 🔴 阻断项"调试遮罩未移除，禁止部署"
- **AND** 提示用户运行 mode 8 移除遮罩后重试

#### Scenario: 无遮罩残留
- **WHEN** 审查扫描未发现任何遮罩 marker 或 class
- **THEN** 该项通过，不影响审查结论

### Requirement: 审查不反向引导适配
残留遮罩审查 SHALL 只执行"扫描残留 → 提示删除 → 阻断"，MUST NOT 在审查输出中包含安全区适配引导或适配 prompt。

#### Scenario: 阻断输出不含适配引导
- **WHEN** 审查检测到遮罩残留并阻断
- **THEN** 输出仅包含删除提示与阻断说明
- **AND** 不包含任何安全区适配引导或 prompt 文案

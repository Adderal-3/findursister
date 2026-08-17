## ADDED Requirements

### Requirement: 审查规则索引文件

`references/audit-rules.md` SHALL 作为审查规则的主入口索引文件，包含一份"加载清单"，按审查模式应执行的顺序列出每个审查模块对应的子文档路径与加载条件。

#### Scenario: 索引文件包含加载清单

- **WHEN** 审查模式（`references/audit.md` 步骤 2）读取 `references/audit-rules.md`
- **THEN** 文件中存在一份按顺序排列的加载清单，覆盖：SDK-LOADER、CONFIG、JSSDK、NS 日志、分享、Ulink、CLICK-PRECHECK、EXPORTS、HTML 加载顺序、HTML 安全审查、小程序支持、wx 调用前置检查、导航栏、DS:ACT-SDK 块审查、服务端存储专项共 15 个模块的子文档路径

#### Scenario: 索引文件标注条件触发模块

- **WHEN** 索引清单中列出小程序支持审查、导航栏审查、DS:ACT-SDK 块审查这三个条件触发模块
- **THEN** 清单中明确各自的触发条件（分别为：检测到 `isWechatMiniProgram` 函数、检测到 `[DS:NAV-BAR:START]` marker 或 `DsNavigationMiniProgramBar` 字样、检测到 `/* ========== DS:ACT-SDK BEGIN ==========` 标记）

#### Scenario: 索引文件不包含具体规则正文

- **WHEN** 维护者打开 `references/audit-rules.md`
- **THEN** 文件中不再包含具体的检查项条目（`- [ ]` 列表）、报告模板、结构示例等正文内容；所有规则正文位于 `references/audits/<module>.md` 子文件

### Requirement: 审查规则子文档目录

`references/audits/` 目录 SHALL 存在并包含每个审查模块的独立子文档，文件命名使用 kebab-case 且与原章节标题一一对应。

#### Scenario: 子文档目录与文件清单

- **WHEN** 列出 `references/audits/` 目录内容
- **THEN** 目录中存在以下文件：`sdk-loader.md`、`config.md`、`jssdk.md`、`ns-log.md`、`share.md`、`ulink.md`、`click-precheck.md`、`exports.md`、`html-load-order.md`、`server-storage.md`、`html-security.md`、`miniapp.md`、`wx-call-guard.md`、`nav-bar.md`、`act-sdk.md`

#### Scenario: 子文档内容来自原 audit-rules.md 原文剪切

- **WHEN** 对比迁移前的 `references/audit-rules.md` 与迁移后所有子文档之和
- **THEN** 每个审查模块的检查项条目（`- [ ]` 列表）、示例代码块、表格、严重程度标识完整保留在对应的子文档中，无新增也无删除

### Requirement: 审查模式行为契约保持不变

审查模式（`references/audit.md`）通过读取索引文件加载所有适用子文档后，其执行步骤、检查项总数、阻断/警告分级、报告模板 SHALL 与重构前完全一致。

#### Scenario: 审查项数量与分级保持一致

- **WHEN** 同一被审查项目在重构前后分别运行审查模式
- **THEN** 输出报告中的阻断项条目、警告项条目、通过项统计、"已知错误检测"表格行数完全一致

#### Scenario: 条件触发模块按命中条件加载

- **WHEN** 被审查项目命中条件触发条件（例如代码中存在 `isWechatMiniProgram`）
- **THEN** 审查模式加载 `references/audits/miniapp.md` 并执行其中所有检查项；未命中的条件触发模块对应子文档不被加载也不参与判定

#### Scenario: 服务端存储专项作为独立入口被复用

- **WHEN** `references/game-data.md` 或 `references/server-storage/04-cms-register.md` 引导执行第 6 步代码审查
- **THEN** 审查执行流通过 `references/audit-rules.md` 索引加载 `references/audits/server-storage.md` 子文档，A 档/B 档/C 档分级与原章节完全一致

### Requirement: 调用方文档零改动

所有现有以 `references/audit-rules.md` 为入口的 reference 文档（包括但不限于 `audit.md`、`inject.md`、`deploy.md`、`game-data.md`、`server-storage/04-cms-register.md`）SHALL 保持原有引用文本不变。

#### Scenario: 调用方引用文本未被修改

- **WHEN** 对比重构前后的 `references/audit.md`、`references/inject.md`、`references/deploy.md`、`references/game-data.md`、`references/server-storage/04-cms-register.md`
- **THEN** 这五份文件中关于审查规则的引用路径（`{skill_dir}/references/audit-rules.md`）保持不变，仅 `CLAUDE.md` 第 37 行/第 77 行的维护说明可同步更新

### Requirement: 维护说明同步更新

`CLAUDE.md` 中关于审查规则维护方法的说明 SHALL 同步更新，指引维护者按"具体规则改子文档、加载顺序与触发条件改索引"的方式工作。

#### Scenario: CLAUDE.md 第 77 行维护说明已更新

- **WHEN** 阅读 `CLAUDE.md` 中"审查规则变更"相关段落
- **THEN** 文本明确指出："具体规则改 `references/audits/<module>.md`，加载顺序与条件触发改 `references/audit-rules.md`（索引文件）"

#### Scenario: CLAUDE.md 第 37 行表格描述已更新

- **WHEN** 阅读 `CLAUDE.md` 中描述 `references/audit-rules.md` 用途的表格行
- **THEN** 该行描述改为"审查规则索引（指向 audits/）"或语义等价表达

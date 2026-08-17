### Requirement: mini-game-data-sdk 最低版本由 act 域名事故防护决定

本 skill SHALL 把 `mini-game-data-sdk` 的最低允许版本定义为「能正确识别 `act.ds.163.com` 投放域名的版本」（当前为 `0.2.1`）。该最低版本 SHALL 作为全仓库统一基线，固化在 `references/audits/server-storage.md` 与 `references/audits/common-table.md` 的审查门禁条目中，并由代码生成模板（`references/server-storage/*`、`references/capabilities/game-storage.md`）的 CDN 字符串一致引用。最低版本的具体数值变更不需要修改本 spec（本 spec 只 pin 行为契约与原因，不 pin 版本号字符串）。

#### Scenario: 最低版本与 references 文档一致

- **WHEN** 读取 `references/audits/server-storage.md` 与 `references/audits/common-table.md` 中的版本门禁条目
- **THEN** 两处声明的最低版本数值完全一致，且与 `references/server-storage/02-best-practices.md`、`99-api-reference.md`、`common-table/00-triage.md`、`common-table/04-code-gen.md`、`common-table/99-api-reference.md`、`references/capabilities/game-storage.md` 中 CDN 模板字符串引用的版本号一致

#### Scenario: 域名识别需求驱动最低版本

- **WHEN** 维护者评估是否需要 bump 最低版本
- **THEN** 决策依据为「新版本是否修复了影响 `act.ds.163.com` 投放的域名识别问题」或「新版本是否引入了影响 act 域名投放的新 breaking change」

### Requirement: 审查阶段硬阻断低于最低版本的 SDK 引用

审查模式 SHALL 对任何引入 `mini-game-data-sdk` 的项目执行版本门禁：CDN 路径版本号 `< 最低版本` → 硬阻断，与项目是否用到 `table*` 能力无关、与项目是否投放 `act.ds.163.com` 无关（静态审查无法判断投放域名，必须全量阻断）。阻断 SHALL 同时覆盖 `references/audits/server-storage.md`（用户维度存储审查）与 `references/audits/common-table.md`（公共表审查）两个入口，避免漏检。

#### Scenario: 版本低于最低版本即阻断

- **WHEN** 审查扫描到 HTML 中存在 `mini-game-data-sdk/<v>` 的 CDN 引用且 `v < 最低版本`
- **THEN** 审查报告输出硬阻断项，不进入通过状态，无论项目是否实际用到 `table*` 接口或是否计划投放 act 域名

#### Scenario: 公共表审查与用户存储审查共用同一门禁

- **WHEN** 项目同时引入用户维度存储与公共表
- **THEN** `references/audits/server-storage.md` 与 `references/audits/common-table.md` 的版本门禁条目使用同一最低版本数值，不重复报错（公共表审查条目注明「与用户存储审查共用」）

#### Scenario: 版本等于或高于最低版本通过

- **WHEN** 审查扫描到 CDN 版本号 `≥ 最低版本`
- **THEN** 版本门禁条目通过，不输出阻断或警告

### Requirement: 审查阻断文案不含技术术语

审查阻断文案 SHALL 面向运营/开发同学，不包含「路由未修复 / 请求内网 / TypeError / table* 接口缺失 / 域名识别逻辑」等 SDK 内部实现术语。文案 SHALL 只说明「不升级的话，小游戏投放到 act.ds.163.com 域名会有问题」，并给出可直接操作的新 CDN 地址。

#### Scenario: 文案不出现技术术语

- **WHEN** 读取 `references/audits/server-storage.md` 与 `references/audits/common-table.md` 的版本门禁阻断输出文案
- **THEN** 文案中不含「路由」「内网」「TypeError」「table*」「接口缺失」「域名识别」等术语，仅说明「投放到 act.ds.163.com 域名会有问题」并给出新版本 CDN 地址

#### Scenario: 文案给出可操作升级步骤

- **WHEN** 审查输出版本阻断项
- **THEN** 文案包含「把 HTML 里 CDN 地址版本号改成 <最低版本>」的明确指引，并附上新版本完整 CDN URL；若项目可能残留 `index.css` 的 `<link>`，文案同步提示删除（0.2.0 起已不需要样式表）

### Requirement: 开发期 autofix 老项目 SDK 版本

mode 5-B intake 阶段 SHALL 检测 HTML 中 `mini-game-data-sdk/<v>` 的 CDN 引用：若 `v < 最低版本`，默认自动把所有相关 CDN 地址的版本号改为最低版本，并向用户输出升级说明后询问「是否保留此升级」。用户拒绝 → 回滚 CDN 字符串到原版本并提示「审查阶段仍会阻断」。autofix 触发条件 SHALL 为范围匹配（`v < 最低版本`），不限于精确匹配某一旧版本，以覆盖 0.1.x / 0.2.0 等所有老项目进 mode 5-B 升级的场景。

#### Scenario: 老项目默认 autofix 升级

- **WHEN** mode 5-B intake 检测到 HTML 中存在 `mini-game-data-sdk/<v>` 且 `v < 最低版本`
- **THEN** 流程默认自动把所有 CDN 地址版本号改为最低版本，输出升级说明（含修改文件清单），并询问用户是否保留

#### Scenario: 用户拒绝 autofix 则回滚并提示

- **WHEN** 用户在 autofix 询问中选择拒绝保留升级
- **THEN** 流程回滚 CDN 字符串到原版本，输出提示「已回滚。审查阶段仍会因版本 < 最低版本而阻断，建议尽快升级」，然后继续后续 intake 流程（不强制阻断）

#### Scenario: 新项目无需 autofix

- **WHEN** mode 5-B intake 判定为新接入（项目无 `game-server-storage.js` 且 HTML 无 `mini-game-data-sdk` 引用）
- **THEN** 代码生成阶段直接注入最低版本 CDN，不触发 autofix 逻辑

#### Scenario: 版本已达标不触发 autofix

- **WHEN** mode 5-B intake 检测到 HTML 中 `mini-game-data-sdk/<v>` 且 `v ≥ 最低版本`
- **THEN** 不触发 autofix，流程继续

### Requirement: 代码生成模板使用最低版本

所有 mode 5-B / 公共表代码生成模板（`game-server-storage.js` / `game-common-table.js` 的 SDK 引入示例、`references/server-storage/*` 与 `references/capabilities/game-storage.md` 的 CDN 字符串）SHALL 引用最低版本，不引用 `latest` 或其他版本。新项目生成的 HTML 中 SDK CDN 版本号 SHALL 等于审查门禁的最低版本，避免「生成 0.2.0、审查又因 0.2.0 阻断」的悖论。

#### Scenario: 模板版本与门禁版本一致

- **WHEN** 读取 `references/server-storage/02-best-practices.md`、`99-api-reference.md`、`common-table/00-triage.md`、`common-table/04-code-gen.md`、`common-table/99-api-reference.md`、`references/capabilities/game-storage.md` 中的 SDK CDN 字符串
- **THEN** 所有 CDN URL 路径中的版本号一致，且等于 `references/audits/server-storage.md` 与 `references/audits/common-table.md` 门禁声明的最低版本

#### Scenario: 新项目生成代码即达标

- **WHEN** mode 5-B 为新项目生成 `game-server-storage.js` 与 HTML SDK 引入
- **THEN** 生成的 CDN 版本号等于最低版本，项目无需手动调整即可通过审查

### Requirement: index.css 残留检测保留

审查 SHALL 保留「检测 `mini-game-data-sdk/${version}/index.css` 的 `<link>` 残留并阻断要求删除」的条目。该条目原因（0.2.0 起 SDK 不再附带样式表，CSS 会污染宿主页面）在 0.2.1 仍然成立，不随版本 bump 改变。

#### Scenario: 残留 index.css 仍阻断

- **WHEN** 审查扫描到 HTML 中存在 `mini-game-data-sdk/<v>/index.css` 的 `<link>` 标签
- **THEN** 审查报告输出阻断项，要求删除该 `<link>`，无论 SDK JS 版本号是否达标

## Why

当前 `references/audit-rules.md` 单文件容纳了 SDK-LOADER、CONFIG、JSSDK、NS 日志、分享、Ulink、CLICK-PRECHECK、EXPORTS、HTML 加载顺序、服务端存储、HTML 安全、小程序、wx 调用、导航栏、DS:ACT-SDK 等十多个独立审查模块，行数已超 440 行。新增/修改某一模块的规则时改动面广、阅读跳转困难、冲突概率高，长期维护性下降。

## What Changes

- 新建 `references/audits/` 目录，将 `audit-rules.md` 中按"块"组织的审查规则拆分为多个独立子文档，每个模块（SDK-LOADER、CONFIG、JSSDK、NS 日志、分享、Ulink、CLICK-PRECHECK、EXPORTS、HTML 加载顺序、服务端存储、HTML 安全、小程序、wx 调用、导航栏、DS:ACT-SDK）一份 md。
- 将原 `references/audit-rules.md` 改造为**主入口索引文件**：保留章节顺序与触发条件描述（如 `isWechatMiniProgram` / `[DS:NAV-BAR:START]` / `DS:ACT-SDK BEGIN` 三个条件触发节点的判定语义），通过指向 `audits/<module>.md` 的清单告诉模型按顺序加载并执行所有适用规则。
- `references/audit.md`（审查模式主流程）继续读取 `audit-rules.md`，由后者动态指引读取 `audits/` 下各子文件；审查模式行为、覆盖范围、阻断/警告判定、输出报告模板**保持完全一致**，对调用方零感知。
- 不修改 `audit.md` 步骤 1–6 的执行顺序、不修改任何具体审查规则的判定标准、不修改其它任何引用 `audit-rules.md` 的 reference 文档（如 `game-data.md`、`server-storage/04-cms-register.md`）的外部表现。

## Capabilities

### New Capabilities
- `audit-rules-modular`: 审查规则的模块化目录结构与主入口索引契约 — 规定 `audit-rules.md` 作为索引、`audits/<module>.md` 为每个审查块的独立来源、条件触发模块的加载语义、审查模式遍历加载顺序保持与原单文件一致。

### Modified Capabilities

（无现有 spec 的具体规则需要修改 — 各 capability spec 描述的均是审查"内容/规则"，本次仅改"组织结构"。`deploy-variable-check`、`cocos-mobileshare-skip`、`wx-existence-guard` 等 spec 中"`references/audit-rules.md` 的 XX 块 SHALL …"语义不变，规则物理位置迁移到 `audits/<module>.md` 子文件，主入口索引文件确保仍可被审查模式整体加载到。）

## Impact

- **修改文件**：
  - `references/audit-rules.md`：改造为索引（保留触发判定、移除具体规则正文）。
  - `references/audits/*.md`：新增 14 份左右子文档（按当前块划分）。
  - `CLAUDE.md` 第 77 行的提示语（"审查规则变更：只改 `references/audit-rules.md`"）需补充："具体规则改 `references/audits/<module>.md`，索引/触发逻辑改 `audit-rules.md`"。
- **不修改**：`references/audit.md`、`references/inject.md`、`references/deploy.md`、`references/game-data.md`、`references/server-storage/04-cms-register.md` 等所有以"读取 `audit-rules.md`"为入口的调用方文档 — 它们继续走索引文件入口，零改动。
- **审查模式行为契约保持不变**：所有原检查项（阻断项/警告项/通过项）、报告模板、Cocos 豁免、条件触发块（小程序/导航栏/DS:ACT-SDK）、全局业务代码扫描（步骤 4.5）逻辑完全不变。
- **风险**：拆分过程中漏字、误拆分边界（如服务端存储专项中的 A/B/C 档分级）将影响审查输出。设计阶段用"逐块直接迁移、不做内容改写"约束规避；任务步骤包含逐块 diff 校对。

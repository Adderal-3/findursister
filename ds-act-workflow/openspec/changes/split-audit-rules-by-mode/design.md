## Context

`references/audit-rules.md` 目前是单文件容纳 14+ 个独立审查块的"巨石"文档（440+ 行），通过 `references/audit.md` 在审查模式步骤 2 整体读取并按章节顺序核查。本次重构只调整文件组织，不动审查行为。

调用入口固定为：
- `references/audit.md` 步骤 2、4 显式 `读取 {skill_dir}/references/audit-rules.md`。
- `references/game-data.md`、`references/server-storage/04-cms-register.md` 显式 `读取 {skill_dir}/references/audit-rules.md（服务端存储专项节）`。

所有调用方均以 `audit-rules.md` 为唯一入口，且条件触发逻辑（`isWechatMiniProgram` / `[DS:NAV-BAR:START]` / `DS:ACT-SDK BEGIN` 三个判定）在 `audit.md` 步骤 2 中编排。

## Goals / Non-Goals

**Goals:**
- 拆分单文件为索引 + 14 份模块化子文档，提升可读性、可维护性、规则改动局部化。
- 入口契约不变：调用方继续读 `audit-rules.md`，审查模式覆盖所有原审查项。
- 条件触发语义保留（小程序/导航栏/DS:ACT-SDK 三个条件块仅在触发条件命中时加载对应子文件）。
- 服务端存储专项节作为独立模块保留 A/B/C 档分级，被 `game-data.md`/`server-storage/04-cms-register.md` 精准定位时不被其它块干扰。

**Non-Goals:**
- 不改动任何审查规则的判定标准、阈值、阻断/警告分级。
- 不改动审查报告模板（`audit.md` 步骤 5 的表格）。
- 不改动 `audit.md`、`inject.md`、`deploy.md`、`game-data.md`、`server-storage/04-cms-register.md` 的对外文本（仅 `CLAUDE.md` 维护说明补一行）。
- 不引入新的审查能力、不删除任何现有项。

## Decisions

### 决策 1：目录结构与命名

**选择：** `references/audits/<module>.md`，文件名映射到原章节标题（小写、kebab-case）：

```
references/audits/
├── sdk-loader.md            ← "SDK-LOADER 块"
├── config.md                ← "CONFIG 块"
├── jssdk.md                 ← "JSSDK 块"
├── ns-log.md                ← "NS 日志块"
├── share.md                 ← "分享块"
├── ulink.md                 ← "Ulink 块"
├── click-precheck.md        ← "CLICK-PRECHECK 块"
├── exports.md               ← "EXPORTS 块"
├── html-load-order.md       ← "HTML 加载顺序检查"（含 <script type> 示例与重复逻辑检测）
├── server-storage.md        ← "服务端存储专项审查（mode 5-B 专用）"
├── html-security.md         ← "HTML 安全审查"
├── miniapp.md               ← "小程序支持审查（条件触发）"
├── wx-call-guard.md         ← "wx 调用前置检查"
├── nav-bar.md               ← "导航栏审查（条件触发）"
└── act-sdk.md               ← "DS:ACT-SDK 块审查（条件触发）"
```

**理由：**
- 文件名与原章节一一对应，迁移阶段易做 diff 校对。
- 三个条件触发块 (`miniapp.md` / `nav-bar.md` / `act-sdk.md`) 文件名直接体现触发语义。
- `server-storage.md` 独立成文件后，`game-data.md` 等可改为更精准的入口（设计阶段保留指向 `audit-rules.md` 索引，由索引引导加载该子文件——避免改外部文档）。

**备选（已否决）：**
- 平铺到 `references/` 根目录加 `audit-` 前缀（如 `audit-sdk-loader.md`）— 散乱、不易识别归属、与现有 `audit.md`/`audit-rules.md` 混淆。
- 按"主流程/条件触发"二级分类 — 过度设计；条件触发块本身已用文件名 + 索引段落标注，二级目录反增导航成本。

### 决策 2：`audit-rules.md` 索引文件结构

改造为"目录 + 加载指令 + 条件触发判定 + 共享前言"四段式：

```markdown
# DS Marker 审查规则（索引）

审查模式调用此索引文件后，按下述顺序读取 audits/ 下各子文档并执行其中检查项。

> JSSDK 相关内容必须额外调用 /dsjssdk 技能进行深度校验。
> HTML 安全审查在 DS Marker 结构校验完成后由 audit.md 步骤 4 单独调用 /html-security-scan。

## 加载清单（顺序即审查顺序）

| # | 模块 | 子文档 | 加载条件 |
|---|------|--------|---------|
| 1 | SDK-LOADER 块 | audits/sdk-loader.md | 始终 |
| 2 | CONFIG 块 | audits/config.md | 始终 |
| ... | ... | ... | ... |
| 12 | 小程序支持审查 | audits/miniapp.md | 检测到 isWechatMiniProgram 函数存在 |
| 13 | wx 调用前置检查 | audits/wx-call-guard.md | 始终 |
| 14 | 导航栏审查 | audits/nav-bar.md | 检测到 [DS:NAV-BAR:START] marker 或 DsNavigationMiniProgramBar |
| 15 | DS:ACT-SDK 块审查 | audits/act-sdk.md | 检测到 /* ========== DS:ACT-SDK BEGIN ========== 标记 |

## 服务端存储专项的额外入口

`game-data.md` / `server-storage/04-cms-register.md` 显式要求加载 audits/server-storage.md（服务端存储专项节）。
```

**理由：**
- 模型读到索引即知"按表格顺序加载下列文件"，无需理解二级元数据。
- 条件触发判定集中表达，避免子文档内重复书写"仅在 X 时触发"。
- 备份兜底：`audit.md` 步骤 2 原文中条件触发语义仍保留，不依赖索引文件解析。

### 决策 3：内容迁移策略 — 逐块原文剪切

每个子文档：
- 顶部一行说明（如 `# CLICK-PRECHECK 块`，与原标题完全一致），便于全文搜索定位。
- 正文为 `audit-rules.md` 原章节内容**原文剪切**，不做改写、不调整顺序、不合并、不增加示例。
- 跨章节共享内容（如 `📋 问题严重程度说明` 在 HTML 安全审查节中）保留在原模块文件，不上提到索引。
- 章节内引用（如分享块提到"遍历所有含 DS Marker 的 HTML 文件，SDK-LOADER 未加载 mobile-share.min.js"）保留原文，引用对象仍能在 sdk-loader.md / html-load-order.md / html-security.md 中找到对应规则。

**理由：** 不改写最大化降低风险；OpenSpec verify 步骤可直接对比迁移前后字节差异。

### 决策 4：CLAUDE.md 维护说明同步

`CLAUDE.md:77` 现有：
> 审查规则变更：只改 `references/audit-rules.md`，`audit.md` 通过 `Read` 动态加载它。

改为：
> 审查规则变更：具体规则改 `references/audits/<module>.md`，加载顺序与条件触发改 `references/audit-rules.md`（索引文件）；`audit.md` 通过 `Read` 动态加载索引，索引引导加载各子文档。

`CLAUDE.md:37` 现有表格 `references/audit-rules.md` 描述同步为"审查规则索引（指向 audits/）"。

## Risks / Trade-offs

- **[风险] 迁移过程中漏字、错位 → 审查规则隐性丢失**
  缓解：tasks.md 中每个子文档迁移步骤后立即跑 `quick_validate.py` 风格的"原文行总和"比对（旧文件总有效行数 = 新文件总有效行数总和 ± 索引/标题增量）。verify 阶段人工抽查 3 个条件触发块。

- **[风险] 子文档之间存在跨引用，单独读取时上下文断裂**
  缓解：索引顶部明确告知"按清单顺序加载所有子文件"；条件触发块内提到的其他章节（如 `share.md` 内 "SDK-LOADER 未加载 mobile-share.min.js" 的兜底）由审查模式按顺序加载后自然在上下文中。设计阶段验证 `audit.md` 步骤 2 始终先加载索引+全部始终加载块再判定条件触发，保证上下文齐全。

- **[风险] OpenSpec 现存 spec（`deploy-variable-check` 等）措辞为 `references/audit-rules.md` 的 XX 块`，是否需要同步更新？**
  评估：现有 spec 措辞仅描述"该规则存在于审查规则中"，迁移后规则物理位置变了但语义未变（索引仍是 `audit-rules.md`，规则正文在 `audits/<module>.md`）。**决定：本次 Change 不批量改 spec 措辞**，待下一次任一相关 spec 改动时随手同步；本 Change 在 design.md 中明确这一兼容立场，避免触发大范围 spec 变更连锁。

- **[Trade-off] 文件数量增加 14 份**
  对比单文件 440 行的查找/编辑成本，多文件方案在"改一处只动一文件"上明显更优。skill 加载机制按需读取，不会一次性加载所有子文件（除非审查模式确实需要全部加载——这本就是设计意图）。

## Migration Plan

1. 创建 `references/audits/` 目录。
2. 按决策 1 表格顺序，从 `audit-rules.md` 逐块剪切到对应子文件。
3. 改造 `audit-rules.md` 为索引（决策 2）。
4. 同步 `CLAUDE.md` 第 37、77 行（决策 4）。
5. 在审查模式下做一次端到端 dry-run（不修改任何被审查项目代码）验证：检查项数量、报告格式、条件触发链路均与基线一致。
6. 无回滚需要 — 拆分过程纯文档重组，Git 历史保留旧版本，必要时 `git revert` 即可恢复。

## Open Questions

无。

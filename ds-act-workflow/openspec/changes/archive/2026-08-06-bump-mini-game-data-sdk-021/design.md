## Context

`mini-game-data-sdk` 是 mode 5-B（用户维度服务端存储）与公共表（datahub-table）流程共同依赖的第三方 SDK，通过 `<script>` CDN 引入 HTML。当前仓库基线版本为 `0.2.0`，硬阻断阈值即 `0.2.0`，散落在 `references/audits/server-storage.md`、`references/audits/common-table.md` 两处；代码生成模板的 CDN 字符串同样固化 `0.2.0`，散落在 `references/server-storage/` 与 `references/capabilities/game-storage.md` 共 11 处。

0.2.1 修复了 `act.ds.163.com` 域名识别逻辑——0.2.0 及以下版本在该域名下 SDK 接口请求会打到内网地址，造成事故。`act.ds.163.com` 线上已有投放，静态审查无法判断项目是否投放该域名（仓库无投放域名标记机制），因此只能全量强制升级。0.2.1 完全向后兼容 0.2.0，无 breaking change。

利益相关方：运营/开发同学（审查文案受众，非专业 SDK 维护者）、mode 5-B 流程（开发期生成代码）、审查模式（硬阻断执行点）。

## Goals / Non-Goals

**Goals:**

- 把全仓库 `mini-game-data-sdk` 最低版本基线从 `0.2.0` 收敛到 `0.2.1`
- 审查阶段硬阻断 `< 0.2.1`，文案对运营/开发同学友好（不解释技术原因）
- 开发阶段对老项目（已有 0.2.0 / 0.1.x 引用）默认 autofix 升级到 0.2.1，用户可拒绝
- 把版本门禁策略 spec 化（新建 `mini-game-data-sdk-version-gate` capability），作为未来 bump 的单一事实源

**Non-Goals:**

- 不改 mode 5-B / 公共表的核心流程步骤（只改版本号字符串 + 新增 autofix 段落）
- 不引入「投放域名标记」机制（精准硬阻断方案 D 不可行，详见 D1）
- 不改 SDK 本身（只改本 skill 对 SDK 的引用与门禁）
- 不改 `ds-act-sdk` 的软门禁策略（两个 SDK 事故后果不同，强度差异合理）
- 不在 spec 里 pin 具体版本号字符串（pin 行为契约，版本号留在 references 文档）

## Decisions

### D1：全量硬阻断（vs 软门禁 / 精准硬阻断）

**选择**：审查阶段 `< 0.2.1` 全量硬阻断，无条件。

**理由**：

- 静态审查无法判断项目是否投放 `act.ds.163.com`——仓库无 `DEPLOY_TARGET` / 投放域名标记机制
- 精准硬阻断（方案 D）依赖项目主动标记投放域名，标记缺失即漏阻断，事故风险不可接受
- 软门禁（仅警告）与原话「审查阶段再阻断下」冲突，且运营可能忽略警告
- 0.2.1 完全向后兼容 0.2.0，全量硬阻断不会破坏功能，只让存量项目必须改一行 CDN 字符串

**备选方案否决**：

- 软门禁（与 `ds-act-sdk` 一致）：事故后果比 ds-act-sdk 重得多（请求内网 vs 接口签名失败），强度应更高
- 精准硬阻断（仅 act 域名项目）：静态识别不可靠，标记缺失即事故

### D2：开发期 autofix 策略——默认自动改 CDN，用户可拒绝

**选择**：mode 5-B intake-data-sdk/<v>` 且 `v < 0.2.1` → 默认自动把所有 CDN 地址版本号改为 `0.2.1`，输出说明后询问用户「是否保留此升级？」，用户拒绝则回滚到原版本（但提示审查阶段会阻断）。

**理由**：

- vs 软提示（用户主动改）：autofix 更省事，老项目无需手动操作 CDN 字符串
- vs 强制阻断（必须接受才能继续）：太严，用户可能想先看 0.2.1 changelog 或与运营确认
- 「默认 yes，opt-out」平衡——绝大多数项目应升级，少数有特殊理由的可拒绝
- 拒绝后继续流程不卡用户，但审查阶段仍硬阻断，用户返工成本可控

**autofix 触发条件**：范围匹配 `mini-game-data-sdk/<v>` 且 `v < 0.2.1`（覆盖 0.1.x / 0.2.0 等所有老版本），不限于精确 0.2.0。这样 0.1.x 老项目进 mode 5-B 升级时也能在开发期就收到 autofix，而不是等到审查才被阻断。

**autofix 输出文案**：

```
ℹ️ 检测到 mini-game-data-sdk 当前版本为 x.x.x，已自动升级到 0.2.1

不升级的话，小游戏投放到 act.ds.163.com 域名会有问题。

已修改以下文件中的 CDN 地址：
  - index.html: ...mini-game-data-sdk/x.x.x/index.js → ...mini-game-data-sdk/0.2.1/index.js
  - （若有 index.css 的 <link>，已同步删除）

是否保留此升级？[Y/n]
```

用户选 `n` → 回滚 CDN 字符串到原版本，输出提示「已回滚。注意：审查阶段仍会因版本 < 0.2.1 阻断，建议尽快升级。」

### D3：审查文案简化原则——不解释技术原因

**选择**：审查阻断文案去掉「路由未修复 / 请求内网 / TypeError / table* 接口缺失」等技术术语，只说「不升级的话，小游戏投放到 act.ds.163.com 域名会有问题」。

**理由**：

- 受众是运营/开发同学，不需要理解 SDK 内部路由机制
- 原文案（`audits/server-storage.md:13`）混合「0.0.9 缺 table* 接口」与「≥0.2.0 基线」两个理由，升级到 0.2.1 后这两个理由都不再适用（0.2.0 接口齐全，0.2.1 只是修域名识别），强行解释反而困惑
- 事故后果严重，文案应直接、可操作（给出新 CDN 地址即可）

**新版阻断文案**（统一用于 `audits/server-storage.md` 与 `audits/common-table.md`）：

```
❌ mini-game-data-sdk 版本过低（当前 x.x.x），需升级到 0.2.1

不升级的话，小游戏投放到 act.ds.163.com 域名会有问题。

1. 把 HTML 里 CDN 地址版本号改成 0.2.1：
   https://ds.res.netease.com/online/pkg/mini-game-data-sdk/0.2.1/index.js
2. （若有 index.css 的 <link>，一并删除——0.2.0 起已不需要样式表）
```

### D4：新建 `mini-game-data-sdk-version-gate` spec 作为版本策略单一事实源

**选择**：新建 `specs/mini-game-data-sdk-version-gate/spec.md`，pin 版本门禁的行为契约。

**spec 内容边界**：

- ✅ pin 行为：审查 SHALL 硬阻断低于最低版本的 SDK；开发期 SHALL autofix 老项目；autofix 默认执行、用户可拒绝；阻断文案 SHALL 不含技术术语
- ✅ pin 原因：最低版本由 `act.ds.163.com` 域名识别需求决定
- ❌ 不 pin 具体版本号字符串（如 `0.2.1`）——版本号留在 references 文档，spec 只要求「最低版本由 references/audits/server-storage.md 与 common-table.md 定义」

**理由**：

- vs 散落在 references 文档：spec 化便于未来 bump（改 references 版本号字符串即可，spec 不变）、便于审查、便于测试
- vs pin 具体版本号：会让 spec 频繁修改（每次 bump 都改 spec），且 spec 与 references 双重维护易漂移
- 行为契约稳定（硬阻断 + autofix + 文案原则），版本号频繁变化——分离合理

**未来 bump 流程（0.2.1 → 0.2.2）**：

1. 改 `references/audits/server-storage.md`、`common-table.md` 阈值与文案版本号
2. 改 `references/server-storage/*` CDN 模板字符串
3. 改 `references/capabilities/game-storage.md` FAQ 版本号
4. 改 `evals/evals.json` expected_output 版本号
5. spec 不变（行为契约不变）

### D5：autofix 实现位置——`00-intake.md` 新增段落

**选择**：在 `references/server-storage/00-intake.md` 现有「检测已有存档文件」路由逻辑之后，新增「检测 SDK 版本」段落。

**理由**：

- intake 已经是「检测已有存档文件 + 路由新接入 vs 已有存档」的入口，加一段最自然
- vs 改 `04-code-gen.md`：code-gen 是新项目生成，不涉及老项目改 CDN
- vs 单独建 `02.6-sdk-version-autofix.md`：autofix 逻辑简单（正则匹配 + 字符串替换 + 询问），不值得单独文档

### D6：`index.css` 说明保留不动

**选择**：保留现有「0.2.0 起移除 index.css」说明，不改成「0.2.1 起移除」。

**理由**：`index.css` 是 0.2.0 移除的，0.2.1 沿用（仍无 css）。历史项目升级时仍需删除残留 `<link>`，说明文本对的。

## Risks / Trade-offs

- **[存量 0.2.0 项目被审查阻断]** → 0.2.1 完全兼容 0.2.0，用户只需改一行 CDN 字符串；开发期 autofix 已自动处理，审查阻断是兜底
- **[autofix 误改用户故意保留的旧版本]** → 用户提供 opt-out（选 `n` 回滚），且回滚后明确提示审查会阻断
- **[eval 用例版本号漂移]** → implementation 阶段 grep `0.2.0` 全仓库扫描，确保无遗漏
- **[未来 bump 忘记同步多处版本号]** → spec 化后行为契约清晰，但版本号仍散落多处；tasks 中要求 grep 验证无残留
- **[文案过于简化失去技术信息]** → 维护者可查 `design.md` D3 与本 spec 了解完整原因；运营/开发同学只需操作指引

## Migration Plan

无独立迁移步骤。change 实施后：

1. 新项目：mode 5-B 直接生成 0.2.1 CDN
2. 老项目（已有 0.2.0 / 0.1.x）：下次进 mode 5-B intake 时被 autofix 升级；未进 mode 5-B 的项目在审查阶段被硬阻断，按文案手动改 CDN
3. 回滚策略：还原 references 文档版本号字符串即可（git revert）

## Open Questions

无。所有关键决策已与用户对齐：Q1（0.2.1 完全向后兼容）、Q2（act 域名线上已有，需硬阻断）、autofix 默认 yes/opt-out、文案简化原则。

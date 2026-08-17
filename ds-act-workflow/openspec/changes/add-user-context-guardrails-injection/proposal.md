## Problem Statement

运营用异构 agent（有道龙虾 / Codex / 其他）写 H5 活动代码，产出 7 类违规：非 ES module / 资源全 base64 / 资源放 public / 资源无 hash / 动态拼接资源地址 / 不拆分模块（单文件 1-2M）/ DOM onclick 内联。违规代码到发布平台 vite 构建部署时才暴露，返工成本高。运营不主动定义 CLAUDE.md / AGENTS.md / 规范文件——规范缺位是根因。

## Solution

ds-act-workflow 在第一次被调用时，往 `~/.agents/AGENTS.md`（跨 agent 标准位置，agents.md）注入 marker 块（`<!-- ds-act-workflow:guardrails:START/END -->`），内容含 H5 专项规范（4 条抽象构建合规规则）+ 通用工程原则（Karpathy 行为原则/不可变性/文件组织/错误处理）。运营用任何 agent 写 H5 代码时 agent 读到规范，从抽象原则推导出合规行为，预防违规产出。deploy 门禁兜底残余违规。

完整决策记录见 `docs/adr/0003-user-context-guardrails-injection.md`。

## User Stories

1. 作为运营，我希望用任何 agent（龙虾/Codex）写 H5 代码时 agent 自动遵守 Vite 构建规范，这样我产出的代码第一次就合规，不用等发布平台 vite build 报错才返工。
2. 作为运营，我希望规范自动注入、不用我手动配置 CLAUDE.md/AGENTS.md，这样我不用学 agent 配置也能享受规范约束。
3. 作为 ds-act-workflow 维护者，我希望规范内容在仓库内有单一真源，改规范只改一处，skill 升级时运营本地自动刷新。

## Implementation Decisions

- **注入点**：`~/.agents/AGENTS.md`（跨 agent 标准，OMP 通过 `agents` provider 读，优先级 70）。不用 `~/.claude/CLAUDE.md` 或 `~/.codex/AGENTS.md`（agent 专属，异构硬伤）。详见 ADR 0003。
- **时机**：第一次被调用时注入（skill 安装时无法执行脚本，skill 只在被调用时加载 SKILL.md）。路由器检查 marker 块是否存在，不存在则写入。参考 `references/dep-check.md` 的 `.skill-cache.json` 缓存检查模式。
- **架构模式**：跨切路由器级机制，不是用户调用的能力——参考 `references/capabilities/git-gate.md`（"跨切门禁，非用户调用的能力"）。不进能力注册表编号映射，由路由器自动执行。
- **真源**：`templates/guardrails.md`（新建）。删除现有 `templates/CLAUDE.md` + `templates/AGENTS.md` + `templates/rules/common.md`（通用 Karpathy 原则，非 H5 专项，不该 ds-act-workflow 管）。
- **内容形态**：抽象规则 + 行为原则 + 编码原则（非详细 do/don't 穷举）：
  - **构建合规规则**（4 条抽象）：资源经构建工具处理获 hash / ES module 化并拆分 / 路径可静态分析 / 结构样式行为分离
  - **代码规范**：最高 ES6 语法（禁 ES2020+）/ CSS BEM / JS-CSS 拆分到独立文件禁全放 HTML / 禁止 public 目录
  - **行为原则（Karpathy）**：编码前思考 / 简洁优先 / 精准修改 / 目标驱动（通用编码原则，迁入 guardrails.md 统一管理）
  - **编码原则**：不可变性 / 文件组织 / 错误处理
- **约束类型**：软约束（放弃硬约束 vite.config/eslint）。详见 ADR 0003。
- **覆盖假设**：OMP + Codex + 龙虾都读 `~/.agents/AGENTS.md`（假设，不深挖）。native `~/.omp/agent/AGENTS.md`（优先级 100）遮蔽不处理（已知 caveat）。

## Testing Decisions

- **唯一测试 seam**：eval（端到端，`evals.json` 新增注入型 eval case）。模拟运营第一次调 ds-act-workflow，验证 `~/.agents/AGENTS.md` 被写入 marker 块 + 内容含 4 条抽象规则关键词。评分用结构断言（marker 块存在）+ `completion()` 语义（内容正确）。参考 `docs/eval-system.md` 的 runner 方法论。
- **fixture 隔离**：写 `~/.agents/AGENTS.md` 有真实副作用，eval 环境要隔离——fixture 副本的 HOME 目录、或注入后清理、或 mock `~/.agents/` 路径。具体隔离方案在实现阶段定，不在 spec 过度设计。
- **不新增低 seam**：不写路由器逻辑单元测试、不写 marker 块内容校验脚本——eval 端到端覆盖。

## Out of Scope

- **硬约束**（vite.config.js / eslint / package.json scripts）：运营本地纯 HTML+JS，硬约束死配置。放弃。
- **每个 agent 专属配置文件**（`~/.claude/` + `~/.codex/` + 龙虾 `SOUL.md`）：异构硬伤，维护 N 套。放弃。
- **跨团队脚手架**（发布平台预置 vite 配置）：超出 skill 控制范围。放弃。
- **native 遮蔽处理**（`~/.omp/agent/AGENTS.md` 优先级 100 遮蔽 `~/.agents/`）：不处理，已知 caveat。
- **详细 do/don't 穷举 7 类反模式**：膨胀/过时/与 audit 重复。用抽象规则替代。
- **龙虾源码深挖**（确认是否读 `~/.agents/AGENTS.md`）：接受假设，不深挖。

## Further Notes

- 术语定义见 `CONTEXT.md`「用户级规范」段（用户级规范 / 软约束 / 抽象规则 / guardrails 真源 / marker 块）。
- 决策记录见 `docs/adr/0003-user-context-guardrails-injection.md`。
- 现有 `~/.agents/AGENTS.md` 已有 marker 块（之前会话手动创建），本 spec 将其机制化（真源进仓库 + 路由器自动注入）。

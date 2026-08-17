# User-Context Guardrails Injection — Tasks

> 状态：待实现。决策见 `docs/adr/0003-user-context-guardrails-injection.md`，spec 见 `proposal.md`。

## Task 1: 新建 guardrails 真源

- **文件**: `templates/guardrails.md`（新建）
- **操作**: 写入 marker 块内容——现有 H5 规范（Vite 结构 / SDK 顺序 / ES modules / 中文注释）+ 4 条抽象规则
- **验收**: 内容含 `<!-- ds-act-workflow:guardrails:START/END -->` marker + 4 条抽象规则关键词

## Task 2: 删除通用 Karpathy 文件

- **文件**: `templates/CLAUDE.md`、`templates/AGENTS.md`、`templates/rules/common.md`
- **操作**: 删除（通用编码原则非 H5 专项，不该 ds-act-workflow 管）
- **验收**: `templates/` 仅剩 `guardrails.md`

## Task 3: SKILL.md 路由器加注入逻辑

- **文件**: `SKILL.md` + 可能新增 `references/user-context-injection.md`（参考 git-gate.md 的跨切机制文档模式）
- **操作**: 路由器在能力路由前检查 `~/.agents/AGENTS.md` 是否有 marker 块，不存在则读 `templates/guardrails.md` 写入。参考 `references/dep-check.md` 缓存检查模式
- **验收**: 第一次调 ds-act-workflow 后 `~/.agents/AGENTS.md` 含 marker 块；重入不重复写

## Task 4: evals.json 新增注入型 eval

- **文件**: `evals/evals.json`
- **操作**: 新增 eval case——prompt 模拟运营第一次调 skill，expected_output 验证 marker 块写入 + 4 条规则内容
- **验收**: eval 跑通（结构断言 + completion 语义评分 pass）；fixture 隔离方案落地（HOME 副本 / 清理 / mock）
- **注**: fixture 隔离是 runner-level work（eval-system.md runner 层），eval case 已定义（id=82），隔离方案作为 deferred runner-level work 后续落地

## Task 5: 验证

- 跑 eval 确认注入逻辑工作
- 确认 `~/.agents/AGENTS.md` 被写入且幂等（重入不破坏用户原有内容）
- 确认 `templates/` 三个 Karpathy 文件已删

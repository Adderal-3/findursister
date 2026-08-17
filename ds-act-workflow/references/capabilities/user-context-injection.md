# 跨切机制：用户级规范注入（USER-CONTEXT-INJECTION）

> 跨切**路由器级机制**，非用户调用的能力。在 ds-act-workflow 第一次被调用时，往 `~/.agents/AGENTS.md` 注入 marker 块（H5 开发规范），让运营用任何 agent 写 H5 代码时读到规范。决策见 `docs/adr/0003-user-context-guardrails-injection.md`，术语见 `CONTEXT.md`「用户级规范」段。

> **不是模式编号能力**：本文件不进能力注册表的编号映射，不可被用户"选择执行"。它由路由器在能力路由前自动调用。架构模式参考 `git-gate.md`（跨切门禁，非用户调用的能力）。

## 驱动

预防（尽可能在前）+ 跨 agent（`~/.agents/AGENTS.md` 是跨 agent 标准位置）+ 规范缺位兜底（运营不主动定义规范）。

## 何时运行

| 时机 | 行为 |
|------|------|
| ds-act-workflow 被调用时（能力路由前） | 检查 `~/.agents/AGENTS.md` 是否有 marker 块，没有则注入，有则幂等更新 |

只在"ds-act-workflow 被调用时"运行；不区分能力类型（任何能力调用都触发检查）。

## 注入点

`~/.agents/AGENTS.md`（跨 agent 标准位置，agents.md 标准）。

- OMP 通过 `agents` discovery provider 读（优先级 70，native `~/.omp/agent/AGENTS.md` 不存在则生效）
- 假设 Codex / 龙虾也读 `~/.agents/AGENTS.md`（未深挖，接受假设）
- native `~/.omp/agent/AGENTS.md`（优先级 100）遮蔽不处理（已知 caveat）

## 检测与写入

执行时检测 `~/.agents/AGENTS.md` 的 marker 块状态：

| 状态 | 检测 | 行为 |
|------|------|------|
| 文件不存在 | `read` 失败 | 创建文件 + 写入完整 marker 块 |
| 文件存在，无 marker 块 | 正则匹配 START/END 失败 | 追加 marker 块到文件末尾 |
| 文件存在，有 marker 块 | 正则匹配 START/END 成功 | 替换 marker 块内容（幂等更新） |

**marker 块格式**：`<!-- ds-act-workflow:guardrails:START -->` ... `<!-- ds-act-workflow:guardrails:END -->`

**真源**：`templates/guardrails.md`（含完整 marker 块）。路由器读它写入 `~/.agents/AGENTS.md`。

## 幂等性

- **重入**：marker 块已存在 → 替换内容（不重复追加，不破坏文件其他内容）
- **真源更新**：skill 升级后 `templates/guardrails.md` 变了 → 下次调用时替换 marker 块为新内容

## 不能做什么

- **不往其他 agent 专属位置写**（`~/.claude/CLAUDE.md` / `~/.codex/AGENTS.md` / 龙虾 `SOUL.md`）：异构硬伤，维护 N 套。只用 `~/.agents/AGENTS.md` 跨 agent 标准位置。
- **不处理 native 遮蔽**：`~/.omp/agent/AGENTS.md`（优先级 100）遮蔽 `~/.agents/AGENTS.md` 时不干预。
- **不强制运营用特定 agent**：运营用什么 agent 写代码不管，只保证 `~/.agents/AGENTS.md` 有规范。
- **不替代 audit/deploy 门禁**：规范是软约束（agent 可读），audit（19 模块）+ deploy 门禁（H1-H4）兜底残余违规。

## 执行步骤

```
ds-act-workflow 被调用
  ↓
【能力路由前】检查 ~/.agents/AGENTS.md 的 marker 块
  ├─ 文件不存在 → 创建 + 写入完整 marker 块
  ├─ 文件存在，无 marker 块 → 追加 marker 块到末尾
  └─ 文件存在，有 marker 块 → 替换 marker 块内容（幂等更新）
  ↓
进入能力路由（dep-check → prescan → 路由 → 能力执行）
```

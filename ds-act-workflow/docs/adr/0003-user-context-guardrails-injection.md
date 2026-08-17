# ADR 0003: 用户级规范注入机制

> 状态：Accepted
> 日期：2026-07-20
> 术语见 `CONTEXT.md`「用户级规范」段（用户级规范 / 软约束 / 抽象规则 / guardrails 真源 / marker 块）。

## 背景

运营用异构 agent（有道龙虾 / Codex / 其他）写 H5 代码，产出 7 类违规（非 ES module / 资源全 base64 / 资源放 public / 资源无 hash / 动态拼接资源地址 / 不拆分模块 / DOM onclick 内联），发布平台 vite 构建部署时炸。运营不主动定义 CLAUDE.md / AGENTS.md / 规范文件。

ds-act-workflow 作为 skill 只在被调用时生效，够不着运营写代码的时刻（skill 调用在 inject/deploy，写代码在之前）。需要一个机制让规范在运营写代码时就生效（预防），尽可能在前，后补兜底可接受。

## 决策

ds-act-workflow 在**第一次被调用时**，往 `~/.agents/AGENTS.md`（跨 agent 标准位置，agents.md 标准）注入 marker 块（`<!-- ds-act-workflow:guardrails:START/END -->`），内容是**抽象规则**（非详细 do/don't）。

### 注入点：`~/.agents/AGENTS.md`

- 跨 agent 标准（agents.md，6 万+开源项目用），OMP 通过 `agents` discovery provider 读（优先级 70，native `~/.omp/agent/AGENTS.md` 不存在则生效）
- 假设 Codex / 龙虾也读 `~/.agents/AGENTS.md`（未深挖源码，接受假设）
- 不用 `~/.claude/CLAUDE.md`（CC 专属）或 `~/.codex/AGENTS.md`（Codex 专属）——异构硬伤，要维护 N 套

### 时机：第一次被调用时（非安装时）

- skill 安装时无法执行脚本（skill 只在被调用时加载 SKILL.md，安装只是把文件放到目录）
- 第一次调用时路由器检查 marker 块是否存在，不存在则写入（参考 dep-check 的 `.skill-cache.json` 缓存检查模式）
- 时序：第一次写代码 best-effort（规范还没注入），第一次调 skill 后规范就位，第二次起预防
- 契合"尽可能在前，后补可接受"

### 约束类型：软约束（放弃硬约束）

- 软约束 = 规范文件（agent 可读，依赖 agent 遵守）
- 放弃硬约束（vite.config.js / eslint / package.json scripts）——运营本地纯 HTML+JS，无 vite 运行时，硬约束是死配置
- deploy 门禁（H1-H4）兜底残余违规

### 内容形态：抽象规则（非详细 do/don't）

4 条抽象规则覆盖 7 类问题精神：

1. 资源必须经构建工具处理并获得 hash 引用
2. 代码必须 ES module 化并合理拆分
3. 资源路径必须可静态分析
4. 结构 / 样式 / 行为分离

不穷举反模式（抗过时、不与 audit 19 模块 + deploy H1-H4 重复、省 token）。风险：依赖 agent 推导，弱模型可能漏——靠 audit/deploy 兜底。

## 备选方案（rejected）

1. **项目级 CLAUDE.md（inject 介入时写项目根）**：时序错位第一次（写代码在 inject 之前）；只覆盖调了 skill 的项目，不调不覆盖
2. **硬约束（vite.config/eslint）**：运营本地纯 HTML+JS，死配置；需项目 vite 化（structure 前置），运营可跳过 structure
3. **跨团队脚手架（发布平台预置 vite 配置）**：超出 skill 控制范围，需跨团队协作；现有手写项目不受益
4. **用户级注入到每个 agent 专属位置**（`~/.claude/` + `~/.codex/` + 龙虾 `SOUL.md`）：异构硬伤，维护 N 套；龙虾 SOUL.md 语义是"agent 性格/价值观"，硬塞项目规范语义错位
5. **详细 do/don't 穷举 7 类反模式**：膨胀、过时（Vite/SDK 升级要同步）、与 audit/deploy 重复

## 后果

- **正面**：规范在运营写代码时生效（第二次起接近 100%，第一次 best-effort）；跨 agent 假设覆盖（OMP+Codex+龙虾）；marker 块幂等更新不破坏用户原有内容；软约束不需项目 vite 化
- **负面**：第一次写代码不预防（时序错位，不可避免）；异构 agent 假设可能不成立（龙虾可能不读 `~/.agents/AGENTS.md`，未深挖）；弱模型可能漏推导抽象规则；native `~/.omp/agent/AGENTS.md`（优先级 100）遮蔽 `~/.agents/AGENTS.md`（不处理，已知 caveat）
- **缓解**：audit（19 个审查模块，含 asset-paths 动态拼接阻断 + html-load-order）+ deploy 门禁（H1-H4，含 hash + 禁 public + preview 无 404）兜底捕获漏网违规

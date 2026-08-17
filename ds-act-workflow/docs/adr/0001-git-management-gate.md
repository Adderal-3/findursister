# Git 管理门禁：跨切门禁 + 自动 init + 本地基线/提交

ds-act-workflow 处理的 H5 活动大多数未纳入 git，而技能对项目文件做原地破坏性改动（structure 覆写 HTML、inject 改 JS、deploy 打包），无撤销路径。我们引入一个**跨切门禁**：任何改源码的能力（0/C/1/4/5/6/8）执行前自动「确保 git + 基线」、执行后自动按 conventional-commits + `(ds-act-workflow)` scope 提交；非 git 项目自动 init + 基线，已在仓库内的复用，位于父仓库子目录的门禁不介入；只管本地、不 push。驱动是安全/回滚 + 规范 + 可追溯三者（部署溯源明确排除）。

## 为什么是门禁而非独立能力

驱动之一是「规范」——碰过的页面必须纳入 git。独立能力可被跳过，gitless 项目会漏网；门禁不可绕过，规范才落地。代价是引入「跨切门禁」这个新架构概念（不落进 primitive/capability/contract/audit 任一层，待在路由器里，和前置扫描同层）——但这正是它该在的地方。

## 考虑过的替代

- **独立能力（模式 9）**：显式、可跳过、契合契约模型，但规范弱（可跳过）。否决。
- **折进 structure（模式 0）**：不经 structure 直接跑 inject 时 git 不触发。否决。
- **远程 push**：超范围（需远程地址 / 认证 / 命名策略），驱动 1+3 被本地提交完全满足。否决。
- **遇非 git 拒绝执行**：与驱动 1（安全）冲突——拒绝保护最需要安全网的项目。否决，改 auto-init。
- **能力失败自动回退**：销毁 partial 里可能要抢救的改动。否决，改「提交 partial + 标注 [中断]」。

## 后果

- 每个 H5 活动仓库历史里会出现 `(ds-act-workflow)` 提交，`git log --grep "ds-act-workflow"` 可追溯技能产生的全部改动，与人工提交区分。
- `.gitignore` 排除产物（`node_modules/`、`dist/`、`deploy.zip`、`.skill-cache.json`、dev-server 证书、OS 垃圾），只跟踪源码；已有仓库不覆盖、`node_modules` 被跟踪则告警。
- 位于父仓库子目录的项目门禁不介入（罕见，已接受）。
- 能力执行中途失败时，partial 状态以 `chore(ds-act-workflow): [中断] <cap> …` 提交保留现场，回退可用但不自动。
- 实现建在 `feature/contract-soft-deps-faq` 契约分支上(`feature/add-git-management` worktree 已基于该 base)。
- 检测矩阵 / .gitignore / 提交格式 / scope 细则见 `references/capabilities/git-gate.md`。

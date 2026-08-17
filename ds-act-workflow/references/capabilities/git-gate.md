# 门禁：Git 管理（GIT-GATE）

> 跨切**门禁**，非用户调用的能力。在任何**改源码的能力**执行前自动「确保 git + 基线」、执行后自动按约定格式提交。与能力的区别：能力有编号、由用户选择执行；门禁透明、不可跳过，是路由器基础设施，与前置扫描同层。架构决策见 `docs/adr/0001-git-management-gate.md`，术语见 `CONTEXT.md`。

> **不是模式编号能力**：本文件不进能力注册表的编号映射，不可被用户"选择执行"。它由路由器在能力执行前后自动调用。

## 驱动

安全/回滚（基线）+ 规范（不可跳过的 git 强制）+ 可追溯（能力提交）。部署溯源明确排除（部署不打 tag、不绑 commit）。

## 何时运行

| 时机 | 行为 |
|------|------|
| 改源码能力执行**前** | ensure + 基线（见检测矩阵） |
| 改源码能力执行**后** | 能力提交（有改动才提交） |

只在「改源码的能力」前后运行；只读 / 只产 gitignored 产物的能力不触发门禁（见 scope）。

## scope（哪些能力触发门禁）

| 能力 | 编号 | 触发 | 理由 |
|------|------|------|------|
| 规范目录 | 0 | ✅ | 改 HTML / 生成 src/CLAUDE.md |
| Cocos Vite | C | ✅ | 改 index.html / 生成 entry.js/package.json |
| 注入大神 | 1 | ✅ | 生成 ds.js/SDK-LOADER / 改 HTML |
| 埋点 | 4 | ✅ | 改 game.js 插入 trackEvent |
| 持久化 | 5 | ✅ | 生成 game-storage.js / game-server-storage.js |
| 活动 SDK | 6 | ✅ | 改 ds.js / HTML 容器 |
| 广告预览 | 8 | ✅ | 加遮罩 / 点击日志块 |
| 资源优化 | 9 | ✅ | 压缩图片源文件 / 生成 .compress-cache.json |
| 审查 | 2 | ❌ | 只读，输出报告不改源码 |
| 部署 | 3 | ❌ | 只产 deploy.zip + dist/（均 gitignored） |
| 开发服务器 | 7 | ❌ | 只起服务 + 产证书（gitignored） |

## Git 可用性检测（检测矩阵前置）

门禁依赖 git 二进制。进入检测矩阵 ①②③④ 之前，先检测 git 是否可用（POSIX `command -v git` / Windows `where git`）。

| 状态 | 行为 |
|------|------|
| git 可用 | 进入检测矩阵（①②③④） |
| git 不可用 | 主动询问用户是否安装（见下），不默认安装、不静默跳过 |

**git 不可用时的询问内容**：

先告知用户安装 git 后能解决的痛点（不装则门禁无法提供）：

1. **回滚**：技能改错文件后无基线可 `git reset --hard <基线>` 回退，原地破坏性改动不可逆。
2. **可追溯**：无法用 `git log --grep "ds-act-workflow"` 区分"技能改的"和"人改的"，改动无审计轨迹。
3. **规范**：H5 活动不会被纳入版本管理，碰过的页面仍是裸文件。

再告知安装后常用的自然语言操作（用户可对 agent 直接说）：

- 「提交」→ `git add` + `git commit`
- 「看历史」→ `git log`
- 「回退到基线」→ `git reset --hard <基线>`
- 「看我改了什么」→ `git diff` / `git status`

询问：「检测到本机未安装 git，是否安装？安装后技能改动可回滚、可追溯。」

**用户同意 → 跨平台安装**：

| 平台 | 命令 |
|------|------|
| Windows | `winget install Git.Git` |
| macOS | `brew install git`（无 brew 先装 brew） |
| Linux(Debian/Ubuntu) | `sudo apt-get install -y git` |
| Linux(RHEL/Fedora) | `sudo dnf install -y git` |

安装后需刷新 PATH（重开终端 / `source` profile），再次检测确认可用后进入检测矩阵。

**用户拒绝 / 安装失败 → 降级**：

- 改源码能力（0/C/1/4/5/6/8）阻断：无 git 保护不裸奔破坏文件，向用户说明「无 git 保护，拒绝原地改动；可先手动安装 git 后重试」。
- 只读 / 只产 gitignored 产物的能力（审查 2 / 部署 3 / 开发服务器 7）不触发门禁，照常可用。

这不是 opt-out（门禁仍不可跳过），而是环境前置失败——git 二进制不可用时门禁无法履行职责，仅对需要门禁的能力阻断。

## 检测矩阵（ensure + 基线段）

执行改源码能力前，门禁检测目标目录的 git 状态：

| 状态 | 检测 | ensure 行为 | 基线 |
|------|------|------------|------|
| ① 无 .git（gitless，常见） | `git rev-parse --git-dir` 失败 | auto-init + 写 .gitignore | 提交全部文件为基线 |
| ② .git 在目标根 + 工作区脏 | .git 在根、`git status --porcelain` 非空 | 复用仓库 | 把未提交改动提交为基线，使工作区干净 |
| ③ .git 在目标根 + 工作区干净 | .git 在根、`git status --porcelain` 为空 | 复用仓库 | HEAD 即基线，跳过基线提交 |
| ④ .git 在祖先目录（父仓库子目录） | .git 解析到祖先而非目标根 | **不介入** | — |

**.git 位置判定**：`git rev-parse --git-dir` 返回的 .git 路径若在目标根 → ②/③；若在祖先目录 → ④；命令失败 → ①。

**第 ④ 行的设计**：目标位于父仓库内时，子目录 commit 会污染父仓库历史且语义模糊。门禁不介入——不建 .git、不提交，能力照常跑。罕见场景，已接受（H5 活动多数 gitless）。

## .gitignore 策略

auto-init（①）时门禁写入 `.gitignore`，基线提交按它排除：

```
node_modules/
.vite/
dist/
deploy.zip
.skill-cache.json
*.pem
*.crt
*.key
.DS_Store
Thumbs.db
```

只跟踪源码；可再生产物（依赖 / 构建产物 / 打包产物 / 缓存 / 证书 / OS 垃圾）不入库。

**已有仓库（②③）**：不覆盖用户现有 `.gitignore`；若检测到 `node_modules/` 被跟踪，输出告警 `⚠️ node_modules 被跟踪，建议加入 .gitignore`，但不自动改。

## 提交契约

**基线提交**（①② 触发，③④ 不触发）：

```
chore(ds-act-workflow): 基线提交（技能介入前快照）
```

**能力提交**（改源码能力执行后，有改动才提交）：

```
<type>(ds-act-workflow): <中文摘要>
```

- `<type>`：feat / refactor / fix 等，反映能力性质（structure → refactor、inject → feat、修复 → fix）。
- `(ds-act-workflow)` scope：追溯钩子，`git log --grep "ds-act-workflow"` 一把捞出全部技能产生的提交，与人工提交区分。
- 摘要用中文，描述该能力做了什么。
- **原子提交原则**：一个 commit 对应一个功能——不把多个能力的改动塞进一个提交，也不把一个能力的改动拆散成多个提交。门禁在每个改源码能力执行后各提交一次，天然满足原子性。

**示例**：

- `feat(ds-act-workflow): 注入大神 SDK + 生成 ds.js`
- `refactor(ds-act-workflow): 提取内嵌 CSS/JS 到 src/`
- `fix(ds-act-workflow): 修复 window 桥接`

## 失败处理

改源码能力执行**中途失败**（部分文件已改、部分未改）时：

- 门禁把 partial（半成品）状态提交，消息标注中断：

  ```
  chore(ds-act-workflow): [中断] <能力名> 部分执行，保留现场
  ```

- **不自动回退**。基线提交让回退始终可用（`git reset --hard <基线>`），但门禁把选择权交回用户——partial 里可能有要抢救的改动，自动回退会销毁它们。
- `[中断]` 标注便于在 `git log` 中识别这条"坏提交"，用户可随时 revert/reset。

## 幂等性

- **基线重入**：③（工作区干净、HEAD 为已知基线）→ 不重建基线。① 已 init 过 → 走 ②/③。
- **能力重入无改动**：能力执行后若未产生任何改动（如 inject 检测到 DS Marker 已存在、幂等跳过），门禁**跳过提交，不产生空提交**。
- **能力重入有改动**：正常产生新的能力提交。

## 不能做什么

- **不 push**：只管本地，远程推送是用户/人工的事。
- **不打部署 tag / 不绑 deploy.zip 到 commit**：部署溯源明确排除。
- **不覆盖已有仓库的 .gitignore**：仅告警。
- **不处理父仓库子目录的 git 管理**：第 ④ 行门禁不介入，不提供 nested repo init。
- **不提供跨能力事务**：多能力组合执行时，每个能力独立 ensure + 提交，不提供"全成功才提交否则全回滚"。
- **不可跳过**：门禁是规范要求，不提供 opt-out 开关。

## 执行步骤

```
改源码能力被路由选中
  ↓
【前·前置】Git 可用性检测（command -v git / where git）
  ├─ 可用 → 进入 ensure
  └─ 不可用 → 询问用户安装
      ├─ 同意 → 跨平台安装 → 刷新 PATH → 复检可用 → 进入 ensure
      └─ 拒绝 / 失败 → 阻断改源码能力（只读能力不受影响）
  ↓
【前】ensure：判定 ①②③④
  ├─ ① → git init + 写 .gitignore + git add -A + 基线提交
  ├─ ② → git add -A（脏改动）+ 基线提交
  ├─ ③ → 无操作（HEAD 即基线）
  └─ ④ → 标记门禁不介入，后续跳过前/后两段
  ↓
执行能力（按能力文件自身契约）
  ├─ 成功 → 【后】若有改动：能力提交；无改动：跳过
  └─ 中途失败 → 【后】partial 提交 + [中断] 标注
```

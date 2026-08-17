---
name: ds-act-workflow
description: 网易大神运营活动 H5 业务注入与审查工具。Use when 用户要接入大神业务或微信小程序、审查/检查 DS 产物、部署打包上线、给游戏加埋点、做数据存储（本地或服务端）、接入活动 SDK（角色/任务/回流/CPS）、起本地开发服务器、调试广告遮罩预览、规范目录结构或 Cocos 导出接 Vite——即使用户没明说"模式"也应用本 skill。支持 HTML/React/Vue。
---

# ds-act-workflow

> **约定：** 本 skill 的 `references/` 下文件用 `{skill_dir}` 表示 Skill 工具加载时提示的 `Base directory` 路径，勿硬编码绝对路径。

> **术语：** 本 skill 使用「H5 活动」「DS 产物」「能力」「门禁」「基线」「能力提交」「用户级规范」「软约束」「抽象规则」「guardrails 真源」「marker 块」及 Eval 体系术语，定义见根目录 `CONTEXT.md`（领域 + 用户级规范 + Eval 体系术语表）。

本 skill 采用**能力契约式架构**：SKILL.md 是路由器（依赖检测 + 前置扫描 + 能力注册表 + 路由规则），具体能力声明在 `references/capabilities/*.md`，公共操作在 `references/primitives/`，产物结构契约在 `references/contracts/`，审查规则在 `references/audits/`。agent 据注册表与路由规则自主选择能力文件读取并执行，而非机械执行编号菜单。

## 架构说明（agent 必读）

本 skill 分四层，各层职责与读取时机如下。执行任何能力前，先据下表判断该读哪一层：

| 层 | 目录 | 性质 | 职责 | 何时读 |
|----|------|------|------|--------|
| **primitives** | `references/primitives/` | 无状态操作 | 公共扫描/检测原语（怎么扫描 HTML、怎么检测框架），返回原始结构化结果，不含 Marker 语义 | 能力文件引用时按需读 |
| **capabilities** | `references/capabilities/` | 能力契约 | 每个模式一个能力文件，统一声明依赖/入参/出参/能做什么/不能做什么/判断规则/幂等性/执行步骤 | 执行该能力时读 |
| **contracts** | `references/contracts/` | 产物结构 + 代码模板 | ds.js Marker 块定义、SDK-LOADER 模板、ds-act-sdk API 契约、小程序接入原理等声明式知识 | 生产者生成前、消费者校验前读 |
| **audits** | `references/audits/` | 校验规则 checklist | 19 个审查规则模块（checklist 格式），audit 能力执行时按 `audits/index.md` 加载清单顺序读取 | audit 能力执行时读 |

> **`references/templates/`** 是 contracts/ 引用的**可 lint 代码真源**（`.js`/`.html`/`.ts` 原始文件），非独立层：`ds-js-template.js`、`sdk-loader-template.html`、`ds-nav-bar-template.js`、`ds-react-hooks-template.ts`。contracts/ 文件引用这些模板的行范围而非内联全部代码。

> **根级 `templates/`** 是用户级规范注入的**guardrails 真源**：`guardrails.md`（marker 块内容 = H5 开发规范 + 抽象规则 + 行为原则）。`user-context-injection` 路由器机制读它写入 `~/.agents/AGENTS.md`。与 `references/templates/`（.js/.html/.ts 代码真源）不同——这是规范内容真源（.md）。

> **附属文件**：部分能力有附属子模块或参考，就近置于能力子目录下（如 `references/capabilities/ds-act-sdk/` 含 `act-role` / `act-task` / `act-task-checker` / `act-cps-bar` / `act-vip-recall` / `act-lottery` / `act-cps-download-guide` / `ds-act-sdk-axios`）；跨层共享的附属参考（如 `references/server-storage/`，被 `game-storage` 能力与 `audits` 共同引用）留 `references/` 根。二者均非独立层，随所属能力按需读取。

**关键约束**：primitives 返回原始结构化数据（如所有 HTML 注释及其位置），**不做 Marker 语义识别**。能力文件拿到原语结果后，按 `contracts/ds-js-markers.md` 的 Marker 模式自行匹配。Marker 语法变了只改 contracts，primitives 的扫描逻辑不变。

## 依赖技能与前置检查

### 依赖技能检测（含缓存）

进入能力路由**之前**，先执行依赖技能检测（含缓存逻辑、软/硬必需性定义、缺失时输出格式）→ `references/dep-check.md`。全部 ✅ 或按软必需禁用相关 capability 后，进入前置扫描。

### 前置扫描（自动检测，手动选择）

进入能力路由**之前**，并行执行 Cocos web-mobile 检测 + H5 结构扫描（含 Cocos 启动块豁免、扫描结果展示格式、展示规则）→ `references/prescan.md`。结果只作参考，由用户在路由中决定执行哪项。

### 用户级规范注入（第一次调用时）

进入能力路由**之前**，检查 `~/.agents/AGENTS.md` 是否有 ds-act-workflow guardrails marker 块，没有则注入（有则幂等更新）→ `references/capabilities/user-context-injection.md`。让运营用任何 agent 写 H5 代码时读到 H5 开发规范，预防违规产出。规范内容真源在 `templates/guardrails.md`。

## 能力注册表

**编号保持旧映射不变**（0/C/1-9），确保 evals 中"模式1""模式C"等引用不漂移。编号是显式指定的快捷方式，意图驱动路由时 agent 读注册表自主选择。

| 编号 | 能力 | 文件 | 一句话 | 依赖 | 出参 |
|------|------|------|--------|------|------|
| 0 | 规范目录 | `references/capabilities/structure.md` | 内联 CSS/JS 提取到 `src/`，规范目录结构 | 无 | `src/*.css` + `src/*.js` + window 桥接块 + CLAUDE.md |
| C | Cocos Vite | `references/capabilities/cocos-vite.md` | Cocos 导出接入 Vite 构建管线 | 无 | `entry.js` + 改写 `index.html` + `package.json` + `public/` 资源 |
| 1 | 注入大神 | `references/capabilities/inject.md` | 接入登录/分享/ns 日志/小程序联登/顶部栏（生成 `ds.js`） | structure（推荐） | `ds.js` + SDK-LOADER + 第三方依赖 + 点击事件修复 |
| 2 | 审查 | `references/capabilities/audit.md` | 校验 DS 产物合规性，输出分级报告 | inject（必须） | 审查报告（阻断项 / 警告项 / 通过项） |
| 3 | 部署 | `references/capabilities/deploy.md` | 构建 + 打包 `deploy.zip` | audit（推荐） | `deploy.zip` |
| 4 | 埋点 | `references/capabilities/game-log.md` | 上报玩家行为（抽卡/过关/分享） | inject（必须） | `trackEvent` 调用 |
| 5 | 持久化 | `references/capabilities/game-storage.md` | 存玩家数据（本地/服务端/公共表） | 本地无 / 服务端+公共表需 [1] | `game-storage.js` 或 `game-server-storage.js` 或 `game-common-table.js` |
| 6 | 活动SDK | `references/capabilities/ds-act-sdk.md` | 接入 ds-act-sdk 七子能力（角色/任务/回流/CPS/会员流失召回/抽奖/CPS下载引导弹窗） | inject（必须） | `configure` + `evoke` 代码 + HTML 容器 |
| 7 | 开发服务器 | `references/capabilities/dev-server.md` | 本地 HTTPS 服务器 + 调试二维码 | 无 | 运行中的 server + 证书 + hosts 条目 |
| 8 | 广告预览 | `references/capabilities/ad-preview.md` | 调试广告遮罩 + 点击日志 | inject（点击日志必须，遮罩无依赖） | 遮罩块 / 点击日志块 |
| 9 | 资源优化 | `references/capabilities/resource-optimization.md` | sharp 压缩超阈图片源文件（保格式不 resize）+ hash 去重 | 无 | 压缩后的图 + `.compress-cache.json` |

> **依赖列说明**：括号内标注 必须/推荐。inject 是多个能力的硬前置（其出参 ds.js 提供 `trackEvent`/`withPrecheck`/`APP_KEY` 等 API）；structure 与 audit 是推荐前置（提升产物可维护性 / 避免带病上线）。

## 能力菜单展示

触发 skill（依赖检测 + 前置扫描完成）后，向用户展示能力全貌，让其看到有哪些能力、当前项目已具备哪些，再选择。

**何时展示**：首次触发或用户意图不明确时展示。用户明确表达意图（如"帮我接入大神"、"打包上线"）或通过模式编号进入（如"模式1"）时，agent 直接识别并执行，不必先弹菜单。

**菜单格式**（展示「能力注册表」的内容，增加状态列 + 推荐路径行；agent 可照画或用自然语言展示全貌）：

```
📋 能力菜单
| 编号 | 能力 | 状态 | 一句话 |
|------|------|------|--------|
| 0 | 规范目录 | | （注册表一句话） |
| 1 | 注入大神 | ✅ 已具备 | （注册表一句话） |
| … | （其余能力见注册表） | | |

🎯 推荐路径：[0] → [1] → [扩展] → [2] → [3]
```

**状态列**：仅标 `✅ 已具备`（前置扫描检测到该能力产物，如 [1] 检测到 DS Marker、[0] 检测到 `src/` 已规范）。其余不标——agent 根据依赖列 + 扫描结果自然判断是否可执行，必要时在能力描述里提一句"需先 [1]"。非 Cocos 项目不显示 [C] 行。

## 路由规则

1. **显式指定**（旧编号或名称均可）→ 直接读对应能力文件执行
   - "模式1" / "注入大神" / "1" → `references/capabilities/inject.md`
   - "模式C" / "Cocos" / "C" → `references/capabilities/cocos-vite.md`
   - 编号与上表一致，纯快捷方式

2. **意图驱动**（默认）→ agent 读注册表自主选择，可组合多个能力
   - "帮我接入分享" → inject（分享是 inject 的子能力）
   - "打包上线" → audit → deploy（组合）
   - "加个排行榜" → game-storage（服务端存储路径）
   - "做帖吧/投稿墙/点赞墙" → game-storage（公共表路径，多人共写共读）
   - "帮我压缩图片" / "图片太大" → mode 9 资源优化
   - "加抽奖" / "做个转盘" / "砸金蛋" / "抽奖功能" → ds-act-sdk 子能力 F（lottery，headless，无 UI 组件）

3. **歧义消解** → 多个能力匹配时，列出候选及区分点，询问用户
   - "加点击日志" → 候选：game-log（`trackEvent` 行为埋点）/ ad-preview（广告点击日志上报）。区分点：是否互动广告 WebView 场景。询问用户。
   - "存数据" → 候选：game-storage 本地存档 / game-storage 服务端存储 / game-storage 公共表（同能力内三选一，由能力文件"判断规则"段引导用户选择）。
   - "检查代码" → 候选：audit（全面合规审查）/ ad-preview（仅查遮罩残留）。区分点：是否互动广告场景且只关心遮罩清理。询问用户。

4. **路径不明确** → agent 读相关能力文件的"依赖/出参"判断前置需求，向用户确认后再执行
   - 用户说"审查"但项目无 DS Marker → 读 audit.md 依赖段（前置 inject 必须），提示先执行模式 1。
   - 用户说"打包"但未审查 → 读 deploy.md 依赖段（audit 推荐前置），询问是否先审查。

> 能力经路由规则选定后，**改源码能力**（0/C/1/4/5/6/8/9）的执行前后由下节「Git 管理门禁」自动包裹（前：init+基线；后：结构化提交）。

## 能力执行后推荐

能力执行完成后的行为按进入方式区分：

- **通过模式编号/能力名进入**（如选 [1]、"模式1"）：完成后重新展示菜单 + 推荐推荐路径里的下一步（如 [1] 完成后推荐扩展能力或 [2] 审查；[2] 通过后推荐 [3] 部署）。
- **单能力意图驱动**（如"帮我接入分享"→inject）：完成后重新展示菜单供用户继续选择，不主动推荐下一步。
- **组合意图驱动**（如"打包上线"→audit+deploy）：完成后只输出状态摘要，不弹菜单；用户主动继续时再展示菜单。

[7] 开发服务器、[C] Cocos 是工具能力，不强制推荐下一步，由用户主动选择。

## Git 管理门禁

本 skill 对 H5 活动文件做原地改动，无内置撤销路径。为提供回滚与可追溯，路由器内置**跨切门禁**：任何**改源码的能力**（0/C/1/4/5/6/8）执行前自动「确保 git + 基线」、执行后自动按约定格式提交。只读 / 只产 gitignored 产物的能力（审查 2 / 部署 3 / 开发服务器 7）不触发门禁。门禁不可跳过（规范要求），只管本地不 push。

**检测矩阵**（执行改源码能力前）：

| 状态 | 行为 |
|------|------|
| 无 .git | auto-init + 写 .gitignore + 基线提交全部文件 |
| .git 在根 + 工作区脏 | 复用仓库 + 把未提交改动提交为基线 |
| .git 在根 + 工作区干净 | 复用仓库，HEAD 即基线，跳过 |
| .git 在祖先（父仓库子目录）| 门禁不介入，能力照常跑 |

**提交格式**：基线 `chore(ds-act-workflow): 基线提交（技能介入前快照）`；能力提交 `<type>(ds-act-workflow): <中文摘要>`（structure→refactor、inject→feat）。`(ds-act-workflow)` 是追溯钩子。能力无改动（幂等重入）→ 跳过提交不产生空提交；能力中途失败 → partial 提交 + `[中断]` 标注，不自动回退。

完整契约（Git 可用性检测与安装询问 / 检测矩阵 / .gitignore 内容 / scope 全表 / 提交格式 / 失败处理 / 幂等性 / 不做什么）见 `references/capabilities/git-gate.md`。

## 常见问题与正确写法

> 反模式表见各能力文件（inject/ds-act-sdk/game-storage/structure/deploy）末尾。

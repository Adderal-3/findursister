# 能力契约式重构 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ds-act-workflow skill 从命令式 SOP 重构为能力契约式架构，恢复 agent 推理能力。

**Architecture:** 四层分离（primitives/capabilities/contracts/audits），SKILL.md 作为 router（能力注册表 + 路由器），每个能力文件统一契约结构（依赖/入参/出参/能做/不能做/判断规则/幂等性/数据流/组合）。

**Tech Stack:** Markdown 文档工程（无代码构建），验证靠 evals A/B 对照。

**Spec:** `docs/superpowers/specs/2026-07-07-capability-contract-refactor-design.md`

---

## 文件结构

```
references/
  primitives/           新建，2 个文件
    scan-html.md
    detect-framework.md
  capabilities/         新建，10 个文件（替代 references/ 下的模式文件）
    structure.md / cocos-vite.md / inject.md / audit.md / deploy.md
    game-log.md / game-storage.md / ds-act-sdk.md / dev-server.md / ad-preview.md
  contracts/            新建，4 个文件
    ds-js-markers.md / sdk-loader.md / ds-act-sdk-api.md / miniapp.md
  audits/              已有，16 个规则文件不变（修正硬引用）
    index.md（改为 audit 能力入口）
    *.md
  templates/           保留原始 .js/.html（可 lint 真源）
    ds-js-template.js / sdk-loader-template.html
```

---

## Task 1: 前置检查 — evals 与 audits 硬引用扫描

**Files:**
- 检查: `evals/evals.json`
- 检查: `references/audits/*.md`

- [ ] **Step 1: 扫描 evals 中的文件路径引用**

用 grep 搜索 evals.json 中是否含 `references/` 路径引用。记录结果。

- [ ] **Step 2: 扫描 audits 中的硬引用**

用 grep 搜索 `references/audits/*.md` 是否引用了 `ds-js-template.js` 的行号或旧文件路径。记录结果。

- [ ] **Step 3: 记录发现到 spec 旁注**

如有硬引用，在 spec 的迁移映射表对应行标注"需同步修正"。如无，记录"无硬引用，安全迁移"。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: 前置检查 — evals/audits 硬引用扫描结果"
```

---

## Task 2: 建目录骨架 + contracts 层

**Files:**
- Create: `references/primitives/`（空目录，放 .gitkeep）
- Create: `references/capabilities/`（空目录）
- Create: `references/contracts/`（空目录）
- Create: `references/contracts/ds-js-markers.md`
- Create: `references/contracts/sdk-loader.md`
- Create: `references/contracts/miniapp.md`
- Move: `references/ds-act-sdk-api.md` → `references/contracts/ds-act-sdk-api.md`
- Move: `references/ds-js-template.js` → `references/templates/ds-js-template.js`
- Move: `references/sdk-loader-template.html` → `references/templates/sdk-loader-template.html`

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p references/primitives references/capabilities references/contracts references/templates
```

- [ ] **Step 2: 移动模板文件到 templates/**

```bash
git mv references/ds-js-template.js references/templates/ds-js-template.js
git mv references/sdk-loader-template.html references/templates/sdk-loader-template.html
```

- [ ] **Step 3: 移动 ds-act-sdk-api.md 到 contracts/**

```bash
git mv references/ds-act-sdk-api.md references/contracts/ds-act-sdk-api.md
```

- [ ] **Step 4: 写 contracts/ds-js-markers.md**

读取 `references/templates/ds-js-template.js` 和 spec 的契约设计段。写 ds-js-markers.md，包含：
- 9 个 Marker 块的表格（标注哪些在 template 中，NAV-BAR 标注"在 html.md 中"）
- 每块的定义、占位符、不变量
- 代码引用（指向 templates/ds-js-template.js 的行范围，NAV-BAR 指向 html.md 的代码块）
- 生产者（inject）/消费者（audit）引用说明

- [ ] **Step 5: 写 contracts/sdk-loader.md**

读取 `references/templates/sdk-loader-template.html`。写 sdk-loader.md，包含：
- SDK-LOADER 模板结构说明
- SEO 标签清单与去重规则
- {IS_COCOS} 占位符说明
- 代码引用（指向 templates/sdk-loader-template.html）

- [ ] **Step 6: 写 contracts/miniapp.md**

合并 `references/miniapp.md` 和 `references/miniapp-h5-integration.md` 的内容，改为声明式知识参考（联登原理、传角选角、分享机制），去除操作步骤叙述。

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: 建 contracts 层 — ds-js-markers/sdk-loader/miniapp 契约"
```

---

## Task 3: primitives 层

**Files:**
- Create: `references/primitives/scan-html.md`
- Create: `references/primitives/detect-framework.md`

- [ ] **Step 1: 写 scan-html.md**

按 spec 原语设计段写。核心：返回原始结构化结果（所有 HTML 注释、style 块、script 标签），不做 Marker 语义识别。明确"不做"清单。

- [ ] **Step 2: 写 detect-framework.md**

按 spec 写。输出框架类型 + IS_COCOS。逻辑：读 package.json 判 react/vue，Cocos 检测（cocos2d-js + _CCSettings）。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 建 primitives 层 — scan-html/detect-framework"
```

---

## Task 4: 框架拆分 — html/react/vue 去重

**Files:**
- Read: `references/html.md`, `references/react.md`, `references/vue.md`
- Modify: `references/contracts/ds-js-markers.md`（补充框架差异说明）
- 记录框架差异摘要供 Task 5-14 使用

- [ ] **Step 1: 分析三框架文件的共享逻辑与差异**

读取三个文件，提取：
- 共享逻辑（SDK-LOADER 注入、ds.js 生成、CONFIG 块处理）→ 已在 contracts 中
- 框架差异（hooks vs composables vs 全局函数、文件路径约定、ds.d.ts 类型声明）

- [ ] **Step 2: 写框架差异摘要**

创建 `references/contracts/framework-diffs.md`，记录三框架的差异点表格，供各能力文件引用。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: 框架拆分 — 共享逻辑进 contracts，差异摘要独立"
```

---

## Task 5: capabilities/inject.md（试点）

**Files:**
- Create: `references/capabilities/inject.md`
- Read: `references/inject.md`（旧 SOP，参考但不照搬）

- [ ] **Step 1: 按 spec 统一结构写 inject.md**

包含全部 9 段：依赖/入参/出参/能做什么/不能做什么/判断规则/幂等性/数据流/组合。
- 入参"获取方式"列：标注 APP_KEY 为"交互询问"、SHARE_TITLE 为"可推断"等
- 判断规则段：迁入点击事件启发式分类表（🔴/🟢/🟡）
- 幂等性段：声明已存在 ds.js 时 CONFIG 块部分保留部分覆盖
- 数据流段：诚实声明串行管线（配置收集→模板填充→注入→点击修复）
- 组合段：标注 audit 为"必须"下游、deploy 为"推荐"

- [ ] **Step 2: 自检 — 对比旧 inject.md 确认无信息丢失**

逐项对比旧 SOP 的每个步骤，确认新契约结构覆盖了所有决策点。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: capabilities/inject.md — 试点能力契约（模式1）"
```

---

## Task 6: capabilities/structure.md

**Files:**
- Create: `references/capabilities/structure.md`
- Read: `references/structure.md`

- [ ] **Step 1: 按 spec 统一结构写 structure.md**

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: capabilities/structure.md（模式0）"
```

---

## Task 7: capabilities/cocos-vite.md

**Files:**
- Create: `references/capabilities/cocos-vite.md`
- Read: `references/cocos-vite-integration.md`, `references/cocos-vite-entry-skeleton.js`, `references/cocos-vite-jslist-flow.md`

- [ ] **Step 1: 按 spec 统一结构写 cocos-vite.md**

合并 entry-skeleton.js 和 jslist-flow.md 为附属参考。

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: capabilities/cocos-vite.md（模式C）"
```

---

## Task 8: capabilities/audit.md + audits/index.md

**Files:**
- Create: `references/capabilities/audit.md`
- Modify: `references/audits/index.md`（改为 audit 能力入口，引用 contracts）

- [ ] **Step 1: 写 capabilities/audit.md**

契约结构。出参是审查报告。组合段标注"inject→audit 必须"。

- [ ] **Step 2: 改造 audits/index.md**

保留审查规则加载清单，改为引用 contracts/ds-js-markers.md 做校验。修正 Task 1 发现的硬引用。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: capabilities/audit.md + audits/index.md 改造（模式2）"
```

---

## Task 9: capabilities/deploy.md

**Files:**
- Create: `references/capabilities/deploy.md`
- Read: `references/deploy.md`

- [ ] **Step 1: 按 spec 统一结构写 deploy.md**

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: capabilities/deploy.md（模式3）"
```

---

## Task 10: capabilities/game-log.md

**Files:**
- Create: `references/capabilities/game-log.md`
- Read: `references/game-log.md`

- [ ] **Step 1: 按 spec 统一结构写 game-log.md**

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: capabilities/game-log.md（模式4）"
```

---

## Task 11: capabilities/game-storage.md

**Files:**
- Create: `references/capabilities/game-storage.md`
- Read: `references/game-storage.md`, `references/game-data.md`, `references/server-storage/`

- [ ] **Step 1: 按 spec 统一结构写 game-storage.md**

合并 game-data.md。server-storage/ 7 个文件改为附属参考，6 步流程改为数据流节点。

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: capabilities/game-storage.md（模式5）"
```

---

## Task 12: capabilities/ds-act-sdk.md

**Files:**
- Create: `references/capabilities/ds-act-sdk.md`
- Read: `references/ds-act-sdk.md`, `references/act-role.md`, `references/act-task.md`, `references/act-task-checker.md`, `references/act-cps-bar.md`

- [ ] **Step 1: 按 spec 统一结构写 ds-act-sdk.md**

子模块（act-role/task/task-checker/cps-bar）保留为附属文件，能力文件引用它们。

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: capabilities/ds-act-sdk.md（模式6）"
```

---

## Task 13: capabilities/dev-server.md

**Files:**
- Create: `references/capabilities/dev-server.md`
- Read: `references/dev-server.md`

- [ ] **Step 1: 按 spec 统一结构写 dev-server.md**

简单能力，可省略判断规则/组合段（标记"无"）。

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: capabilities/dev-server.md（模式7）"
```

---

## Task 14: capabilities/ad-preview.md

**Files:**
- Create: `references/capabilities/ad-preview.md`
- Read: `references/ad-preview.md`

- [ ] **Step 1: 按 spec 统一结构写 ad-preview.md**

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: capabilities/ad-preview.md（模式8）"
```

---

## Task 15: SKILL.md router 重写

**Files:**
- Modify: `SKILL.md`

- [ ] **Step 1: 重写 SKILL.md**

保留：依赖技能检测 + .skill-cache.json + 前置扫描。
新增：架构说明（四层表）+ 能力注册表（含旧编号映射）+ 路由规则（4条，含歧义消解）。
删除：旧编号菜单 + 旧模式映射表。

- [ ] **Step 2: 自检 — 确认旧编号 0/C/1-8 映射不变**

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: SKILL.md router — 能力注册表 + 路由器 + 架构说明"
```

---

## Task 16: CLAUDE.md 维护说明重写

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 重写 CLAUDE.md 的架构概述与维护说明**

更新：模式映射表（指向 capabilities/）、框架检测逻辑（指向 primitives/）、路径引用约定（四层结构）、修改技能时的注意事项。

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "docs: 重写 CLAUDE.md 维护说明适配四层架构"
```

---

## Task 17: 清理旧文件

**Files:**
- Delete: `references/audit-rules.md`（旧残留）
- Delete: `references/inject.md`, `structure.md`, `deploy.md` 等已迁移的旧文件
- Delete: `references/miniapp.md`, `miniapp-h5-integration.md`（已合并到 contracts/miniapp.md）
- Delete: `references/game-data.md`（已合并到 game-storage.md）

- [ ] **Step 1: 确认所有旧文件已迁移**

逐一确认每个旧 references/*.md 的内容已被 capabilities/ 或 contracts/ 覆盖。

- [ ] **Step 2: 删除已迁移的旧文件**

```bash
git rm references/inject.md references/structure.md references/deploy.md ...
```

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: 清理已迁移的旧 references 文件"
```

---

## Task 18: evals A/B 对照实验

**Files:**
- Create: `docs/superpowers/specs/2026-07-07-capability-contract-refactor-result.md`

- [ ] **Step 1: 新增 15 条对照 eval**

在 evals/evals.json 新增 15 条（ID ≥ 58）：边界情况 5 条 + 多能力组合 5 条 + 歧义消解 3 条 + SOP未覆盖 2 条。expected_output 写行为预期。

- [ ] **Step 2: A 组 — 新版跑 eval**

在重构分支跑全部 eval（57 旧 + 15 新），记录每条的 token 消耗和产物正确性。

- [ ] **Step 3: B 组 — 旧版跑 eval**

`git checkout staging`，跑相同 eval 集，记录指标。

- [ ] **Step 4: 汇总对比表**

写入 result.md，含：不退化验证（57条对比）、价值验证（15条对比）、token 效率对比。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "docs: A/B 对照实验结果 — 能力契约式重构价值验证"
```

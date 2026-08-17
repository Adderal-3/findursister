## Context

`SKILL.md` 菜单 [6] 指向 `references/act-task.md`，该文件当前 700+ 行，按步骤 1-9 线性串联了 SDK 注入、任务面板、回流任务、CPS 通用悬浮栏。三个可选功能无法独立选择，且文件持续膨胀。

目标架构：一个入口编排器 `ds-act-sdk.md` 负责共享前置步骤和功能多选，三个独立子模块 md 各自完成参数收集和代码生成。

## Goals / Non-Goals

**Goals:**
- 将 `act-task.md` 拆分为 1 个入口 + 3 个子模块
- 用户可按需多选功能，不选的功能完全不执行
- 各子模块自包含（可独立维护、独立测试）
- 代码生成统一在 `DS:ACT-SDK BEGIN/END` 块内，configure 只写一次
- 修改 SKILL.md 菜单项 [6] 和路由表

**Non-Goals:**
- 不修改 SKILL.md 菜单 [0]-[5] 的行为
- 不修改 `ds-act-sdk` 包本身
- 不支持子模块脱离入口编排器独立使用（必须从 [6] 进入）
- 不重写"常见问题与正确写法"（仅核对引用是否仍正确）

## Decisions

### 决策 1：入口编排器与子模块的职责分离

**入口 `ds-act-sdk.md` 负责：**
- 步骤 1：前置检查（搜索是否已接入）
- 步骤 2：注入 SDK CSS/JS 到 index.html
- 步骤 3：收集共享参数（actId 必填 / appKey 必填 / squareId 可选 / gameInfo 可选）
- 步骤 4：功能多选菜单（[A] 任务面板 [B] 回流任务 [C] CPS 通用悬浮栏）
- 步骤 5：生成 `DS:ACT-SDK BEGIN/END` 骨架代码（含 configure），然后依次读取选中模块的 md 文件执行
- 步骤 6：汇总完成报告

**子模块各自负责：**
- 自己的参数收集（专有参数）
- 自己的 HTML 容器注入
- 自己的代码生成（追加到 `DS:ACT-SDK END` 之前）
- 自己的占位符表格

**理由：** 子模块自包含意味着新增功能只需加一个 md 文件 + 入口多选菜单加一行，不需改动已有子模块。

---

### 决策 2：代码统一在一个 marker 块内

```javascript
/* ========== DS:ACT-SDK BEGIN ========== */
// 入口编排器生成：
var sdk = window.DsActSdk;
sdk.configure({ production: { actId, appKey, squareId, gameInfo } });

// —— 任务面板（act-task.md 生成）——
...

// —— 回流任务（act-task-checker.md 生成）——
...

// —— CPS 通用悬浮栏（act-cps-bar.md 生成）——
...
/* ========== DS:ACT-SDK END ========== */
```

**理由：** 各子模块共享 `sdk` 变量、`configure` 只调一次、审查/删除时一目了然。子模块追加位置约定为 `DS:ACT-SDK END` 之前。

**备选：** 每个模块自己的 BEGIN/END 块——但 `sdk` 变量需要重复声明或提到全局，不如统一块简洁。

---

### 决策 3：功能多选交互格式

```
请选择需要接入的功能（可多选，用字母组合输入，如 AC、B、ABC）：

  [A] 任务面板
  [B] 回流任务
  [C] CPS 通用悬浮栏

输入：
```

**理由：** 字母组合输入比逐个 Y/N 更高效，一次性完成选择后加载对应模块。

---

### 决策 4：子模块加载顺序

固定顺序：A → B → C（任务面板 → 回流任务 → CPS 通用悬浮栏）。

**理由：** 代码生成的追加顺序需要确定性，固定顺序保证每次生成结果一致。用户选择 `CA` 等效于 `AC`。

---

### 决策 5：骨架代码中 configure + 登录检测由入口生成

入口编排器在步骤 5 生成的骨架代码包含：
1. `var sdk = window.DsActSdk` 声明
2. `sdk.configure({ production: { ... } })` 调用
3. `_setupActSdk()` 登录检测函数（检测登录态后调用各模块初始化）

子模块只负责生成各自的初始化函数体，由骨架代码统一调度。

**理由：** 登录态检测逻辑（站内 JSBridge / 站外 dsLogin）是共享的，不应在每个子模块重复。

## Risks / Trade-offs

- **[风险] 现有已接入项目的代码 marker 变更** → `DS:ACT-TASK` 改为 `DS:ACT-SDK`。审查模块（audit.md）如果搜索旧 marker 会找不到。→ 需同步检查 `audit.md` 是否引用了此 marker。
- **[Trade-off] 子模块不能独立使用** → 必须从入口进入。如果未来某个功能需要独立接入，需再提取共享前置为可选步骤。当前三个功能都依赖 SDK 注入 + configure，暂无独立使用的场景。
- **[风险] 拆分后原 act-task.md 被删除** → 已有 commit 引用该文件的历史不受影响，但需要确保 SKILL.md 路由表更新到位。

## Migration Plan

1. 创建 `ds-act-sdk.md` 入口编排器
2. 从现有 `act-task.md` 提取任务面板逻辑到新 `act-task.md`（瘦身版）
3. 从现有 `act-task.md` 提取回流任务逻辑到 `act-task-checker.md`
4. 从现有 `act-task.md` 提取 CPS 通用悬浮栏逻辑到 `act-cps-bar.md`
5. 更新 `SKILL.md` 菜单项 [6] 和路由表
6. 删除原 `act-task.md`
7. 检查 `audit.md` 和"常见问题"中对旧 marker/文件的引用

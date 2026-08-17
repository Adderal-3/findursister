## Why

当前 `act-task.md` 是一个 700+ 行的单体文件，将 SDK 注入、任务面板、回流任务、CPS 通用悬浮栏全部串联在一条线性流程中。不需要任务面板时无法跳过步骤 4-6，每新增一个可选功能文件就更臃肿，各功能文档混在一起无法单独维护或复用。需要将其拆分为入口编排器 + 独立子模块的架构。

## What Changes

- **新增** `references/ds-act-sdk.md`：入口编排器，负责前置检查、SDK 注入、configure 配置、功能多选、依次加载子模块、汇总完成报告
- **拆分** 现有 `act-task.md` 中的任务面板逻辑为独立的 `references/act-task.md`（自包含参数收集 + 代码生成）
- **拆分** 现有回流任务逻辑为独立的 `references/act-task-checker.md`（自包含参数收集 + 代码生成）
- **拆分** 现有 CPS 通用悬浮栏逻辑为独立的 `references/act-cps-bar.md`（自包含参数收集 + 代码生成）
- **修改** `SKILL.md` 菜单项 [6]：描述改为"大神活动接入（ds-act-sdk）"，路由指向 `ds-act-sdk.md`
- **BREAKING** 删除原 `act-task.md`（内容已拆分到新文件中）
- **修改** 代码块 marker 从 `DS:ACT-TASK` 改为 `DS:ACT-SDK`

## Capabilities

### New Capabilities

- `ds-act-sdk-orchestrator`: 入口编排器流程——前置检查、SDK 注入、configure 参数收集、功能多选菜单、按选择加载子模块 md、汇总完成报告
- `act-task-module`: 独立的任务面板接入模块——参数收集（showRole/触发方式）、HTML 容器注入、evoke 代码生成
- `act-task-checker-module`: 独立的回流任务接入模块——参数收集（asId/触发时机）、TaskChecker 代码生成
- `act-cps-bar-module`: 独立的 CPS 通用悬浮栏接入模块——参数收集（downloadConfig/appointDownloadButton/可选项）、evoke 代码生成

### Modified Capabilities

（无现有 spec 需修改）

## Impact

- 修改文件：`SKILL.md`（菜单项 [6] 描述 + 路由表）
- 删除文件：`references/act-task.md`（原单体文件）
- 新增文件：`references/ds-act-sdk.md`、`references/act-task.md`（瘦身版）、`references/act-task-checker.md`、`references/act-cps-bar.md`
- `SKILL.md` 第三节"常见问题与正确写法"中 ds-act-sdk 相关条目需核对引用

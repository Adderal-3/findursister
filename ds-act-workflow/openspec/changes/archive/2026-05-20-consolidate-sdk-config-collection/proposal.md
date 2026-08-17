## Why

`ds-act-sdk` 接入流程中，配置收集分散在编排器（步骤 3）与各子模块（act-task.md A.1/A.2、act-task-checker.md B.2、act-cps-bar.md C.1）内，导致用户在不同步骤被多次打断询问，`frontId` 存在重复收集风险，且子模块职责不纯粹（既问配置又生成代码）。当前 SKILL.md 中还存在与子模块 API 说明矛盾的条目。

## What Changes

- **编排器（ds-act-sdk.md）**：步骤 3 移除 `frontId` 询问；新增步骤 5「集中收集配置」，在功能选择后一次性收集所有子模块所需参数（触发方式、showRole、asId、frontId 等），`frontId` 最多问一次；步骤重新编号；完成报告删除已过时的 `downloadConfig` / `appointDownloadButton` 字段；头部补充小游戏集成参考文档链接
- **act-task.md**：移除 A.1（触发方式问答）、A.2（frontId 检查问答），步骤重编为 A.1~A.3，子模块变为纯代码生成
- **act-task-checker.md**：移除 B.2（配置问答）；更新 B.1 API 说明，澄清 `query()` 不是初始化前置而是按需获取任务列表；步骤重编为 B.1~B.3；代码不变
- **act-cps-bar.md**：移除 C.1（frontId 问答）；步骤重编为 C.1~C.2，子模块变为纯代码生成
- **SKILL.md**：修正 `tc.query()` 相关条目，消除与 act-task-checker.md B.1 的矛盾

## Capabilities

### New Capabilities

- `sdk-config-consolidation`：编排器统一收集所有功能配置（含 frontId 去重逻辑），子模块只负责代码生成

### Modified Capabilities

（无现有 spec 级别行为变更）

## Impact

- 影响文件：`SKILL.md`、`references/ds-act-sdk.md`、`references/act-task.md`、`references/act-task-checker.md`、`references/act-cps-bar.md`
- 不影响生成代码的实际内容，只影响 Skill 的交互流程
- 用户侧体验：配置收集集中到一个步骤，减少多步骤打断

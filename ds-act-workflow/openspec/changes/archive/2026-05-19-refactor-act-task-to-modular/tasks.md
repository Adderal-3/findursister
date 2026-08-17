## 1. 创建入口编排器

- [x] 1.1 创建 `references/ds-act-sdk.md`，编写步骤 1（前置检查）和步骤 2（SDK 资源注入）——内容从现有 act-task.md 步骤 1-2 提取
- [x] 1.2 编写步骤 3（共享参数收集）——actId/appKey/squareId/gameInfo，从现有步骤 3 提取
- [x] 1.3 编写步骤 4（功能多选菜单）——[A] 任务面板 [B] 回流任务 [C] CPS 通用悬浮栏
- [x] 1.4 编写步骤 5（骨架代码生成）——DS:ACT-SDK BEGIN/END 块、sdk 变量声明、configure 调用、登录态检测 `_setupActSdk()` 函数，以及"读取选中模块 md 文件"的加载指令
- [x] 1.5 编写步骤 6（汇总完成报告模板）——根据选中功能动态拼接文件变更表、配置表、验证方式

## 2. 拆分任务面板子模块

- [x] 2.1 创建新 `references/act-task.md`（瘦身版），从原文件中提取步骤 4（面板触发方式询问）的内容
- [x] 2.2 提取任务面板代码生成逻辑（initActTask 函数、evoke 调用、A/B 模式按钮代码）
- [x] 2.3 提取任务面板 HTML 容器注入说明（#ds-task-root、按钮样式）
- [x] 2.4 编写子模块占位符表格

## 3. 拆分回流任务子模块

- [x] 3.1 创建 `references/act-task-checker.md`，编写参数收集（asId、触发时机 A/B/C）
- [x] 3.2 提取 checkReturnTask 函数定义和 TaskChecker API 说明
- [x] 3.3 提取 A/B/C 三种触发模式的代码模板
- [x] 3.4 编写子模块占位符表格

## 4. 拆分 CPS 通用悬浮栏子模块

- [x] 4.1 创建 `references/act-cps-bar.md`，编写参数收集（downloadConfig、appointDownloadButton 模式、可选参数）
- [x] 4.2 提取 CpsUniversalBar.evoke 代码生成逻辑
- [x] 4.3 提取 HTML 容器注入说明（#ds-cps-bar-root）
- [x] 4.4 编写子模块占位符表格
- [x] 4.5 补充组件文档链接和 loginedUser/onLogin 自动注入说明

## 5. 更新 SKILL.md

- [x] 5.1 修改菜单项 [6] 描述为"大神活动接入（ds-act-sdk）"，描述文案更新
- [x] 5.2 修改路由表：`| 6 | {skill_dir}/references/ds-act-sdk.md |`
- [x] 5.3 检查第三节"常见问题与正确写法"中引用旧 marker `DS:ACT-TASK` 的条目，更新为 `DS:ACT-SDK`

## 6. 清理与验证

- [x] 6.1 删除原 `references/act-task.md`（内容已完全拆分到新文件）
- [x] 6.2 检查 `references/audit.md` 是否引用旧 marker 或旧文件名，同步更新
- [x] 6.3 通读 ds-act-sdk.md，确认步骤编号连贯、子模块加载指令正确
- [x] 6.4 通读三个子模块，确认各自独立可执行、代码追加位置说明清晰

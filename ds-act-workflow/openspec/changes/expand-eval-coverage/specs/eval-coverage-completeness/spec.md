## ADDED Requirements

### Requirement: 模式覆盖矩阵

`evals/evals.json` 中所有用例必须满足"模式 × 路径"二维覆盖矩阵：每个 SKILL.md 定义的模式（0–6）SHALL 至少包含 1 条正向用例和 1 条负面用例（输入异常/前置缺失/已存在冲突等）。

#### Scenario: 模式 0（规范目录结构）覆盖
- **WHEN** 检查 evals.json 中带模式 0 标识的用例
- **THEN** 存在至少 1 条正向用例（项目含 `<style>` 内嵌样式或非外链 `<script>` 内嵌脚本，期望提取到 `src/style.css` 与 `src/game.js`）
- **AND** 存在至少 1 条已规范跳过用例（项目已分离样式与脚本，期望模式 0 在前置扫描阶段静默通过、不生成多余文件）

#### Scenario: 模式 1（接入大神功能）覆盖
- **WHEN** 检查 evals.json 中带模式 1 标识的用例
- **THEN** 存在至少 1 条 HTML 项目正向用例（生成完整 SDK-LOADER + ds.js + EXPORTS）
- **AND** 存在至少 1 条更新现有 ds.js 的用例（保留原 APP_KEY/SQUARE_ID，只覆盖 EVENT_ACTION/EVENT_CATEGORY）
- **AND** 存在至少 1 条小程序默认接入用例（验证不存在独立模式 4）

#### Scenario: 模式 2（审查）覆盖
- **WHEN** 检查 evals.json 中带模式 2 标识的用例
- **THEN** 至少包含 script 标签 type 检查、SDK-LOADER 区域 type、白名单域名、JSSDK 用法、点击预检、Ulink onReady、EXPORTS window 挂载、`window.DA_SQUARE_ID` 赋值禁止、HTML 安全（eval/atob 等）九大类规则各 1 条用例（已有，不新增）

#### Scenario: 模式 3（构建打包）覆盖
- **WHEN** 检查 evals.json 中带模式 3 标识的用例
- **THEN** 存在至少 1 条"无 build 脚本直接打包"用例（期望 `scripts/zip.py` 直接运行、产物 `deploy.zip` 排除 `.git/`、`node_modules/`、`CLAUDE.md`、`.env` 等）
- **AND** 存在至少 1 条"有 build 脚本"用例（期望先执行 `npm run build`，再对 `dist/` 打包）
- **AND** 存在至少 1 条负面用例（如：build 脚本执行失败时不应生成空 `deploy.zip`）

#### Scenario: 模式 4（游戏埋点）覆盖
- **WHEN** 检查 evals.json 中带模式 4 标识的用例
- **THEN** 已有至少 1 条负面用例（无 ds.js 时阻断）
- **AND** 新增至少 1 条正向用例（已有 ds.js 的项目，期望识别交互/流程/结果/奖励节点并插入 `trackEvent` 调用）

#### Scenario: 模式 5（数据持久化）覆盖
- **WHEN** 检查 evals.json 中带模式 5 标识的用例
- **THEN** 已有至少 1 条负面用例（已存在 `game-storage.js` 时确认覆盖）
- **AND** 新增至少 1 条本地存档正向用例（生成 `game-storage.js`，AES-GCM 加密，零依赖）
- **AND** 新增至少 1 条服务端存储正向用例（接入 `mini-game-data-sdk`，生成 `game-server-storage.js`）

#### Scenario: 模式 6（ds-act-sdk）覆盖
- **WHEN** 检查 evals.json 中带模式 6 标识的用例
- **THEN** 存在至少 1 条基础 SDK 注入用例（注入 ds-act-sdk 依赖、配置 `actId` + `appKey`）
- **AND** 存在至少 1 条任务面板接入用例（含 actTaskList/回流任务）
- **AND** 存在至少 1 条 CPS 通用悬浮栏用例
- **AND** 存在至少 1 条 CPS 分发底部栏用例
- **AND** 存在至少 1 条负面用例（actId 缺失时阻断）

### Requirement: 框架覆盖矩阵

evals.json 必须覆盖 SKILL.md 声明支持的全部三种框架：HTML、React、Vue。每种框架至少 1 条端到端用例（覆盖模式 1 注入或模式 2 审查）。

#### Scenario: HTML 框架覆盖
- **WHEN** 检查 evals.json
- **THEN** 至少存在 1 条用例的 prompt 明确说明项目是"纯 HTML"或包含 `index.html` + `src/*.js` 描述

#### Scenario: React 框架覆盖
- **WHEN** 检查 evals.json
- **THEN** 至少存在 1 条 React 项目的模式 1 注入用例（期望 ds.js 在 `src/` 下，遵循 `references/react.md` 的 hook/组件接入模式）
- **AND** 至少存在 1 条 React 项目的模式 2 审查用例

#### Scenario: Vue 框架覆盖
- **WHEN** 检查 evals.json
- **THEN** 至少存在 1 条 Vue 项目的模式 1 注入用例（期望 ds.js 在 `src/` 下，遵循 `references/vue.md` 的 setup/composable 接入模式）
- **AND** 至少存在 1 条 Vue 项目的模式 2 审查用例

### Requirement: 子流程独立覆盖

某些子流程虽不构成独立模式，但有专属 reference 文档，需独立 eval 用例验证。

#### Scenario: 小程序改造端到端
- **WHEN** 检查 evals.json
- **THEN** 至少存在 1 条用例对应 `references/miniapp-h5-integration.md`（H5 → 微信小程序的完整改造路径，验证 `wx.miniProgram.postMessage`、`isWechatMiniProgram` 检测、URS Ulogin 静默检测三段集成）

### Requirement: 用例 ID 稳定性

新增用例的 `id` 字段 SHALL 从现有最大 ID + 1 开始递增，不复用历史 ID，不重排已有用例顺序。

#### Scenario: 新增用例 ID
- **WHEN** 向 evals.json 追加新用例
- **THEN** 新用例 `id` 严格大于 evals.json 中现有最大 `id`
- **AND** 已有 24 条用例的 `id`、`prompt`、`expected_output` 不被改动

### Requirement: 用例输入约定

用例的 `prompt` 字段 SHALL 包含足够的上下文（代码片段、配置值），使 sub-agent 在零额外文件输入时能产出可被 grader 评分的输出。`files` 字段仅在以下情况使用：模式 3 打包用例需要完整 mock 项目作为输入。

#### Scenario: prompt 自包含
- **WHEN** 一条 eval 不属于模式 3
- **THEN** 它的 `files` 字段 SHALL 为 `[]`
- **AND** `prompt` 中包含验证所需的全部代码片段或配置值

#### Scenario: 模式 3 用例引用 workspace mock
- **WHEN** 一条 eval 属于模式 3
- **THEN** 它的 `files` 字段可以引用 workspace 中现有的 mock 项目路径（如 `../ds-act-skills-workspace/mock-h5-project/`），而不是把 mock 文件内联到 evals.json

### Requirement: expected_output 写作风格

新增用例的 `expected_output` SHALL 沿用既有 24 条的写作模板，使同一个 grader 能稳定评分。

#### Scenario: 审查类用例的 expected_output 格式
- **WHEN** 用例 prompt 是"帮我审查..."
- **THEN** `expected_output` SHALL 以"审查报告标记 N 个阻断项/警告项："开头
- **AND** 用编号列表逐项描述每个问题的定位、原因和修复方案

#### Scenario: 注入/生成类用例的 expected_output 格式
- **WHEN** 用例 prompt 是"帮我接入..."或"帮我生成..."
- **THEN** `expected_output` SHALL 列出生成文件清单（路径 + 关键内容片段）
- **AND** 列出关键 export/window 挂载/配置字段，使 grader 能用关键字匹配判分

#### Scenario: 负面/阻断类用例的 expected_output 格式
- **WHEN** 用例 prompt 描述前置缺失或冲突场景
- **THEN** `expected_output` SHALL 明确写出阻断信息文本（如"未找到 ds.js，请先运行模式1..."）
- **AND** 明确说明"不生成任何代码"或"在用户确认前不执行"

### Requirement: 可选 tags 字段

evals.json 的每条用例 MAY 包含 `tags` 字段（字符串数组），用于按模式或框架切片跑批。`tags` 字段是可选的，缺失时保持向后兼容。

#### Scenario: tags 字段语义
- **WHEN** 一条用例包含 `tags` 字段
- **THEN** 字符串数组 SHALL 至少包含一个 `mode-N`（N 为 0–6）标签
- **AND** 涉及框架特定路径的用例 SHALL 额外包含 `framework-html` / `framework-react` / `framework-vue` 之一
- **AND** 子流程用例 SHALL 包含子流程标签（如 `subflow-miniapp`、`subflow-act-task`、`subflow-cps-bar`）

#### Scenario: tags 字段缺失向后兼容
- **WHEN** 一条用例不包含 `tags` 字段
- **THEN** eval runner 视为"未分类"，全量跑批时正常包含
- **AND** 现有 24 条用例不强制补 tags（增量推进）

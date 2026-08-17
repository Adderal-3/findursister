# ds-act-workflow 语境

ds-act-workflow 是网易大神运营活动 H5 的业务注入与审查工具，覆盖 SDK 注入、代码审查、打包部署等能力。本术语表只记词汇，不含实现细节。

## 词汇

**H5 活动**：
ds-act-workflow 处理的目标——网易大神运营活动的 H5 页面项目。多数未纳入 git（git 门禁要解决的现状）。
_Avoid_: 页面、项目（泛指时统一用「H5 活动」）

**DS 产物**：
ds-act-workflow 注入或生成的代码与文件（ds.js、SDK-LOADER、src/*.css、src/*.js、window 桥接块等），区别于 H5 活动原有代码。
_Avoid_: 注入物、生成物

**能力（capability）**：
用户意图可映射到的、有契约的工作模式（注入 / 审查 / 部署等），有编号、由用户选择执行。
_Avoid_: 功能、模式（「模式」是旧编号别名，保留作快捷方式）

**门禁（gate）**：
跨切的路由器级关注点，在任何能力执行前后自动运行，**不是**用户调用的能力、不可跳过。与能力的区别：能力可选且有编号，门禁透明且不可绕过。
_Avoid_: 钩子、中间件

**基线（baseline）**：
门禁在技能介入前对 H5 活动现状的完整快照提交，是回滚与可追溯的起点。
_Avoid_: 初始提交、快照

**能力提交（capability commit）**：
单个能力执行后由门禁自动产生的提交，带 `(ds-act-workflow)` scope，可被 `git log --grep` 追溯。
_Avoid_: 自动提交

**能力菜单展示（menu display）**：
触发 skill 后向用户展示能力全貌（编号/能力/一句话 + 推荐路径）的步骤，让用户看到有哪些能力、当前已具备哪些。首次触发或意图不明确时展示；用户明确指定能力时可直接执行。
_Avoid_: 模式列表、能力清单

**链式推荐（chained recommendation）**：
主流程能力执行完成后，重新展示菜单并推荐推荐路径里的下一步。推荐是提示不是限制，用户可偏离。
_Avoid_: 自动跳转、强制流程

**资源优化（resource optimization）**：
mode 9 能力，用 sharp 压缩 src/assets/ 下超阈图片源文件（只压质量不 resize，保持原格式）。压缩前告知运营确认，压缩后内部 vite build 验证。与 deploy 软门禁 A 形态衔接：门禁检测大图引导执行 mode 9，不自动压缩。设计决策见 ADR-0004/0005。
_Avoid_: 图片压缩（mode 9 是资源优化能力，不只压图片）

**压缩去重缓存（compress dedup cache）**：
.compress-cache.json，记录已压缩图片的内容 hash，避免重复压缩（sharp 每次压质量有损，重复压累积质量损失）。进 git 团队共享——区别于 .skill-cache.json（本地环境状态，gitignore）。设计决策见 ADR-0005。
_Avoid_: 压缩缓存（特指去重，非通用缓存）

## 用户级规范

**用户级规范（user-context guardrails）**：
ds-act-workflow 注入到运营用户级配置的 H5 开发规范，让运营用任何 agent 写 H5 代码时 agent 读到。与项目级规范（写在 H5 项目目录）区分。
_Avoid_: 全局规范、用户配置

**软约束（soft constraint）**：
规范文件（agent 可读，依赖 agent 遵守）。ds-act-workflow 的用户级规范是软约束。与硬约束（工具链，机器可执行，违规即报错）区分——ds-act-workflow 放弃硬约束。
_Avoid_: 规范文件

**抽象规则（abstract rule）**：
原则性规范，agent 推导具体行为。用户级规范用抽象规则，不穷举反模式。与详细 do/don't（穷举具体违规）区分。
_Avoid_: 原则

**guardrails 真源（guardrails source）**：
仓库内用户级规范内容的单一真源，路由器读它注入到运营用户级配置。规范内容只在仓库一处维护，避免双源漂移。
_Avoid_: 规范模板

**marker 块（marker block）**：
用户级配置文件中由特定标记包裹的规范段落，可幂等更新不破坏用户原有内容。与用户原有内容隔离，支持替换更新。
_Avoid_: 规范块

## Eval 体系

**Eval Case**:
evals.json 中的一个测试用例,由 prompt(模拟用户输入)、expected_output(期望行为描述)和 files(fixture 引用,目前全空)组成。
_Avoid_: test case, test scenario

**Expected Output**:
eval case 中描述 agent 期望行为的自然语言字段,作为语义判定的基准。非精确字符串,无法用正则或精确匹配校验。
_Avoid_: expected result, assertion

**Eval Runner**:
执行 evals.json 中各 case 并将 agent 实际输出与 expected_output 对比打分的机制。在 OMP session 内由 task subagent 加载 skill 执行 + `completion()` 语义评分（见 `docs/eval-system.md` + ADR-0001/0002），81/81 eval 全跑全 pass。
_Avoid_: test harness, eval script

**Semantic Scoring**:
因 expected_output 为自然语言而采用的 LLM 语义判定方式,替代精确匹配或正则校验。
_Avoid_: LLM grading, auto-grading

**Fixture**:
eval case 的 `files` 字段引用的输入项目(真实 H5 代码)。审查型 eval 的输入内联在 prompt 中,fixture 可空;注入型 eval 需 fixture 才能执行文件操作。当前全部 eval 的 fixture 为空。
_Avoid_: test input, input project

**审查型 Eval**:
输入代码内联在 prompt、输出为审查报告的 eval 类型。验证 skill 的决策与审查推理层,无需 fixture,纯对话可跑。
_Avoid_: review eval

**注入型 Eval**:
prompt 描述一个需接入的项目、要求生成 ds.js / 修改 index.html 等文件操作的 eval 类型。验证 skill 的文件生成层,需 fixture。
_Avoid_: generation eval

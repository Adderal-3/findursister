## Why

当前 `evals/evals.json` 共 24 条用例，分布严重失衡——审查模式（mode 2）独占 16 条，而模式 3（构建打包）零覆盖、模式 6（ds-act-sdk 任务面板/CPS 悬浮栏/分发底部栏）零覆盖、模式 4/5 仅各 1 条负面用例、React/Vue 框架路径完全未测。skill 已实现的能力大幅领先于 eval 验证范围，回归质量无法量化保证；新功能（如 game-data-sdk、act-cps-bar、miniapp-h5-integration）一旦改坏没有自动信号。本次补全用例覆盖，让 benchmark 真正反映 skill 的端到端质量。

## What Changes

- 新增模式 3（构建打包）的正/负用例：有 build 脚本走 `npm run build` 后打包、无 build 脚本直接打包、deploy.zip 排除规则验证。
- 新增模式 6（ds-act-sdk）系列用例：基础 SDK 注入、任务面板接入、回流任务、CPS 通用悬浮栏、CPS 分发底部栏、actId 缺失负面用例。
- 模式 4（游戏埋点）补正向用例：扫描业务代码、识别交互/流程/结果/奖励节点、生成 trackEvent 调用。
- 模式 5（数据持久化）补正向用例：本地存档（AES-GCM 加密）和服务端存储（mini-game-data-sdk）两条路径。
- 新增 React 项目用例：模式 1 注入、模式 2 审查（涉及 `references/react.md`）。
- 新增 Vue 项目用例：模式 1 注入、模式 2 审查（涉及 `references/vue.md`）。
- 新增小程序改造独立用例：H5 → 小程序集成（`miniapp-h5-integration.md`）的端到端流程。
- 模式 0 补正向 + 已规范跳过用例。
- 每个新用例附 `expected_output` 描述，遵循现有 24 条的写作风格，便于 grader 评分。

## Capabilities

### New Capabilities
- `eval-coverage-completeness`: 定义 `evals/evals.json` 必须满足的最小覆盖矩阵——每个模式（0–6）的正/负路径、每个支持框架（HTML/React/Vue）的至少一条端到端用例，以及关键子流程（小程序、ds-act-sdk 子模块）的独立用例。

### Modified Capabilities
（无——本次只新增 capability，不改动已有 specs/* 中的 requirement。）

## Impact

- **修改文件**：`evals/evals.json` 增量新增约 18–22 条 eval 条目。
- **新增 spec**：`openspec/specs/eval-coverage-completeness/spec.md`（覆盖矩阵约束）。
- **不影响**：skill 行为本身（references/*.md、scripts/*.py 不动）；workspace 里旧迭代结果不动，新增用例下次 `/eval` 时自动跑。
- **下游影响**：下次执行 `/eval` 时迭代时长会拉长（用例数 +75% 量级），需评估是否拆分批次。

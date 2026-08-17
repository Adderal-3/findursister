## Context

`evals/evals.json` 的现状（24 条用例）由历史增量积累而成，没有按 SKILL.md 的模式矩阵系统化补全。审查模式占比过高（66%），运营活动最常用的"打包部署"路径零覆盖，新近落地的能力（ds-act-sdk、game-data-sdk 服务端存储、CPS 悬浮栏、miniapp-h5-integration）也无对应 eval。skill-creator 推荐的 baseline vs with_skill 对比 benchmark 因此偏倚——`mode 2` 提分明显，其他模式的真实增益不可见。

本次设计聚焦 **eval 数据本身的结构与扩展规则**，不改 skill 行为。最终交付物是 `evals/evals.json` 的增量条目和 `eval-coverage-completeness` capability 的 spec（描述覆盖矩阵的最低标准）。

## Goals / Non-Goals

**Goals:**

- 建立"模式 × 框架 × 路径正负"三维覆盖矩阵，每个 cell 至少 1 条用例。
- 模式 3、6、4-正向、5-正向 从零达到可量化基线。
- React/Vue 框架进入 benchmark 视野，验证 `references/react.md` 和 `vue.md` 的真实指导效果。
- 新增 eval 沿用现有写作约定（中文 prompt + 中文 expected_output，结构化列出阻断项/警告项），grader 无需调整。

**Non-Goals:**

- 不改 SKILL.md、references/*.md、scripts/*.py。
- 不重写已有 24 条用例（保持 ID 稳定，避免 grading.json 历史失效）。
- 不引入自动化 eval 跑批 CI（属于另一个 change）。
- 不引入 `assertions` 字段（保持当前 prompt + expected_output 风格，由 grader 自己解析 expected_output）。

## Decisions

### 决策 1：用 capability spec 而非 lint 脚本表达覆盖标准

**选择**：把覆盖矩阵写成 `eval-coverage-completeness` 的 spec scenarios。

**对比方案**：写一个 `scripts/check_eval_coverage.py` 检查 evals.json 是否每个模式都有用例。

**理由**：spec 是声明式的"事实标准"，新人加用例时能直接看到约束；脚本检查会落后于规范。spec 的 scenario 也可以未来转成自动化 lint，反过来不行。

### 决策 2：复用现有 ID 段，新增用例从 #25 开始递增

**选择**：保留 #1–#24 不动，新增条目 ID 从 25 起。

**对比方案**：重排 ID 让模式连续。

**理由**：`evals/iteration-N/eval-X-foo/` 目录名里嵌了 ID，重排会让历史 benchmark 的对应关系断掉。skill-creator 文档明确说 ID 应稳定。

### 决策 3：用例 prompt 必须包含**最少必要上下文**而非完整项目文件

**选择**：prompt 里直接描述代码片段（`<script src="..."` 形式），不依赖 `files` 字段提供完整 mock 项目。

**对比方案**：每条用例都附完整 mock-h5-project 副本到 `files`。

**理由**：现有 24 条全部 `files: []`，sub-agent 在 with_skill 模式下会自己生成或推导项目结构；`files` 字段只在确实需要"基于现有项目"时才启用（如模式 3 需要校验打包产物排除规则）。保持一致性，避免 baseline 和 with_skill 的输入面积不一致。

### 决策 4：模式 3 需要 mock 输入项目，沿用 workspace 里的 `mock-h5-project`

**选择**：模式 3 用例的 `files` 字段引用 workspace 里已有的 `mock-h5-project/` 路径。

**对比方案**：把 mock 项目复制到 evals 内联或新增 fixtures 目录。

**理由**：workspace 已经有 `mock-h5-project/`、`mock-h5-project-with-ds/` 等齐全的 mock，重新拷贝违反"workspace 不提交"的原则。我们让 eval runner 在跑模式 3 时把 workspace mock 复制到该 run 的临时目录里执行——这条规则写进 spec scenario。

### 决策 5：模式 6（ds-act-sdk）用例拆分为多个独立条目，不合并

**选择**：基础 SDK 注入、任务面板、回流任务、CPS 通用悬浮栏、CPS 分发底部栏各 1 条独立用例。

**对比方案**：合并成 2-3 条"组合"用例。

**理由**：模式 6 的子模块在 `references/` 里是分别成文件的（`act-task.md`、`act-cps-bar.md`、`ds-act-sdk.md`），grader 可以针对每个子流程定位失败原因。合并会让 expected_output 太长、grader 难判分。

## Risks / Trade-offs

- **Risk**：用例数从 24 → ~42，单次 eval 跑批时间和 token 成本接近翻倍。
  → **Mitigation**：在 spec 里允许按 tag（mode-N）切片跑，CI/手动跑时可只选某模式。增加 `tags` 字段到 evals.json schema（可选字段，向后兼容）。

- **Risk**：React/Vue 用例需要 sub-agent 在沙箱里有 npm 环境，mode 3 用例需要 `npm run build` 真实可执行。
  → **Mitigation**：mode 3 用例的 expected_output 描述"产物结构"而非"运行成功"，用文件存在性判断打包动作正确即可；React/Vue 用例只验证生成代码的结构，不要求真实跑起来。

- **Risk**：新增用例的 expected_output 标准不统一，导致 grader 评分波动。
  → **Mitigation**：新增的 18+ 条 expected_output 必须沿用现有写作模式（"审查报告标记 N 个阻断项：1) ... 2) ..."、"生成 ds.js 包含：xxx 函数；xxx 字段..."），在 spec scenario 里举正面/反面写法对比例。

- **Trade-off**：保留 ID 稳定带来 ID 序号不连续（#21 插在 #4 后面是历史遗留）；新用例 ID 也会按提交顺序，不按模式分组。
  → **接受**：稳定性 > 美观；通过 evals.json 排序或 grouped report 解决可读性问题，不是结构问题。

## Migration Plan

无运行时迁移。落地步骤：

1. 写完 spec → 提交。
2. 按 spec 矩阵新增 evals.json 条目（一次 PR 内完成）。
3. 下次 `/eval` 跑批时新用例自动进入 iteration-N 结果。
4. 旧 iteration 数据保留参考价值（用例 ID 未变），新增条目在新 iteration 才出现 grading 数据，不算"回归"。

## Open Questions

- 是否要在本次顺手把 `tags` 字段加进 evals.json schema？（spec 决定先加，spec 里给出可选字段定义。）
- React/Vue 用例的 prompt 是否要标注"使用 Vite/CRA"等具体工具链？设计倾向不指定，让 sub-agent 自由选——这本身是 skill 指导能力的一部分。

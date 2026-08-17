# Eval Runner 默认单臂,A/B baseline 仅作反常逃生阀

skill-creator 默认每条 eval 跑 with-skill + without-skill 双臂以隔离 skill 边际价值,回答"这个 skill 值不值得存在"。但本 skill 的目标是改 instructions(通过 eval 回路改善能力/审查文件),问的是"skill 有没有产出正确行为"——正确性单臂即可观测:with-skill 失败即 skill bug,直接改对应 audit 模块或能力文件。审查型 eval 的规则全住在 skill 里,裸 agent 必然报不全,baseline 只会显示"裸 agent 也失败",不改变解释。决定:默认单臂跑(省一半 subagent),仅当"with-skill 失败 + 断言复核确认 eval 自身无误"这种反常情况,才补跑一次 baseline 排除"任务本身不可解"。

## Considered Options

- 一律 A/B(skill-creator 默认):2× subagent 成本,回答的是"skill 存在性论证"而非"正确性",对"改 instructions"目标是过度工程。
- 纯单臂无逃生阀:最省,但反常失败时无法排除"任务本身不可解",全靠断言复核兜底。
- 单臂 + 反常补 baseline(选定):默认省,仅在断言复核无法定论时定向补,兼顾成本与可解释性。

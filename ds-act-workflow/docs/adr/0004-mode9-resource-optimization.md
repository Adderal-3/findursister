# Mode 9 资源优化能力：独立能力而非门禁，A 形态衔接 deploy

mode 9 资源优化是独立能力（不进 deploy 门禁），用 sharp 压缩 `src/assets/` 源文件，压缩前告知运营确认，压缩后内部 vite build 验证。deploy 软门禁检测大图时引导执行 mode 9（A 形态：门禁引导 + 能力执行），不自动压缩。技术选型（sharp + cache）见 ADR-0005。

## Considered Options

- **归门禁 vs 归能力**：选能力。门禁不可跳过（CONTEXT.md 定义），压缩有损该 opt-in；门禁改代码（H2/H3 修 import）可逆，压缩改二进制有损，性质不同。
- **改源文件 vs 改产物**：选源文件。产物 gitignored 无法"git 提交"持久；改源文件一次永久小，Git 门禁基线保护可回退。
- **告知确认 vs 直接压缩**：选告知确认。mode 0/1 改代码可逆不询问，压缩有损（运营可能不察觉质量损失到上线后才发现），有损操作值得一次确认（mode 8 添加遮罩有先例）。

## Consequences

- 触 Git 门禁（改源码能力），能力提交带 `(ds-act-workflow)` scope
- deploy 软门禁新增"建议执行 mode 9"引导（A 形态衔接）
- png 大图压完仍超阈走"接受+告知"路径（见 ADR-0005）

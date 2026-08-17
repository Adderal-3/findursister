## Why

运营项目「寻物大作战」暴露图片资源偏大（排行榜头图 2.5MB）无门禁覆盖。deploy 软门禁（MR !39 加的体积警告）只警告不处理，运营要手动压缩。需要 mode 9 资源优化能力：用 sharp 压缩超阈图片源文件，自动去重避免重复压缩累积质量损失。

## What Changes

- 新增 mode 9 资源优化能力：sharp 压缩 `src/assets/` 下 >300KB 图片源文件（只压质量不 resize，保持原格式）
- 压缩前告知运营确认（有损操作），压缩后内部 vite build 验证没破坏构建
- 内容 hash 去重（`.compress-cache.json` 进 git 团队共享，避免跨人重复压缩累积质量损失）
- 压缩后仍超阈接受+告知不重压（300KB 是软门禁阈值不是硬律，长图超阈是合理场景）
- deploy 软门禁新增"建议执行 mode 9"引导（A 形态：门禁引导 + 能力执行）
- SKILL.md 能力注册表加 mode 9 行
- evals 加 mode 9 case

## Capabilities

### New Capabilities
- `resource-optimization`: mode 9 资源优化能力——sharp 压缩超阈图片源文件 + 内容 hash 去重 + 告知确认 + 内部 build 验证

### Modified Capabilities
- `deploy`: 软门禁体积警告新增"建议执行 mode 9"引导（A 形态衔接，门禁检测大图引导执行能力，不自动压缩）

## Impact

- 新增 `references/capabilities/resource-optimization.md`（mode 9 能力契约）
- `SKILL.md` 能力注册表新增 mode 9 行
- `references/capabilities/deploy.md` 软门禁段加引导
- `evals/evals.json` 加 mode 9 case
- 引入 sharp npm 依赖（C++ binding，预编译 binary）
- `.compress-cache.json` 新文件（进 git，能力提交产物）
- 触 Git 门禁（改源码能力）

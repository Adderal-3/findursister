# deploy Specification

## Purpose
TBD - created by archiving change add-mode9-resource-optimization. Update Purpose after archive.
## Requirements
### Requirement: 软门禁引导执行 mode 9
deploy 软门禁检测到 `dist/assets/` 图片 >300KB 时，SHALL 在警告中引导"建议执行 mode 9 资源优化"，不自动压缩。

#### Scenario: 软门禁引导
- **WHEN** deploy 软门禁检测到图片 >300KB
- **THEN** ⚠️ 警告"图片偏大，建议执行 mode 9 资源优化压缩"，不阻断，继续打包


# resource-optimization Specification

## Purpose
TBD - created by archiving change add-mode9-resource-optimization. Update Purpose after archive.
## Requirements
### Requirement: 压缩超阈图片源文件
系统 SHALL 用 sharp 压缩 `src/assets/` 下 >300KB 的图片源文件，只压质量不 resize，保持原格式（png/jpeg/gif）。

#### Scenario: 扫描超阈图片
- **WHEN** 执行 mode 9 资源优化
- **THEN** 扫描 `src/assets/` 下图片（.png/.jpg/.jpeg/.gif/.webp），筛选 >300KB 的

#### Scenario: 压缩保持原格式
- **WHEN** sharp 压缩图片
- **THEN** 只压质量（quality 80 默认），不 resize 尺寸，输出保持原格式（不转 webp）

### Requirement: 内容 hash 去重
系统 SHALL 查 `.compress-cache.json` 内容 hash，已压缩的图片跳过，避免重复压缩累积质量损失。

#### Scenario: 跳过已压缩图片
- **WHEN** 图片内容 hash 在 `.compress-cache.json` 中匹配
- **THEN** 跳过该图片，不重复压缩

#### Scenario: 换图重新压缩
- **WHEN** 运营换了图（内容变，hash 变）
- **THEN** 重新压缩该图，更新 cache

### Requirement: 压缩前告知确认
系统 SHALL 压缩前告知运营"X 张图将压缩，质量损失不可逆，Git 基线可回退"，等运营确认。

#### Scenario: 告知 + 确认
- **WHEN** 扫描到 N 张超阈图片（去重后）
- **THEN** 展示"即将压缩 N 张图，质量损失不可逆，Git 基线可回退"，等运营确认后才压缩

### Requirement: 压缩后内部 build 验证
系统 SHALL 压缩后内部 vite build 验证没破坏构建（H1 退出码 0）。

#### Scenario: build 验证通过
- **WHEN** 压缩完成
- **THEN** 跑 `npx vite build`，退出码 0 = 压缩没破坏构建，继续能力提交

#### Scenario: build 验证失败
- **WHEN** 压缩后 vite build 退出码非 0（图片损坏）
- **THEN** 阻断，提示"压缩破坏构建，请检查图片"，不能力提交

### Requirement: 压后仍超阈接受+告知
系统 SHALL 对压缩后仍 >300KB 的图片，接受不重压，告知运营"X 张图压完仍超阈，建议拆图/换素材"。

#### Scenario: 压完仍超阈
- **WHEN** 压缩后图片仍 >300KB
- **THEN** 不重压，报告"该图压完仍超阈，建议拆图/换素材"，继续（不阻断）

### Requirement: 能力提交 + cache 进 git
系统 SHALL 压缩后能力提交（压缩后的图 + `.compress-cache.json` 更新），cache 进 git 团队共享。

#### Scenario: 能力提交
- **WHEN** 压缩 + build 验证通过
- **THEN** Git 门禁自动能力提交（图 + cache），带 `(ds-act-workflow)` scope


# Deploy Media Volume Gate — Tasks

> 状态：已实施（Task 4 N/A：rebase 时保留 origin menu-routing 业务场景词版本，SKILL.md 未改）

## Task 1: deploy.md H3 扩展到音频/视频 [x]

- **文件**: `references/capabilities/deploy.md`
- H3 段扩展名加 `.mp3/.mp4/.wav/.ogg/.webm`
- H3 标题从"图片禁止放 `public/`"改为"媒体资源禁止放 `public/`"

## Task 2: deploy.md 软门禁加资源体积警告 [x]

- **文件**: `references/capabilities/deploy.md`
- 软门禁段加：扫 `dist/assets/` 图片/音频/视频体积超阈值→⚠️警告
- 阈值：图片 > 300KB / 音频 > 1MB / 视频 > 3MB
- 执行段注释加体积扫描步骤

## Task 3: asset-paths.md 检测模式加硬编码资源路径 [x]

- **文件**: `references/audits/asset-paths.md`
- 检测模式段加一条：硬编码完整路径字符串（含 `/` 前缀 + 资源扩展名）→阻断
- 豁免：已 hash CDN URL / 白名单 SDK 域 / `data:` / `.json` / `import` 内路径
- 已知错误检测表加对应行

## Task 4: SKILL.md 模式 [3] 描述微调 [N/A]

> rebase 到 origin/staging 时，SKILL.md 冲突用 @ours 保留 origin menu-routing 的业务场景词风格注册表（模式 3-8），放弃本 change 的模式[3] 技术细节改动。理由：origin 精简风格更合适，门禁细节在 deploy.md 里已充分。

## Task 5: evals 加 3 个 case [x]

- **文件**: `evals/evals.json`
- case A：音频在 `public/` → H3 阻断（mode-3）
- case B：图片巨大 → 软门禁警告（mode-3）
- case C：硬编码 mp3 路径字符串 → 规则 19 阻断（mode-2）

## Task 6: 写设计文档 [x]

- `docs/superpowers/specs/2026-07-27-deploy-media-volume-gate-design.md`

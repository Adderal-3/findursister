# Add Deploy Media Volume Gate

## Why

运营项目「寻物大作战」暴露 build 门禁 4 个 gap：

1. **音频不在 H3 范围**：mp3 未走构建（路径含中文/日文/空格致 505），H3 只查图片，音频漏检。
2. **无资源体积门禁**：图片巨大（`排行榜奖励头图-CMDFKy9m.png`），H1-H4 + 软门禁都不查图片/音频体积，`vite build` 也不警告图片体积。
3. **H4 preview 不交互**：条件触发的资源 403/505 抓不到，preview 只首屏静态检查。
4. **规则 19 不查硬编码路径**：只查动态拼接（`+`/模板字符串），硬编码资源路径字符串（`'/assets/art/xxx.mp3'`）漏。

需要扩展 H3 到音频/视频、加资源体积软门禁、扩展规则 19 查硬编码资源路径。

## What Changes

1. **`references/capabilities/deploy.md` H3 扩展**：扩展名加 `.mp3/.mp4/.wav/.ogg/.webm`，从"图片禁 public/"改为"媒体资源禁 public/"。
2. **`references/capabilities/deploy.md` 软门禁加体积**：扫 `dist/assets/` 图片/音频/视频体积，超阈值（图 300KB / 音 1MB / 视 3MB）→⚠️警告不阻断。
3. **`references/audits/asset-paths.md` 检测模式扩展**：加"硬编码完整资源路径字符串"检测（含 `/` 前缀 + 资源扩展名），豁免已 hash CDN URL / 白名单 SDK 域 / `data:` / `.json` / `import` 内路径。
4. **同步** `evals/evals.json` 加 3 个 case（音频在 public/、图片巨大警告、硬编码 mp3 路径）。

## Design

见 `docs/superpowers/specs/2026-07-27-deploy-media-volume-gate-design.md`。

## Impact

- `references/capabilities/deploy.md` — H3 扩展名 + 软门禁加体积段
- `references/audits/asset-paths.md` — 检测模式加一条 + 豁免说明
- `evals/evals.json` — 加 3 个 mode-3/mode-2 case

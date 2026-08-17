# Deploy 媒体资源门禁 + 体积警告 设计

- 日期：2026-07-27
- 状态：已批准
- worktree：`feature/deploy-media-volume-gate`
- 关联 openspec change：`add-deploy-media-volume-gate`

## 背景

运营项目「寻物大作战」(`wp.ds.163.com/minigame/f835e9dc-...`) 暴露 build 门禁 4 个 gap：

| # | 问题 | 性质 | 现门禁覆盖 |
|---|------|------|-----------|
| 1 | mp3 路径含中文/日文/空格致 505，未走构建 | 音频未 `import` | H3 只查图片，漏音频 |
| 2 | 图片巨大（`排行榜奖励头图-CMDFKy9m.png`） | 已 hash，体积大 | H1-H4 + 软门禁都不查体积 |
| 3 | 条件触发的资源 403/505 | 运行时条件加载 | H4 preview 只首屏静态，不交互 |
| 4 | 硬编码资源路径字符串 | 未 `import`，写死路径 | 规则 19 只查动态拼接，漏硬编码 |

> `levels-config.json?t=` 403 是运行时数据 fetch（非静态资源），不归 build 门禁管，单独给运营修复指引。

> 纠正：线上绝对 CDN URL 是 da.ds.163.com 部署平台后处理，本地 `dist/` 仍是相对路径，H2 正常工作。

## 设计（3 处改动 + 1 处不单独改）

### 改动 1 — H3 扩展到音频/视频〔gap #1〕

`references/capabilities/deploy.md` H3 段：

- 当前：扫 `public/` 下 `.png/.jpg/.webp/.svg/.gif`
- 改后：扩展名加 `.mp3/.mp4/.wav/.ogg/.webm`，标题从"图片禁止放 public/"改为"媒体资源禁止放 public/"
- 理由：音频/视频同样需走构建图获得 hash，`public/` 原样复制不带 hash，路径原样暴露（含特殊字符致 505）
- 豁免不变：`favicon.ico`

### 改动 2 — 软门禁加资源体积警告〔gap #2〕

`references/capabilities/deploy.md` 软门禁段：

- 加：扫 `dist/assets/` 下图片/音频/视频体积，超阈值→⚠️警告（不阻断）
  - 图片 > 300KB / 音频 > 1MB / 视频 > 3MB（阈值见软门禁段，按项目调整）
- 软门禁不阻断：体积阈值难统一（长图/高清背景/剧情音频合法偏大），硬阻断误杀。警告 + 指引（tinypng/转 webp/资产管理上传大音频）足够推动运营压缩
- `vite build` 本身不警告图片体积，必须自己 stat

### 改动 3 — 规则 19 加硬编码资源路径检测〔gap #4 + #1 条件触发部分〕

`references/audits/asset-paths.md` 检测模式段：

- 加：硬编码完整路径字符串（含 `/` 路径前缀 + 资源扩展名）→ ❌阻断并自动修复
  - 命中：`'/assets/art/xxx.mp3'`、`'./assets/xxx.png'`、`fetch('https://.../xxx.mp3')`
- 豁免（避免误杀）：
  - `import` 语句内的路径（合法引用）
  - 已 hash 的 CDN URL（含 `[name]-[hash].[ext]` 模式，如 `xxx-CMDFKy9m.png`）
  - 白名单外部 SDK 域（`ds.res.netease.com` 等）
  - `data:` URI
  - `.json` 不查（可能是 API endpoint）
- 自动修复：复用现有步骤 B（单资源 `import`）/ 步骤 C（多资源 `import.meta.glob`）

### 不单独改 — H4 preview 不交互〔gap #3〕

- 条件触发的**资源** 404（如 mp3）由改动 3 覆盖（硬编码资源路径会被抓）
- `levels-config.json` 类**数据 fetch** 不归 build 门禁管
- H4 增加交互探测成本高（模拟用户操作 + 等待条件触发），收益不抵成本，暂不做

## 影响范围

| 文件 | 改动 | 估行 |
|------|------|------|
| `references/capabilities/deploy.md` | H3 扩展名 + 软门禁加体积 | ~15 |
| `references/audits/asset-paths.md` | 检测模式加一条 + 豁免 | ~12 |
| `evals/evals.json` | 加 3 个 case | ~20 |

## YAGNI（不做）

- H4 交互探测（成本高收益低）
- H2 扩展到音频引用扫描（音频引用方式多样 `new Audio()`/`<audio src>`/Web Audio API，H3 源码侧 + 规则 19 已覆盖主要场景）
- 体积硬门禁阻断（误杀风险，软警告足够）
- `.json` fetch 路径检查（数据 API 非资源，不归 build 门禁）

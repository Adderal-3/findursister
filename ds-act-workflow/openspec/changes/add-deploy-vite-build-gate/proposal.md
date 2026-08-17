# Add Deploy Vite Build Gate

## Why

原 deploy 流程（情况 A）`npm run build` 产出 `dist/` 后直接 `zip.py dist`，无构建门禁。问题：

1. 退出码 0 ≠ 产物正确：运行时动态拼接的图片路径 Vite 无法静态分析、不进构建图，退出码仍 0，但产物运行时 404。
2. `public/` 资源被原样复制、不带 hash，等于没被 Vite 构建。
3. 上传 zip 后部署平台会再触发一次 vite 构建；本地不预检，平台构建失败才发现。

需要打包前先 `npx vite build` 预检 + 门禁，**门禁不过则不打包**。

## What Changes

1. **重写 `references/deploy.md` 步骤 2 为「构建门禁」**：所有项目（Cocos / 非 Cocos / 纯静态）部署前跑 `npx vite build` + 硬/软门禁。
   - **H1** `npx vite build` 退出码 0〔全量〕
   - **H2** 产物本地 js/css/img 引用全为 hashed URL〔非 Cocos〕——外部 `http(s)://` URL（CDN SDK）+ `favicon.ico` 豁免；只查本地引用
   - **H3** 图片禁放 `public/`〔非 Cocos〕——`favicon.ico` 豁免
   - **H4** preview 静态资源 200 / 无 404〔全量〕——**不查 pageerror、不查 DS SDK/登录/后端 API 非 200**（大神活动 H5 在大神 App 外 preview 时 SDK/登录/API 必然报错，属运行时环境问题非构建问题）；`favicon.ico` 豁免
   - **Cocos**：H1 + 重跑 `cocos-vite-integration.md` 步骤 6（stat dist 预期文件 + preview），豁免 H2/H3（引擎管理 public/ bundle/jsList 故意不 hash）
   - 命中 → 自动修复源码（动态拼接→`import`/`import.meta.glob`；public 图片→移 src/）+ 重建 ≤3 轮
   - 打包路由不变（Cocos→当前目录 / 非Cocos+build→dist / 纯静态→当前目录）
2. **同步** `SKILL.md` 模式 [3] 描述、`CLAUDE.md` 构建说明、`evals/evals.json` mode-3 用例（27/28/29）。
3. **修正审查模式 4.5.5** 自动修复为 `import`/`import.meta.glob`（见 `add-static-asset-path-audit` 变更）——deploy 的 H2/H3 自动修复复用 4.5.5 的定位+改写逻辑。

## Design

见 `docs/superpowers/specs/2026-07-13-deploy-vite-build-gate-design.md`。

## Impact

- `references/deploy.md` — 步骤 2 重写为构建门禁
- `SKILL.md` — 模式 [3] 描述
- `CLAUDE.md` — 常用命令注释 / 模式表行 / 打包脚本节
- `evals/evals.json` — mode-3 用例 27/28/29
- `scripts/zip.py` — 不变（打包规则不变）
- `references/audit-rules.md` + `references/audits/index.md` — 4.5.5 自动修复修正（见 `add-static-asset-path-audit`）

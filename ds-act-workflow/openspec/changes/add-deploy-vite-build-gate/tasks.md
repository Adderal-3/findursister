# Deploy Vite Build Gate — Tasks

> 状态：已实现。

## Task 1: 重写 deploy.md 步骤 2 为构建门禁 [x]

- **文件**: `references/deploy.md`
- 步骤 2 = H1-H4 硬门禁 + Cocos 步骤6（stat+preview）+ 自动修复重建循环（≤3 轮）+ 软门禁
- 步骤 1（可选审查）/ 3（打包路由，不变）/ 4（部署完成）保持

## Task 2: 更新 SKILL.md 模式 [3] 描述 [x]

- **文件**: `SKILL.md`
- 模式 [3] 描述：`npx vite build` 构建门禁（H1/H2/H3/H4）通过后才打包

## Task 3: 更新 CLAUDE.md [x]

- **文件**: `CLAUDE.md`
- 常用命令注释（情况 A → npx vite build 门禁通过后）
- 模式表行（模式 3 → 门禁通过后调用 zip.py）
- 打包脚本节加门禁说明

## Task 4: 更新 evals mode-3 用例 [x]

- **文件**: `evals/evals.json`
- id 27（纯静态 → 也跑 npx vite build 门禁）
- id 28（npm run build → npx vite build 门禁）
- id 29（npx vite build 失败 → 不打包）

## Task 5: 写设计文档 [x]

- `docs/superpowers/specs/2026-07-13-deploy-vite-build-gate-design.md`

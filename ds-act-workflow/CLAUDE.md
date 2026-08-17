# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库用途

这是一个 **Claude Code Skill**（`/ds-act-workflow`），为网易大神运营活动 H5 项目提供业务注入、代码审查、打包部署等自动化工作流。**架构说明、能力注册表与路由规则以 `SKILL.md` 为唯一真源**，本文件只承载仓库工作流指引，不重复其内容。

## 常用命令

```bash
# 运行打包脚本的单元测试
python -m pytest scripts/test_zip.py -v

# 手动打包当前 H5 项目（情况 B：无构建脚本）
python scripts/zip.py

# 打包构建产物（情况 A：有 build 脚本，门禁通过后打包 dist/）
python scripts/zip.py dist
```

## 架构与路由（指针）

为避免双源漂移，下列内容均见 `SKILL.md` 或对应 reference 文件，本文件不再 re-host：

- **四层架构**（primitives/capabilities/contracts/audits 的层职责、读取时机、层间依赖方向、templates 非-独立-层说明）→ `SKILL.md` 架构说明段。
- **各层变更频率**（维护向，SKILL.md 不载）：primitives 低 / capabilities 中 / contracts 中（随 SDK 升级）/ audits 低。
- **能力注册表与模式→文件映射**（0/C/1-8）→ `SKILL.md` 能力注册表。新增能力在那里加行，编号沿用旧映射顺延。
- **路由规则**（依赖检测 + 前置扫描 + 显式/意图驱动/歧义消解）→ `SKILL.md` 路由规则段。
- **框架检测逻辑** → `references/primitives/detect-framework.md`；框架差异（hooks/composables/全局函数、路径约定）→ `references/contracts/framework-diffs.md`。
- **依赖技能**（`appkey-naming` / `dsjssdk` / `html-security-scan`）的检测与 `.skill-cache.json` 缓存 → `references/dep-check.md`。
- **路径约定**：所有 `references/**/*.md` 用 `{skill_dir}` 表示技能安装根目录，勿硬编码绝对路径。

## 打包脚本（`scripts/zip.py`）

由模式 3 在 H5 项目目录下调用，生成 `deploy.zip`。

模式 3 在调用 `zip.py` 前，先执行 `npx vite build` 构建门禁（H1 构建成功 / H2 产物全 hash / H3 图片禁放 public / H4 preview 静态资源无 404；见 `references/capabilities/deploy.md` 判断规则 2 与 `docs/superpowers/specs/2026-07-13-deploy-vite-build-gate-design.md`）。门禁不过不打包。`zip.py` 本身不变。

关键排除规则：
- 优先读取 `.gitignore`（使用 `pathspec` 库），排除匹配的文件/目录
- 硬编码目录：`.git`、`node_modules`、`.vscode` 等
- 硬编码文件：`deploy.zip`、锁文件、构建配置（`tsconfig.json`、`vite.config.*` 等）
- `.env` 机密文件（保留 `.env.example`、`.env.sample`、`.env.template`）

修改排除规则时，同步更新 `scripts/test_zip.py` 中的对应测试用例。

## 修改技能时的注意事项

按四层架构分层变更，改动范围与层职责对齐：

- **能力契约变更**：改 `references/capabilities/*.md`（依赖/入参/出参/边界等契约段）。
- **审查规则变更**：具体规则改 `references/audits/*.md`；审查流程、加载顺序与条件触发改 `references/audits/index.md`（唯一入口，含工作流 + 规则索引）。
- **产物契约变更**：改 `references/contracts/*.md`（如 ds.js Marker 块定义改 `ds-js-markers.md`，SDK-LOADER 模板改 `sdk-loader.md`）。代码模板保留原始 `.js`/`.html` 文件作为可 lint 的真源，contracts/ 文件引用而非内联全部代码。
- **原语变更**：改 `references/primitives/*.md`（scan-html 返回原始结构化结果，detect-framework 输出框架类型）。原语无状态、不含 Marker 语义，变更时勿引入对 contracts 语义的依赖。
- **新增能力**：在 `references/capabilities/` 新建 `.md`（遵循统一契约结构），并在 `SKILL.md` 能力注册表新增一行（编号沿用旧映射 0/C/1-8，新增编号顺延）。
- **新增框架支持**：在 `references/contracts/framework-diffs.md` 新增列（框架差异：hooks/composables/全局函数、文件路径约定），必要时扩展 `primitives/detect-framework.md` 的检测分支。

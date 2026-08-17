## Why

开发者在 Vite/Webpack 项目中常通过字符串拼接（`'/assets/' + name + '.png'`、模板字符串、`require(path)` 等）动态引用资源文件。这种运行时求值的方式构建工具无法静态分析，资源不会加入构建图（无 content hash、不压缩、不上传 CDN），导致部署上线后 404。每次排查都要手动定位拼接处、找出所有资源引用、重写为静态路径，低效且容易遗漏。

## What Changes

1. **移除** SKILL.md 三、常见问题表格中的"动态拼接静态资源路径"这一行（过于具体的单一场景不放在通用排查表中）
2. **在审查流程 [2] 中新增「动态资源路径拼接检测」**：
   - 在 `references/audits/index.md` 步骤 4.5 全局业务代码扫描中增加 4.5.5 子节
   - 扫描所有业务代码文件中的动态资源路径拼接模式（字符串拼接、模板字符串、`require(path)` 等）
   - 报告每个拼接的位置、涉及的资源目录、估算总数
3. **自动修复**：检测到动态拼接时——单图改静态 `import`，多图改 `import.meta.glob`（自动生成 `src/asset-paths.js`，用 `{ eager: true, query: '?url', import: 'default' }` 收集 `键 → hashed URL` 映射并 export）；其他 JS 文件通过 `import { MAP } from './asset-paths.js'` + `MAP[key]` 替换拼接表达式。**禁止字符串映射表 + window 挂载**（Vite 不处理裸字符串路径）。Cocos 引擎文件（`settings*/main*/cocos2d-js*/physics*.js`、`public/`、`cc.resources.load` 等）豁免——引擎按固定路径加载，强制改写会破坏加载器。

## Capabilities

### New Capabilities
- `static-asset-path-audit`: 审查时检测业务代码中运行时拼接资源路径的行为，自动生成静态路径映射表文件，替换动态拼接引用

### Modified Capabilities
- 无（不修改现有 spec 的行为）

## Impact

- `references/audits/index.md` — 步骤 4.5 新增子节 4.5.5
- `references/audit-rules.md` — 末尾新增"动态路径拼接检测"规则节
- `SKILL.md` — 删表格第210行，模式 [2] 描述不变（审查已有描述不涉及具体检查项）
- 无外部依赖变更

## Why

在 ds-act-skills 的 HTML 项目模板中，生成的 ds.js script 标签使用了 `type="module"`，导致 Vite 等构建工具在构建时默认将脚本作为 ES Module 处理。这会造成运行时错误，因为 ds.js 是一个传统的 IIFE 格式脚本，不依赖 ES Module 系统。

## What Changes

- 修改 `references/html.md` 中 4-HTML-5 步骤的 script 标签生成逻辑
- 将 `<script type="module" src="/src/ds.js"></script>` 改为 `<script type="text/javascript" src="/src/ds.js"></script>`
- 确保 ds.js 仍以传统脚本方式加载，避免 Vite 构建时自动添加 `type=module`

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- 无（此变更为模板文档修复，不涉及 spec 级别的能力变更）

## Impact

- 影响范围：`references/html.md` 文件中的 HTML 项目模板
- 影响用户：使用 ds-act-skills 注入 HTML 项目的开发者
- 向后兼容：完全兼容，修复后构建产物更稳定

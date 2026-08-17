## 1. 修复 HTML 模板中的 script 类型

- [x] 1.1 修改 `references/html.md` 第 158 行，将 `<script type="module" src="/src/ds.js"></script>` 改为 `<script type="text/javascript" src="/src/ds.js"></script>`
- [x] 1.2 同时修改第 155 行的检查说明

## 2. 验证变更

- [x] 2.1 检查修改后的 html.md 文件格式
- [x] 2.2 确认没有其他地方使用 `type="module"` 引用 ds.js

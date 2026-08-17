# Static Asset Path Audit — Tasks

> 状态：已实现。实现时将自动修复从「字符串映射表 + window 挂载」修正为「import / import.meta.glob」（Vite 不处理裸字符串路径），并新增 Cocos 引擎文件豁免。

## Task 1: 从 SKILL.md 删除表格行 [x]

- **文件**: `SKILL.md`
- **操作**: 删除第210行（表格末尾的"动态拼接静态资源路径"行）
- **验收**: 表格以第209行 `| ❌ new TaskChecker()...` 结尾

## Task 2: 在 references/audit-rules.md 末尾新增检测规则节 [x]

- **文件**: `references/audit-rules.md`
- **操作**: 在文件末尾新增"动态路径拼接检测"节
- **内容**:
  - 检测模式说明（字符串拼接 `+`、模板字符串、`require()`/`import()` 拼接、硬编码裸文件名）
  - 检测范围：`src/` 下所有 `.js`/`.ts`/`.jsx`/`.tsx`/`.vue` 文件
  - **Cocos 引擎文件豁免**：`settings*/main*/cocos2d-js*/physics*.js`、`public/`、`cc.resources.load` 等不纳入
  - 自动修复：单图改静态 `import`，多图改 `import.meta.glob`（生成 `src/asset-paths.js`，`{ eager: true, query: '?url', import: 'default' }` 收集 `键 → hashed URL` 映射并 export）；**禁止字符串映射表 + window 挂载**
  - 替换业务代码中拼接引用为 `import { MAP } from './asset-paths.js'` + `MAP[key]`
  - 无法自动枚举时仅报告并建议 `import.meta.glob`

## Task 3: 在 references/audits/index.md 中增加 4.5.5 子节 [x]

- **文件**: `references/audits/index.md`
- **操作**: 在步骤 4.5.4 之后插入 4.5.5 动态资源路径拼接检测子节
- **内容**:
  - 检测模式定义 + Cocos 引擎文件豁免
  - 自动修复流程：单图 `import` / 多图 `import.meta.glob` + 替换拼接引用
  - 无法枚举时的降级策略

## Task 4: 在 references/audits/index.md 步骤 5 审查报告中增加检测行 [x]

- **文件**: `references/audits/index.md`
- **操作**:
  - "已知错误检测"表格末尾新增行：`| 动态拼接文件路径 ... | [✅ 未发现 / ❌ 阻断 发现，位置：xxx（已自动修复为 import/import.meta.glob）] |`
  - "全局扫描结果"末尾新增"动态文件路径拼接检测"节

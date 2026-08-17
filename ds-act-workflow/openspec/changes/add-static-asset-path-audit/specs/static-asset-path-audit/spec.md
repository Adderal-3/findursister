# Static Asset Path Audit

## Requirement: 检测运行时拼接静态资源路径

审查流程 SHALL 在全局业务代码扫描阶段（步骤 4.5），扫描 `src/` 下所有 `.js`/`.ts`/`.jsx`/`.tsx`/`.vue` 文件，检测以下动态拼接资源路径模式：

| 模式 | 检测信号 |
|---|---|
| 字符串拼接中夹带资源扩展名 | 代码中存在 `+ '`+扩展名（`.png`/`.jpg`/`.webp`/`.svg`/`.gif`）或 `+ "`+扩展名 |
| 字符串拼接中夹带资源目录前缀 | 代码中存在 `'assets/`+`、`'images/`+`、`'/assets/`+`、`'/images/`+` 后接 `+` |
| 模板字符串拼接资源路径 | `` `assets/${` ``、`` `images/${` `` 等目录前缀 + `${` 插值 |
| `require()` 中拼接路径 | `require(` 的参数为字符串拼接表达式 |
| `import()` 中拼接路径 | `import(` 的参数为字符串拼接表达式 |

审查流程 SHALL NOT 扫描/改写 Cocos 引擎管理文件与路径：`settings*/main*/cocos2d-js*/physics*.js`、`public/` 下文件、`cc.resources.load`/`cc.assetManager.loadResources`/`loadBundle` 等引擎资源 API 路径——由 Cocos 引擎运行时按固定路径加载（走 `public/` + 编辑器 MD5 Cache），强制改写会破坏引擎加载器。

### Scenario: 未检测到动态拼接
- **WHEN** 审查流程执行动态路径拼接检测
- **AND** 所有业务代码文件中均未发现上述拼接模式
- **THEN** 报告中显示 ✅ 未发现

### Scenario: 检测到动态拼接但可枚举
- **WHEN** 审查流程检测到动态拼接模式
- **AND** 拼接中引用的资源目录和文件命名规律可识别（如 `'assets/questions/' + q.file` 中 `q.file` 来自 `QUESTIONS_DATA` 数组）
- **THEN** 提示用户确认资源目录和文件命名规则
- **AND** 自动修复流程启动

## Requirement: 自动修复为 import / import.meta.glob

系统 SHALL 在确认资源规则后，自动修复为让 Vite 构建期将资源纳入构建图的方式（带 hash、上 CDN）：

- **单图**：在引用所在模块顶部改为静态 `import <name> from './assets/<file>'`
- **多图**：自动生成 `src/asset-paths.js`，用 `import.meta.glob('./<dir>/*.{<ext>}', { eager: true, query: '?url', import: 'default' })` 收集为 `键 → hashed URL` 映射并 `export`；文件以 `[DS:ASSET-PATHS:START]` / `[DS:ASSET-PATHS:END]` marker 包裹
- 系统 SHALL NOT 使用字符串映射表 + `window` 挂载——Vite 不处理裸字符串路径，资源仍不进构建图，部署后 404

### Scenario: 多图生成映射表文件
- **WHEN** 确认资源规则后执行自动修复（多图）
- **THEN** 生成 `src/asset-paths.js`，用 `import.meta.glob` 收集目录下所有匹配文件为 `键 → hashed URL` 映射并 `export`
- **AND** 以 `[DS:ASSET-PATHS:START]` / `[DS:ASSET-PATHS:END]` 包裹
- **AND** 只作为 ES module 被 `import` 引用，不挂 `window`、不用 `<script src>` 引入

### Scenario: 单图改静态 import
- **WHEN** 拼接实为引用单张固定图片（key 只有一个取值，或裸文件名字面量）
- **THEN** 在引用所在模块顶部改为 `import <name> from './assets/<file>'`
- **AND** 原拼接处替换为该 import 变量

### Scenario: 无法枚举时降级
- **WHEN** 检测到拼接模式但资源文件名完全在运行时决定（无法静态枚举）
- **THEN** 仅报告发现拼接，不自动修复
- **AND** 输出建议：改用 `import.meta.glob` 构建期扫描，或重构数据源以静态提供路径

## Requirement: 替换拼接引用

自动修复时，系统 SHALL 在引用拼接的文件中：
1. 多图：添加 `import { <映射表名> } from './asset-paths.js'`，将拼接表达式替换为 `<映射表名>[key]`；单图：添加静态 `import <name> from '<file>'`，将拼接替换为 `<name>`
2. 保留原变量名语义，只改变路径获取方式

### Scenario: 替换单文件引用
- **WHEN** 文件中存在 `'assets/questions/' + q.file` 拼接
- **THEN** 文件顶部添加 `import { QUESTION_IMAGES } from './asset-paths.js'`
- **AND** 该拼接替换为 `QUESTION_IMAGES[q.file]`

## Requirement: 审查报告展示

审查报告 SHALL 在"已知错误检测"表格中包含动态拼接检测行，在"全局扫描结果"末尾包含"动态资源路径拼接检测"节。

### Scenario: 已知错误检测行
- **WHEN** 审查流程输出已知错误检测表
- **THEN** 表格中包含 `| 动态拼接文件路径 | [✅ 未发现 / ❌ 阻断 发现，位置：xxx（已自动修复为 import/import.meta.glob）] |` 行

### Scenario: 全局扫描结果节
- **WHEN** 审查流程输出全局扫描结果
- **THEN** 末尾包含"动态文件路径拼接检测：已自动修复为 import/import.meta.glob / 仅发现但无法枚举 / 未发现"的描述

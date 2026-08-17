# Static Asset Path Audit — Design Document

## 问题

运行时拼接资源路径（`'/assets/' + name + '.png'`、模板字符串、`require(path)` 等）→ Vite 无法静态分析 → 资源不进构建图 → 无 hash、不上 CDN → 部署后 404。

## 方案

### 1. 移除 SKILL.md 中的表格行

直接删除 `SKILL.md` 第210行（"动态拼接静态资源路径"这一行）。

### 2. 审查流程新增检测

在 `references/audits/index.md` 步骤 4.5 末尾新增子节 **4.5.5 动态资源路径拼接检测**，行为：

**检测模式**（正则扫描业务代码文件 `src/` 下所有 `.js`/`.ts`/`.jsx`/`.tsx`/`.vue`）：

| 模式 | 正则示例 | 说明 |
|---|---|---|
| 字符串拼接 | `['"\`]\/(assets\|images\|icons)\/\w+['"\`]\s*\+` 或 `\+\s*['"\`]\.(png\|jpg\|webp\|svg\|gif)` | `'assets/' + name`、`name + '.png'` |
| 模板字符串中路径前缀 | `` `assets/${'`` 或 `` `/assets/${'`` | `` `/assets/${id}.webp` `` |
| `require()` 中拼接 | `require\s*\(\s*['"\`].*['"\`]\s*\+` | `require('./icons/' + name)` |
| `import()` 中拼接 | `import\s*\(\s*['"\`].*['"\`]\s*\+` | `import('./assets/' + path)` |

**自动修复行为**：

检测到动态拼接时（核心原则：所有静态资源必须通过 `import`/`import.meta.glob` 引入，让 Vite 构建期纳入构建图；**禁止字符串映射表 + `window` 挂载**——Vite 不处理裸字符串路径，资源仍不进构建图）：

1. 扫描所有 `src/` 下的业务代码文件，识别拼接中涉及的静态资源目录路径（如 `assets/questions/`、`assets/icons/`）
2. 询问用户确认资源目录和文件命名规律
3. **单图** → 改为静态 `import img from './assets/x.png'`
4. **多图** → 自动生成 `src/asset-paths.js`，用 `import.meta.glob` 收集为 `键 → hashed URL` 映射并 `export`：

```javascript
/* [DS:ASSET-PATHS:START] */
const _modules = import.meta.glob('./assets/questions/*.webp', {
  eager: true, query: '?url', import: 'default',
});
export const QUESTION_IMAGES = Object.fromEntries(
  Object.entries(_modules).map(([path, url]) => [
    path.split('/').pop().replace(/\.webp$/, ''), url,
  ])
);
/* [DS:ASSET-PATHS:END] */
```

5. 在引用所在模块顶部 `import { QUESTION_IMAGES } from './asset-paths.js'`，将拼接表达式替换为 `QUESTION_IMAGES[q.file]`。`asset-paths.js` 只作 ES module 被 import，**不挂 `window`、不用 `<script src>` 引入**。

**Cocos 引擎文件豁免**：`settings*/main*/cocos2d-js*/physics*.js`、`public/` 下文件、`cc.resources.load`/`cc.assetManager.loadResources`/`loadBundle` 等引擎资源 API 路径不纳入检测——由 Cocos 引擎运行时按固定路径加载（走 `public/` + 编辑器 MD5 Cache），强制改写会破坏引擎加载器。

**若无法自动枚举（如文件名完全在运行时决定）** → 仅报告不修复，给出使用 `import.meta.glob` 的建议。

### 3. 审查报告

在 `references/audits/index.md` 步骤 5 的"已知错误检测"表格末尾新增"已知错误检测"行：

```
| 动态拼接静态资源路径 | [✅ 未发现 / ❌ 发现，位置：xxx（已自动修复）] |
```

在"全局扫描结果"末尾新增"动态资源路径拼接检测"节。

### 4. 审核规则

在 `references/audit-rules.md` 末尾新增「动态路径拼接检测」规则节。

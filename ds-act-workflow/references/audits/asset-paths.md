# 动态资源路径拼接审查（asset-paths）

> **加载条件：始终。** 扫描所有业务代码文件（`src/` 下 `.js`/`.ts`/`.jsx`/`.tsx`/`.vue`），命中动态拼接资源路径即 **A 档阻断** 并自动修复。
>
> 本子文档由 audit 能力的全局业务代码扫描阶段（原步骤 4.5.5）调用，不在步骤 2 的 Marker 结构校验中执行。校验基准引用 `contracts/` 层的 Vite 构建契约——所有静态资源必须通过 `import`（单图）或 `import.meta.glob`（多图）引入，让 Vite 在构建期把资源纳入构建图（带 hash、上 CDN）。

---

## Cocos 引擎文件豁免（不纳入检测、不可自动修复）

以下文件/目录的路径由 Cocos 引擎运行时按固定路径加载，Vite 故意不处理（走 `public/` + Cocos 编辑器 MD5 Cache），**不纳入**检测与自动修复——强制改写会破坏引擎加载器：

- 引擎文件：`settings*.js`（含 `_CCSettings` 资源清单）、`main*.js`、`cocos2d-js*.js`、`physics*.js`（任意目录）
- `public/` 目录下全部文件（bundle 资源、jsList 插件，按 `<前缀><jsList url>` 放置）
- 业务代码中通过 Cocos 资源 API（`cc.resources.load` / `cc.assetManager.loadResources` / `loadBundle` 等）加载的资源键——属引擎管理，非 Vite 静态资源

---

## 检测模式（A 档阻断，发现即阻断并自动修复）

- [ ] **字符串拼接疑似文件路径**：扫描代码中 `+` 拼接，且拼接一侧是包含 **路径分隔符 `/`** 的字符串字面量（如 `'dirname/'`、`'path/to/'`、`'./'`），或拼接一侧是 **资源扩展名**（`.png`/`.jpg`/`.webp`/`.svg`/`.gif`/`.js`/`.css`/`.json`/`.mp3`/`.mp4`/`.woff` 等）的字符串字面量，或拼接两侧拼合后形如 `'./' + 变量 + '.png'` 三明治拼法 → ❌ **阻断**（需自动修复）
- [ ] **模板字符串疑似文件路径**：扫描 `` `.../${` ``、`` `./${` ``、`${` + `'.png'` 等包含路径分隔符的字符串前缀后接 `${` 插值，或 `${` 插值后接扩展名字符串 → ❌ **阻断**（需自动修复）
- [ ] **`require()` / `import()` 中拼接路径**：`require(` 或 `import(` 的参数为字符串拼接表达式 → ❌ **阻断**（需自动修复）
- [ ] **硬编码裸文件名**：扫描对象属性值、变量赋值中出现的裸字符串字面量（不含 `/` 路径前缀），以扩展名 `.png`/`.jpg`/`.webp`/`.svg`/`.gif` 结尾，且不在 `import`/`require`/`new URL()`/`new Image()` 等标准引用表达式内 → ❌ **阻断**（需自动修复）
- [ ] **硬编码完整资源路径字符串**：扫描代码中含 **路径分隔符 `/`** 的字符串字面量，且以资源扩展名（`.png`/`.jpg`/`.webp`/`.svg`/`.gif`/`.mp3`/`.mp4`/`.wav`/`.ogg`/`.webm` 等）结尾的完整路径（如 `'/assets/art/xxx.mp3'`、`'./assets/xxx.png'`、`fetch('https://host/.../xxx.mp3')`），且不在 `import` 语句内 → ❌ **阻断**（需自动修复）。**豁免**：已 hash 的 CDN URL（含 `[name]-[hash].[ext]` 模式如 `xxx-CMDFKy9m.png`）；白名单外部 SDK 域（`ds.res.netease.com` 等）；`data:` URI；`.json` 路径（可能是 API endpoint）。

---

## 自动修复规则

检测到动态拼接后，按以下流程自动修复。**核心原则：所有静态资源必须通过 `import`（单图）或 `import.meta.glob`（多图）引入，让 Vite 在构建期把资源纳入构建图（带 hash、上 CDN）。禁止用字符串映射表 + `window` 挂载——Vite 不会处理裸字符串路径，资源仍不进构建图，部署后照样 404。**

### 步骤 A — 确认资源规则

询问用户拼接引用的资源目录、文件命名规律、可枚举范围。例如对于 `'assets/questions/' + q.file`，需确认 `q.file` 的取值范围（来自 `QUESTIONS_DATA` 数组的 `file` 字段）。

### 步骤 B — 单图改静态 import

若拼接实为引用单张固定图片（运行时 key 只有一个取值，或裸文件名字面量），直接在引用所在模块顶部改为静态 import：

```javascript
// ❌ 修复前：const logo = '/assets/logo.png'  // 裸字符串，Vite 不打包
// ✅ 修复后：
import logoUrl from './assets/logo.png'
// 后续使用 logoUrl（已是 hashed URL）
```

### 步骤 C — 多图改 import.meta.glob

若拼接引用一个目录下的多张图片（key 来自数据集合），生成 `src/asset-paths.js`，用 `import.meta.glob` 在构建期把目录下所有图片收集为 `键 → hashed URL` 映射并 export：

```javascript
/* [DS:ASSET-PATHS:START] */
/**
 * 静态资源映射（由审查/部署工具自动生成）
 * import.meta.glob 让 Vite 构建期把图片纳入构建图（带 hash、上 CDN）
 * 注意：glob 路径相对本文件（src/asset-paths.js）解析
 * 禁止改为字符串映射表 + window 挂载——Vite 不处理裸字符串路径
 */
const _modules = import.meta.glob('./assets/questions/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});
export const QUESTION_IMAGES = Object.fromEntries(
  Object.entries(_modules).map(([path, url]) => [
    path.split('/').pop().replace(/\.webp$/, ''),
    url,
  ])
);
/* [DS:ASSET-PATHS:END] */
```

### 步骤 D — 替换拼接引用

在业务代码中改为 import 取值：

- [ ] 在引用所在模块顶部 `import { QUESTION_IMAGES } from './asset-paths.js'`
- [ ] 将 `'assets/questions/' + q.file + '.webp'` 或 `` `./assets/questions/${q.file}.webp` `` 替换为 `QUESTION_IMAGES[q.file]`
- [ ] 单图情形替换为步骤 B 的静态 import 变量
- [ ] `src/asset-paths.js` 只作为 ES module 被 `import` 引用——**不再挂 `window`、不再用 `<script src>` 引入**；调用方脚本须为 `type="module"`（HTML 加载顺序检查已强制，见 `./html-load-order.md`）

---

## 降级处理（文件名完全运行时决定）

若文件名完全在运行时动态决定（如 `'assets/' + userUploadedFilename`），无法静态枚举，仅报告不修复，输出建议：

```
⚠️ 发现动态拼接资源路径：xxx
    文件：xxx
    问题：文件名完全在运行时决定，无法静态枚举
    建议：用 import.meta.glob('./assets/**/*.{png,jpg,webp,svg,gif}', { eager: true, query: '?url', import: 'default' })
          构建期生成动态路径映射表，运行时用键名取 hashed URL
```

---

## 已知错误检测表（并入审查报告）

| 错误写法 | 状态 |
|----------|------|
| 字符串拼接疑似文件路径（含 `/` 字符串 + 变量，变量 + 扩展名，`./` + 变量 + 扩展名） | [✅ 未发现 / ❌ 发现，位置：xxx（已自动修复为 import/import.meta.glob）] |
| 硬编码裸文件名（不含 `/` 路径前缀的扩展名字符串） | [✅ 未发现 / ❌ 发现，位置：xxx（已自动修复为 import/import.meta.glob）] |
| 模板字符串疑似文件路径 | [✅ 未发现 / ❌ 发现，位置：xxx（已自动修复为 import/import.meta.glob）] |
| `require()`/`import()` 中拼接路径 | [✅ 未发现 / ❌ 发现，位置：xxx（已自动修复为 import/import.meta.glob）] |
| 硬编码完整资源路径字符串（含 `/` 前缀 + 资源扩展名） | [✅ 未发现 / ❌ 发现，位置：xxx（已自动修复为 import/import.meta.glob）] |

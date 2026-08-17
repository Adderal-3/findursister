<!-- ds-act-workflow:guardrails:START -->
## 网易大神 H5 活动开发规范

> 本节由 ds-act-workflow 技能安装，适用于网易大神 H5 活动项目。通用工程原则以使用者本文件既有内容为准。遵循前端开发最佳实践，适配 Vite 构建。

### 项目结构（Vite）

- `index.html` 根入口（Vite 入口，`<script type="module">` 加载主模块）
- `src/` 模块化源码（ES modules，import/export）
- `package.json` + `vite.config` 管理依赖与构建；`vite build` → `dist/`
- 资源在 JS 中 `import`（Vite 处理 hash）
- **禁止使用 `public/` 目录**——所有资源必须经构建工具处理获得 hash

### 代码规范

- **最高使用 ES6 语法**（let/const、箭头函数、模板字符串、解构、class、Promise、ES module import/export），不污染全局（需要全局时显式挂 `window`）；不用 ES2020+ 特性（可选链 `?.`、空值合并 `??`、BigInt 等）
- **CSS 使用 BEM 命名**（`block__element--modifier`）
- **JS/CSS 必须拆分到独立文件**（`src/*.js` / `src/*.css`），禁止全放 HTML（`<style>` 内联样式块、业务 `<script>` 内联脚本块；SDK-LOADER 除外）
- 函数名动词开头、变量名完整不缩写；异步操作加 try-catch
- 中文注释（JSDoc 风格）

### 行为原则（Karpathy）

| 原则 | 解决什么问题 |
|-----------|-----------|
| **编码前思考** | 错误假设、隐藏困惑、缺少权衡 |
| **简洁优先** | 过度复杂、臃肿抽象 |
| **精准修改** | 无关编辑、触碰不应碰的代码 |
| **目标驱动执行** | 通过测试优先、可验证的成功标准 |

- **编码前思考**：不假设、不隐藏困惑、呈现权衡；不确定时询问而非猜测；困惑时停下来要求澄清
- **简洁优先**：用最少代码解决问题，不添加未要求的"灵活性"；资深工程师觉得过于复杂就简化
- **精准修改**：只碰必须碰的，匹配现有风格，不"改进"无关代码；改动产生孤儿代码时删除因改动而无用的导入/变量
- **目标驱动执行**：定义成功标准，循环验证直到达成

### 编码原则

**不可变性（关键）**：始终创建新对象，绝不改变现有对象——返回包含更改的新副本，不原地修改：

```
WRONG:  modify(original, field, value) → 原地修改 original
CORRECT: update(original, field, value) → 返回包含更改的新副本
```

理由：不可变数据防止隐藏副作用，使调试更容易，支持安全并发。

**文件组织**：多个小文件 > 少数大文件。高内聚低耦合，通常 200-400 行，最多 800 行。按功能/领域组织，不按类型组织。从大型模块提取实用工具。

**错误处理**：始终全面处理错误。每层级明确处理，面向用户代码提供友好消息，服务器端记录详细上下文。绝不默默忽略错误。

### 构建合规规则

> 针对运营 H5 常见违规的抽象原则。agent 生成代码时遵守，从原则推导具体行为。

1. **资源必须经构建工具处理并获得 hash 引用**——禁止 base64 内联、**禁止使用 `public/` 目录**、资源必须走构建图获得 hash
2. **代码必须 ES module 化并合理拆分**——`<script type="module">`、import/export、禁止单文件巨型化（1-2M）
3. **资源路径必须可静态分析**——禁止运行时拼接资源地址字符串（`'/assets/' + name + '.png'`、模板字符串、`require(path)`）
4. **结构 / 样式 / 行为分离**——JS/CSS 拆分到独立文件，禁止全放 HTML；禁止内联事件处理器（onclick 等）、禁止内联资源

### H5 平台对接

- **SDK 加载顺序（不可颠倒）**：NS Stats → DS JSSDK → ULink → MobileShare
- 必填配置（新项目替换占位）：`APP_KEY`、`SQUARE_ID`、`SHARE_TITLE/DESC/ICON`、`EVENT_ACTION`
- 埋点 `trackEvent({action,value})`；登录检查 `withPrecheck(cb)`；分享 `initShare()`

### ds-act-workflow 技能

注入 / 审查 / 部署 / 埋点 / 存储 / 活动 SDK / 开发服务器 / 广告预览——走 ds-act-workflow 能力路由；H5 合规由其 audits 层（19 个审查模块）运行时强制。
<!-- ds-act-workflow:guardrails:END -->

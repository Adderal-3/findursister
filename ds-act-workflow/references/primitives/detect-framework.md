# 原语：detect-framework

> 无状态框架检测。输出框架类型（HTML/React/Vue）+ `IS_COCOS` 标志。
>
> 被 inject / structure / cocos-vite 等能力引用，决定后续读哪个框架模板、是否跳过微信 JSSDK 注入。

## 依赖

- 无（纯读取 + glob 操作）

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| 项目根目录 | 调用方 | 是 | 当前工作目录 | 前置传递 |

## 出参

| 字段 | 类型 | 取值 | 说明 |
|------|------|------|------|
| `framework` | 枚举 | `HTML` / `React` / `Vue` | 框架类型，决定 inject 读哪个模板文件 |
| `IS_COCOS` | 布尔 | `true` / `false` | 是否 Cocos Creator web-mobile 导出工程 |

> 两个标志独立：Cocos 工程的 `framework` 仍按 package.json 判定（通常为 `HTML`，因 Cocos 导出产物无 package.json），`IS_COCOS` 单独标记。

## 能做什么

- 读取 `package.json` 的 `dependencies` + `devDependencies`，判定 React / Vue
- glob 扫描项目 `.js` 文件，检测 Cocos Creator web-mobile 导出特征
- 返回框架类型 + IS_COCOS 两个独立标志

## 不能做什么

- **不修改任何文件**——只读 + glob
- **不扫描 HTML 结构**——HTML 注释 / style / script 块的扫描是 `scan-html` 的职责
- **不决定后续能力路由**——只输出标志，由调用方（SKILL.md router 或能力文件）决定读哪个模板、是否跳过 JSSDK
- **不检测构建工具**——Vite/Webpack 等不在本原语范围（Cocos Vite 工程的构建工具判定由 `cocos-vite` 能力自行做）

## 判断规则

### 框架类型（`framework`）

读取当前工作目录下的 `package.json`（若不存在 → `HTML`），检查 `dependencies` 和 `devDependencies`：

| 条件 | 判定 |
|------|------|
| 含 `"react"` 键 | `React` |
| 含 `"vue"` 键 | `Vue` |
| 无 `package.json` 或均未匹配 | `HTML` |

> 优先级：react 优先于 vue（实际项目不会同时依赖两者；若同时出现，以 react 为准并提示异常）。

### Cocos 检测（`IS_COCOS`）

**两项条件必须同时满足**才判定为 Cocos 项目（均排除 `node_modules`、`dist`）：

1. 项目内存在 `cocos2d-js*.js` 文件（glob 匹配，不限目录层级）
2. 项目内任意 `.js` 文件内容包含 `_CCSettings`

| 条件 1 | 条件 2 | `IS_COCOS` |
|--------|--------|------------|
| ✅ | ✅ | `true` |
| ✅ | ❌ | `false` |
| ❌ | ✅ | `false` |
| ❌ | ❌ | `false` |

**`IS_COCOS=true` 的下游影响**（由调用方执行，本原语只输出标志）：
- inject：跳过微信 JSSDK（`jweixin`）加载，`[DS:SHARE]` 普通浏览器分支降级为 no-op
- sdk-loader 契约：`{IS_COCOS}` 占位符替换为 `true`，mobile-share 不加载
- 原因：MobileShare 会间接加载微信 JSSDK，Cocos 引擎检测到 `window.wx` 后误判为微信小游戏环境进入错误分支导致白屏

## 幂等性

- 纯读取 + glob，任意次数重入结果一致（前提：项目文件未被外部修改）

## 组合

| 方向 | 能力 | 关系 | 必须/推荐 |
|------|------|------|-----------|
| 下游 | inject | inject 据 `framework` 选模板文件，据 `IS_COCOS` 决定是否跳过 JSSDK | 必须 |
| 下游 | cocos-vite | cocos-vite 据 `IS_COCOS` 判定是否进入 Cocos Vite 集成流程 | 推荐 |
| 下游 | structure | structure 据 `IS_COCOS` 决定是否对 Cocos 启动块豁免 | 推荐 |

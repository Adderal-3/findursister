## Context

`isWechatMiniProgram()` 通过 UA 检测 `miniprogram` 字符串判定是否在微信小程序 WebView 中运行。该函数被用作 `wx.miniProgram.*` 调用的唯一切入点守卫。但存在两类风险：

1. **间接 wx 污染**：第三方库在不含 `miniprogram` 的 UA 环境中注入 `window.wx`（MobileShare 即为此例，已通过 `IS_COCOS` 豁免修复），此时 `isWechatMiniProgram()` 为 false 看似安全，但 `window.wx` 已存在于全局。如果未来有新代码以为 `isWechatMiniProgram` 为 true 等价于 `wx` 可用、或是绕过守卫直接调 `wx.xxx`，就会命中中间态。
2. **语义错配**：`isWechatMiniProgram()` 回答"我在微信里吗"，而 `wx.xxx` 调用需要回答"wx 对象加载了吗"。只有在小程序 WebView 中这两个问题答案一致（浏览器提供 wx），其余场景不能混用。

更关键的是，Cocos 项目注入 `jweixin` 已被跳过，未来任何向 Cocos 环境注入 `window.wx` 的变化都应符合同一防御策略——不在"为什么会有 wx"上做假设，只判断"wx 是否存在"。

## Goals / Non-Goals

**Goals:**
- 所有 `wx.miniProgram.*` 调用前添加 `typeof window.wx !== 'undefined'` 检查（或等价短路表达式）。
- 保留 `isWechatMiniProgram()` 函数不做删除——它仍用于环境区分逻辑（如跳过 ulink、选择登录方式），只是不再作为 `wx` 调用的唯一切入点。
- 审查规则能检测到裸调 `wx.*` 的代码并报告。

**Non-Goals:**
- 不删除或重命名 `isWechatMiniProgram()`。
- 不修改 `isWechatMiniProgram()` 的实现逻辑。
- 不影响非模板代码（用户自己的业务代码）——仅模板生成 + 审查覆盖。

## Decisions

### 决策 1：守卫写成 `typeof window.wx !== 'undefined'` 而非 `window.wx &&`

**选择：** `typeof window.wx !== 'undefined'`

**理由：** `window.wx &&` 对 `window.wx === null` 或 `0` 或 `false` 都会短路，但这些值不会出现在微信环境中。`typeof` 更精确地表达"该全局变量是否已定义"。对压缩/obfuscation 也安全。

**替代：** `'wx' in window` 也同样正确，但 `typeof` 更常见于代码库现有风格（如模板中的 `typeof MobileShare !== 'undefined'`）。选择一致风格。

### 决策 2：`isWechatMiniProgram()` 保留不动

**选择：** 保留该函数，不修改其实现，不将其返回值与 `window.wx` 存在性耦合。

**理由：** `isWechatMiniProgram()` 在 `withPrecheck`、`initApp`、`initUlink` 等处用于环境分流决策（走不走 ulink、用哪种登录方式），这些决策依赖 UA 特征而非 `wx` 对象存在性。修改该函数会牵连过多。

### 决策 3：审查规则新增通用"wx 调用必须有存在性检查"，不限定特定函数

**选择：** 审查规则描述为"所有 `wx.` 调用前必须有 `typeof window.wx !== 'undefined'`（或等价判断）"，不绑定具体函数名（如 `isWechatMiniProgram`）。

**理由：** 防范未来有人在非模板代码中直接调 `wx.xxx`。

## Risks / Trade-offs

- **风险：有人反过来移除 `isWechatMiniProgram` 调用点** —— 守卫改成 `window.wx` 存在性后，开发者可能觉得 `isWechatMiniProgram()` 冗余而删除。但它仍用于环境分流（登录方式、ulink 跳过）。**缓解：** 注释标注清楚两件事的职责边界——`isWechatMiniProgram()` = 环境判断，`typeof window.wx !== 'undefined'` = SDK 可用性。
- **权衡：代码略微膨胀** —— 每个 `wx.` 调用点会增加一层 if 判断（约 2 行）。但在关键路径上这比 ReferenceError 的代价小几个数量级。

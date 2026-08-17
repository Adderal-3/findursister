# HTML 加载顺序检查

遍历所有含 DS Marker 的 HTML 文件，扫描每个文件中**全部 `<script>` 标签**，每一个标签都必须明确指定 `type` 属性，不允许省略：

| 情形 | 要求 |
|------|------|
| **src 为相对路径**的 `<script>`（如 `src/ds.js`、`src/game.js`、`./xxx.js`） | **必须** `type="module"` → 违反即**阻断** |
| SDK-LOADER 区域内的脚本（绝对 URL，IIFE 格式） | `type="text/javascript"` |
| 其他绝对 URL 的第三方库（如微信 JSSDK、universal-login） | `type="text/javascript"` |
| 其他内联 `<script>`（无 src） | 含 `import`/`export` → `type="module"`；纯传统 JS → `type="text/javascript"` |

**核心规则：凡 `src` 指向相对路径的 `<script>` 标签，一律 `type="module"`，不允许用 `type="text/javascript"` 或省略 type。**

- [ ] **所有 `<script>` 标签都有明确的 `type` 属性**（不允许省略）→ 缺失标记为**警告**
- [ ] **所有 src 为相对路径的 `<script>` 必须有 `type="module"`** → 违反即**阻断**
  > 相对路径脚本均使用 ES Module 语法（import/export），缺少 type="module" 或错误使用 type="text/javascript" 会导致浏览器语法错误，脚本完全不执行
- [ ] SDK-LOADER 区域内的 `<script>` 有 `type="text/javascript"`（IIFE 格式，加 `type="module"` 反而出错）
- [ ] 其他内联 `<script>` 若含 `import`/`export` 则必须有 `type="module"` → **阻断**
- [ ] ds.js 在所有游戏业务 script **之前**
- [ ] SDK-LOADER 在 `<head>` 中
- [ ] 游戏业务 script 在 `</body>` 附近

### `<script type>` 审查示例

**✅ 正确写法：**

```html
<!-- SDK-LOADER 区域：IIFE 格式，用 text/javascript -->
<!-- [DS:SDK-LOADER ...] -->
<script type="text/javascript" src="https://...ds-js-sdk.min.js"></script>
<script type="text/javascript">!function(){...}()</script>
<!-- [DS:SDK-LOADER-END] -->

<!-- 微信 JSSDK / universal-login 等第三方库：传统 IIFE，用 text/javascript，须在 ds.js 之前 -->
<script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
<script type="text/javascript" src="https://g.166.net/pkg/universal-login/2.1.4/index.umd.min.js"></script>

<!-- ds.js：有 export，用 module -->
<script type="module" src="src/ds.js"></script>

<!-- game.js：有 import，用 module -->
<script type="module" src="src/game.js"></script>
```

**❌ 错误写法及对应问题：**

```html
<!-- ❌ 缺少 type：ds.js 的 export 语法报错 → 阻断 -->
<script src="src/ds.js"></script>

<!-- ❌ 缺少 type：game.js 的 import 语法报错 → 阻断 -->
<script src="src/game.js"></script>

<!-- ❌ 相对路径脚本用了 text/javascript：export/import 语法报错 → 阻断 -->
<script type="text/javascript" src="src/ds.js"></script>
<script type="text/javascript" src="src/game.js"></script>
<script type="text/javascript" src="./utils.js"></script>

<!-- ❌ SDK-LOADER 内用了 type="module"：IIFE 与 module 作用域不兼容，平台初始化失败 → 阻断 -->
<script type="module" src="https://...ds-js-sdk.min.js"></script>

<!-- ❌ 微信 JSSDK 缺少 type：警告 -->
<script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>

<!-- ❌ universal-login 缺少 type：警告 -->
<script src="https://g.166.net/pkg/universal-login/2.1.4/index.umd.min.js"></script>

<!-- ❌ 顺序错误：ds.js 在 game.js 之后，import 找不到模块 → 阻断 -->
<script type="module" src="src/game.js"></script>
<script type="module" src="src/ds.js"></script>

<!-- ❌ 顺序错误：jweixin 在 ds.js 之后，小程序环境初始化失败 → 阻断 -->
<script type="module" src="src/ds.js"></script>
<script type="text/javascript" src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
```

### 重复逻辑检测（全局扫描业务代码）

> ⚠️ 此检查需扫描全部业务代码文件（不限于 DS 注入文件列表），在审查步骤 4.5 中执行。

审查游戏代码中是否存在与 ds.js 功能重复的逻辑：
- [ ] `isInDashenApp()` 或类似检测函数
- [ ] `openInDashen()` 或类似唤起函数
- [ ] 自定义的 ulink 跳转逻辑

如发现重复逻辑，询问用户是否需要清理。

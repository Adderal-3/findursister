# 能力：Cocos Vite 集成（模式 C / COCOS-VITE）

> 将 Cocos Creator 导出的 `web-mobile` 产物接入 Vite 构建管线，使引擎脚本获得文件名 hash（CDN 缓存可更新），同时保留 Cocos 的全局变量加载约定。
>
> 核心是**两根支柱**：引擎脚本走 `?url` import（支柱 1），运行时硬编码路径加载的资源走 `public/`（支柱 2）。

## 依赖

- **前置能力**：无。本能力直接作用于 Cocos Creator 导出的 `web-mobile` 原始产物，不依赖其他能力。
- **公共原语**：
  - `primitives/scan-html.md`——返回 HTML 注释清单、style/script 块、head/body 区间。本能力用它读 `index.html` 的 `<link rel="stylesheet">` 清单与底部内联 `loadScript` 调用顺序。
  - `primitives/detect-framework.md`——输出 `framework` + `IS_COCOS` 标志。`IS_COCOS=true` 是进入本能力的前提；`framework` 对本能力无分支影响（Cocos 导出产物通常为 `HTML`）。
- **产物契约**：无。本能力产出的 `entry.js` / `package.json` / `public/` 资源无独立 contracts 文件，结构由本文"出参"段 + 附属"entry.js 骨架"段声明。
- **外部技能**：无。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| `IS_COCOS` | detect-framework 原语 | 是 | — | 前置传递（布尔，不询问用户；`false` 时本能力不执行） |
| settings 文件名 | 文件发现 | 是 | — | glob `src/settings*.js` 恰好 1 个匹配 |
| main 文件名 | 文件发现 | 是 | — | glob 项目根 `main*.js` 恰好 1 个匹配 |
| cocos2d 引擎文件名 | 文件发现 | 是 | — | glob 项目根 `cocos2d-js*.js` 恰好 1 个匹配 |
| physics 文件名 | 文件发现 | 否 | — | glob 项目根 `physics*.js` 0 或 1 个匹配（见判断规则段 1） |
| physics 启用标志 | 判断规则段 1 | 是 | — | 4 级优先级判定（main 文件 grep → index.html 内联块 → 文件存在提示 → 不启用） |
| CSS 文件清单 | scan-html 原语 | 是 | — | `index.html` 中所有 `<link rel="stylesheet">` 的 `href`（排除外部 URL） |
| HTML 内联 loadScript 顺序 | scan-html 原语 | 是 | — | `index.html` 末尾内联 `<script>` 块中 `loadScript` 各次调用参数顺序 |
| jsList 完整清单 | settings 文件 | 是 | — | `_CCSettings.jsList` 字段的完整数组（可能跨多行，须取全部元素） |
| jsList 运行时前缀 | 判断规则段 2 | 是 | — | main 文件中 `jsList` 调用点的 `.map(...)` / 字符串拼接提取（不可省略） |

> **文件发现禁止使用示例值**：上述所有"文件发现"入参必须用 glob 实际匹配到的文件名，禁止照搬本文档或 entry-skeleton 骨架中的占位符。发现结果直接进入后续步骤，无需中断等待用户确认。
>
> **jsList 运行时前缀不可猜**：`_CCSettings.jsList` 中的字符串不一定是浏览器最终请求的 URL，Cocos 可能在 main 文件中加前缀（常见 `src/`、空、或自定义）。未发现真实前缀直接复制到 `public/<jsList url>` 运行时必然 404。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| entry.js | 项目根 `entry.js` | 附属"entry.js 骨架"段；`?url` import 列表含实际发现的 settings/main/cocos2d（+physics 启用时），CSS import 与 `<link>` 一致，`loadScript` await 顺序与 HTML 内联块一致 |
| index.html（改写） | 项目根 `index.html` | 底部所有 `<script src="settings.js">` + `<script src="main.js">` + 内联 `loadScript` 块替换为一行 `<script type="module" src="/entry.js">`；CSS `<link>` 保留 |
| package.json | 项目根 `package.json` | 最小化：`{ "private": true, "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" }, "devDependencies": { "vite": "^8" } }` |
| .gitignore | 项目根 `.gitignore` | 至少含 `node_modules`、`dist`、`public/`、`*.zip`、`.ccg/` |
| public/assets/ | `public/assets/` | `assets/` 目录原样复制（bundle 资源，Cocos 编辑器 MD5 Cache 负责 hash） |
| public/ jsList 插件 | `public/<前缀><jsList url>` | 每项 jsList 按"前缀 + url"拼接部署路径（见判断规则段 2） |

## 能做什么

- **发现实际文件**：glob 匹配 settings/main/cocos2d/physics 文件，读 `index.html` 的 CSS 清单与 loadScript 顺序，读 settings 文件的 jsList 完整数组，发现 jsList 运行时前缀。
- **生成 entry.js**：按发现的文件名填充骨架，引擎脚本全部 `?url` import，CSS 各一行 `import`，`loadScript` 按序 await，physics 不启用时完全不出现 physics 代码（含 `if` 包裹块）。
- **改写 index.html**：底部旧加载方式替换为单行 `<script type="module" src="/entry.js">`，CSS `<link>` 不动。
- **部署运行时资源到 public/**：`assets/` 原样复制；jsList 每项按 `<前缀><url>` 部署路径放置，源文件按基本文件名递归查找（排除 `public/`、`node_modules/`、`dist/`）。
- **工程化**：创建/更新 `package.json` 与 `.gitignore`。
- **验证**：`npm install && npm run build` 后静态 stat `dist/` 清单 + 启动 preview 程序化校验入口/引擎组与运行时资源组全部 HTTP 200、无 404、无 pageerror。

## 不能做什么

- **不照搬骨架文件名**——entry-skeleton 仅供理解结构，所有文件名必须用实际发现的值替换。
- **不让 Rollup 碰到 Cocos 引擎脚本**——引擎脚本走 `?url` → `loadScript` 路径，不作为模块依赖被 Rollup 解析（`require('src/settings.js')` 会被静态解析挂掉）。
- **不按源文件磁盘路径推断 jsList 部署路径**——永远以"前缀 + jsList url"拼接结果为准。源文件常在 `src/assets/`，前缀 `src/` + url `assets/...` 恰好拼回是巧合，不是规律。
- **不把全部资源丢进 public/**——那样文件不带 hash，CDN 缓存永远不更新。引擎脚本必须走 `?url` import 获得 Vite 文件名 hash。
- **不把引擎脚本写成 `<script type="module">`**——Cocos 的 `require()` 会被 Rollup 静态解析挂掉。
- **physics 不启用时不留任何 physics 代码**——`?url` import 在 Vite 中总是执行复制，`if (window.CC_PHYSICS_...)` 包不住；不启用就完全不出现 physics import 与包裹块。
- **不静默跳过 MISSING jsList 项**——任一 jsList 项在项目全局递归查找后不存在，必须报告并给出选项（回 Cocos Creator 重新导出 / 确认废弃后从 jsList 移除），不允许带着缺失项进入运行验证。
- **不只用"打开浏览器肉眼看启动画面"作为唯一验证**——启动画面在 jsList 加载之前就显示，看到画面 ≠ jsList 真的加载成功；控制台 404 必须程序化采集。
- **不决定后续能力路由**——集成完成后可提示后续选项（inject/deploy），但不强制执行。

## 判断规则

### 1. physics 启用判定（4 级优先级，命中即停）

`CC_PHYSICS_BUILTIN` / `CC_PHYSICS_CANNON` 由 Cocos Creator 编译期注入到 **main 文件**，**不在 `_CCSettings` 里**——不要去 settings 文件里找。

| 优先级 | 判定条件 | 结果 |
|--------|---------|------|
| 1 | main 文件中 grep `CC_PHYSICS_BUILTIN` 或 `CC_PHYSICS_CANNON`，找到任一引用 | **启用** |
| 2 | index.html 内联块含 `loadScript(... 'physics...', window.boot)` | **启用** |
| 3 | 1、2 都未命中且 physics 文件存在 | 提示用户人工确认（疑似启用但无法证实，默认按启用处理避免漏装） |
| 4 | 1、2 都未命中且 physics 文件不存在 | **不启用** |

> **边界**：physics 文件不存在但判定 1 或 2 命中 → 报错退出（导出不完整）。

### 2. jsList 运行时前缀发现（必做）

`_CCSettings.jsList` 中的字符串**不一定就是浏览器请求的最终 URL**。Cocos 在 main 文件中可能给 jsList 项加前缀。判定流程：

1. 在 main 文件中 grep `jsList` 或 `loadScript`，定位把 `settings.jsList` 传给 loader 的那一行。
2. 观察该行的 `.map(...)` 或字符串拼接，提取前缀：

   | 代码形式 | 前缀 |
   |---------|------|
   | `settings.jsList.map(x => 'src/' + x)` | `src/` |
   | `settings.jsList.map(x => x)` 或直接传 `settings.jsList` | 空 |
   | `BASE_URL + x` 等自定义拼接 | 该 BASE_URL 的运行时值 |

3. 部署路径 = `public/<前缀><jsList url>`。

> **边界**：main 文件中找不到 `jsList` 引用 → 报错退出（导出不完整或 main 文件不是 Cocos 标准导出），不能猜前缀。

### 3. 文件发现边界规则

| 情况 | 处理 |
|------|------|
| 任一必发现项（settings/main/cocos2d）匹配 0 个 | 报错退出（导出不完整） |
| 任一必发现项匹配 >1 个（如同时 `main.js` 和 `main.5f647.js`） | 报错退出（旧产物残留） |
| physics 文件匹配 0 或 1 个 | 正常（0 个时按判定规则段 1 处理） |
| jsList 为空数组或不存在该字段 | 跳过 jsList 第二类部署 |
| 某个 jsList 项全局递归查找命中 0 个 | 报告该项文件名、jsList url、计算部署路径，给两选项（重新导出 / 从 jsList 移除），**继续处理下一项不跳过整个列表** |
| 某个 jsList 项命中 >1 个 | 列出所有命中位置，让用户选择正确源 |

### 4. jsList 部署路径计算示例

| jsList url | 步骤 2 发现的前缀 | 部署路径 |
|-----------|------------------|----------|
| `assets/scripts/plugins/foo.js` | `src/`（常见） | `public/src/assets/scripts/plugins/foo.js` |
| `assets/scripts/plugins/foo.js` | 空 | `public/assets/scripts/plugins/foo.js` |
| `assets/scripts/plugins/foo.js` | `cdn/v2/` | `public/cdn/v2/assets/scripts/plugins/foo.js` |

### 5. 资源归属判定（两根支柱）

| 资源类型 | 交给谁 | hash 机制 |
|----------|--------|-----------|
| settings / main / cocos2d 引擎 / physics | entry.js 的 `?url` import | Vite 文件名 hash |
| CSS | entry.js 的 `import`（Vite 去重 `<link>`，双重来源比丢失好） | Vite 文件名 hash |
| `assets/<bundle>/` bundle 资源 | `public/` 原样复制 | Cocos 编辑器 MD5 Cache |
| jsList 插件脚本 | `public/<前缀><jsList url>` | Cocos 编辑器 MD5 Cache |

## 幂等性

- **重入检测标志**：
  - entry.js：项目根 `entry.js` 存在。
  - index.html 改写：含 `<script type="module" src="/entry.js">`。
  - Vite 工程：`package.json` 含 `"vite"` 依赖。
  - public/ 资源：`public/assets/` 与 `public/<前缀><jsList url>` 文件存在。
- **重入行为**：
  - **entry.js**：已存在则**覆盖**（用最新发现的文件名重新生成，不部分保留——文件名发现是确定性的，旧值无保留意义）。
  - **index.html**：已含 `/entry.js` 引用 → 跳过改写；否则替换旧加载块。
  - **package.json / .gitignore**：已存在则合并/补齐缺失项，不覆盖用户已有字段。
  - **public/ 资源**：已存在则跳过复制（文件内容由 Cocos 导出决定，不变）。
  - **jsList 部署**：每次重入重新按"前缀 + url"计算部署路径并验证 stat，缺失项重新部署。

## 执行步骤

本能力是**严格串行管线**，每一步的输出是下一步的输入，无可并行节点：

```
detect-framework（返回 IS_COCOS，false 则不进入）
  ↓
文件发现（glob settings/main/cocos2d/physics + 边界规则校验）
  ↓
scan-html（读 index.html 的 CSS 清单 + 内联 loadScript 顺序）
  ↓
physics 启用判定（4 级优先级，main grep → index.html 内联块 → 文件存在 → 不启用）
  ↓
jsList 清单读取（settings 文件 _CCSettings.jsList 完整数组）
  ↓
jsList 运行时前缀发现（main 文件 grep jsList 调用点，提取 .map/拼接前缀）
  ↓
entry.js 生成（?url import + CSS import + loadScript await 顺序）
  ↓
index.html 改写（旧加载块 → 单行 module script）
  ↓
public/ 资源部署（assets/ 原样复制 ‖ jsList 按 <前缀><url> 部署）
  ↓
工程化（package.json + .gitignore）
  ↓
验证（build → dist/ 静态 stat → preview 运行时 HTTP 200 + 无 404 + 无 pageerror）
```

## 附属：entry.js 骨架

> 仅供理解结构，**禁止照搬文件名**。使用时用实际项目中发现到的文件名替换所有 `<...>` 占位符；physics 未启用时删除标注"仅 physics 启用时"的行；CSS import 列表与 index.html 中 `<link>` 的 href 一致。

```js
// -- 引擎脚本 (?url 表示只取路径，不执行文件内容) ------------------
import settingsUrl from './<实际 settings 文件路径>?url'
import mainUrl     from './<实际 main 文件路径>?url'
import cocosUrl    from './<实际 cocos2d 文件路径>?url'
// ↓ 仅 physics 启用时保留
import physicsUrl  from './<实际 physics 文件路径>?url'

// -- CSS (每个 <link> 对应一行) ----------------------------------
import './<实际 style-mobile 文件名>'
import './<实际 style-desktop 文件名>'  // 若存在

// -- VConsole 桥接 (如果 Cocos 导出时有) -------------------------
if (typeof VConsole !== 'undefined') {
  window.vConsole = new VConsole()
}

// -- 启动画面 ---------------------------------------------------
const splash = document.getElementById('splash')
splash.style.display = 'block'

// -- 动态脚本加载 (保持全局作用域执行) ----------------------------
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.async = false
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.body.appendChild(s)
  })
}

// -- 按 Cocos 要求的顺序加载 -------------------------------------
;(async () => {
  await loadScript(settingsUrl)   // 1. 先加载 settings
  await loadScript(mainUrl)       // 2. 再加载 main
  await loadScript(cocosUrl)      // 3. 最后加载 cocos 引擎

  // ↓ 仅 physics 启用时保留此三行
  if (window.CC_PHYSICS_BUILTIN || window.CC_PHYSICS_CANNON) {
    await loadScript(physicsUrl)
  }

  window.boot()
})()
```

> **physics 不启用时**：删除 `import physicsUrl` 行与 `if (window.CC_PHYSICS_...)` 包裹块——`?url` import 在 Vite 中总是执行复制，`if` 包不住，残留 import 会让 physics 文件进入 dist/。

## 附属：jsList 逐文件定位流程

> 本流程依赖"判断规则段 2"已发现的 **jsList 运行时前缀**。若未发现，先回主流程完成发现——本流程所有路径计算都依赖这个前缀。

设发现的前缀为 `<前缀>`（可能为 `src/`、空字符串、或其他自定义值）。对 `_CCSettings.jsList` 数组中的每一项 `<url>`：

1. **解析**：
   - 从 `<url>` 的最后一段提取基本文件名 `<name>`
   - 计算目标部署路径：`public/<前缀><url>`
2. **递归查找**：在项目内查找文件名为 `<name>` 的文件，排除 `public/`、`node_modules/`、`dist/` 目录。
3. **按命中数处理**：

   | 命中数 | 处理 |
   |--------|------|
   | 1 | `mkdir -p public/<前缀><url 所在的父目录> && cp <源> public/<前缀><url>` |
   | 0 | 报告 `❌ jsList 引用的文件未找到: <url>（应部署到 public/<前缀><url>）`，建议回 Cocos Creator 重新导出或确认插件已废弃后从 jsList 移除。**继续处理下一项，不跳过整个列表** |
   | >1 | 列出所有命中位置，让用户选择正确的源，再按 1 的方式复制 |

4. **全部处理后汇总**：列出所有 MISSING 项，用户手动确认后继续。任何 MISSING 不能静默跳过。

**验证**：对 jsList 中每项 `<url>`，确认 `public/<前缀><url>` 文件存在于磁盘。全部 ✓ 才算通过。

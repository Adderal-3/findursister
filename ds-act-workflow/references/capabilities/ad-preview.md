# 能力：互动游戏广告模式预览（模式 8 / AD_PREVIEW）

> 把小游戏嵌入互动游戏广告 WebView 时，屏幕顶部（状态栏 + 集数/倍速导航栏，94px）与底部（广告下载面板，220px）被客户端原生 UI 遮挡且不可点击。本能力注入上下两块**调试遮罩**作为可视化标尺，帮运营把核心玩法收进中间可操作区；同时注入**生产级**广告点击日志上报，回流广告小游戏点击数据。
>
> 遮罩与点击日志是两条生命周期相反的产物线。

## 依赖

- **前置能力**：`capabilities/inject.md`（点击日志必须，遮罩无依赖）——点击日志复用 inject 产物 `ds.js` 模块作用域内的 `APP_KEY`/`SQUARE_ID`/`userInfo` 与 `window.ns`（NS 日志通道）。遮罩是纯 HTML/CSS 注入，不依赖 ds.js。
- **公共原语**：
  - `primitives/scan-html.md`——返回 HTML 注释清单、`<head>`/`<body>` 位置、`<script>` 块清单，供定位遮罩注入点（`</body>` 前）、匹配 marker（残留检查）、定位 ds.js 内 `[DS:NS-LOG:END]` 锚点（点击日志追加位置）。
  - `primitives/detect-framework.md`——输出 `framework`（HTML/React/Vue）。本能力仅支持 HTML，React/Vue 直接终止。
- **产物契约**：本能力的两个 marker 块定义内联于本文"出参"段（`[DS:AD-PREVIEW-COVER]` 调试遮罩、`[DS:AD-CLICK-LOG]` 点击日志），不进 `contracts/ds-js-markers.md`（它们不是 ds.js 的 9 个标准块，是本能力专属产物）。
- **审查契约**：`audits/ad-preview-cover.md`——调试遮罩残留审查规则（无条件扫描所有 HTML，残留即阻断）。点击日志**不**纳入此审查。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| 子操作 | 用户 | 是 | — | 交互询问（A=添加遮罩 / R=移除遮罩 / K=检查残留 / L=注入点击日志） |
| `framework` | detect-framework 原语 | 是 | — | 前置传递（HTML/React/Vue，不询问用户） |
| `SELECTED_HTML_FILES` | scan-html 原语 + 用户确认 | 是（A/R/K） | — | 前置传递（单 HTML 静默默认；多 HTML 须用户确认要预览的页面） |
| `DS_JS_PATH` | scan-html 原语 | 是（L） | — | 可推断（`src/ds.js` 或根 `ds.js`，含 `trackEvent` 函数者；两者皆无则判定未接入） |
| `HAS_DS_JS` | scan-html 原语 | 是（L） | — | 可推断（`DS_JS_PATH` 存在且含 `trackEvent` → true） |

> **`SELECTED_HTML_FILES` 获取规则**：scan-html 返回项目根目录所有 `.html`（排除 `node_modules`、`dist`）。仅 1 个 → 静默 `["index.html"]`；多个 → 列出清单请用户确认（回车默认 index.html，或逗号分隔输入）。此集合贯穿遮罩注入/移除/残留检查。
>
> **标尺参数固定内置**：上遮罩 94px、下遮罩 220px、可操作区 `calc(100vh - 314px)`、背景图 URL 均为互动游戏广告标准版式素材，已固定内置，**不向运营询问**。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| 调试遮罩块 | `SELECTED_HTML_FILES` 每个文件 `</body>` 前 | marker `<!-- [DS:AD-PREVIEW-COVER:START] -->` … `<!-- [DS:AD-PREVIEW-COVER:END] -->`；内含 `<style>`（`.ds-act-ad-preview-cover` + `--top`/`--bottom` 修饰类）与两个 `<div>`；CSS 内联不外置 |
| 安全区标尺记录 | `CLAUDE.md` 的"## 互动广告安全区（调试标尺）"节 | 顶部 94px / 底部 220px / 可操作区 `calc(100vh - 314px)` / 遮罩 class；不存在则追加，已存在则覆盖 |
| 适配 prompt | 控制台输出（可复制文本） | 约束核心交互元素到 `calc(100vh - 314px)` 安全区、遮挡区只放装饰背景的改造指引文案 |
| 广告点击日志块 | `DS_JS_PATH` 内 `[DS:NS-LOG:END]` 之后 | marker `/* [DS:AD-CLICK-LOG:START] */` … `/* [DS:AD-CLICK-LOG:END] */`；`reportAdClick()` 函数 + `document.addEventListener('click', reportAdClick, true)`（捕获阶段） |

### 调试遮罩 marker 块定义

```html
<!-- [DS:AD-PREVIEW-COVER:START] -->
<style>
.ds-act-ad-preview-cover {
  position: fixed; left: 0; width: 100vw; z-index: 99999;
  pointer-events: auto; touch-action: none; box-sizing: border-box;
  background-size: 100% 100%; background-position: center; background-repeat: no-repeat;
}
.ds-act-ad-preview-cover--top {
  top: 0; height: 94px;
  background-image: url('https://img.166.net/gameyw-misc/opd/squash/20260625/105644-efpj7b9aio.png');
}
.ds-act-ad-preview-cover--bottom {
  bottom: 0; height: 220px;
  background-image: url('https://img.166.net/gameyw-misc/opd/squash/20260625/105644-mzt6sjds0i.png');
}
</style>
<div class="ds-act-ad-preview-cover ds-act-ad-preview-cover--top"></div>
<div class="ds-act-ad-preview-cover ds-act-ad-preview-cover--bottom"></div>
<!-- [DS:AD-PREVIEW-COVER:END] -->
```

> **`pointer-events: auto` 是关键不变量**：遮罩必须吃掉点击与触摸，真实模拟客户端 UI 遮挡，禁止用 `pointer-events: none`。否则遮罩形同虚设，运营无法判断哪些元素被挡住。

### 广告点击日志 marker 块定义

```javascript
/* [DS:AD-CLICK-LOG:START] */
function reportAdClick() {
  if (typeof window.ns !== 'function') return;
  var sp = new URLSearchParams(window.location.search);
  var m = window.location.pathname.match(/\/minigame\/([^/]+)/);
  window.ns('send', {
    hitType: 'event',
    eventCategory: 'interstitial_ad_minigame',
    eventAction: 'clk_new_2_926_1',
    eventLabel: JSON.stringify({
      uid: userInfo.uid || -9999,
      game: APP_KEY || '',
      community_id: SQUARE_ID || '',
      minigame_id: m ? m[1] : '',
      ad_info: {
        ad_id: sp.get('ad_id') || -2,
        creative_id: sp.get('creative_id') || -2,
        material_id: sp.get('material_id') || -2,
      },
    }),
  });
}
document.addEventListener('click', reportAdClick, true);
/* [DS:AD-CLICK-LOG:END] */
```

> **捕获阶段绑定是关键不变量**：`addEventListener('click', reportAdClick, true)` 第三参为 `true`，确保业务代码 `stopPropagation` 也能收到点击。日志只读上报，不 `preventDefault`/`stopPropagation`，不影响业务行为。

## 能做什么

- **[A] 添加调试遮罩**：在 `SELECTED_HTML_FILES` 每个文件 `</body>` 前注入遮罩块（HTML+CSS 一体），记录安全区标尺到 `CLAUDE.md`，输出适配 prompt，并自动触发 [L] 注入点击日志（进入广告模式即视为需要生产埋点）。
- **[R] 移除调试遮罩**：扫描所有 `*.html` 及 `src/style.css`，按 `[DS:AD-PREVIEW-COVER]` marker 整块删除（含 marker），删除后校验全项目无 `ds-act-ad-preview-cover` class 与 marker 残留。
- **[K] 检查遮罩残留**：复用 `audits/ad-preview-cover.md` 规则，扫描所有 HTML，命中 marker 或 class 即报告为残留（只读不改）。
- **[L] 注入广告点击日志**：向 `DS_JS_PATH` 的 `[DS:NS-LOG:END]` 之后追加点击日志块，复用模块作用域内 `APP_KEY`/`SQUARE_ID`/`userInfo`，经 `window.ns` 上报 `eventCategory='interstitial_ad_minigame'` / `eventAction='clk_new_2_926_1'`。
- **输出完成报告**：注入/移除结果摘要、安全区标尺位置、适配 prompt、验证方式指引。

## 不能做什么

- **不支持 React/Vue 项目**——遮罩与点击日志都针对原生 HTML 结构（`</body>` 注入、内联 `<style>`、`ds.js` 模块作用域 `var` 明文 JS）。React/Vue 的 `APP_KEY`/`SQUARE_ID`/`userInfo` 分散在不同 `.ts`/hook 文件，直接注入会引用不到而报错。`framework != HTML` 时提示"模式 8 目前仅支持 HTML 项目"并终止。
- **不删除广告点击日志**——`[R]` 移除遮罩**仅**删除 `[DS:AD-PREVIEW-COVER]` marker 区间，**绝不**触碰 `[DS:AD-CLICK-LOG]` 块。点击日志是生产埋点，与遮罩生命周期分离。
- **不把点击日志纳入残留审查**——`audits/ad-preview-cover.md` 只扫描遮罩 marker/class，点击日志 marker 不进审查。残留审查阻断的是遮罩，不是日志。
- **不向运营询问标尺参数或背景图**——94px/220px/背景图 URL 均为互动游戏广告标准版式素材，固定内置。
- **不在非 mode 8 场景输出适配引导**——安全区标尺记录与适配 prompt **仅**在本能力 [A] 添加遮罩时触发。其他能力（mode 0/C/1/2/3/4/5/6/7）一律不主动提示互动广告适配、不注入遮罩、不输出适配 prompt。
- **不阻断遮罩注入于未接入 ds.js**——[A] 添加遮罩时若 `HAS_DS_JS=false`，不阻断遮罩注入，仅提示"未接入 ds.js，广告点击日志未注入，请先运行模式 1 后重新选择 [L] 补注入"，跳过点击日志自动注入。
- **不强制删除 CLAUDE.md 标尺节**——`[R]` 移除遮罩时，安全区标尺记录是否保留由用户决定（标尺记录不影响上线，不强制删除）。

## 判断规则

### 1. 遮罩与点击日志生命周期分离表

两条产物线生命周期相反，agent 必须区分对待：

| 产物 | 性质 | 上线时 | 审查 | marker |
|------|------|--------|------|--------|
| 调试遮罩 | 调试标尺（方案 A） | **必须移除** | `audits/ad-preview-cover.md` 阻断残留 | `[DS:AD-PREVIEW-COVER]` |
| 广告点击日志 | 生产埋点 | **必须保留** | 不纳入审查 | `[DS:AD-CLICK-LOG]` |

> **核心约束**：`[R]` 移除遮罩绝不触碰点击日志；审查阻断只针对遮罩残留。两者独立 marker、独立生命周期，互不干扰。

### 2. 子操作路由与触发边界

| 子操作 | 触发条件 | 副作用 |
|--------|---------|--------|
| [A] 添加遮罩 | 用户选择 | 注入遮罩 + 写 CLAUDE.md 标尺 + 输出适配 prompt + **自动触发 [L]** |
| [R] 移除遮罩 | 用户选择 | 仅删 `[DS:AD-PREVIEW-COVER]` 区间，不触碰 `[DS:AD-CLICK-LOG]` |
| [K] 检查残留 | 用户选择 | 只读扫描，报告残留（与审查链同规则） |
| [L] 注入点击日志 | 用户选择 / [A] 自动触发 | 向 ds.js 追加点击日志块 |

> **[A] 自动触发 [L] 的边界**：添加调试遮罩即视为进入广告模式，自动执行 [L] 注入逻辑。但若 `HAS_DS_JS=false`，不阻断遮罩，仅跳过点击日志并提示。这是"进入广告模式需要生产埋点"的语义，不是"遮罩依赖点击日志"。

> **适配引导触发边界**：安全区标尺记录与适配 prompt **仅**在 [A] 添加遮罩时输出。审查链中的残留检查只做"扫描 → 提示删除 → 阻断"，**不包含**任何适配引导文案。

### 3. 点击日志字段取值规则

| 字段 | 取值 | 缺省 | 语义 |
|------|------|------|------|
| `uid` | `userInfo.uid` | `-9999` | 未登录用户标识 |
| `game` | `APP_KEY`（复用运营配置） | `''` | 游戏标识 |
| `community_id` | `SQUARE_ID`（复用运营配置） | `''` | 圈子标识 |
| `minigame_id` | URL path `/minigame/` 后紧跟一段 | `''` | 小游戏标识（如 `/minigame/74f6…2d64/index.html` → `74f6…2d64`） |
| `ad_info.ad_id` | URL query `ad_id` | `-2` | 广告 ID（与客户端约定缺省） |
| `ad_info.creative_id` | URL query `creative_id` | `-2` | 创意 ID |
| `ad_info.material_id` | URL query `material_id` | `-2` | 素材 ID |

> ⚠️ `ad_info` 缺省用 `-2`（与客户端约定），与 `uid` 的 `-9999` 语义不同，勿混。`eventCategory` 固定 `interstitial_ad_minigame`、`eventAction` 固定 `clk_new_2_926_1`，不询问用户。

### 4. ds.js 接入判定规则

| 条件 | 判定 | 行为 |
|------|------|------|
| `src/ds.js` 或根 `ds.js` 存在且含 `trackEvent` 函数 | 已接入 | [L] 继续；[A] 自动注入点击日志 |
| `src/ds.js` 或根 `ds.js` 存在但无 `trackEvent` | 未接入 | 同下 |
| 两者皆无 | 未接入 | [L] 输出"❌ 未找到 ds.js，请先运行模式 1"并终止；[A] 不阻断遮罩，仅提示跳过点击日志 |

## 幂等性

- **重入检测标志**：
  - 调试遮罩：目标 HTML 含 `<!-- [DS:AD-PREVIEW-COVER:START] -->` 注释对。
  - 点击日志：`DS_JS_PATH` 含 `/* [DS:AD-CLICK-LOG:START] */`。
  - 安全区标尺节：`CLAUDE.md` 含"## 互动广告安全区（调试标尺）"节标题。
- **重入行为**：
  - **[A] 添加遮罩**：marker 已存在 → 跳过遮罩注入，提示"遮罩已存在，如需重加请先 [R] 移除"。
  - **[A] 自动触发 [L]**：点击日志 marker 已存在 → 跳过（不重复注入）；不存在 → 追加。与遮罩幂等独立判定。
  - **[A] 安全区标尺节**：不存在 → 追加；已存在 → 覆盖更新（不重复追加）。
  - **[R] 移除遮罩**：每次重新扫描全项目 marker 区间，存在则整块删除，删除后校验无残留。不触碰点击日志。
  - **[K] 检查残留**：纯只读，每次重新扫描，无副作用。
  - **[L] 注入点击日志**：marker 已存在 → 跳过注入，提示"广告点击日志已注入，如需重注请先移除该 marker 区间"，终止；不存在 → 追加。

## 执行步骤

本能力是**串行管线**，子操作间无并行空间（[A] 内部的遮罩注入与点击日志注入虽产物独立，但点击日志依赖 ds.js 锚点定位，须在遮罩注入后顺序执行）：

```
detect-framework（返回 framework，非 HTML 则终止）
  ↓
scan-html（返回 HTML 清单、注释清单、<head>/<body> 位置、ds.js 路径与 trackEvent 检测）
  ↓
子操作路由（用户选择 A/R/K/L）
  ↓
[A] 添加遮罩分支：
  ├─ 幂等检测 [DS:AD-PREVIEW-COVER] marker → 已存在跳过
  ├─ 注入遮罩块到 </body> 前（HTML+CSS 一体）
  ├─ 写/覆盖 CLAUDE.md 安全区标尺节
  ├─ 输出适配 prompt
  └─ 自动触发 [L]（HAS_DS_JS=false 则跳过并提示）
  ↓
[R] 移除遮罩分支：
  ├─ 扫描所有 HTML + src/style.css 的 marker 区间
  ├─ 整块删除（含 marker）
  └─ 校验无 ds-act-ad-preview-cover class 与 marker 残留
  ↓
[K] 检查残留分支：
  └─ 复用 audits/ad-preview-cover.md 规则扫描，报告残留（只读）
  ↓
[L] 注入点击日志分支：
  ├─ 前置检查 HAS_DS_JS → false 则终止并提示
  ├─ 幂等检测 [DS:AD-CLICK-LOG] marker → 已存在跳过
  └─ 在 [DS:NS-LOG:END] 之后追加点击日志块
  ↓
完成报告输出
```


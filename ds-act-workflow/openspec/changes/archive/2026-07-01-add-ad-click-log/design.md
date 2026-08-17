## Context

模式 8（互动游戏广告模式预览）当前只做调试遮罩：注入/移除上下遮罩，残留会被审查阻断（纯调试标尺，上线前必须移除）。现在要在同一模式下新增一个**生产级**广告点击日志上报能力，用于回流广告小游戏的点击数据并与客户端广告投放（ad_id / creative_id / material_id）打通。

现有 NS 日志能力在 `references/ds-js-template.js` 的 `[DS:NS-LOG]` 块中，`trackEvent(extra)` 通过 `window.ns('send', ...)` 上报，可直接访问 `APP_KEY`、`SQUARE_ID`、`userInfo`、`godlikeInfo`。广告点击上报可复用同一通道与同一批变量。

## Goals / Non-Goals

**Goals:**
- 模式 8 新增子操作，向 `ds.js` 注入独立、可整块删除的 `[DS:AD-CLICK-LOG]` 代码块。
- 全局捕获点击，按固定字段 schema 通过 `window.ns` 上报，`eventAction = clk_new_2_926_1`。
- 字段取值：复用 `APP_KEY`（game）、`SQUARE_ID`（community_id），从 URL 解析 `minigame_id` 与 `ad_info`，落缺省值。
- 模式 8 入口强制 ds.js（模式 1）前置检查。
- 点击日志与调试遮罩生命周期彻底分离（生产保留 vs 调试移除）。

**Non-Goals:**
- 不改遮罩的添加/移除/残留审查逻辑。
- 不引入新的上报后端或 HTTP endpoint（复用 `window.ns`）。
- 不做点击节流/去重/采样（一期每次点击都上报，符合"全局点击日志"直觉）。
- 不支持非 `/minigame/{id}/` 的 URL 结构自定义解析（一期只认该固定结构）。

## Decisions

### D1：复用 window.ns，而非独立接口
和现有 `trackEvent` 同款通道。理由：运营已在用 NS 日志平台，无需新增后端；`window.ns` 由 SDK-LOADER 加载，ds.js 环境天然可用。上报前 `typeof window.ns !== 'function'` 守卫，未就绪静默返回。

### D2：独立 marker `[DS:AD-CLICK-LOG]`，注入 ds.js
- 注入 `ds.js`（`src/ds.js` 或根 `ds.js`），复用模块作用域内的 `APP_KEY`/`SQUARE_ID`/`userInfo`。
- 用独立 marker，与 `[DS:AD-PREVIEW-COVER]` 完全分离。遮罩的 `[R]` 移除按遮罩 marker 删除，不会误删点击日志。
- **审查黑名单不加入点击日志 marker** —— 它是生产埋点，必须能上线。

**Alternatives considered:** 独立 HTML `<script>` 块（放弃：拿不到 ds.js 里的 `userInfo`/`APP_KEY`，要重复解析登录态，割裂）。

### D3：eventCategory / eventAction 用固定专属值
`eventCategory` 固定 `interstitial_ad_minigame`，`eventAction` 固定 `clk_new_2_926_1`，均不复用业务埋点的 `EVENT_CATEGORY` / `EVENT_ACTION`。广告点击走独立 category+action，NS 平台按此分流，避免污染现有埋点。

### D8：添加遮罩 [A] 自动注入点击日志
运营进入广告预览（[A] 加遮罩）即视为进入广告模式，自动执行 [L] 注入逻辑。理由：减少运营遗漏埋点概率；遮罩是调试（[R] 会移除），点击日志是生产（保留），二者独立 marker 互不影响。未接入 ds.js 时不阻断遮罩，仅提示补跑模式 1 后手动 [L]。

### D4：字段取值规则
```
uid          userInfo.uid || -9999
game         APP_KEY || ''
community_id SQUARE_ID || ''
minigame_id  location.pathname.match(/\/minigame\/([^/]+)/) → [1]，无匹配则 ''
ad_info      { ad_id, creative_id, material_id }，各取 URLSearchParams，缺省 -2
```
- `minigame_id`：只认 `/minigame/` 后紧跟的一段（例：`/minigame/74f6...2d64/index.html` → `74f6...2d64`）。
- `ad_info` 缺省用 `-2`（与客户端约定），注意区别于 `uid` 的 `-9999`。

### D5：全局捕获监听
`document.addEventListener('click', reportAdClick, true)` 捕获阶段绑定，保证即便业务 `stopPropagation` 也能收到。绑定放在 `[DS:AD-CLICK-LOG]` 块内、`initApp()` 之外顶层执行即可（不依赖登录完成；点击时实时读 `userInfo.uid`）。

### D6：模式 8 前置检查
进入模式 8 先检测 `src/ds.js` 或根 `ds.js` 是否存在且含 ds.js 特征（如 `trackEvent`）。缺失 → 阻断并提示"请先运行模式 1 接入大神功能"。与模式 5 的前置检查同构。

### D7：注入子操作的幂等
注入前检测 ds.js 是否已含 `[DS:AD-CLICK-LOG:START]`：已存在则跳过并提示，避免重复注入。

## Risks / Trade-offs

- [每次点击都上报，量可能大] → 一期不做节流，符合"全局点击日志"需求；若量级问题后续可加采样，属二期。
- [捕获阶段监听可能与业务其他全局监听交互] → 只读上报、不 `preventDefault`/`stopPropagation`，对业务无副作用。
- [ad_info 缺省 `-2` 易和 `-9999` 混淆] → 在 spec 与代码注释里明确两者语义不同，测试覆盖缺省场景。
- [minigame_id 依赖固定 URL 结构] → 非 `/minigame/{id}/` 部署时取空串；一期接受，spec 明确该边界。
- [点击日志被误当遮罩残留删除] → 独立 marker + 审查黑名单不收录，spec 显式声明分离，规避。

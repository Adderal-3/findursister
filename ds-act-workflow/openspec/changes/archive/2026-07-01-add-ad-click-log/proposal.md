## Why

互动游戏广告场景下，运营需要衡量广告小游戏的点击效果，并把点击数据与客户端广告投放（ad_id / creative_id / material_id）打通。目前模式 8 只提供调试遮罩，没有任何广告点击数据回流，运营无法评估广告转化。

## What Changes

- 模式 8 新增子操作「注入广告小游戏全局点击日志上报」：向 `ds.js` 注入独立的 `[DS:AD-CLICK-LOG]` 代码块，在 `document` 上以捕获方式监听全局点击，每次点击通过 `window.ns` 上报一条 NS 日志。
- 上报固定 `eventAction = clk_new_2_926_1`，`eventLabel` 字段：
  - `uid`：`userInfo.uid`，未登录 `-9999`
  - `game`：复用 `APP_KEY`
  - `community_id`：复用 `SQUARE_ID`
  - `minigame_id`：URL path 中 `/minigame/` 后紧跟的一段
  - `ad_info`：`{ ad_id, creative_id, material_id }`，取自 URL query，缺省 `-2`
- 模式 8 入口新增前置检查：项目未接入 `ds.js`（未跑模式 1）时阻断，提示先运行模式 1。
- 模式 8 菜单描述追加广告点击日志上报说明。
- **关键边界**：广告点击日志是**生产埋点**，用独立 marker `[DS:AD-CLICK-LOG]`，与调试遮罩 `[DS:AD-PREVIEW-COVER]` 完全分离；**不纳入**遮罩残留审查，上线时必须保留。

## Capabilities

### New Capabilities
- `ad-click-log`: 互动广告小游戏全局点击日志上报 —— 注入逻辑、字段取值规则（含复用 APP_KEY/SQUARE_ID、URL 解析、缺省值）、模式 1 前置依赖，以及与调试遮罩相互独立的生命周期边界。

### Modified Capabilities
<!-- 无既有 capability 的 spec 级行为变更（mode 8 遮罩行为不变，仅新增独立子操作与前置检查） -->

## Impact

- `SKILL.md`：模式 8 菜单描述追加「注入广告小游戏全局点击日志上报」。
- `references/ad-preview.md`：入口新增 ds.js 前置检查；子操作菜单新增「注入广告点击日志」项及其执行流程。
- `references/ds-js-template.js`：新增 `[DS:AD-CLICK-LOG:START/END]` 代码块（复用 `APP_KEY`/`SQUARE_ID`/`userInfo`/`window.ns`）。
- 审查链：**不改动**。点击日志 marker 不进残留审查黑名单（`references/audits/ad-preview-cover.md` 保持只扫遮罩 marker/class）。
- 固定命名：marker `[DS:AD-CLICK-LOG:START/END]`；固定 `eventAction = clk_new_2_926_1`。

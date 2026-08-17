# ad-click-log

## Purpose

模式 8 广告点击日志上报能力：向已接入大神功能（`ds.js`）的 HTML 项目注入独立、幂等的全局点击埋点，用于回流互动广告小游戏的点击数据，与调试遮罩生命周期完全分离。

## Requirements

### Requirement: 模式 8 广告点击日志注入前置检查

广告点击日志注入 SHALL 仅支持 HTML 项目：当 `package.json` 判定为 React / Vue 时，系统 MUST 终止注入并提示仅支持 HTML。当且仅当用户选择「注入广告点击日志」子操作（或 `[A]` 自动注入）时，系统 SHALL 检测项目是否已接入 `ds.js`（存在 `src/ds.js` 或根目录 `ds.js`，且含 `trackEvent`），未接入则 MUST 阻断并提示先运行模式 1。

#### Scenario: React/Vue 项目不支持
- **WHEN** 用户在模式 8 触发广告点击日志注入，且 `package.json` 判定为 React 或 Vue 项目
- **THEN** 系统 MUST 终止注入，提示"模式 8 广告点击日志目前仅支持 HTML 项目"，不注入任何代码

#### Scenario: 未接入 ds.js 时阻断
- **WHEN** 用户在模式 8 选择「注入广告点击日志」子操作，且项目不存在 `src/ds.js` 或根 `ds.js`
- **THEN** 系统 MUST 终止该子操作，输出提示"未找到 ds.js，请先运行模式 1 接入大神功能后再使用广告点击日志上报"，且不注入任何代码

#### Scenario: 已接入 ds.js 时放行
- **WHEN** 用户选择「注入广告点击日志」子操作，且已存在含 `trackEvent` 的 ds.js（HTML 项目）
- **THEN** 系统 SHALL 继续执行注入流程

### Requirement: 注入独立的广告点击日志代码块

系统 SHALL 向 ds.js 注入以 `[DS:AD-CLICK-LOG:START]` / `[DS:AD-CLICK-LOG:END]` 包裹的代码块，复用 ds.js 作用域内的 `APP_KEY`、`SQUARE_ID`、`userInfo` 与全局 `window.ns`。该 marker MUST 独立于调试遮罩 marker `[DS:AD-PREVIEW-COVER]`。

#### Scenario: 首次注入
- **WHEN** ds.js 中不存在 `[DS:AD-CLICK-LOG:START]` marker
- **THEN** 系统 SHALL 在 ds.js 中追加完整的 `[DS:AD-CLICK-LOG]` 代码块

#### Scenario: 幂等跳过
- **WHEN** ds.js 中已存在 `[DS:AD-CLICK-LOG:START]` marker
- **THEN** 系统 MUST 跳过注入并提示"广告点击日志已注入，如需重注请先移除"，不产生重复代码块

### Requirement: 全局点击捕获上报

注入的代码块 SHALL 在 `document` 上以捕获方式（`addEventListener('click', handler, true)`）监听点击，每次点击通过 `window.ns('send', ...)` 上报一条 NS 日志。上报前 MUST 校验 `window.ns` 为函数，否则静默返回。上报处理器 MUST NOT 调用 `preventDefault` 或 `stopPropagation`，不干扰业务。

#### Scenario: 点击触发上报
- **WHEN** 用户在页面任意位置点击，且 `window.ns` 为函数
- **THEN** 系统 SHALL 调用 `window.ns('send', ...)` 上报一条事件日志

#### Scenario: ns 未就绪静默返回
- **WHEN** 点击发生但 `window.ns` 不是函数
- **THEN** 处理器 MUST 直接返回，不抛错、不上报

### Requirement: 上报事件标识与字段 schema

上报的 `hitType` MUST 为 `event`，`eventCategory` MUST 固定为 `interstitial_ad_minigame`，`eventAction` MUST 固定为 `clk_new_2_926_1`。`eventLabel` MUST 为如下字段的 JSON 字符串：`uid`、`game`、`community_id`、`minigame_id`、`ad_info`。

#### Scenario: eventCategory 与 eventAction 固定值
- **WHEN** 上报广告点击日志
- **THEN** `eventCategory` MUST 等于 `interstitial_ad_minigame`，`eventAction` MUST 等于 `clk_new_2_926_1`，且均不复用业务埋点的 `EVENT_CATEGORY` / `EVENT_ACTION`

#### Scenario: eventLabel 字段齐全
- **WHEN** 组装 eventLabel
- **THEN** JSON MUST 同时包含 `uid`、`game`、`community_id`、`minigame_id`、`ad_info` 五个键

### Requirement: 字段取值与缺省规则

各字段取值 SHALL 遵循：`uid` 取 `userInfo.uid`，未登录缺省 `-9999`；`game` 复用 `APP_KEY`，缺省空串；`community_id` 复用 `SQUARE_ID`，缺省空串；`minigame_id` 取 URL path 中 `/minigame/` 后紧跟的一段，无匹配缺省空串；`ad_info` 为对象 `{ ad_id, creative_id, material_id }`，各值取自 URL query 同名参数，缺省 `-2`。

#### Scenario: 复用 APP_KEY 与 SQUARE_ID
- **WHEN** ds.js 配置了非空 `APP_KEY` 与 `SQUARE_ID`
- **THEN** `game` 取 `APP_KEY` 值，`community_id` 取 `SQUARE_ID` 值

#### Scenario: 解析 minigame_id
- **WHEN** 页面 URL 为 `.../minigame/74f61411-fafd-403f-bb8e-cc4bdb0d2d64/index.html`
- **THEN** `minigame_id` MUST 为 `74f61411-fafd-403f-bb8e-cc4bdb0d2d64`

#### Scenario: minigame_id 无匹配
- **WHEN** URL path 中不含 `/minigame/` 段
- **THEN** `minigame_id` SHALL 为空串

#### Scenario: ad_info 取 URL 参数
- **WHEN** URL 为 `...?ad_id=A&creative_id=B&material_id=C`
- **THEN** `ad_info` MUST 为 `{ ad_id: "A", creative_id: "B", material_id: "C" }`

#### Scenario: ad_info 缺省 -2
- **WHEN** URL 缺少 `ad_id` / `creative_id` / `material_id` 任一参数
- **THEN** 对应字段值 MUST 缺省为 `-2`

#### Scenario: 未登录 uid 缺省
- **WHEN** 点击时 `userInfo.uid` 不存在
- **THEN** `uid` MUST 为 `-9999`

### Requirement: 广告点击日志与调试遮罩生命周期分离

广告点击日志是生产埋点，MUST 在上线时保留。调试遮罩残留审查（`references/audits/ad-preview-cover.md`）MUST NOT 将 `[DS:AD-CLICK-LOG]` marker 纳入残留黑名单，模式 8 的 `[R]` 移除遮罩操作 MUST NOT 删除广告点击日志代码块。

#### Scenario: 移除遮罩不动点击日志
- **WHEN** 用户执行模式 8 `[R]` 移除调试遮罩
- **THEN** 系统 MUST 仅删除 `[DS:AD-PREVIEW-COVER]` marker 区间，保留 `[DS:AD-CLICK-LOG]` 代码块

#### Scenario: 残留审查放行点击日志
- **WHEN** 审查链（模式 2 / 模式 3）扫描遮罩残留，项目含 `[DS:AD-CLICK-LOG]` 但无 `[DS:AD-PREVIEW-COVER]`
- **THEN** 审查 MUST 通过，不报告点击日志为残留、不阻断部署

### Requirement: 模式 8 菜单描述与子操作

模式 8 菜单描述 SHALL 追加广告小游戏全局点击日志上报的说明，子操作菜单 SHALL 新增「注入广告点击日志」项。用户选择 `[A]` 添加调试遮罩时，系统 SHALL 自动执行广告点击日志注入逻辑（等同 `[L]`）。

#### Scenario: 子操作可选
- **WHEN** 用户进入模式 8
- **THEN** 子操作菜单 SHALL 在遮罩相关操作之外提供「注入广告点击日志」选项

#### Scenario: 添加遮罩时自动注入点击日志
- **WHEN** 用户选择 `[A]` 添加调试遮罩，且项目已接入 ds.js、尚无 `[DS:AD-CLICK-LOG]`
- **THEN** 系统 SHALL 在注入遮罩后自动注入 `[DS:AD-CLICK-LOG]` 代码块

#### Scenario: 添加遮罩但未接入 ds.js
- **WHEN** 用户选择 `[A]` 添加调试遮罩，但项目未接入 ds.js
- **THEN** 系统 MUST 仍完成遮罩注入，且不阻断，仅提示广告点击日志未注入、需先运行模式 1

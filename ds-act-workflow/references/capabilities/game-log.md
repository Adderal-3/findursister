# 能力：游戏行为埋点（模式 4 / GAME_LOG）

> 扫描业务代码，语义识别交互/流程/结果/奖励四类游戏关键节点，对用户确认的节点插入 `trackEvent` 调用，上报玩家行为至 NS 日志平台。

## 依赖

- **前置能力**：`capabilities/inject.md`（**必须**）——`trackEvent` 由 inject 生成的 ds.js `[DS:NS-LOG]` 块定义、`[DS:EXPORTS]` 块导出。未接入 ds.js 时本能力无法执行（`trackEvent` 不存在）。
- **公共原语**：
  - `primitives/scan-html.md`——返回 HTML 文件内联 `<script>` 块清单（位置 + 内容），供定位含业务逻辑的内联脚本。HTML 框架项目扫描内联脚本时依赖此原语。
  - `primitives/detect-framework.md`——输出 `framework`（HTML/React/Vue），决定扫描哪些扩展名的业务文件。
- **产物契约**：
  - `contracts/ds-js-markers.md`——`[DS:NS-LOG]` 块定义 `trackEvent(extra)` 签名与不变量（`window.ns` 不可用时静默 return）。本能力是消费者：按此签名生成调用。
  - `contracts/framework-diffs.md`——三框架扫描扩展名差异表，据 `framework` 取对应列。
- **外部技能**：无。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| `framework` | detect-framework 原语 | 是 | — | 前置传递（HTML/React/Vue，不询问用户） |
| `trackEvent` 可用性 | inject 产物 | 是 | — | 前置检查（`src/ds.js` 存在且含 `[DS:NS-LOG]` 块 / `trackEvent` 定义；不存在则终止并提示先运行 inject） |
| 扫描文件集 | detect-framework + scan-html | 是 | — | 前置传递（据 `framework` 取扫描扩展名遍历 `src/`；HTML 项目另用 scan-html 取内联 `<script>` 块；排除 `node_modules`、`.git`、`dist`） |
| 选中节点 | 用户 | 是 | 全部 | 交互确认（识别结果表格后用户输入编号，回车默认全部） |

> **扫描范围（按框架）**：据 `framework-diffs.md` 扫描扩展名列——HTML 扫 `src/` 下 `.js`/`.ts` + 含 DS Marker 的 HTML 内联 `<script>`（无 `src/` 则扫当前目录）；React 扫 `src/` 下 `.js`/`.ts`/`.jsx`/`.tsx`；Vue 扫 `src/` 下 `.js`/`.ts`/`.vue`。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| `trackEvent` 调用 | 用户确认节点所在业务文件（触发行之后） | `contracts/ds-js-markers.md`（`[DS:NS-LOG]` 块：`trackEvent({ event: eventId, ...params })` 单对象签名） |
| 埋点完成报告 | 交互输出（不入文件） | 无（位置/eventId/状态表 + NS 日志验证提示） |

## 能做什么

- **前置校验 ds.js**：检测 `src/ds.js`（或 React/Vue 对应 hooks/composables）存在且含 `trackEvent` 定义；不存在则输出提示并终止。
- **扫描业务代码**：据 `framework` 取扫描扩展名，遍历 `src/` 下业务文件（HTML 项目另扫内联 `<script>`），排除 `node_modules`/`.git`/`dist`。
- **语义识别四类节点**：阅读扫描到的代码，按"判断规则"段识别交互/流程/结果/奖励节点，为每个节点推荐 `eventId` 与参数。
- **输出识别结果表格**：列出位置/代码片段/节点类型/推荐 eventId/推荐参数，请用户选择需埋点的节点（默认全部）。
- **展示插入示例并确认**：对选中节点展示插入前后代码对比，询问全部插入或逐个确认。
- **插入 trackEvent 调用**：对确认节点在触发行之后插入 `trackEvent({ event: eventId, ...params })`，确保事件已发生再上报。
- **输出埋点完成报告**：位置/eventId/状态表（已插入/已跳过）+ NS 日志验证方式提示。

## 不能做什么

- **不创建 ds.js**——`trackEvent` 由 inject 生成，本能力仅消费。未接入 ds.js 时终止并提示先运行 inject。
- **不修改业务逻辑**——仅插入 `trackEvent` 调用，不改 handler 内部逻辑、不改控制流、不改已有业务代码。
- **不做 withPrecheck 包裹**——点击事件的登录预检包裹是 inject 的职责。本能力只问"是否已加 trackEvent 埋点"，不问"是否已用 withPrecheck 包裹"（见判断规则段 3）。
- **不强制全部插入**——用户选择性确认，可跳过任意节点。
- **不决定 eventId 最终命名**——推荐 eventId 供参考，用户可修改。
- **不决定后续能力路由**——埋点完成后可提示后续选项（audit/deploy/game-storage），但不强制执行。

## 判断规则

### 1. 四类节点语义识别表

阅读扫描到的业务代码，用语义理解识别以下四类游戏关键节点：

| 节点类型 | 说明 | 典型代码语义 |
|---------|------|------------|
| **交互** | 关键按钮点击 | `withPrecheck` 包裹的回调、关键 click handler（开始/抽奖/兑换/分享/提交等业务关键动作） |
| **流程** | 游戏开始/重开 | 初始化游戏状态、重置关卡、倒计时开始、`startGame()`/`resetLevel()` 调用等 |
| **结果** | 通关/失败/超时 | 分数达标判断（`score >= target`）、`gameOver()` 调用、倒计时归零、胜负判定分支等 |
| **奖励** | 获得道具/领取/兑换 | 后端奖励回调成功（`onRewardSuccess`）、道具数量增加、兑换码生成等 |

> **识别为空时**：输出"未找到游戏行为节点"提示并终止，建议检查业务代码是否在扫描范围内或手动添加。

### 2. trackEvent 调用签名与插入位置规则

**签名**（据 `contracts/ds-js-markers.md` `[DS:NS-LOG]` 块）：

```javascript
trackEvent({ event: 'eventId', ...customParams });
```

`trackEvent` 接收**单个对象参数** `extra`，其中 `event` 字段是 eventId，其余字段是自定义业务参数，会被合并进 NS 日志的 `eventLabel` JSON（与 `open_from`/`game`/`scene`/`deviceid`/`uid`/`bnet_id`/`time`/`utm_source` 等公共字段合并）。

> ⚠️ **不要用两参数形式** `trackEvent('eventId', params)`——`trackEvent(extra)` 只取首参，第二参数会被丢弃，eventId 无法上报。

**插入位置**：`trackEvent` 调用统一插在**触发行之后**——确认事件已发生再上报，避免后续逻辑异常导致误报。

| 节点类型 | 插入位置 | 示例 |
|---------|---------|------|
| 交互（withPrecheck 内） | 回调函数体首行（业务动作之后） | `withPrecheck(() => { startGame(); trackEvent({ event: 'click_start' }); })` |
| 交互（普通 handler） | handler 内业务动作之后 | `btn.onclick = () => { draw(); trackEvent({ event: 'click_draw' }); }` |
| 流程 | 状态初始化语句之后 | `initGameState(); trackEvent({ event: 'game_start' });` |
| 结果-通关 | 分数达标分支内、胜利展示之后 | `if (score >= target) { showWinScreen(); trackEvent({ event: 'game_win', score, level }); }` |
| 结果-失败 | `gameOver()` 调用之后 | `gameOver(); trackEvent({ event: 'game_over', score });` |
| 奖励 | 奖励回调成功分支内 | `onRewardSuccess(res => { trackEvent({ event: 'get_reward', rewardId: res.id, count: res.count }); });` |

### 3. 与 inject 点击事件修复的区分

交互节点与 inject 的点击事件修复外观相似（都涉及 click handler），但目的不同，**不可混淆**：

| 维度 | inject（模式 1） | game-log（模式 4） |
|------|------------------|-------------------|
| 问什么 | 是否已用 `withPrecheck` 包裹（登录预检） | 是否已加 `trackEvent` 埋点（行为日志） |
| 产物 | `withPrecheck(fn)` 包裹 | `trackEvent({ event })` 调用 |
| 依赖 | ds.js `[DS:CLICK-PRECHECK]` 块 | ds.js `[DS:NS-LOG]` 块 |

> 一个 click handler 可能同时需要两者：外层 `withPrecheck` 包裹（登录预检），内层 `trackEvent` 调用（行为上报）。两者独立判断、独立插入。

## 幂等性

- **重入检测标志**：节点所在函数体已含 `trackEvent({ event: '<该节点 eventId>' })` 调用（按 eventId 匹配，非任意 trackEvent）。
- **重入行为**：
  - **已插入相同 eventId 的 trackEvent** → 跳过该节点（标记"已跳过"）。
  - **未插入** → 正常识别、请用户确认、插入。
  - **已插入但 eventId 不同** → 视为新节点，正常识别并请用户确认（不覆盖已有 trackEvent）。
- **重入不删除**：已插入的 `trackEvent` 调用原样保留，不删除、不修改。

## 执行步骤

本能力是**严格串行管线**，无可并行节点：

```
前置检查（ds.js 存在且含 trackEvent 定义）
  ↓ 失败则终止并提示先运行 inject
detect-framework（返回 framework）
  ↓
扫描业务代码（据 framework 取扫描扩展名遍历 src/；HTML 另用 scan-html 取内联脚本）
  ↓
语义识别四类节点（交互/流程/结果/奖励，按判断规则段 1）
  ↓ 识别为空则终止
输出识别结果表格（位置/代码片段/节点类型/推荐 eventId/推荐参数）
  ↓
用户选择需埋点的节点（默认全部）
  ↓
展示插入前后代码对比 + 确认插入方式（全部 / 逐个）
  ↓
插入 trackEvent 调用（触发行之后，按判断规则段 2 签名与位置）
  ↓
埋点完成报告输出
```


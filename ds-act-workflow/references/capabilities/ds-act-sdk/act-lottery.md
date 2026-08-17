# 子模块 F：抽奖（Luckydraw）

> 本文件由 `ds-act-sdk.md` 步骤 7 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> 与 A/B/D 不同，本子模块是 **headless 能力**（无 UI 组件、无 HTML 容器、无 `evoke()` 调用），消费方在业务代码中调用 hook 或 service 函数。与 E（会员流失召回）同属 headless 能力，但抽奖有两种模式（次数抽奖 / 积分抽奖），编排逻辑更复杂。

---

## F.1 抽奖模块派生（configure 无需额外配置）

抽奖模块由 SDK 内部按 `asType===2` 从 `actInfo.moduleList` 自动派生（**单模块约束**：`moduleList` 中 `asType===2` 的模块必须恰好 1 个，否则 `luckydrawModuleAtom` 返回 `null`、抽奖动作被守卫跳过）。

`configure()` 仅需 `{ actId, appKey, env }`，**不支持也不需要** `lottery` 字段——抽奖模块不从 configure 注入，始终从 `actInfo.moduleList` 派生：

```javascript
window.DsActSdk.configure({
  production: {
    actId: '6954c5d472bbb96d77fe687c',
    appKey: 'x2',
  },
});
```

> **说明：**
> - `luckydrawModuleAtom` 从 `actInfoState.moduleList` 过滤 `asType===2`，**仅支持恰好 1 个**（0 个或多个返回 `null`，抽奖动作被守卫跳过返回 `null`/`false`）
> - 若活动需完成任务才解锁抽奖模块，需确保后台 `moduleList` 在解锁后包含恰好 1 个 `asType===2` 模块；SDK 不提供 configure 层面的模块 asId 覆盖能力
> - **多模块守卫**：抽奖动作内部 `getModuleCount()` 读 `actInfoState.moduleList` 过滤 `asType===2` 计数，含多个时 `Toast.show('当前活动存在多个抽奖模块，暂不支持')` 并返回 `null`

---

## F.2 React 接入：useLuckydraw hook

React 项目中，通过 `useLuckydraw` hook 获取响应式状态 + 转发 service actions（Vue/原生 JS 接入见 F.3）：

```javascript
const {
  // 响应式状态（useAtomValue 读取，状态变化自动重渲染）
  luckydrawModule,   // 抽奖模块（ActModulePropsType | null）
  luckydrawInfo,     // 抽奖信息（LuckydrawInfo | undefined）
  currencyInfo,      // 货币余额（CurrencyInfo | undefined，仅积分抽奖有）
  // service actions（转发，内部已含预检/时段校验/埋点/Toast/刷新）
  fetchLuckydrawInfo, // 获取抽奖模块信息 → 写入 luckydrawMapState
  fetchCurrencyInfo,  // 获取货币余额 → 写入 currencyInfoState（次数抽奖无 currencyType，守卫跳过返回 false）
  doLuckydraw,        // 单抽（自动选 drawUseType）
  doLuckydrawMore,    // 连抽（multiDrawLimit 次，结果合并为 DrawResultMerged）
  getLuckydrawState,  // 一次性快照读取全部状态（不发请求）
  mergeLuckydrawResults, // 纯函数：合并连抽结果数组
  checkCanDraw,       // 纯函数：时段校验（不弹 UI，返回 { canDraw, reason }）
  canDrawAgain,       // 纯函数：判断是否还能再抽（"再抽一次"按钮态用）
} = window.DsActSdk.useLuckydraw();

// 角色绑定后拉取抽奖信息 + 货币余额
await fetchLuckydrawInfo();
await fetchCurrencyInfo(); // 积分抽奖(drawType===4)才有 currencyType；次数抽奖会被守卫跳过

// 用户点击「抽奖」按钮时调用（消费方须自行防重复点击——React 用 debounce，HTML/JS 用锁变量）
const res = await doLuckydraw();
if (res?.code === 200) {
  // res.result 是 DrawResult：{ isWin, winPrize?, mustWinPrize?, randomNoPrizeBlessing?, myLeftDrawChance?, currencyBalance? }
  // 自行渲染中奖动画/UI（SDK 不干预 UI）
}
```

> **hook 返回值：**
>
> | 方法/属性 | 说明 |
> |-----------|------|
> | `luckydrawModule` | 派生状态：抽奖模块（`ActModulePropsType` 或 `null`；`null` 时所有抽奖动作被守卫跳过） |
> | `luckydrawInfo` | 派生状态：抽奖信息（`LuckydrawInfo` 或 `undefined`；从 `luckydrawMapState` 按 `module.asId` 取） |
> | `currencyInfo` | 货币余额（`CurrencyInfo` 或 `undefined`；有 `currencyType` 时才有，积分抽奖 `drawType===4` 通常有，次数抽奖通常无） |
> | `fetchLuckydrawInfo()` | 获取抽奖模块信息写入 `luckydrawMapState`；成功返回 `true`，失败/异常返回 `false` |
> | `fetchCurrencyInfo()` | 获取货币余额写入 `currencyInfoState`；守卫检查 `currencyType` 与 `actId` 是否存在（任一缺失返回 `false`，不检查 `drawType`） |
> | `doLuckydraw(options?)` | 单抽；预检→多模块检测→时段校验→抽奖→成功刷新；返回 `ApiResult<DrawResult>` 或 `null`（失败/不可抽） |
> | `doLuckydrawMore(options?)` | 连抽（`multiDrawLimit` 次）；预检→多模块检测→时段校验→连抽→合并结果→成功刷新；返回 `ApiResult<DrawResultMerged>` 或 `null` |
> | `getLuckydrawState()` | 一次性快照读取 `{ luckydrawModule, luckydrawInfo, currencyInfo, moduleCount }`，不发请求 |
> | `mergeLuckydrawResults(list)` | 纯函数：把 `DrawResult[]` 合并为 `DrawResultMerged`（winPrize/mustWinPrize 聚合为数组；`randomNoPrizeBlessing` 取首个未中祝福语，无则取默认「欧气满满，大吉大利」） |
> | `checkCanDraw(info)` | 纯函数：时段校验，返回 `{ canDraw, reason }`（`reason` 含格式化时间，如「请在 07月31日 10:00 再来参与吧~」），不弹 UI。**边界**：`currentTimeDraw===true` 直接可抽；否则只查 `timeIntervalList[0]`（首个时段，后续时段忽略）；`now < startTime`→未开启（给格式化时间），`now > endTime`→已结束，`now === endTime` 仍可抽（仅 `>` 拒绝）；无 `timeIntervalList` 或空→「暂未开启」 |
> | `canDrawAgain(info, currency)` | 纯函数：判断是否还能再抽（有免费次数 → `true`；积分抽奖 `drawType===4` 且 `balance >= everyTimeAmount` → `true`；否则 `false`） |

> **`doLuckydraw` / `doLuckydrawMore` 的 `options`：**
>
> | 参数 | 类型 | 默认 | 说明 |
> |------|------|------|------|
> | `drawUseType` | `'chance' \| 'intergral'` | 自动 | 不传时：`myLeftDrawChance > 0` 用 `'chance'`（次数抽奖），否则 `'intergral'`（积分抽奖）。强制指定覆盖自动判断 |

---

## F.3 HTML/JS 接入：直接使用 headless service 函数

非 React 环境直接调用 service 编排函数（`luckydraw.ts` 导出，经 `window.DsActSdk` 暴露，不依赖 React）：

```javascript
// 站内/站外自动分流（isGodlike 判断 act 域 / web 域）
// 编排函数内部自动：预检(角色绑定/活动资格) + 时段校验 + 埋点 + Toast/Dialog 错误 + 成功刷新

// 1. 获取抽奖模块信息（写入 luckydrawMapState + 埋点）
const ok = await window.DsActSdk.fetchLuckydrawInfo();

// 2. 获取货币余额（仅积分抽奖有 currencyType；次数抽奖被守卫跳过返回 false）
await window.DsActSdk.fetchCurrencyInfo();

// 3. 单抽（返回 ApiResult<DrawResult> 或 null）
//    内部预检 + 自动选 drawUseType + Toast 错误，返回原始 ApiResult
const res = await window.DsActSdk.doLuckydraw();

// 4. 连抽（返回 ApiResult<DrawResultMerged> 或 null）
//    连抽 multiDrawLimit 次，结果合并为 DrawResultMerged
const resMore = await window.DsActSdk.doLuckydrawMore();

// 5. 一次性读取全部状态（非 React 消费方用，不发请求）
const { luckydrawModule, luckydrawInfo, currencyInfo, moduleCount } =
  window.DsActSdk.getLuckydrawState();

// 6. 纯函数（不依赖 React/store，可独立调用）
const canDraw = window.DsActSdk.checkCanDraw(luckydrawInfo);
if (canDraw.canDraw) { /* 可以抽 */ }
const again = window.DsActSdk.canDrawAgain(luckydrawInfo, currencyInfo);
const merged = window.DsActSdk.mergeLuckydrawResults(drawResultList);
```

> 编排函数内部已处理：`actPreCheck` 预检（站外跳大神/登录/活动资格/活动结束/角色绑定）、多模块检测、时段校验（`checkCanDraw`）、抽奖类型自动选择、成功后刷新 `luckydrawInfo` / `currencyInfo`、埋点自动发送、`Toast`/`Dialog` 错误提示。
>
> 底层接口（`getLuckydrawInfo` / `getCurrencyInfo` / `doLuckDrawByChance` / `doLuckDrawByCurrency` / `doLuckDrawByChanceMore` / `doLuckDrawByCurrencyMore`）亦可直接调用，但需自行处理预检、`asType` 取值、埋点与 Toast，一般用编排函数即可。
>
> **Provider 挂载前提**：F 是 headless 能力，自身无 `evoke()` 不挂载 `DsActProvider`。`luckydrawModuleAtom` 依赖 `actInfoState`（由 `DsActProvider` 的 `LoginBoot` 自动拉取）派生模块——若页面未接入其他 UI 组件（A 角色 / B 任务 / D CPS 底部栏），需确保 Provider 已挂载（React 声明式 `<DsActProvider>` 包裹，或接入任意 UI 组件 `.evoke()`），否则 `actInfo` 未加载、`luckydrawModule` 派生为 `null`、抽奖动作被守卫跳过。`doLuckydraw` 的预检（`actPreCheck`）也需 Provider 已挂载完成登录态/角色检测。

---

## F.4 抽奖模式：次数抽奖 vs 积分抽奖

`drawType` 描述后台配置的活动模式（4=积分，非4=次数）。**`drawType` 不决定接口选择、也不派生 `currencyType`**——`currencyType` 是后台配在 `luckydrawInfo` 上的字段（独立存在与否），`drawType` 仅在 `canDrawAgain` 中参与判断（见 F.2）。**接口选择**由 `doLuckydraw`/`doLuckydrawMore` 按 `options.drawUseType` 或 `myLeftDrawChance > 0` 自动选 `'chance'`/`'intergral'`。下表按 `drawType` 列出典型模式与余额行为：

| `drawType` | 模式 | `drawUseType='chance'` 走的接口 | `drawUseType='intergral'` 走的接口 | 货币余额 |
|------------|------|------|------|----------|
| 非 4 | 次数抽奖（消耗抽奖券/次数） | `doLuckDrawByChance` / `doLuckDrawByChanceMore` | `doLuckDrawByCurrency` / `doLuckDrawByCurrencyMore` | 通常无 `currencyType`（`fetchCurrencyInfo` 守卫检查 `currencyType` + `actId`，任一缺失返回 `false`，不检查 `drawType`） |
| 4 | 积分抽奖（消耗积分/货币） | 同上 | 同上 | 有 `currencyType`，`fetchCurrencyInfo` 拉取余额；抽奖成功后自动刷新余额 |

> **上表接口列按 `drawUseType` 分，不按 `drawType` 分**：两种 `drawType` 走的接口集合相同——`'chance'` 走 `doLuckDrawByChance`/More，`'intergral'` 走 `doLuckDrawByCurrency`/More。`drawType` 只影响是否有 `currencyType`（余额行为），不影响接口选择。自动选择按 `myLeftDrawChance > 0` 决定 `drawUseType`，与 `drawType` 无直接对应（如次数抽奖 `drawType≠4` 次数耗尽时自动选 `'intergral'`）。

> `doLuckydraw` / `doLuckydrawMore` 不传 `options.drawUseType` 时自动判断：`myLeftDrawChance > 0` → `'chance'`（次数），否则 `'intergral'`（积分）。两种模式的接口签名需 `useGlClientSignature` 签名，SDK 内部已处理。
>
> **`drawType` 与自动选择的关系**：`drawType` 描述后台配置的活动类型（4=积分，非4=次数），而自动选择按**剩余免费次数**决定走哪个接口。对纯次数抽奖（`drawType≠4`）次数耗尽时，自动选择会回退到 `'intergral'` 调 `doLuckDrawByCurrency`（积分接口）——若活动未配置积分抽奖，该请求会按后台返回处理（通常报错，由 `handleDrawError` 提示）。消费方若需严格限定模式，显式传 `options.drawUseType`（如次数抽奖强制 `'chance'`）。

---

## F.5 埋点行为

> `luckydraw.ts` service 函数内部在**实际发起接口请求后**通过 `sendLuckyLog` 发送埋点（hook 转发 service，故经 hook 或直接调 service 均发）。注意：前置守卫失败时（如 `fetchLuckydrawInfo` 的 `module`/`actId` 缺失、`doLuckydraw` 的预检/多模块/时段校验失败）直接返回 `false`/`null`，**不发送埋点**——埋点仅在进入实际请求分支后发送：

- `eventCategory`: `'lottery'`
- `eventAction`:
  - `'clk_new_2_100_12'`——抽奖动作（`doLuckydraw` / `doLuckydrawMore`）
  - `'exposure_new_2_100_13'`——信息拉取（`fetchLuckydrawInfo` / `fetchCurrencyInfo`）
- `eventLabel`: JSON.stringify 公共字段（`system` / `uid` / `deviceid` / `role_id` / `server` / `game_code` / `scene` / `remain`）+ `action` + `result`

| Action | action 字段 | result 取值 |
|--------|-------------|-------------|
| `fetchLuckydrawInfo` | `fetch_info` | `success` / `fail` |
| `fetchCurrencyInfo` | `fetch_currency` | `success` / `fail` |
| `doLuckydraw` | `draw` | `success` / `fail` |
| `doLuckydrawMore` | `draw_more`（含 `num`=`multiDrawLimit`） | `success` / `fail` |

> 公共字段 `remain`（剩余次数/余额）按模板优先级：`myLeftDrawChance > 0` 时取免费次数，否则取 `currencyInfo.balance`。埋点完全内部处理，消费方无需也不应手动发送。经 hook 或直接调 service 编排函数都会发埋点。
>
> **刷新为后台触发不等待**：`doLuckydraw`/`doLuckydrawMore` 成功后调 `fetchLuckydrawInfo()`/`fetchCurrencyInfo()` 刷新状态，但**不 `await`**——函数返回时状态可能尚未更新，响应式状态（hook）会在刷新完成后自动更新，非 React 消费方可稍后调 `getLuckydrawState()` 读取最新值。
>
> **`fetch*` 返回 `boolean` 非 `null`**：`fetchLuckydrawInfo`/`fetchCurrencyInfo` 返回 `Promise<boolean>`（成功 `true`/失败 `false`）；`doLuckydraw`/`doLuckydrawMore` 返回 `ApiResult` 或 `null`。「失败统一返回 `null`」仅适用于抽奖编排函数。

---

## F.6 错误码处理

> `handleDrawError(code, errmsg)` 在抽奖失败时（`code !== 200`）自动调用，消费方无需处理：

| 错误码 | 处理 | 说明 |
|--------|------|------|
| `971` | `Dialog.alert({ content: errmsg })` | 需用户确认的弹窗 |
| `50951` | `Toast.show('余额不足')` | 积分抽奖余额不足 |
| `975` | `Dialog.alert` + 确认后 `window.location.reload()` | 抽奖暂未开启，刷新页面 |
| 其他 | `Toast.show(errmsg)` | 通用错误提示 |

> 预检失败（`actPreCheck` 返回非 200）时 `doLuckydraw` / `doLuckydrawMore` 直接返回 `null`，不进抽奖流程。时段校验失败（`checkCanDraw.canDraw === false`）时 `Toast.show(reason)` 返回 `null`。

---

## F.7 关键约束

- **无 UI 组件**——抽奖动画/中奖弹窗/转盘等 UI 各活动页差异大，SDK 只提供逻辑能力（拉取信息、抽奖、合并结果、埋点、错误提示），消费方自行实现 UI
- **单模块约束**——`moduleList` 含多个 `asType===2` 模块时抽奖动作直接 `Toast.show('当前活动存在多个抽奖模块，暂不支持')` 返回 `null`；`moduleList` 无 `asType===2` 模块时 `luckydrawModuleAtom` 返回 `null`，抽奖动作被守卫跳过。SDK 不支持通过 configure 显式指定抽奖模块 asId，模块始终从 `actInfoState.moduleList` 派生
- **预检由编排函数内部完成**——`doLuckydraw` / `doLuckydrawMore` 内部调 `actPreCheck()`（站外跳大神/登录/活动资格/活动结束/角色绑定），消费方无需也不应手动预检
- **时段校验不弹 UI**——`checkCanDraw` 纯函数返回 `{ canDraw, reason }`，编排函数内 `Toast.show(reason)` 提示；消费方也可独立调用 `checkCanDraw` 自行决定 UI
- **成功后自动刷新**——单抽/连抽成功后编排函数自动调 `fetchLuckydrawInfo`（刷新模块信息）；当 `drawUseType === 'intergral'`（走货币接口）时额外调 `fetchCurrencyInfo`（刷新余额）——条件是 `drawUseType` 而非 `drawType`（如次数抽奖 `drawType≠4` 次数耗尽自动回退 `'intergral'` 时也会刷新余额），消费方无需手动刷新
- **消费方须防重复点击**——`doLuckydraw` / `doLuckydrawMore` 是 async，用户连点会触发多次请求；React 用 debounce，HTML/JS 用锁变量（`let drawing = false; if (drawing) return; drawing = true; try { ... } finally { drawing = false; }`）
- **`DrawResult` 无 `isError` 字段**——SDK 失败统一返回 `null`（不返回带 `isError` 的对象），消费方判断 `res && res.code === 200` 即成功
- **连抽结果需合并**——`multiDraw` 接口返回 `MultiDrawResult.drawResultList`（`DrawResult[]`），编排函数内部已调 `mergeLuckydrawResults` 合并为 `DrawResultMerged`；消费方若直接调底层 `doLuckDrawByChanceMore` / `doLuckDrawByCurrencyMore` 需自行合并

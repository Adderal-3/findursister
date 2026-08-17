# 子模块 E：心易会员流失召回

> 本文件由 `ds-act-sdk.md` 步骤 7 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> 与 A/B/D 不同，本子模块是 **headless 能力**（无 UI 组件、无 HTML 容器、无 `evoke()` 调用），消费方在业务代码中调用 hook 或 service 函数。

---

## E.1 configure 注入 vipRecall 配置

`configure()` 需额外传入 `vipRecall` 字段（分环境），包含 VIP 子活动 ID 和回流礼包模块 asId 列表：

```javascript
window.DsActSdk.configure({
  production: {
    actId: '6954c5d472bbb96d77fe687c',
    appKey: 'x2',
    frontId: 'yyy',
    // 心易会员流失召回配置
    vipRecall: {
      actId: 'vip-sub-act-id',       // VIP 子活动 ID（与主 actId 不同）
      recallAsIds: ['m1', 'm2'],     // 回流礼包模块 asId 列表
    },
  },
});
```

> **说明：**
> - `vipRecall.actId` 是独立的 VIP 子活动 ID，和主 `actId` 不是同一个
> - `recallAsIds` 标识 VIP 子活动中哪些模块是回流礼包模块（按 `asId` 匹配，`asType` 由 SDK 从匹配模块取用，不再写死）
> - 不传 `vipRecall` 时，hook 方法内部 guard 不执行，不会发起任何请求

---

## E.2 React 接入：useVipRecall hook

React 项目中，通过 `useVipRecall` hook 使用完整能力（Vue/原生 JS 接入见 E.3）：

```javascript
const {
  fetchVipInfo,
  fetchVipActInfo,
  fetchGiftApplyInfo,
  claimGiftPrize,
  canVipRecallGet,
} = window.DsActSdk.useVipRecall();

// 角色绑定后调用
fetchVipInfo();       // 获取心易会员等级（V0–V7）
fetchVipActInfo();    // 编排入口：预检（确保角色绑定）→ 查流失 → 查礼包

// 用户点击「领取」时调用
if (canVipRecallGet.canApply) {
  claimGiftPrize();  // 无资格内部 Toast.show(reason)，失败弹固定文案；成功不弹 Toast（由业务自行处理提示），返回接口结果
}
```

> **hook 返回值：**
>
> | 方法/属性 | 说明 |
> |-----------|------|
> | `fetchVipInfo()` | 获取心易会员等级，写入 `currentLevelState` |
> | `fetchVipActInfo()` | 编排入口：预检（确保角色绑定）→ 查流失 → 查礼包（vipActInfo 由 LoginBoot 自动拉取，不在编排内） |
> | `fetchGiftApplyInfo()` | 获取礼包领取模块信息（通常由 `fetchVipActInfo` 内部调用，也可独立调） |
> | `claimGiftPrize(options?)` | 领取回流礼包；无资格 `Toast.show(reason)` 返回 null，无匹配模块返回 null，失败弹固定文案；成功不弹 Toast（业务自行处理提示，如 Toast/弹窗），返回接口结果（`options.n4OneDefaultPrize` 领默认奖品） |
> | `canVipRecallGet` | 派生状态 `VipRecallEligibility`：`{ canApply, reason }`（不可领取时 `reason` 给出原因） |

---

## E.3 HTML/JS 接入：直接使用 headless service 函数

非 React 环境直接调用 service 编排函数（`vip-recall.ts` 导出，经 `window.DsActSdk` 暴露，不依赖 React）：

```javascript
// 站内/站外自动分流（isGodlike 判断 exp 域 / web 域）
// 编排函数内部自动发埋点、写状态、Toast 提示

// 1. 获取会员等级
await window.DsActSdk.fetchVipInfo();

// 2. 一键编排：预检（确保角色绑定）→ 查流失 → 查礼包
await window.DsActSdk.fetchVipActInfo();

// 3. 领取回流礼包（无资格 Toast.show(reason)；成功不弹 Toast，业务自行处理提示，返回接口结果）
const res = await window.DsActSdk.claimGiftPrize({ n4OneDefaultPrize: true });

// 4. 一次性读取全部状态（非 React 消费方用）
const { currentLevel, isUserLoss, canVipRecallGet, giftApplyInfo, vipModule } =
  window.DsActSdk.getVipRecallState();
```

> 编排函数内部已处理：预检角色绑定、`asType` 从匹配模块动态取（不再写死）、`baseURL` 运行时按 env 切换、埋点自动发送。
>
> 底层接口（`getVipInfo` / `getUserLossInfo` / `getGiftApplyInfo` / `applyGiftPrize`）亦可直接调用，但需自行处理角色绑定、`asType` 取值、埋点与 Toast，一般用编排函数即可。

---

## E.4 埋点行为

> `vip-recall.ts` service 函数内部在每个 action 完成时自动通过 `sendVipLog` 发送埋点（hook 转发 service，故经 hook 或直接调 service 均发）：

- `eventCategory`: `'vip_recall'`
- `eventAction`: `'exposure_new_3_1913_4'`
- `eventLabel`: 基础字段（`vip_level` / `current_lost_status` / `button_status` 等）+ `action` + `result`

| Action | action 字段 | result 取值 |
|--------|-------------|-------------|
| `fetchVipInfo` | `fetch_vip_info` | `success` / `fail` |
| `fetchVipActInfo` | `fetch_vip_act_info` | `success` / `fail` |
| `fetchGiftApplyInfo` | `fetch_gift_apply_info` | `success` / `fail` |
| `fetchUserLossInfo` | `fetch_user_loss` | `success` / `fail` |
| `claimGiftPrize` | `apply_gift_prize` | `success` / `fail` / `ineligible` / `no_module` |

> 埋点完全内部处理，消费方无需也不应手动发送。经 hook 或直接调 service 编排函数都会发埋点。

---

## E.5 关键约束

- **无 UI 组件**——回流弹窗等 UI 各活动页差异大，SDK 只提供逻辑能力，消费方自行实现 UI
- **vipRecall 配置必传**——不传 `vipRecall` 时 hook 方法内部 guard 不执行，不发起请求
- **actClientType 渠道守卫不内化**——SDK 不硬编码 `actClientType === '2'` 判断，消费方自行决定是否在特定渠道下跳过调用
- **exp 域接口**——VIP/流失查询走 `god-exp.gameyw.netease.com`，SDK 内部已处理，消费方无需关心域名
- **领奖 Toast 由 service 内部弹出**——`claimGiftPrize` 无资格弹 `reason`（如「已领取或不满足领取资格，请前往网易超级会员专区查询」），失败弹「领取失败，请前往大神网易超级会员专区查询」；成功不弹 Toast，由业务自行处理提示（Toast/弹窗等），SDK 返回接口结果
- **getUserLossInfo 依赖角色绑定**——必须先调 `actPreCheck(undefined, undefined, undefined, vipActId)` 确保角色已绑定（未绑自动唤起选角），否则 roleId 为空导致请求失败
- **actPreCheck 传 actId 时检查 vip 活动的 canOffsiteJoin**——非主活动。vip 活动需在后台配置支持站外参与，否则站外访问返回 801

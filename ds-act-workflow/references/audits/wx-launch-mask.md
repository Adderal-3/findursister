# 安卓微信遮罩块（WX-LAUNCH-MASK）

> **性质：建议项（不阻断）。** 此块是后期新增能力，早期接入模式1的小游戏不会有它。审查的目的是**引导**这些历史项目补接，而不是把它们判为失败。

## 触发前提

仅当项目已接入大神功能（存在 `src/ds.js` 且含 `[DS:CONFIG:START]`）时才检查。

## 判定逻辑

读取 `src/ds.js` 中的 `H5_LOGIN_ENABLED` 值，并检测是否存在 `[DS:WX-LAUNCH-MASK:START]` marker：

| H5_LOGIN_ENABLED | 有 WX-LAUNCH-MASK marker | 结论 |
|---|---|---|
| `false`（不支持站外体验） | 否 | ⚠️ **建议补接**：输出引导（见下方） |
| `false` | 是 | ✅ 已接入，检查块内 4 项 |
| `true`（支持站外体验） | 否 | ✅ 无需接入（支持站外，用户可直接在微信内玩，不应加遮罩） |
| `true` | 是 | ⚠️ 提示：支持站外却仍挂了遮罩，`initWxLaunchMask()` 内 `if (H5_LOGIN_ENABLED) return;` 会自动跳过，功能不生效，可保留也可移除 |

## 已接入时的检查项（仅当 marker 存在）

- [ ] `initWxLaunchMask()` 在 `initApp()` 内被调用（`initUlink()` 之后、`await initLogin()` 之前）
- [ ] 函数体首行 `if (H5_LOGIN_ENABLED) return;` 存在（支持站外时不展示遮罩）
- [ ] 有 `window.ds.isGodlike` 与 `isWechatMiniProgram()` 的提前 return（App 内 / 小程序内不挂遮罩）
- [ ] `WxLaunchMask.mount` 的 `extInfo` 使用 `SQUARE_ID` 拼接 ulink 地址，且 UMD 从 `wx-launch-mask.umd.js` 加载

## "建议补接"引导输出模板

当结论为 ⚠️ 建议补接时，向用户输出：

```
⚠️ 建议补接：安卓微信全屏遮罩引导

  检测到本项目已接入大神功能，且 H5_LOGIN_ENABLED = false（不支持 App 站外体验），
  但尚未接入安卓微信遮罩。安卓微信用户当前无法被引导唤起大神 App。

  建议接入 WxLaunchMask：安卓微信内展示全屏遮罩 + 微信标签，点击直接唤起大神 App，
  可显著提升站外微信流量的回流转化。

  👉 重新运行 /ds-act-workflow → [1] 接入大神功能，即可自动补上该模块（不影响现有代码）。
```

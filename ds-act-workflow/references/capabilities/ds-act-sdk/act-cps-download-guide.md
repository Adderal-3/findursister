# 子模块 G：CPS 下载引导弹窗

> 本文件由 `ds-act-sdk.md` 步骤 7 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> `frontId` 已在编排器步骤 5 按需收集并写入 `sdk.configure()`（G 与 D 一样依赖 frontId 拉取 `cpsModalConfig.ext`），本模块无需重复询问。
>
> API 详情见 `{skill_dir}/references/contracts/ds-act-sdk-api.md` 第 4.5 节。
>
> 💡 完整配置项含义可查阅组件文档：https://fe.docs-opd.nie.netease.com/page/ds-act-business-components/cps-download-modal
> 注意：`isWydsCpsUser`、`loginedUser` 等由 SDK 自动注入，业务侧无需关心。

---

## G.1 能力说明

`CpsDownloadModal` 是**命令式 CPS 下载引导弹窗**，与任务弹窗（B）**完全独立**——不依赖 `taskListPopupState`，可在任意业务时机（抽奖后、点击按钮等）零参调起：

- 宿主组件 `return null`，仅作为 `usePreCpsDownload` 的运行宿主
- `evoke({ container })` 将宿主挂到隐藏节点，跑起 hook（自带 DsActProvider，自动处理登录态 + frontConfig 拉取）
- 零参 `showCpsDownloadModal()` 调起弹窗，**站内四步走 / 站外两步走由 `isGodlike()` 在宿主内部自动分发**，调用方无需选择环境

| 环境 | 判定 | 流程 | 关键前提 |
|------|------|------|----------|
| 大神 APP 内 | `isGodlike()` = true | 四步走引导 | iOS 不支持（底层 Toast「暂不支持ios设置」） |
| 大神 APP 外（Web/社交） | `isGodlike()` = false | 两步走引导 | 需 `cpsCanDownloadOutside = true`；社交内置浏览器引导系统浏览器 |

---

## G.2 询问配置

```
CPS 下载引导弹窗配置：

  asId（触发任务ID，必填）：_______________
  例如：6a0d7747226c7a38df7fb83a
  用途：调起前用 TaskChecker 判断该任务是否完成，未完成才弹窗
        （任务由业务场景决定，不限回流；TaskChecker 与用户维度绑定，不支持按角色区分）

  ⚠️ 其余展示配置（游戏图标/名称/下载链接/包名/是否允许站外下载等）
     由运营在大神后台 frontConfig「CPS下载引导弹窗」项（cpsModalConfig.ext）配置，
     代码侧无需也不应硬编码。

  frontId 已在编排器步骤 5 收集，本模块无需重复询问。
```

> **G 依赖 frontId + actId + asId**：`CpsDownloadModal` 从 `frontConfig.cpsModalConfig.ext` 读取展示配置（依赖 frontId）；调起前的任务完成校验依赖 `TaskChecker(actId, asId)`（actId 复用骨架已填值，asId 本模块收集）。`frontId` 未配置时弹窗无数据。

---

## G.3 注入 HTML 容器

遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入隐藏挂载容器：

```html
<!-- DS Act SDK CPS 下载引导弹窗容器（宿主 return null，挂隐藏节点） -->
<div id="ds-cps-download-modal-root" style="position:absolute;width:0;height:0;overflow:hidden;"></div>
```

---

## G.4 生成初始化代码

在 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间追加以下代码：

```javascript
// —— CPS 下载引导弹窗（evoke 挂宿主，跑起 usePreCpsDownload；配置走后台 frontConfig）——
window.DsActSdk.CpsDownloadModal.evoke({
  container: '#ds-cps-download-modal-root',
});

// 业务任意时机调起（站内四步/站外两步由 isGodlike 自动分发）：
// 调起时机由业务方自行决定（抽奖后/点击下载按钮等）。
// 推荐走「预检 + 任务完成校验」链路，未完成任务才弹窗：
var tc = new window.DsActSdk.TaskChecker('__ACT_ID__', '__AS_ID__');
async function onDownloadClick() {
  var pre = await window.DsActSdk.actPreCheck();       // 预检：环境/登录/活动起止/绑角
  if (pre.code !== 200) return;
  if (!(await tc.isMatched())) return;                 // 任务不存在
  await tc.query();
  if (tc.isCompleted()) return;                        // 已完成，无需下载
  if (window.ds && ds.isIOS) return;                   // iOS 不支持，走后续流程
  window.DsActSdk.CpsDownloadModal.showCpsDownloadModal();  // 未完成 → 调起弹窗
}
```

> **⚠️ 生成规则（必须遵守）：**
> - `evoke({ container })` 在页面加载时调用一次挂宿主，**只调一次**
> - `showCpsDownloadModal()` 是**零参**命令式入口，**禁止封装成函数**（旧版废弃写法），由业务方在需要处直接裸调
> - **禁止询问触发模式**——调起时机完全由业务方决定
> - **禁止硬编码展示配置**——所有配置走 `cpsModalConfig.ext`，代码只写 `evoke({ container })`
> - **禁止将弹窗绑定任务面板**——它是独立 evoke，不依赖 `taskListPopupState`
> - `TaskChecker(actId, asId)` 是业务层预检参数（`CpsDownloadModal` 组件本身不接收 asId），`__AS_ID__` 填 G.2 收集的 asId

---

## G.5 行为说明

> - **配置单一来源**：`icon` / `name` / `desc` / `cpsUrl` / `packageName` / `cpsCanDownloadOutside` / `showGuide` 全部来自 `frontConfig.cpsModalConfig.ext`
> - **站内/站外自动分发**：`showCpsDownloadModal()` 内部按 `isGodlike()` 选站内四步 / 站外两步，调用方零参无需选环境
> - **`showGuide`**：是否展示「引导用户前往设置」UI，走 `ext.showGuide`，默认 `false`
> - **iOS 短路**：CPS 不支持 iOS。站内 `ds.isIOS` 为 true 时，底层仅给出 Toast 提示，不会真正弹窗；业务侧应在调起前自行判断 `ds.isIOS` 并直接走后续流程，避免无效调起
> - **站外前提**：`cpsCanDownloadOutside` 为 false 时底层 Toast「未开启cps包体允许站外下载配置」，不弹窗
> - **社交浏览器**：站外微信/微博/QQ 内置浏览器调用 `GlBrowserGuid()` 引导系统浏览器打开
> - **宿主未挂载**：未先 `evoke` 直接 `showCpsDownloadModal()` 输出 `console.error` 且不弹窗

---

## G.6 填充占位符

| 占位符 | 替换为 |
|--------|--------|
| `__ACT_ID__` | 骨架代码中已填充的 actId（直接复用同一值） |
| `__AS_ID__` | 填 G.2 收集的触发任务 asId 字符串（配合 TaskChecker 预检） |

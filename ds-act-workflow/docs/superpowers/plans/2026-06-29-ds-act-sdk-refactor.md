# ds-act-sdk 模式6重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 ds-act-workflow 模式6（ds-act-sdk 接入），使其与 SDK 0.1.2 实际代码对齐：删除冗余 IIFE 骨架改为直接 evoke、新增角色绑定能力、简化 frontId 收集、从新实现审查规则、新增独立 API 文档。

**Architecture:** 以 `~/ds-act/ds-act-sdk/src` 代码为唯一信源。核心机制：`configure()` 仅写配置；四个 UI 组件 `.evoke()` 内部走 `mountComponent` 自动挂载全局单例 `DsActProvider` → `LoginBoot` 自动完成登录态检测 + `fetchActInfo`；`TaskChecker` 是纯逻辑类与 store 隔离。重构后接入代码大幅简化：`configure()` + 各组件直接 `evoke({ container })`，无 IIFE、无手动登录检测、无 `initActTask` 封装。

**Tech Stack:** Markdown 指令文件（skill 模板）

## Global Constraints

- SDK 版本统一为 `0.1.2`，CDN 地址为 `https://ds.res.netease.com/online/pkg/ds-act-sdk/0.1.2/ds-act-sdk.min.js`
- 以代码为准（`~/ds-act/ds-act-sdk/src`），官方 docs/components/ 下文档部分已过时不可信
- 四个能力项固定顺序 A→B→C→D：角色绑定 / 任务弹窗 / 回流任务检测 / CPS 底部栏
- 删除 IIFE 骨架代码、手动登录检测、`_setupActSdk`、`initActTask`、`checkReturnTask` 封装
- `configure()` 只配置 `production`，不含 `staging`
- `evokeRoleSelection()` 不作为独立能力项，作为 `act-role.md` 的高级用法说明
- `TaskChecker` 只生成最小调用骨架，不封装函数、不做触发模式询问
- `frontId` 仅选了 D（CPS 底部栏）时才询问
- 只需要任务弹窗（TaskModule），不需要任务列表（TaskList）
- 纯函数绑角（`evokeRoleSelection`）前必须先有一次 UI `evoke`，这是依赖关系
- 所有改造都是文档级修改（修改 .md 模板文件），不涉及代码运行时逻辑
- `local://ds-act-sdk-api.md` 已校验的 API 文档将作为正式 reference 文件 `references/ds-act-sdk-api.md`

---

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `references/ds-act-sdk-api.md` | 新增：SDK API 文档（从 `local://ds-act-sdk-api.md` 落地为正式文件） |
| `references/ds-act-sdk.md` | 重写：编排器，新增能力总览、简化骨架、版本 0.1.2 |
| `references/act-role.md` | 新增：角色绑定子模块（Role.evoke + evokeRoleSelection 高级用法） |
| `references/act-task.md` | 重写：任务弹窗子模块，删除 IIFE/initActTask，改为直接 evoke |
| `references/act-task-checker.md` | 重写：回流任务子模块，改为最小调用骨架 |
| `references/act-cps-bar.md` | 重写：CPS 底部栏子模块，删除登录态判断，改为直接 evoke |
| `references/audits/act-sdk.md` | 从新实现：审查规则适配新接入方式 |
| `SKILL.md` | 修改：模式6描述、常见问题表更新 |

---

## Task 1：落地 API 文档为正式 reference 文件

**Files:**
- Create: `references/ds-act-sdk-api.md`

**Interfaces:**
- Produces: `references/ds-act-sdk-api.md` — 供 Task 2 的编排器和 Task 7 的审查规则引用

- [ ] **Step 1：读取已校验的 API 文档内容**

读取 `local://ds-act-sdk-api.md` 全文（已通过 reviewer 子代理对照源码校验，7 个问题已修正）。

- [ ] **Step 2：写入正式 reference 文件**

将 `local://ds-act-sdk-api.md` 的完整内容写入 `references/ds-act-sdk-api.md`，保持已有修正（useGodlike/useActInfo/useUserTask 返回值、squareId 删除、错误码补全、合并语义）。

- [ ] **Step 3：验证文件内容完整性**

读取 `references/ds-act-sdk-api.md`，确认包含十个章节：核心机制、配置 API、Provider、UI 组件 API、纯逻辑 API、Hooks API、Services API、Store & Atoms、核心类型定义、参考资料。确认 SDK 版本为 0.1.2（若文档中 CDN 地址仍为 latest，需改为 0.1.2）。

- [ ] **Step 4：Commit**

```bash
git add references/ds-act-sdk-api.md
git commit -m "feat(ds-act-sdk): 新增 API 文档 reference 文件（基于源码校验）"
```

---

## Task 2：重写编排器 ds-act-sdk.md

**Files:**
- Modify: `references/ds-act-sdk.md`（全文重写）

**Interfaces:**
- Consumes: `references/ds-act-sdk-api.md`（API 文档引用）
- Produces: 编排器，供 SKILL.md 模式6加载；步骤6加载子模块 `act-role.md` / `act-task.md` / `act-task-checker.md` / `act-cps-bar.md`

- [ ] **Step 1：重写编排器全文**

写入以下内容到 `references/ds-act-sdk.md`：

````markdown
# 六、大神活动接入（MODE 6: DS-ACT-SDK）

> **功能定位：** 接入 `ds-act-sdk`，为活动 H5 提供以下可选能力：
>
> - **角色绑定**：页面常驻角色选择入口，点击完成登录预检→绑角/换角流程
> - **任务弹窗**：半屏弹窗渲染任务列表，支持固定按钮或自定义触发元素
> - **回流任务检测**：纯逻辑类，检测流失用户任务完成/可领奖状态，业务方自行决定弹窗时机
> - **CPS 底部栏**：页面底部常驻展示游戏下载/预约引导
>
> 💡 完整 API 文档见 `{skill_dir}/references/ds-act-sdk-api.md`（以 SDK 源码为准）
> 💡 小游戏接入前端配置说明参考文档：https://docs.popo.netease.com/team/pc/dsfekb/pageDetail/f16bf2ba8be5406993a2093bfd91b57e

---

## 步骤 1：前置检查

在所有含 DS Marker 的 HTML 文件和 `src/` 中搜索 `ds-act-sdk` / `DsActSdk`：

- ✅ 未找到 → 继续
- ⚠️ 已找到 → 询问是否覆盖，用户选 `n` 则终止

---

## 步骤 1.5：HTML 页面选择

扫描所有含 DS Marker 的 HTML 文件（即已通过模式1接入大神的页面）。

**若只有 1 个含 DS Marker 的 HTML 文件**：
- `ACT_SDK_HTML_FILES = [该文件]`
- 静默跳过，不询问用户

**若有多个含 DS Marker 的 HTML 文件**：

```
## HTML 页面选择

检测到以下含 DS Marker 的 HTML 文件：

  [✅] index.html（默认）
  [ ] page2.html
  [ ] result.html

请输入需要接入 ds-act-sdk 的页面（回车确认默认，或输入文件名，逗号分隔）：
```

用户确认后，记录为 `ACT_SDK_HTML_FILES`。

> **注意：** 候选为含 DS Marker 的文件，而非所有 HTML 文件。ds-act-sdk 依赖 SDK-LOADER 已就位。

---

## 步骤 2：注入 SDK 资源

遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `<head>` 末尾（SDK-LOADER 块之后）追加，确保在 `src/ds.js` 加载之前就位：

```html
<!-- DS Act SDK -->
<link
  rel="stylesheet"
  href="https://ds.res.netease.com/online/pkg/ds-act-sdk/0.1.2/ds-act-sdk.min.css"
/>
<script
  type="text/javascript"
  src="https://ds.res.netease.com/online/pkg/ds-act-sdk/0.1.2/ds-act-sdk.min.js"
></script>
```

确认 `src/ds.js` 的引用标签有 `type="module"`（相对路径脚本必须使用，否则 `import`/`export` 语法报错）：

```html
<script type="module" src="src/ds.js"></script>
```

---

## 步骤 3：询问配置参数

```
请填写 ds-act-sdk 的活动配置参数：

  actId（活动ID）：_______________
  appKey（必填）：_______________

💡 actId 是大神活动后台（外网）生成的活动 ID，格式如：69f08224bc343227bf382956
   请登录大神运营后台 → 找到对应活动 → 复制活动 ID（注意：不是内网后台的 ID，也不是圈子 ID）
⚠️ 若只接入 CPS 底部栏（功能 D），actId 可跳过不填
💡 appKey 若 ds.js 中已有，可自动复用，无需重复填写
```

**`sdk.configure` 完整参数说明：**

| 参数      | 是否必填 | 说明                                                                                                        |
| --------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `actId`   | 按需填写 | 大神活动后台（**外网**）生成的活动 ID；角色绑定(A)/任务弹窗(B)/回流任务(C)必填；仅接入 CPS 底部栏(D)时可省略 |
| `appKey`  | ✅ 必填  | 游戏 appKey，如 `ma75`                                                                                      |
| `frontId` | 按需填写 | 前端活动页配置 ID；**CPS 底部栏(D)必填**（拉取后台配置），其他功能不依赖                                    |

**智能复用：** 若 `src/ds.js` 中已有 `APP_KEY` 常量，自动读取并提示用户确认复用。

---

## 步骤 4：能力总览与功能多选

### 能力总览

ds-act-sdk 提供以下能力，各能力 API 签名、入参出参、依赖详见 `{skill_dir}/references/ds-act-sdk-api.md`：

| 能力 | API | 类型 | 依赖 | 说明 |
|------|-----|------|------|------|
| A 角色绑定 | `Role.evoke({ container })` | UI 组件 | configure（actId/appKey） | 页面常驻角色选择入口，点击完成绑角/换角 |
| B 任务弹窗 | `TaskModule.evoke({ container })` | UI 组件 | configure（actId/appKey） | 半屏弹窗渲染任务列表，通过 `dsActStore.set(taskListPopupState, true)` 控制显隐 |
| C 回流任务检测 | `new TaskChecker(actId, asId)` | 纯逻辑类 | configure（actId） | 检测流失用户任务状态，业务方自行决定弹窗时机。与 store 隔离，自带 actInfo 拉取 |
| D CPS 底部栏 | `CpsUniversalBar.evoke({ container })` | UI 组件 | configure（actId/appKey/**frontId**） | 页面底部常驻下载/预约引导栏，配置全由后台 frontConfig 注入 |

> **关键机制：** 四个 UI 组件的 `.evoke()` 内部自动挂载全局单例 `DsActProvider`，自动完成登录态检测 + `fetchActInfo` 拉取活动信息。**无需手动检测登录态、无需手动拉取 actInfo。**

### 功能多选

```
请选择需要接入的功能（可多选，用字母组合输入，如 AD、C、ABCD）：

  [A] 角色绑定 — 页面常驻角色选择入口，点击完成绑角/换角
  [B] 任务弹窗 — 半屏弹窗渲染任务列表，支持固定按钮或自定义触发元素
  [C] 回流任务检测 — 纯逻辑类，检测流失用户任务状态，业务方自行决定弹窗时机
  [D] CPS 底部栏 — 页面底部常驻下载/预约引导栏

输入（如 AD、C、ABCD）：
```

用户输入后，按 **A → B → C → D** 的固定顺序依次执行选中模块。输入顺序不影响执行顺序。

---

## 步骤 5：frontId 配置收集

**若选中了 D（CPS 底部栏）**，frontId 必填（CpsUniversalBar 依赖 frontConfig 拉取后台配置，`appKey` 为空时组件 `return null` 不渲染）。

检查用户是否已提供 frontId：

- ✅ 已提供 → 继续
- ⚠️ 未提供 → **原文向用户展示以下内容（含参考文档链接，不得省略）**：

```
CPS 底部栏需要 frontId（前端活动页配置 ID）才能正常工作。

  frontId：_______________

💡 frontId 是大神活动后台（外网）生成的前端活动页配置 ID，格式如：6a0c7c2c226c7a38df7fb80c
   请登录大神CMS后台 → 找到前端活动页配置项 → 复制前端 ID

📌 前端ID 配置参考文档（必看）：
   https://docs.popo.netease.com/team/pc/dsfekb/pageDetail/f16bf2ba8be5406993a2093bfd91b57e
```

**若未选中 D**，不询问 frontId。

---

## 步骤 6：生成全局配置代码 + 加载子模块

### 6.1 全局配置

在 `src/ds.js` 末尾追加以下配置代码（若无 `src/ds.js` 则追加到业务主 JS 文件）：

```javascript
/* ========== DS:ACT-SDK BEGIN ========== */
window.DsActSdk.configure({
  production: {
    actId: "__ACT_ID__", // 角色绑定(A)/任务弹窗(B)/回流任务(C) 必填；仅 CPS 底部栏(D) 时可删除此行
    appKey: "__APP_KEY__",
    // frontId: '__FRONT_ID__', // CPS 底部栏(D) 必填，其他功能不依赖
  },
});
/* ========== DS:ACT-SDK END ========== */
```

**占位符：**

| 占位符         | 替换为                                                   |
| -------------- | -------------------------------------------------------- |
| `__ACT_ID__`   | actId                                                    |
| `__APP_KEY__`  | appKey                                                   |
| `__FRONT_ID__` | frontId（仅选了 D 时取消注释并填写）                     |

### 6.2 加载子模块

**填充占位符后，依次读取并执行选中模块的 reference 文件：**

| 用户选择 | 读取文件                                     |
| -------- | -------------------------------------------- |
| A        | `{skill_dir}/references/act-role.md`         |
| B        | `{skill_dir}/references/act-task.md`         |
| C        | `{skill_dir}/references/act-task-checker.md` |
| D        | `{skill_dir}/references/act-cps-bar.md`      |

> **关键机制说明（各子模块共享）：**
>
> - `configure()` 仅写配置到内存，不触发任何初始化
> - 四个 UI 组件（Role/TaskModule/CpsUniversalBar）的 `.evoke()` 内部走 `mountComponent` → 自动挂载全局单例 `DsActProvider` → `LoginBoot` 自动完成登录态检测 + `fetchActInfo` 拉取活动信息
> - **无需手动检测登录态、无需手动拉取 actInfo**——evoke 自带的 Provider 会自动处理
> - `TaskChecker` 是纯逻辑类，与 store 隔离，自己拉取 actInfo，可脱离 Provider 独立使用

---

## 步骤 7：汇总完成报告

所有选中模块执行完毕后，输出汇总报告：

```
## 🎯 大神活动接入完成

### 文件变更
| 文件 | 操作 |
|------|------|
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 注入 ds-act-sdk CSS/JS（0.1.2） |
| src/ds.js | ✅ 追加 DS:ACT-SDK 配置代码（configure） |
| （以下根据选中模块列出） |
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 添加 #ds-role-root 容器（A：角色绑定） |
| src/ds.js | ✅ 追加 Role.evoke 代码（A：角色绑定） |
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 添加 #ds-task-root 容器（B：任务弹窗） |
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 添加 #ds-task-entry-btn 按钮（B：任务弹窗，仅自动按钮模式） |
| src/style.css | ✅ 追加按钮样式（B：任务弹窗，仅自动按钮模式） |
| src/ds.js | ✅ 追加 TaskModule.evoke 代码（B：任务弹窗） |
| src/ds.js | ✅ 追加 TaskChecker 调用骨架（C：回流任务检测） |
| ACT_SDK_HTML_FILES 中每个文件 | ✅ 添加 #ds-cps-bar-root 容器（D：CPS 底部栏） |
| src/ds.js | ✅ 追加 CpsUniversalBar.evoke 代码（D：CPS 底部栏） |

### 配置
| 参数 | 值 |
|------|----|
| actId | [值] |
| appKey | [值] |
| frontId | [若已配置] |
| （以下根据选中模块列出） |
| showRole（B） | [值] |
| asId（C） | [值] |

### 验证方式
1. 登录大神账号
2. （A）页面出现角色选择入口，点击可完成绑角/换角
3. （B）确认入口按钮出现（自动按钮模式）或指定元素可点击（自定义触发模式），点击后任务弹窗弹出并出现任务列表
4. （C）在游戏内完成任务后返回 H5，确认满足条件时可领奖
5. （D）页面底部出现 CPS 底部栏，点击右侧按钮可跳转/触发预约下载

```

> 仅列出用户实际选中的功能条目，未选中的不展示。

---

接入完成后，询问：

```
还需要继续操作吗？

  [2] 🔍 审查代码 → 校验接入写法是否合规
  [3] 🚀 构建并打包 → 生成 deploy.zip 上传大神平台
  [Q] 退出

输入选项或直接关闭：
```
````

- [ ] **Step 2：验证编排器内容**

读取 `references/ds-act-sdk.md`，确认：
- 版本号为 0.1.2
- 步骤4包含"能力总览"表格（4个能力，含 API/类型/依赖/说明）
- 步骤6.1 骨架代码只有 `configure()`，无 IIFE、无 `_setupActSdk`、无 `initActTask`
- 步骤6.2 子模块加载表包含 `act-role.md`
- 引用了 `references/ds-act-sdk-api.md`

- [ ] **Step 3：Commit**

```bash
git add references/ds-act-sdk.md
git commit -m "feat(ds-act-sdk): 重写编排器，新增能力总览，简化骨架，版本 0.1.2"
```

---

## Task 3：新增角色绑定子模块 act-role.md

**Files:**
- Create: `references/act-role.md`

**Interfaces:**
- Consumes: 编排器步骤6.2 加载本文件；依赖 `configure()` 已执行
- Produces: `Role.evoke()` 调用代码 + `#ds-role-root` 容器

- [ ] **Step 1：写入角色绑定子模块**

写入以下内容到 `references/act-role.md`：

````markdown
# 子模块 A：角色绑定

> 本文件由 `ds-act-sdk.md` 步骤 6 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> API 详情见 `{skill_dir}/references/ds-act-sdk-api.md` 第 4.1 节。

---

## A.1 注入 HTML 容器

遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入挂载容器：

```html
<!-- DS Act SDK 角色绑定容器 -->
<div id="ds-role-root"></div>
```

---

## A.2 生成角色绑定代码

在 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间追加以下代码：

```javascript
// —— 角色绑定（evoke 自带 DsActProvider，自动处理登录态 + actInfo）——
window.DsActSdk.Role.evoke({
  container: '#ds-role-root',
  // placeholder: '请选择角色',  // 可选：未绑角色时的占位文案，默认 "请选择角色"
  // changeIcon: 'https://...',  // 可选：切换角色图标 URL
  // arrowIcon: 'https://...',   // 可选：未绑角色箭头图标 URL
});
```

> **行为说明：**
> - 组件挂载后展示当前已绑角色（图标+昵称+切换箭头）或占位文案
> - 点击 → 自动完成登录预检 → 未绑角时唤起选角弹窗 → 绑定成功后刷新 actInfo
> - 已绑角色且 `actInfo.switchBindingRole === true` 时显示切换入口
> - `actInfo.appKey` 为空时渲染空 div（actInfo 由 evoke 触发的 Provider 自动拉取）

---

## A.3 高级用法：evokeRoleSelection（纯逻辑唤起选角）

若业务逻辑需要**主动触发绑角**（而非通过 Role 组件点击），可使用 `evokeRoleSelection()` 纯函数：

```javascript
// ⚠️ 依赖：evokeRoleSelection 直接读写 dsActStore，需要 actInfo 已就位
// 必须先有一次 UI 组件 .evoke() 调用（Role/TaskModule/CpsUniversalBar 任一），
// 使 DsActProvider 挂载并自动拉取 actInfo，否则 store 为空绑角失败
window.DsActSdk.evokeRoleSelection({
  onBound: function () {
    console.log('[ActSdk] 绑角成功');
  },
});
```

> **API 签名：** `evokeRoleSelection(opts?: { onBound?: () => void }): Promise<void>`
>
> **行为：** 拉取角色列表 → 弹出选角弹窗 → 绑定角色 → 刷新 actInfo
>
> **依赖陷阱：** 此函数不挂载 DsActProvider，依赖 store 里 `actInfoState.appKey` 已就位。若此前无任何 UI `evoke` 调用，store 为空，`fetchRoleList` 拿不到 appKey，绑角失败。**必须先有 UI evoke。**
````

- [ ] **Step 2：验证文件内容**

读取 `references/act-role.md`，确认：
- 包含 A.1 容器注入（`#ds-role-root`）
- 包含 A.2 `Role.evoke()` 调用代码
- 包含 A.3 `evokeRoleSelection()` 高级用法，且明确标注"必须先有 UI evoke"依赖陷阱
- 无 IIFE、无手动登录检测

- [ ] **Step 3：Commit**

```bash
git add references/act-role.md
git commit -m "feat(ds-act-sdk): 新增角色绑定子模块 act-role.md"
```

---

## Task 4：重写任务弹窗子模块 act-task.md

**Files:**
- Modify: `references/act-task.md`（全文重写）

**Interfaces:**
- Consumes: 编排器步骤6.2 加载本文件；依赖 `configure()` 已执行
- Produces: `TaskModule.evoke()` 调用代码 + `#ds-task-root` 容器 + `taskListPopupState` 显隐控制

- [ ] **Step 1：重写任务弹窗子模块全文**

写入以下内容到 `references/act-task.md`：

````markdown
# 子模块 B：任务弹窗

> 本文件由 `ds-act-sdk.md` 步骤 6 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> API 详情见 `{skill_dir}/references/ds-act-sdk-api.md` 第 4.3 节。

---

## B.1 询问面板触发方式

```
任务弹窗通过什么方式触发？

  [A] 自动生成入口按钮（页面右下角悬浮，推荐）
  [B] 页面上已有一个按钮/图标，点它打开面板

输入 A 或 B：
```

选 B 时，额外询问：

```
请描述一下那个按钮/图标长什么样，或者叫什么名字？
（例如："右下角的任务图标"、"顶部导航栏里写着'每日任务'的按钮"）
```

根据用户描述，在页面代码中定位对应元素，提取 CSS 选择器后继续。

```
是否在任务弹窗内展示角色绑定入口？（用户可在弹窗内查看/切换游戏角色）

  [Y] 是（showRole: true）
  [N] 否（默认，不展示）

输入 Y 或 N：
```

---

## B.2 注入 HTML 容器

遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入容器（A 模式还需插入按钮）：

```html
<!-- DS Act SDK 任务弹窗容器 -->
<div id="ds-task-root"></div>
<!-- 仅 A 模式需要，初始隐藏，登录后由 JS 显示 -->
<button id="ds-task-entry-btn" title="任务" style="display:none">任务</button>
```

A 模式还需在 `src/style.css`（不存在则内联到 `<style>`）追加按钮样式：

```css
#ds-task-entry-btn {
  position: fixed; right: 16px; bottom: 80px; z-index: 9999;
  width: 52px; height: 52px; border-radius: 50%; border: none;
  background: #ff6b35; color: #fff; font-size: 12px; font-weight: bold;
  cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,.25);
  display: flex; align-items: center; justify-content: center;
}
#ds-task-entry-btn:hover { background: #e55a26; }
```

> **B 模式操作：** 不插入按钮 HTML 和样式，仅保留 `#ds-task-root` 容器。

---

## B.3 生成任务弹窗代码

**`TaskModule.evoke()` 参数说明：**

| 参数 | 是否必填 | 说明 |
|------|---------|------|
| `container` | ✅ 必填 | 面板挂载容器选择器，如 `'#ds-task-root'` |
| `title` | 可选 | 弹窗标题文字，默认 "获取次数" |
| `showRole` | 可选 | 是否在弹窗顶部展示角色选择组件，默认 `false` |
| `showClose` | 可选 | 是否显示关闭按钮，默认 `true` |

> **关键区分：** `evoke()` 是**挂载**，只调用一次；后续**显示面板**通过 `dsActStore.set(taskListPopupState, true)` 控制，两者职责分离。

在 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间追加以下代码：

```javascript
// —— 任务弹窗（evoke 自带 DsActProvider，自动处理登录态 + actInfo）——
window.DsActSdk.TaskModule.evoke({
  container: '#ds-task-root',
  // title: '任务',      // 可选：弹窗标题，默认 "获取次数"
  showRole: __SHOW_ROLE__,
});

// —— A 模式 BEGIN ——
var entryBtn = document.getElementById('ds-task-entry-btn');
if (entryBtn) {
  entryBtn.style.display = 'flex';
  entryBtn.addEventListener('click', function () {
    window.DsActSdk.dsActStore.set(window.DsActSdk.taskListPopupState, true);
  });
}
// —— A 模式 END ——

// —— B 模式 BEGIN（替换 A 模式代码块）——
// var triggerEl = document.querySelector('__TRIGGER_SELECTOR__');
// if (triggerEl) {
//   triggerEl.addEventListener('click', function () {
//     window.DsActSdk.dsActStore.set(window.DsActSdk.taskListPopupState, true);
//   });
// }
// —— B 模式 END ——
```

> **B 模式操作：** 删除 A 模式代码块，取消 B 模式代码块注释，填入选择器。

---

## B.4 填充占位符

| 占位符 | 替换为 |
|--------|--------|
| `__SHOW_ROLE__` | `true`（选 Y）或直接删除该行（选 N） |
| `__TRIGGER_SELECTOR__` | CSS 选择器字符串（仅 B 模式） |
````

- [ ] **Step 2：验证文件内容**

读取 `references/act-task.md`，确认：
- 无 IIFE、无 `initActTask` 封装、无 `_setupActSdk`、无 `if (isLoggedIn)` 调度
- `TaskModule.evoke()` 直接调用，使用 `window.DsActSdk.TaskModule.evoke`
- 显隐控制用 `window.DsActSdk.dsActStore.set(window.DsActSdk.taskListPopupState, true)`
- B.1 保留触发方式询问和 showRole 询问
- B.4 占位符表完整

- [ ] **Step 3：Commit**

```bash
git add references/act-task.md
git commit -m "feat(ds-act-sdk): 重写任务弹窗子模块，删除 IIFE 骨架改为直接 evoke"
```

---

## Task 5：重写回流任务子模块 act-task-checker.md

**Files:**
- Modify: `references/act-task-checker.md`（全文重写）

**Interfaces:**
- Consumes: 编排器步骤6.2 加载本文件；依赖 `configure()` 已执行
- Produces: `new TaskChecker()` 最小调用骨架

- [ ] **Step 1：重写回流任务子模块全文**

写入以下内容到 `references/act-task-checker.md`：

````markdown
# 子模块 C：回流任务检测

> 本文件由 `ds-act-sdk.md` 步骤 6 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> API 详情见 `{skill_dir}/references/ds-act-sdk-api.md` 第 5.1 节。

---

## C.1 TaskChecker API 说明

`TaskChecker` 是纯逻辑类，与 jotai store **完全隔离**，自己维护 actInfo 私有缓存，可脱离 DsActProvider 独立使用。

**构造：**

```typescript
new TaskChecker(actId: string, asId: string)
```

**方法：**

| 方法 | 类型 | 说明 |
|------|------|------|
| `isMatched()` | async → `boolean` | 是否命中回流任务（moduleList 中 asType===4 且 asId 匹配） |
| `query()` | async → `TaskItemInfoType[]` | 拉取任务详情，更新内部状态 |
| `isCompleted()` | sync → `boolean` | 任务是否已完成（依赖 query 后的数据） |
| `isClaimable()` | sync → `boolean` | 已完成且未领奖 |
| `getStatus()` | sync → `TaskStatus` | 语义化状态：`'incomplete' \| 'claimable' \| 'claimed'` |
| `getTask()` | sync → `TaskItemInfoType \| undefined` | 获取任务详情 |
| `claim()` | async → `ClaimResult` | 领奖，内部调 `actPreCheck` 预检 |

**`claim()` 返回值：**

```typescript
interface ClaimResult {
  code: number;              // 200 成功 / -1 未完成 / -2 已领取 / -999 异常
  result?: TaskPrizeResult;  // 奖品数据
  errmsg?: string;
}
```

**错误码：**

> `claim()` 内部先调 `actPreCheck()` 预检，预检失败时返回预检错误码；预检通过后另有领奖错误码。

| code | 来源 | 含义 |
|------|------|------|
| 200 | 领奖 | 领奖成功 |
| -1 | 领奖 | 任务未完成 / 任务不存在（taskList 为空） |
| -2 | 领奖 | 奖励已领取 |
| -999 | 领奖 | 网络或接口异常 |
| 801 | 预检 | 非大神端（需在大神 APP 内） |
| 802 | 预检 | 未登录 |
| 803 | 预检 | 活动未开始 / 已结束 |
| 805 | 预检 | 未绑角色 |

---

## C.2 询问配置

```
回流任务配置：

  asId（任务ID，必填）：_______________
  例如：6a0455ecf20d41361aa734f3

  ⚠️ 注意：回流任务与「用户」维度绑定，不支持与游戏角色维度绑定。
     若活动需要按角色区分任务进度，请勿使用回流任务能力。
```

---

## C.3 生成最小调用骨架

在 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间追加以下代码：

```javascript
// —— 回流任务检测（纯逻辑类，与 store 隔离，自带 actInfo 拉取）——
// 调用时机由业务方自行决定（玩家死亡/登录后/点击按钮等）
var __TC_ACT_ID__ = '__ACT_ID__';
var __TC_AS_ID__ = '__AS_ID__';

var tc = new window.DsActSdk.TaskChecker(__TC_ACT_ID__, __TC_AS_ID__);

// 示例调用流程：
// var matched = await tc.isMatched();        // → boolean：是否命中回流任务
// if (!matched) return;
// await tc.query();                           // → TaskItemInfoType[]：拉取任务详情
// if (!tc.isCompleted()) {                    // → boolean（sync）：未完成，引导用户
// } else if (tc.isClaimable()) {              // → boolean（sync）：可领奖
//   var result = await tc.claim();            // → ClaimResult：领奖
//   if (result.code === 200) {
//     // 领奖成功，处理奖品
//   }
// }
```

> **设计说明：**
> - 只生成 `new TaskChecker` + 调用链骨架（注释形式），**不封装成函数、不做触发模式询问**
> - 调用时机完全由业务方决定：玩家死亡时、登录后、点击按钮等
> - `isMatched()` / `query()` / `claim()` 是 async，`isCompleted()` / `isClaimable()` / `getStatus()` / `getTask()` 是 sync
> - `claim()` 内部会调 `actPreCheck()` 预检（环境/登录/活动起止/角色绑定），预检失败直接返回错误码不领奖

---

## C.4 填充占位符

| 占位符 | 替换为 |
|--------|--------|
| `__ACT_ID__` | 骨架代码中已填充的 actId（直接复用同一值） |
| `__AS_ID__` | 实际任务 ID 字符串，如 `'6a0455ecf20d41361aa734f3'` |
````

- [ ] **Step 2：验证文件内容**

读取 `references/act-task-checker.md`，确认：
- 无 `checkReturnTask` 封装函数、无三种触发模式（自动/点击/手动）
- 只有 `new TaskChecker` + 调用链骨架（注释形式）
- API 表格 7 个方法完整，标注 sync/async
- 错误码表包含预检错误码（801/802/803/805）和领奖错误码（-1/-2/-999）
- 明确"不封装成函数、不做触发模式询问"

- [ ] **Step 3：Commit**

```bash
git add references/act-task-checker.md
git commit -m "feat(ds-act-sdk): 重写回流任务子模块，改为最小调用骨架"
```

---

## Task 6：重写 CPS 底部栏子模块 act-cps-bar.md

**Files:**
- Modify: `references/act-cps-bar.md`（全文重写）

**Interfaces:**
- Consumes: 编排器步骤6.2 加载本文件；依赖 `configure()` 已执行，frontId 已配置
- Produces: `CpsUniversalBar.evoke()` 调用代码 + `#ds-cps-bar-root` 容器

- [ ] **Step 1：重写 CPS 底部栏子模块全文**

写入以下内容到 `references/act-cps-bar.md`：

````markdown
# 子模块 D：CPS 底部栏

> 本文件由 `ds-act-sdk.md` 步骤 6 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> `frontId` 已在编排器步骤 5 按需收集并写入 `sdk.configure()`，本模块无需重复询问。
>
> API 详情见 `{skill_dir}/references/ds-act-sdk-api.md` 第 4.4 节。
>
> 💡 完整配置项含义可查阅组件文档：https://fe.docs-opd.nie.netease.com/page/ds-act-business-components/cps-universal-bar
> 注意：文档中的 `loginedUser`、`onLogin` 等参数**无需传入**，SDK 已自动处理登录态注入和登录回调，业务侧不需要关心。

---

## D.1 注入 HTML 容器

遍历 `ACT_SDK_HTML_FILES`，在每个文件的 `</body>` 前插入挂载容器：

```html
<!-- DS Act SDK CPS 底部栏容器 -->
<div id="ds-cps-bar-root"></div>
```

页面根节点需添加底部预留高度（若已有则跳过）：

```css
body { padding-bottom: var(--cps-bar-bottom, 0px); }
```

---

## D.2 生成初始化代码

在 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间追加以下代码：

```javascript
// —— CPS 底部栏（evoke 自带 DsActProvider，自动处理登录态 + frontConfig 拉取）——
window.DsActSdk.CpsUniversalBar.evoke({
  container: '#ds-cps-bar-root',
});
```

> **行为说明：**
> - 所有展示配置（下载链接、按钮模式、菜单等）均由 `frontId` 对应的后台 `frontConfig.cpsUniversalBarConfig.ext` 自动拉取，无需在代码中硬编码
> - SDK 自动注入 `loginedUser.uid`（从 `myGodlikeInfoState`）和 `onLogin`（站内 `ds.openLoginPage`，站外 `universal-login`）
> - 自动注入 CSS 变量 `--cps-bar-bottom`，卸载时清除
> - `appKey` 为空时（frontConfig 未加载或未配置）`return null` 不渲染
> - 内置关闭按钮，点击后隐藏并清除 CSS 变量
````

- [ ] **Step 2：验证文件内容**

读取 `references/act-cps-bar.md`，确认：
- 无"不依赖登录态"的错误注释（旧版有，新版改为"evoke 自带 DsActProvider 自动处理"）
- 无 `if (isLoggedIn)` 判断
- `CpsUniversalBar.evoke()` 直接调用，只传 `container`
- 包含 `body { padding-bottom: var(--cps-bar-bottom, 0px); }` 样式说明
- 引用了 API 文档第 4.4 节

- [ ] **Step 3：Commit**

```bash
git add references/act-cps-bar.md
git commit -m "feat(ds-act-sdk): 重写 CPS 底部栏子模块，删除登录态判断改为直接 evoke"
```

---

## Task 7：从新实现审查规则 act-sdk.md

**Files:**
- Modify: `references/audits/act-sdk.md`（全文重写）

**Interfaces:**
- Consumes: 新接入方式（configure + evoke，无 IIFE 骨架）
- Produces: 审查规则，供 `references/audits/index.md` 步骤2加载

- [ ] **Step 1：重写审查规则全文**

写入以下内容到 `references/audits/act-sdk.md`：

````markdown
# DS:ACT-SDK 块审查（条件触发）

> 仅当文件中存在 `/* ========== DS:ACT-SDK BEGIN ==========` 标记时执行本章节，否则跳过。
>
> 审查依据：`{skill_dir}/references/ds-act-sdk-api.md`（以 SDK 源码为准）

### SDK API 合法性校验（防止 AI 凭空捏造）

扫描 `DS:ACT-SDK BEGIN` 与 `DS:ACT-SDK END` 之间的全部 `DsActSdk.<name>` 调用，对照以下白名单校验：

**合法的 `DsActSdk.*` 调用：**

| 调用 | 用途 |
|------|------|
| `DsActSdk.configure(...)` | 初始化配置 |
| `DsActSdk.dsActStore` | 状态存储对象（属性访问，非函数调用） |
| `DsActSdk.taskListPopupState` | 任务弹窗状态（属性访问，非函数调用） |
| `DsActSdk.Role.evoke(...)` | 挂载角色选择组件 |
| `DsActSdk.TaskModule.evoke(...)` | 挂载任务弹窗 |
| `DsActSdk.CpsUniversalBar.evoke(...)` | 挂载 CPS 底部栏 |
| `DsActSdk.TaskChecker` | 回流任务检测类（`new DsActSdk.TaskChecker(...)`） |
| `DsActSdk.evokeRoleSelection(...)` | 唤起选角流程（纯逻辑，高级用法） |
| `DsActSdk.actPreCheck(...)` | 活动预检 |
| `DsActSdk.preBindRoleCheck(...)` | 角色绑定预检 |
| `DsActSdk.preCheck(...)` | 环境登录预检 |

**校验规则：** 扫描正则 `DsActSdk\.([a-zA-Z_][a-zA-Z0-9_]*)[\.(]`，提取所有 `<name>`，若不在上表中 → 标记为 **❌ 阻断项**：

```
❌ [DS:ACT-SDK] DsActSdk.<name> 不是 ds-act-sdk 的合法 API
    文件：src/ds.js
    问题：DsActSdk.<name>(...) 在 ds-act-sdk API 文档中不存在，疑似 AI 生成错误
    你需要：对照 references/ds-act-sdk-api.md 修正为正确的 API 调用
```

### 结构完整性校验

- [ ] `DS:ACT-SDK BEGIN` / `DS:ACT-SDK END` 注释标记成对存在
- [ ] `DsActSdk.configure()` 仅配置 `production` 字段，**不含** `staging` 字段
- [ ] `production.actId` 非占位符 `__ACT_ID__`（若角色绑定/任务弹窗/回流任务已选中）
- [ ] `production.appKey` 非占位符 `__APP_KEY__` 且非空
- [ ] `production.frontId` 若存在，非占位符 `__FRONT_ID__`

### 容器元素校验

- [ ] 若某页面引用的 JS 中含 `DsActSdk.Role.evoke(`，该页面 HTML 中存在 `id="ds-role-root"` 容器 → 缺失即**阻断**（按页面粒度检查，非每个页面都需要）
- [ ] 若某页面引用的 JS 中含 `DsActSdk.TaskModule.evoke(`，该页面 HTML 中存在 `id="ds-task-root"` 容器 → 缺失即**阻断**（按页面粒度检查，非每个页面都需要）
- [ ] 若某页面引用的 JS 中含 `DsActSdk.CpsUniversalBar.evoke(`，该页面 HTML 中存在 `id="ds-cps-bar-root"` 容器 → 缺失即**阻断**（按页面粒度检查，非每个页面都需要）

### frontId 配置校验

- [ ] 若代码中含 `DsActSdk.CpsUniversalBar.evoke(`，`DsActSdk.configure()` 中 `frontId` 已配置且非占位符 → 缺失即**阻断**（CPS 底部栏依赖 frontConfig 拉取后台配置）

### HTML 加载顺序校验

- [ ] 遍历所有含 DS Marker 的 HTML 文件，`ds-act-sdk.min.css` 和 `ds-act-sdk.min.js` 的 `<link>` / `<script>` 标签存在于需要 ds-act-sdk 的页面中 → 缺失即**阻断**
- [ ] `ds-act-sdk.min.js` 的加载顺序在 `src/ds.js` 之前（SDK 必须先于调用方就位）→ 顺序错误即**阻断**
- [ ] SDK 的 `<script src>` 指向 `ds.res.netease.com/online/pkg/ds-act-sdk/` 域名（需与 `ds-act-sdk.md` 步骤 2 保持一致，禁止自行修改 CDN 地址）
- [ ] **`ds-act-sdk` 版本检查**：当前最新版本为 `0.1.2`。遍历所有含 DS Marker 的 HTML 文件中的 CDN 地址，任一文件版本低于 `0.1.2`，输出提示引导升级：`⚠️ ds-act-sdk 当前版本为 x.x.x，最新版本为 0.1.2，建议升级：将 CDN 地址中的版本号替换为 0.1.2`

### 旧版骨架代码残留检测

- [ ] 代码中**不含** IIFE 包裹的 `_setupActSdk` 函数定义（旧版骨架，已废弃）→ 发现即**警告**：`⚠️ 检测到旧版 IIFE 骨架代码 _setupActSdk，已废弃。evoke 自带 DsActProvider 自动处理登录态，请删除手动登录检测代码，改为直接 evoke`
- [ ] 代码中**不含** `initActTask` 函数定义（旧版封装，已废弃）→ 发现即**警告**：`⚠️ 检测到旧版 initActTask 封装，已废弃。TaskModule.evoke 自带 Provider，请直接调用 evoke，无需封装`
- [ ] 代码中**不含** `checkReturnTask` 函数定义（旧版封装，已废弃）→ 发现即**警告**：`⚠️ 检测到旧版 checkReturnTask 封装，已废弃。请使用 new TaskChecker() 最小调用骨架`
- [ ] 代码中**不含** `if (isLoggedIn)` 包裹 `evoke` 调用的写法（evoke 自带 Provider，无需手动判断登录态）→ 发现即**警告**

### 常见写法错误检测

| 错误写法 | 状态 |
|----------|------|
| `sdk.useCpsUniversalBar(...)` | [✅ 未发现 / ❌ 发现，应改为 `DsActSdk.CpsUniversalBar.evoke({container: '#ds-cps-bar-root'})`] |
| `sdk.showTaskPanel(...)` 或 `sdk.openTask(...)` | [✅ 未发现 / ❌ 发现，应改为 `DsActSdk.TaskModule.evoke({...})`] |
| `new DsActSdk(...)` 实例化（TaskChecker 除外） | [✅ 未发现 / ❌ 发现，`DsActSdk` 通过 `window.DsActSdk` 全局访问，TaskChecker 是唯一需要 new 的] |
| `DsActSdk.configure({ staging: {...} })` 含 staging 配置 | [✅ 未发现 / ❌ 发现，线上只配置 production，删除 staging 字段] |
| `evokeRoleSelection()` 调用前无任何 UI `evoke` | [✅ 未发现 / ⚠️ 发现，evokeRoleSelection 依赖 store 已有 actInfo，必须先有 UI evoke 挂载 Provider] |
| `CpsUniversalBar.evoke` 放在 `if (isLoggedIn)` 内 | [✅ 未发现 / ❌ 发现，evoke 自带 Provider 自动处理登录态，无需手动判断] |
````

- [ ] **Step 2：验证文件内容**

读取 `references/audits/act-sdk.md`，确认：
- API 白名单包含 11 个合法调用（configure/dsActStore/taskListPopupState/Role.evoke/TaskModule.evoke/CpsUniversalBar.evoke/TaskChecker/evokeRoleSelection/actPreCheck/preBindRoleCheck/preCheck）
- 扫描正则改为 `DsActSdk\.` 前缀（旧版是 `sdk\.`）
- 容器校验新增 `#ds-role-root`
- 新增 frontId 配置校验
- 新增旧版骨架代码残留检测（_setupActSdk/initActTask/checkReturnTask/if(isLoggedIn)）
- 版本号 0.1.2
- 常见写法错误表更新

- [ ] **Step 3：Commit**

```bash
git add references/audits/act-sdk.md
git commit -m "feat(ds-act-sdk): 从新实现审查规则，适配 evoke 接入方式"
```

---

## Task 8：更新 SKILL.md 模式6描述和常见问题

**Files:**
- Modify: `SKILL.md`

**Interfaces:**
- Consumes: 新的模式6能力清单（A角色绑定/B任务弹窗/C回流任务/D CPS底栏）
- Produces: SKILL.md 模式6描述更新、常见问题表更新

- [ ] **Step 1：更新模式6描述**

在 `SKILL.md` 中找到模式6的描述行：

```
  [6] 🎯 大神活动接入（ds-act-sdk）
      接入 ds-act-sdk，注入 SDK 依赖，配置 actId/appKey，按需接入任务面板/回流任务/CPS 通用悬浮栏
```

替换为：

```
  [6] 🎯 大神活动接入（ds-act-sdk）
      接入 ds-act-sdk，注入 SDK 依赖，配置 actId/appKey，按需接入角色绑定/任务弹窗/回流任务检测/CPS 底部栏
```

- [ ] **Step 2：更新常见问题表**

在 `SKILL.md` 的常见问题表中，找到以下旧条目并替换：

**替换 1** — 找到：
```
| ❌ 任务面板容器 `#ds-task-root` 未添加到 HTML          | ✅ 在 `</body>` 前添加 `<div id="ds-task-root"></div>`                                    | evoke 需要有容器元素，找不到容器就无法渲染                                            |
```
替换为：
```
| ❌ 任务弹窗容器 `#ds-task-root` 未添加到 HTML          | ✅ 在 `</body>` 前添加 `<div id="ds-task-root"></div>`                                    | evoke 需要有容器元素，找不到容器就无法渲染                                            |
```

**替换 2** — 找到：
```
| ❌ 不检查登录态就直接显示任务面板入口                  | ✅ 先用 `await window.dsLogin.hasLoggedIn()` 确认登录，再调用 `initActTask()`             | 未登录用户看到任务入口但点开是空的，体验很差                                          |
```
替换为：
```
| ❌ 手动检测登录态后再调用 `evoke`                      | ✅ 直接调用 `evoke({ container })`，evoke 自带 DsActProvider 自动处理登录态 + actInfo 拉取 | 手动检测是旧版 IIFE 骨架的做法，evoke 内部自动挂载 Provider，手动检测冗余且可能绕过 Provider 状态同步 |
```

**替换 3** — 找到：
```
| ❌ 在按钮点击时才调用 `sdk.configure()`                | ✅ `configure` 在登录确认后立即调用，按钮只负责触发 `evoke`                               | configure 是配置初始化，每次点击都调用会造成重复配置                                  |
```
替换为：
```
| ❌ 在按钮点击时才调用 `DsActSdk.configure()`           | ✅ `configure` 在页面加载时立即调用，按钮只负责 `dsActStore.set(taskListPopupState, true)` | configure 是配置初始化，每次点击都调用会造成重复配置                                  |
```

**替换 4** — 找到：
```
| ❌ `gameInfo.icon` 用相对路径                          | ✅ 必须用 `https://` 开头的完整 URL                                                       | 任务面板内展示的图片是独立加载的，相对路径找不到                                      |
```
替换为：
```
| ❌ `gameInfo.icon` 用相对路径                          | ✅ 必须用 `https://` 开头的完整 URL                                                       | 任务弹窗内展示的图片是独立加载的，相对路径找不到                                      |
```

**替换 5** — 找到 CPS 相关条目：
```
| ❌ 把 `CpsUniversalBar.evoke()` 放在 `if (isLoggedIn)` 内 | ✅ 放在子模块插入区域（IIFE 顶层，`_setupActSdk` 定义之前）                           | CPS 通用悬浮栏不依赖登录态，SDK 内部自动处理；放进登录判断会导致未登录用户看不到底栏   |
```
替换为：
```
| ❌ 把 `CpsUniversalBar.evoke()` 放在 `if (isLoggedIn)` 内 | ✅ 直接调用 `evoke({ container })`，evoke 自带 DsActProvider 自动处理登录态             | evoke 内部自动挂载 Provider 处理登录态，手动判断登录态是旧版 IIFE 骨架做法，已废弃   |
```

**替换 6** — 找到：
```
| ❌ 以为 CPS 栏的下载链接/按钮文案需要在代码里配置       | ✅ 只传 `container` 选择器，所有展示内容通过 `frontId` 关联的后台配置自动拉取             | CPS 栏的内容由运营在大神CMS后台配置，代码侧无需也不应硬编码                            |
```
替换为：
```
| ❌ 以为 CPS 底部栏的下载链接/按钮文案需要在代码里配置   | ✅ 只传 `container` 选择器，所有展示内容通过 `frontId` 关联的后台配置自动拉取             | CPS 底部栏的内容由运营在大神CMS后台配置，代码侧无需也不应硬编码                        |
```

**新增条目** — 在常见问题表末尾追加：

```
| ❌ `evokeRoleSelection()` 调用前没有任何 UI `evoke`     | ✅ 必须先有一次 UI 组件 `evoke`（Role/TaskModule/CpsUniversalBar 任一）挂载 Provider      | evokeRoleSelection 直接读写 dsActStore，依赖 actInfo 已就位；无 UI evoke 则 store 为空，绑角失败 |
| ❌ 用 IIFE 手动检测登录态 + `initActTask` 封装          | ✅ 直接 `TaskModule.evoke({ container })`，evoke 自带 Provider 自动处理                   | 旧版 IIFE 骨架已废弃；evoke 内部走 mountComponent 自动挂载 DsActProvider + LoginBoot  |
| ❌ `new TaskChecker()` 后不调 `isMatched()` 就直接 `query()` | ✅ 先 `await tc.isMatched()` 判断命中，再 `await tc.query()` 拉取详情                 | query 内部会自动调 isMatched，但显式调用更清晰；isMatched 返回 false 时 query 返回空数组 |
```

- [ ] **Step 3：验证 SKILL.md 修改**

读取 `SKILL.md`，确认：
- 模式6描述包含"角色绑定/任务弹窗/回流任务检测/CPS 底部栏"
- 常见问题表无"任务面板"旧称（改为"任务弹窗"）
- 常见问题表无"initActTask"旧条目
- 常见问题表新增 3 条（evokeRoleSelection 依赖、IIFE 废弃、TaskChecker 调用顺序）
- description 字段（第3行）若含"任务面板"也改为"任务弹窗"，若含"CPS 通用悬浮栏"改为"CPS 底部栏"

- [ ] **Step 4：Commit**

```bash
git add SKILL.md
git commit -m "feat(ds-act-sdk): 更新 SKILL.md 模式6描述和常见问题"
```

---

## Task 9：最终验证

**Files:**
- 无文件修改，仅验证

- [ ] **Step 1：验证所有文件版本号一致**

在所有修改/新增的文件中搜索 `0.1.1`，确认无残留旧版本号（应为 `0.1.2`）：
- `references/ds-act-sdk.md`
- `references/ds-act-sdk-api.md`
- `references/audits/act-sdk.md`

- [ ] **Step 2：验证子模块加载表一致**

读取 `references/ds-act-sdk.md` 步骤6.2 的子模块加载表，确认 4 个文件名与实际文件一致：
- `act-role.md`
- `act-task.md`
- `act-task-checker.md`
- `act-cps-bar.md`

- [ ] **Step 3：验证无旧版骨架残留**

在所有 `references/act-*.md` 文件中搜索以下旧版关键词，确认无残留：
- `_setupActSdk`
- `initActTask`
- `checkReturnTask`
- `if (isLoggedIn)`
- `if (typeof initActTask`

- [ ] **Step 4：验证审查规则引用一致**

读取 `references/audits/index.md` 第 15 行，确认 DS:ACT-SDK 审查规则触发条件仍为 `/* ========== DS:ACT-SDK BEGIN ==========` 标记（未改变）。

- [ ] **Step 5：验证 SKILL.md 模式6引用文件表**

读取 `SKILL.md` 中模式选择后的"读取文件"表，确认模式6仍指向 `references/ds-act-sdk.md`。

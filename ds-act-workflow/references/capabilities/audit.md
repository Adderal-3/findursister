# 能力：审查 DS 产物合规性（模式 2 / AUDIT）

> 校验 inject 产物（ds.js + SDK-LOADER + 第三方依赖 + 点击事件修复）是否符合契约，输出阻断项 / 警告项 / 通过项分级报告，确保不带病上线。
>
> 审查规则本身（19 个 checklist 模块）保留在 `audits/index.md` 的加载清单与同目录子文档中——本能力声明"审什么、怎么判定、怎么聚合"。

## 依赖

- **前置能力**：`capabilities/inject.md`（必须）——本能力的审查对象是 inject 的全部出参（ds.js、SDK-LOADER、第三方依赖、点击事件修复）。无 inject 产物则审查范围为空。
- **公共原语**：
  - `primitives/scan-html.md`——返回 HTML 注释清单、script 标签清单、head/body 区间，供定位审查目标文件与匹配 Marker / SDK-LOADER 边界。
  - `primitives/detect-framework.md`——输出 `framework`（HTML/React/Vue）+ `IS_COCOS` 标志，决定审查哪些文件、Cocos 项目豁免哪些检查项。
- **产物契约**（校验基准）：
  - `contracts/ds-js-markers.md`——ds.js 的 10 个 Marker 块定义、占位符、不变量。本能力是消费者，按此校验 Marker 齐全、占位符无残留、不变量成立。
  - `contracts/sdk-loader.md`——SDK-LOADER 模板结构、SEO 标签去重规则、`{IS_COCOS}` 占位符语义。本能力按此校验 SDK-LOADER 块存在、占位符已替换、SEO 标签齐全。
  - `contracts/framework-diffs.md`——三框架差异总表（审查文件路径、点击事件检测模式、`ds.d.ts` 存在性、NAV-BAR 有无），据 `framework` 取对应列。
  - `contracts/miniapp.md`——小程序接入原理，声明式知识参考，供条件触发判定与"已知错误检测"段引用。
  - `contracts/ds-act-sdk-api.md`——DS-ACT-SDK API 契约，条件触发审查 `DS:ACT-SDK` 块时作为校验基准。
- **审查规则清单**：`audits/index.md`——19 个 checklist 模块的加载索引与条件触发判定语义。本能力执行 Marker 结构校验时按此清单顺序加载同目录子文档。
- **外部技能**：
  - `/dsjssdk`——JSSDK 深度校验（审查目标含 `DS:JSSDK` 块或任意 `window.ds.*` 调用时必须调用）。
  - `/html-security-scan`——HTML 安全审查（对所有含 DS Marker 的 HTML 文件调用）。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| `framework` | detect-framework 原语 | 是 | — | 前置传递（HTML/React/Vue，决定审查文件范围与点击事件检测模式） |
| `IS_COCOS` | detect-framework 原语 | 是 | — | 前置传递（布尔，决定 MobileShare / 微信 JSSDK 检查项豁免） |
| `SELECTED_HTML_FILES` | scan-html 原语 | 是 | — | 前置传递（inject 阶段确认的 HTML 文件集合；审查范围以"含 DS Marker"自动收敛，见判断规则段 1） |
| inject 产物 | inject 能力 | 是 | — | 前置传递（ds.js / SDK-LOADER / 第三方依赖 / 点击事件修复，即审查对象） |
| `game-server-storage.js` 存在性 | 文件系统检测 | 否 | — | 可推断（根目录或 `src/` 下存在该文件则触发服务端存储专项审查） |

> **审查范围自动收敛**：scan-html 返回所有 `.html`（排除 `node_modules`、`dist`），本能力检测是否含 `<!-- [DS:SDK-LOADER:START] -->` marker，含 marker 的文件纳入审查范围。无需用户指定。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| 审查报告 | 标准输出（不落盘） | 阻断项（❌ 必须修复）/ 警告项（⚠️ 建议修复）/ 通过项（✅ 统计）/ 已知错误检测表 / 重复逻辑检测 / 全局扫描结果 / 点击预检检查表 |
| 注入结果摘要 | 审查报告末尾 | 文件变更表 + 配置参数表 + 清理记录（据 inject 产物汇总，非本能力生成） |

> **报告分级语义**：
> - **阻断项（❌）**：违反契约不变量或已知会导致运行时静默失效的错误，必须修复后方可上线。
> - **警告项（⚠️）**：不阻断但建议修复（如点击事件未包裹待用户确认、`wx.*` 调用缺存在性判断）。
> - **通过项（✅）**：契约校验通过，简要统计。

## 能做什么

- **确定审查范围**：scan-html 检测含 DS Marker 的 HTML 文件，据 `framework` 确定审查文件清单（DS 注入文件 + 全局业务代码文件，见判断规则段 2）。
- **Marker 结构校验**：按 `audits/index.md` 加载清单顺序，读取 19 个 checklist 子文档并执行每一条 `- [ ]` 检查项，据 `contracts/ds-js-markers.md` + `contracts/sdk-loader.md` 校验 Marker 块齐全、占位符无残留、不变量成立。
- **条件触发审查**：据代码特征触发小程序 / 导航栏 / DS:ACT-SDK / 服务端存储专项审查（触发条件见判断规则段 3）。
- **JSSDK 深度校验**：审查目标含 `DS:JSSDK` 块或 `window.ds.*` 调用时调用 `/dsjssdk` 技能。
- **HTML 安全审查**：对所有含 DS Marker 的 HTML 文件调用 `/html-security-scan` 技能。
- **全局业务代码扫描**：部署变量禁止定义检测（`window.DA_*`）、重复逻辑检测（`isInDashenApp` / `openInDashen` / 自定义 ulink）、mini-game-data-sdk 注入检测、点击预检检查（未包裹 `withPrecheck` 的点击事件 + 启发式分类）。
- **已知错误检测**：按固定检测表扫描常见错误写法（见判断规则段 4），含 Cocos 项目豁免逻辑。
- **输出分级审查报告**：聚合所有检查结果为阻断项 / 警告项 / 通过项 / 已知错误检测表，附注入结果摘要与修复建议。

## 不能做什么

- **不修复问题**——本能力只校验、只报告。修复动作由用户或重新执行 inject 能力完成（报告中的"你需要"字段给出修复动作指引，但不代为执行）。
- **不修改任何文件**——纯只读校验，不写入、不删除、不重排。
- **不决定后续能力路由**——报告输出后可提示后续选项（重新注入 / 构建打包 / 退出），但不强制执行。
- **不做 Marker 语义识别的扫描**——scan-html 返回原始注释清单，本能力按 `contracts/ds-js-markers.md` 的 Marker 模式自行匹配（与 inject 一致）。
- **不校验 inject 未涉及的产物**——审查范围严格限定为 inject 出参 + 全局业务代码中的 DS 相关模式。业务逻辑正确性不在审查范围。
- **不替代 `/dsjssdk` 与 `/html-security-scan`**——这两个外部技能做深度校验，本能力只负责调用与聚合其结果。

## 判断规则

### 1. 审查范围检测规则

scan-html 返回所有 `.html` 后，本能力检测是否含 `<!-- [DS:SDK-LOADER:START] -->` marker：

| 条件 | 行为 |
|------|------|
| 含 DS Marker 的 HTML 文件 ≥ 1 | 纳入审查范围，输出检测到的页面清单 |
| 无任何含 DS Marker 的 HTML 文件 | 审查范围为空，提示用户先执行 inject |

### 2. 框架分支审查文件清单

据 `framework` 取 `contracts/framework-diffs.md` 对应列，确定两类审查文件：

**A. DS 注入文件**（Marker 结构校验）：

| 框架 | 审查文件 |
|------|---------|
| HTML | 含 DS Marker 的 HTML 文件、`src/ds.js` |
| React | 含 DS Marker 的 HTML 文件（或 `src/Document.tsx`）、`src/ds.d.ts`、`src/hooks/useDs*.ts`（4 个） |
| Vue | 含 DS Marker 的 HTML 文件、`src/ds.d.ts`、`src/composables/useDs*.ts`（4 个） |

**B. 全局业务代码文件**（重复逻辑检测 + 点击预检检查）：

| 框架 | 扫描扩展名 |
|------|-----------|
| HTML | `src/` 下 `.js` |
| React | `src/` 下 `.js` `.ts` `.jsx` `.tsx` |
| Vue | `src/` 下 `.js` `.ts` `.vue` |

### 3. 条件触发判定表

19 个 checklist 模块中，5 个为条件触发，命中才加载执行，未命中整节跳过、不参与判定：

| 模块 | 子文档 | 触发条件 | 未命中行为 |
|------|--------|---------|-----------|
| 小程序支持审查 | `audits/miniapp.md` | 代码中存在 `isWechatMiniProgram` 函数（不限定义位置） | 跳过整节 |
| 导航栏审查 | `audits/nav-bar.md` | 代码中存在 `[DS:NAV-BAR:START]` marker 或 `DsNavigationMiniProgramBar` 字样 | 跳过整节 |
| DS:ACT-SDK 块审查 | `audits/act-sdk.md` | 代码中存在 `/* ========== DS:ACT-SDK BEGIN ==========` 标记 | 跳过整节 |
| 服务端存储专项审查 | `audits/server-storage.md` | 项目存在 `game-server-storage.js`（根目录或 `src/`） | 静默跳过，不输出任何内容 |
| 公共表专项审查 | `audits/common-table.md` | 项目存在 `game-common-table.js`（根目录或 `src/`） | 静默跳过，不输出任何内容 |

> 其余 14 个模块（SDK-LOADER / CONFIG / JSSDK / NS-LOG / SHARE / ULINK / CLICK-PRECHECK / EXPORTS / HTML 加载顺序 / HTML 安全 / wx 调用前置检查 / 互动广告调试遮罩残留 / 安卓微信遮罩 / 动态资源路径拼接）始终加载。

### 4. 已知错误检测表

本能力按以下固定表扫描常见错误写法，每项标注状态（✅ 未发现 / ❌ 阻断 / ⚠️ 警告）。Cocos 项目（`IS_COCOS=true`）的豁免项单独标注：

| 错误写法 | 级别 | Cocos 豁免 |
|---------|------|-----------|
| `window.ds.getDeviceId()` 直接调用（应取 `godlikeInfo['GL-DeviceId']`） | ❌ 阻断 | — |
| 直接 `new DsUlink(...)` 不等 `onDsUlinkReady` 回调 | ❌ 阻断 | — |
| 分享只写 Godlike 分支（缺非 Godlike / 小程序分支） | ❌ 阻断 | `IS_COCOS=true` 时豁免（普通浏览器分支本应 no-op） |
| Cocos 项目 SDK-LOADER 误注入 mobile-share（污染 `window.wx` 致引擎误判微信小游戏） | ❌ 阻断 | 仅 Cocos 项目显示此项 |
| `wx.miniProgram.*` 调用前缺少 `typeof window.wx !== 'undefined'` 存在性判断 | ⚠️ 警告 | — |
| `imgUrl` 使用相对路径（应为 `https://` 开头完整 URL） | ❌ 阻断 | — |
| 需预检的点击未包裹 `withPrecheck` | ⚠️ 警告（需用户确认） | — |
| `withPrecheck` 旧调用模式（`function() { withPrecheck(...) }` 或 `onclick="withPrecheck(...)"`，thunk 静默失效） | ❌ 阻断 | — |
| `withPrecheck` 未透传事件参数（非 thunk 模式，`callback()` 无 `...args`） | ⚠️ 警告 | — |
| 事件委托误判：`document.addEventListener("click", withPrecheck(...))` 被当作未包裹（委托模式下 withPrecheck 在外层，算已包裹） | ⚠️ 警告（审查逻辑自身需修正） | — |
| `ds.callHandler('openLoginPage')` 直接调用（未经 `ds.ready()`） | ❌ 阻断 | — |
| 代码中定义 `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID`（部署平台注入，禁止代码定义） | ❌ 阻断 | — |
| `withPrecheck` 被空函数覆盖（登录态保护失效，须恢复三分支实现） | ❌ 阻断 | — |
| `DsNavigationMiniProgramBar` 在 `ds.ready()` 外调用 `callHandler`（`initNavBar` 未在 `initLogin` 之后执行） | ❌ 阻断 | — |
| 导航栏 JS `<script>` 使用 `type="module"`（UMD 格式，必须 `type="text/javascript"`） | ❌ 阻断 | — |
| `NavigationBarTheme` 使用 `'transparent'` 等非法值（只支持 `'white'` / `'black'`） | ❌ 阻断 | — |
| 缺少 UMD 兼容处理（未检查 `window.DsNavigationMiniProgramBar.default`） | ❌ 阻断 | — |
| 互动广告调试遮罩残留（`[DS:AD-PREVIEW-COVER]` marker 或 `ds-act-ad-preview-cover` class，调试标尺未移除） | ❌ 阻断（须运行模式 8 → [R] 移除遮罩后再部署） | — |

> **服务端存储专项附加检测**（仅 `game-server-storage.js` 存在时显示）：`mini-game-data-sdk` CSS/JS 引入、`setGameId()` 调用、登录态前置检查（`loadFull` 不在 `initApp` 之后 / `initApp` 无 `hasLoggedIn`/`checkLogined`）、点击触发 `saveFull` 未包裹 `withPrecheck`、`game-server-storage.js` 的 `<script>` 缺 `type="module"`（部署平台不重写 CDN，上线后 404）。详见 `audits/server-storage.md`。

### 5. 点击预检启发式分类表

扫描全局业务代码中的点击事件（据 `framework` 取检测模式，见 `framework-diffs.md`），对未用 `withPrecheck` 包裹的点击事件按元素/变量名启发式分类（与 inject 能力共用同一套规则）：

| 信号模式（名称含） | 标注 | 默认建议 |
|---------|------|---------|
| `start` / `play` / `begin` / `draw` / `lottery` / `claim` / `exchange` / `share` / `submit` / `confirm` / `join` / `enter` | 🔴 建议包裹 | 业务关键动作，需登录预检 |
| `close` / `cancel` / `tab` / `toggle` / `rule` / `rules` / `back` / `arrow` / `prev` / `next` / `scroll` / `hide` / `show` | 🟢 可不包裹 | UI 交互，无业务副作用 |
| 无法匹配上述任一模式 | 🟡 需确认 | 请用户据业务判断 |

> **委托模式识别**：`document.addEventListener("click", withPrecheck(function(e) { if (!e.target.closest(sel)) return; ... }))` 中 `withPrecheck` 在 document 级 handler 外层，**算已包裹**，不得误判为未包裹。

## 幂等性

- **纯只读校验**：本能力不修改任何文件，任意次数重入结果一致（前提：审查对象未被外部修改）。
- **重入行为**：每次执行重新扫描审查范围、重新加载 checklist、重新输出报告。无重入检测标志、无跳过逻辑。
- **报告不落盘**：审查报告输出到标准输出，不写文件，无累积副作用。

## 执行步骤

本能力是**串行管线**，每一步的输出是下一步的输入：

```
scan-html（返回 HTML 注释/script/head-body 清单）
  ↓
detect-framework（返回 framework + IS_COCOS）
  ↓
审查范围检测（含 DS:SDK-LOADER:START marker 的 HTML 文件 → 审查目标）
  ↓
Marker 结构校验（按 audits/index.md 加载清单，19 模块顺序执行，条件触发判定）
  ├─ 始终模块：SDK-LOADER / CONFIG / JSSDK / NS-LOG / SHARE / ULINK / CLICK-PRECHECK / EXPORTS / HTML 加载顺序 / HTML 安全 / wx 调用前置 / 遮罩残留 / 安卓微信遮罩 / 动态资源路径拼接
  └─ 条件触发：miniapp（isWechatMiniProgram）/ nav-bar（[DS:NAV-BAR:START] 或 DsNavigationMiniProgramBar）/ act-sdk（DS:ACT-SDK BEGIN）/ server-storage（game-server-storage.js 存在）/ common-table（game-common-table.js 存在）
  ↓
JSSDK 深度校验（含 DS:JSSDK 块或 window.ds.* 调用时调用 /dsjssdk）
  ↓
HTML 安全审查（对所有含 DS Marker 的 HTML 调用 /html-security-scan）
  ↓
全局业务代码扫描
  ├─ 部署变量禁止定义检测（window.DA_*）
  ├─ 重复逻辑检测（isInDashenApp / openInDashen / 自定义 ulink）
  ├─ mini-game-data-sdk 注入检测（仅 game-server-storage.js 存在时）
  └─ 点击预检检查（未包裹 withPrecheck + 启发式分类 🔴/🟢/🟡）
  ↓
已知错误检测表扫描（含 Cocos 豁免判定）
  ↓
审查报告聚合（阻断项 / 警告项 / 通过项 / 已知错误检测表 / 重复逻辑 / 全局扫描 / 点击预检表）
  ↓
注入结果摘要 + 修复建议 + 后续选项提示
```


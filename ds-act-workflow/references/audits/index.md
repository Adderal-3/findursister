# 审查规则加载清单（MODE 2: AUDIT）

> 本文档是 audit 能力（`capabilities/audit.md`）的**审查规则加载索引**——19 个 checklist 模块的加载顺序与条件触发判定语义。
>
> audit 能力按本清单顺序加载同目录子文档并执行其中每一条 `- [ ]` 检查项；校验基准引用 `contracts/` 层契约（`ds-js-markers.md` / `sdk-loader.md` / `framework-diffs.md` / `miniapp.md` / `ds-act-sdk-api.md`），不再内联 Marker 定义。
>
> JSSDK 相关检查项必须额外调用 `/dsjssdk` 技能做深度校验（已在 `./jssdk.md` 顶部标注）。
---

## 加载清单

audit 能力按下表顺序读取本目录下子文档并执行其中每一条 `- [ ]` 检查项。条件触发模块仅在触发命中时加载，子文档不命中则整节跳过、不参与判定。校验基准引用 `contracts/ds-js-markers.md`（Marker 块定义 / 占位符 / 不变量）与 `contracts/sdk-loader.md`（SDK-LOADER 模板 / SEO 标签 / `{IS_COCOS}` 占位符），不再在各子文档内联 Marker 定义。

| # | 模块 | 子文档 | 加载条件 |
|---|------|--------|---------|
| 1 | SDK-LOADER 块 | `./sdk-loader.md` | 始终 |
| 2 | CONFIG 块 | `./config.md` | 始终 |
| 3 | JSSDK 块 | `./jssdk.md` | 始终（同时调用 `/dsjssdk` 深度校验） |reb
| 4 | NS 日志块 | `./ns-log.md` | 始终 |
| 5 | 分享块 | `./share.md` | 始终 |
| 6 | Ulink 块 | `./ulink.md` | 始终 |
| 7 | CLICK-PRECHECK 块 | `./click-precheck.md` | 始终 |
| 8 | EXPORTS 块 | `./exports.md` | 始终 |
| 9 | HTML 加载顺序检查 | `./html-load-order.md` | 始终（含 `<script type>` 审查示例与重复逻辑检测子节） |
| 10 | 服务端存储专项审查 | `./server-storage.md` | 仅在项目存在 `game-server-storage.js`（mode 5-B 已接入）时加载（含：数值任务依赖 ds-act-sdk 检查 A 档、写入成功后同步页面检查 B 档） |
| 11 | HTML 安全审查 | `./html-security.md` | 始终（audit 能力调用 `/html-security-scan`，本子文档作为本地规则参考） |
| 12 | 小程序支持审查 | `./miniapp.md` | 检测到 `isWechatMiniProgram` 函数存在 |
| 13 | wx 调用前置检查 | `./wx-call-guard.md` | 始终（与小程序审查独立，扫描所有业务代码中的 `wx.*` 调用） |
| 14 | 导航栏审查 | `./nav-bar.md` | 检测到 `[DS:NAV-BAR:START]` marker 或 `DsNavigationMiniProgramBar` 字样 |
| 15 | DS:ACT-SDK 块审查 | `./act-sdk.md` | 检测到 `/* ========== DS:ACT-SDK BEGIN ==========` 标记 |
| 16 | 互动广告调试遮罩残留审查 | `./ad-preview-cover.md` | 始终（无条件扫描所有 HTML，残留即阻断） |
| 17 | 公共表专项审查 | `./common-table.md` | 仅在项目存在 `game-common-table.js`（公共表已接入）时加载 |
| 18 | 安卓微信遮罩审查 | `./wx-launch-mask.md` | 始终（自判：仅当已接入大神功能（`src/ds.js` 含 `[DS:CONFIG:START]`）时检查；建议项不阻断） |
| 19 | 动态资源路径拼接审查 | `./asset-paths.md` | 始终（扫描所有业务代码，命中即阻断并自动修复） |

## 条件触发判定语义

- **小程序支持审查（`./miniapp.md`）**：当代码中存在 `isWechatMiniProgram` 函数（不限定义位置）时加载并执行；未命中则跳过整节，不参与判定。
- **导航栏审查（`./nav-bar.md`）**：当代码中存在 `[DS:NAV-BAR:START]` marker 或 `DsNavigationMiniProgramBar` 字样时加载；未命中跳过。
- **DS:ACT-SDK 块审查（`./act-sdk.md`）**：当代码中存在 `/* ========== DS:ACT-SDK BEGIN ==========` 标记时加载；未命中跳过。
- **服务端存储专项审查（`./server-storage.md`）**：当项目存在 `game-server-storage.js`（根目录或 `src/` 下）时加载；不存在则整节跳过。加载后额外执行两条新规则：
  - **数值任务依赖 ds-act-sdk（A 档阻断）**：若 `game-server-storage.js` 顶部注释含 `__MISSION_KEYS__: [...]`，则被审查 HTML 必须已引入 `ds-act-sdk.min.js`；缺失则阻断，引导先走 mode6 再完成 CMS 任务模块配置。
  - **写入成功后同步页面（B 档警告，规则 #15）**：扫描 `saveFull` / `obfuscatedWriteData` / `obfuscatedBatchWriteData` 的成功分支，若无 UI 刷新或本地状态回写则警告。
- **公共表专项审查（`./common-table.md`）**：当项目存在 `game-common-table.js`（根目录或 `src/` 下）时加载并执行；不存在则整节跳过。与 `server-storage.md` 独立，可同时加载。
- **安卓微信遮罩审查（`./wx-launch-mask.md`）**：始终加载，但先自判是否已接入大神功能（存在 `src/ds.js` 且含 `[DS:CONFIG:START]`）；未接入则整节跳过。已接入时按 `H5_LOGIN_ENABLED` 与是否存在 `[DS:WX-LAUNCH-MASK:START]` marker 决定输出「已接入检查 / 无需接入 / 建议补接引导」。此为建议项，不阻断。
- **动态资源路径拼接审查（`./asset-paths.md`）**：始终加载，扫描所有业务代码文件（`src/` 下 `.js`/`.ts`/`.jsx`/`.tsx`/`.vue`）；命中动态拼接即阻断并自动修复。Cocos 引擎文件（`settings*.js`/`main*.js`/`cocos2d-js*.js`/`physics*.js`、`public/` 下文件、`cc.resources.load`/`cc.assetManager.loadResources`/`loadBundle` 等引擎资源 API）豁免，不纳入检测。

## 服务端存储专项的额外入口

`capabilities/game-storage.md`（合并自原 `references/game-data.md` 与 `references/server-storage/` 子文档，如 `04-cms-register.md`）中"读取审查规则索引（服务端存储专项节）"的引用语义为：通过本索引定位到 `./server-storage.md` 子文档，执行其中 A 档/B 档/C 档分级检查与 `__FIELDS_NOT_REGISTERED__` 提示输出模板。

> 本版新增：`./server-storage.md` A 档含「数值任务依赖 ds-act-sdk」阻断（`game-server-storage.js` 顶部含 `__MISSION_KEYS__` 但页面未引入 `ds-act-sdk.min.js`）、B 档含「写入成功后同步页面」警告（规则 #15，写入成功回调须以回包数值状态刷新 UI）。

## 公共表专项的额外入口

`capabilities/game-storage.md`（mode 5-B triage 后）中"读取审查规则索引（公共表专项节）"的引用语义为：通过本索引定位到 `./common-table.md` 子文档，仅当项目存在 `game-common-table.js` 时加载并执行其中 A 档/B 档检查与 `__TABLE_NOT_REGISTERED__` 提示。该子文档与 `server-storage.md` 独立，可同时加载。

## 校验输出格式（统一约定）

对每个失败项，记录格式：

```
❌ [marker 块名] 出错了
    文件：[文件路径]
    问题：[具体问题描述]
    你需要：[具体的修复动作]
```

对每个通过项（简洁模式）：

```
✅ [marker 块名] 通过
```

具体的报告聚合（阻断项 / 警告项 / 通过项 / 已知错误检测表）由 `capabilities/audit.md` 的出参段统一渲染。

## 1. 基线快照与目录初始化

- [x] 1.1 记录迁移前 `references/audit-rules.md` 的总行数、章节列表（用于完成后比对）
- [x] 1.2 创建 `references/audits/` 目录

## 2. 逐块迁移正文（保持原文）

- [x] 2.1 创建 `references/audits/sdk-loader.md`，将原 `SDK-LOADER 块` 一节原文写入（含标题 `# SDK-LOADER 块`）
- [x] 2.2 创建 `references/audits/config.md`，迁移 `CONFIG 块` 一节
- [x] 2.3 创建 `references/audits/jssdk.md`，迁移 `JSSDK 块` 一节（保留 `> ⚠️ 该块内容必须额外调用 /dsjssdk 技能进行深度校验` 提示语）
- [x] 2.4 创建 `references/audits/ns-log.md`，迁移 `NS 日志块` 一节
- [x] 2.5 创建 `references/audits/share.md`，迁移 `分享块` 一节（含 IS_COCOS 分支逻辑）
- [x] 2.6 创建 `references/audits/ulink.md`，迁移 `Ulink 块` 一节
- [x] 2.7 创建 `references/audits/click-precheck.md`，迁移 `CLICK-PRECHECK 块` 一节（含 thunk 模式、事件委托模式、旧调用模式三组检查项）
- [x] 2.8 创建 `references/audits/exports.md`，迁移 `EXPORTS 块` 一节（含情形 A/B 与 React/Vue 子节）
- [x] 2.9 创建 `references/audits/html-load-order.md`，迁移 `HTML 加载顺序检查` 一节（含 `<script type>` 审查示例正确/错误对照、重复逻辑检测子节）
- [x] 2.10 创建 `references/audits/server-storage.md`，迁移 `服务端存储专项审查（mode 5-B 专用）` 一节（含 A 档/B 档/C 档分级、autofix 表、`__FIELDS_NOT_REGISTERED__` 提示输出模板）
- [x] 2.11 创建 `references/audits/html-security.md`，迁移 `HTML 安全审查（调用 /html-security-scan）` 一节（含域名白名单、HIGH/MEDIUM/LOW 三级、HTML 结构检查）
- [x] 2.12 创建 `references/audits/miniapp.md`，迁移 `小程序支持审查（条件触发）` 一节（含基础改造、URS Cookie 联登、自定义分享三子节）
- [x] 2.13 创建 `references/audits/wx-call-guard.md`，迁移 `wx 调用前置检查` 一节
- [x] 2.14 创建 `references/audits/nav-bar.md`，迁移 `导航栏审查（条件触发）` 一节（含资源加载、初始化结构、回调配置、主题配置、导出五子节）
- [x] 2.15 创建 `references/audits/act-sdk.md`，迁移 `DS:ACT-SDK 块审查（条件触发）` 一节（含 SDK API 合法性校验、结构完整性校验、容器元素校验、HTML 加载顺序校验、常见写法错误检测五子节）

## 3. 改造 audit-rules.md 为索引

- [x] 3.1 清空 `references/audit-rules.md` 原正文，仅保留文件顶部说明
- [x] 3.2 在 `references/audit-rules.md` 中写入加载清单表格，按以下顺序列出 15 个模块的路径与触发条件：sdk-loader/config/jssdk/ns-log/share/ulink/click-precheck/exports/html-load-order/server-storage/html-security/miniapp/wx-call-guard/nav-bar/act-sdk
- [x] 3.3 在索引中标注三个条件触发模块的判定条件（小程序：`isWechatMiniProgram` 函数存在；导航栏：`[DS:NAV-BAR:START]` marker 或 `DsNavigationMiniProgramBar`；DS:ACT-SDK：`/* ========== DS:ACT-SDK BEGIN ==========` 标记）
- [x] 3.4 在索引中加入"服务端存储专项的额外入口"段落，告知 `game-data.md` / `server-storage/04-cms-register.md` 引用时将定位到 `audits/server-storage.md`
- [x] 3.5 索引顶部保留两条原有提示：`> JSSDK 相关内容必须额外调用 /dsjssdk 技能进行深度校验` 与"审查分两阶段顺序执行：1. DS Marker 结构校验 2. HTML 安全审查"

## 4. 同步 CLAUDE.md 维护说明

- [x] 4.1 修改 `CLAUDE.md` 第 37 行：`references/audit-rules.md` 描述改为"审查规则索引（指向 audits/）"
- [x] 4.2 修改 `CLAUDE.md` 第 77 行：维护说明改为"具体规则改 `references/audits/<module>.md`，加载顺序与条件触发改 `references/audit-rules.md`（索引文件）；`audit.md` 通过 `Read` 动态加载索引，索引引导加载各子文档"

## 5. 完整性校验

- [x] 5.1 用 grep 在 `references/audits/*.md` 中累计 `- [ ]` 行数，与迁移前 `audit-rules.md` 中 `- [ ]` 行数对比，确认完全一致
- [x] 5.2 用 grep 在 `references/audits/*.md` 中累计 `❌ /` `⚠️ /` `✅ ` 标识出现总数，与迁移前对比
- [x] 5.3 在 `references/audits/` 目录列举所有 md 文件，确认 15 个子文档全部存在且文件名与设计决策 1 表格一致
- [x] 5.4 全文搜索仓库中残留的"audit-rules.md"引用（`grep -r "audit-rules\.md"`），确认 `references/audit.md`、`references/inject.md`、`references/deploy.md`、`references/game-data.md`、`references/server-storage/04-cms-register.md` 等调用方文档的引用文本未被改动
- [x] 5.5 全文搜索 `references/audits/` 子文档中是否仍出现"读取 audit-rules.md"或"参见上节/下节"等会造成跨文件断链的指代，必要时改写为"参见 audits/<module>.md"

## 6. 端到端审查 dry-run

- [x] 6.1 选取一份历史已审查过的项目目录（或测试 fixture），按 `references/audit.md` 步骤 1–6 完整跑一遍审查模式
- [x] 6.2 对比 dry-run 输出报告与重构前同项目的报告基线：阻断项条目、警告项条目、"已知错误检测"表格行数完全一致
- [x] 6.3 验证条件触发链路：构造含 `isWechatMiniProgram` / `[DS:NAV-BAR:START]` / `DS:ACT-SDK BEGIN` 三类 marker 的测试 fixture，确认审查模式按命中加载对应子文档并执行其规则

## 7. OpenSpec 验证与归档准备

- [x] 7.1 运行 `openspec validate split-audit-rules-by-mode --strict` 确认 change 通过校验
- [x] 7.2 运行 `openspec verify split-audit-rules-by-mode` 抽查每项 ADDED Requirement 的 Scenario 是否可在实际文件中找到对应证据
- [x] 7.3 提交所有变更到 git（一次 commit，message 体现"refactor: split audit-rules.md into audits/ subdir with index"）

# 能力契约式重构设计

> 将 ds-act-workflow skill 从命令式 SOP 重构为能力契约式架构，恢复 agent 推理能力。
>
> **v2** — 根据独立审查修正：primitives/contracts 耦合、DAG 过度建模、经验性知识缺失、框架拆分顺序、NAV-BAR 事实错误等。

## 背景与问题

当前 10 个模式文件（`references/*.md`，对应 SKILL.md 菜单的 0/C/1-8）均为命令式 SOP——"步骤1扫描X，步骤2询问Y，步骤3在 `</head>` 前注入Z"。这导致：

1. **推理被架空**：agent 机械执行步骤，遇到 SOP 未覆盖的边界情况无决策依据。
2. **冗余膨胀**："扫描含 DS Marker 的 HTML 文件"在 7+ 个文件里各写一遍，措辞还略有不同。
3. **组合性差**：模式间衔接靠硬编码"完成后询问：[2]审查 [3]打包"菜单，而非声明"出参X是下个能力的入参"。
4. **Marker 契约隐式**：ds.js 的 Marker 块定义散落在模板、框架文件、审查规则里，inject（生产者）和 audit（消费者）无共享契约。

## 目标

- 从"教 agent 走路"变为"给 agent 地图和交通规则"
- 每个能力声明依赖/入参/出参/边界/交互点/幂等性/组合，agent 自主规划路径
- 共享逻辑（HTML扫描、框架检测、Marker系统）提取为公共原语和显式契约，零重复
- 保留旧编号（0/C/1-8）作为显式指定的快捷方式，同时支持意图驱动的自主规划

## 非目标

- 不改变 skill 的外部行为（各模式产物、审查规则、打包逻辑不变）
- 不改变审查规则的判定标准（audits/ 下 16 个 checklist 保持原样）
- 不引入新的能力或删除现有能力
- 不改 scripts/（zip.py、server.mjs 等脚本不变）
- 不改变依赖技能检测 + `.skill-cache.json` 缓存机制（router 保留此逻辑）

## 架构：四层分离

```
references/
  primitives/          公共操作（无状态，怎么扫描/检测）
    scan-html.md         扫描HTML，返回原始结构化结果（不含Marker语义）
    detect-framework.md  框架检测（HTML/React/Vue/Cocos）
  capabilities/        能力契约（每个模式一个，统一结构）
    structure.md         模式0
    cocos-vite.md        模式C
    inject.md            模式1
    audit.md             模式2
    deploy.md            模式3
    game-log.md          模式4
    game-storage.md      模式5
    ds-act-sdk.md        模式6
    dev-server.md        模式7
    ad-preview.md        模式8
  contracts/           产物结构 + 代码模板（有状态，产物长什么样）
    ds-js-markers.md     ds.js Marker块定义 + 默认实现代码
    sdk-loader.md        SDK-LOADER模板 + SEO标签契约
    ds-act-sdk-api.md    （已有）SDK API契约
    miniapp.md           小程序接入原理（声明式知识参考）
  audits/              审查规则（audit能力的校验清单，保持checklist格式）
    index.md             audit能力入口
    *.md                 16个规则模块（格式不变）
```

### 层职责

| 层 | 性质 | 何时读 | 变更频率 |
|----|------|--------|----------|
| primitives | 无状态操作（怎么扫描） | 能力文件引用时按需读 | 低（但依赖 contracts 的模式定义） |
| capabilities | 能力契约 | 执行该能力时读 | 中 |
| contracts | 产物结构定义 + 代码模板 | 生产者生成前、消费者校验前读 | 中（随SDK升级） |
| audits | 校验规则 checklist | audit 能力执行时读 | 低 |

### 关键决策

**primitives 依赖 contracts 的模式定义，但方向是单向的。** scan-html 返回原始结构化数据（所有 HTML 注释及其位置、所有 script 标签、所有 style 块），**不做 Marker 语义识别**。能力文件拿到 scan-html 结果后，按 contracts/ds-js-markers.md 的 Marker 模式自行匹配。这样 primitives 不依赖 contracts 的语义——Marker 语法变了只改 contracts，scan-html 的"返回所有注释"逻辑不变。

**templates/ 合并进 contracts/。** 原计划的独立 templates/ 层只有两个文件，内容是 Marker 块的具体实现，与契约强耦合。合并后 `ds-js-markers.md` 同时包含块定义和默认代码。代码块保留原始 `.js`/`.html` 文件作为可 lint 的真源，contracts/ 文件引用而非内联全部代码。

**audits/ 保持独立子目录。** 16 个审查规则已是声明式 checklist，是整个 skill 里最不需要改的部分。"不能做什么"是能力的自我约束声明，audits/ 是独立校验（超集——audits 还校验 SOP 时代遗留的写法错误）。两者漂移时以 audits/ 为准（它是执行层），"不能做什么"是声明层。

**primitives/ 只有 2 个文件仍独立成层。** 与 templates/（已合并）不同，primitives 是操作抽象（被多个能力引用），不是产物定义。如果合并进 capabilities，scan-html 逻辑会在 inject/structure/audit/ad-preview 各写一遍——这正是要消除的重复。

## SKILL.md Router

SKILL.md 从"编号菜单"重构为"依赖检测 + 能力注册表 + 路由器 + 架构说明"。

### 保留的逻辑（不变）

- 依赖技能检测（appkey-naming / dsjssdk / html-security-scan）+ `.skill-cache.json` 缓存机制——原样保留
- 前置扫描（Cocos 检测 + H5 内嵌检测）——原样保留

### 架构说明（agent 必读）

四层架构表，告知 agent 各层职责与读取时机。

### 能力注册表

**编号保持旧映射不变**（0/C/1-8），确保 evals 中"模式1""模式C"等引用不漂移：

| 编号 | 能力 | 文件 | 一句话 | 依赖 | 出参 |
|------|------|------|--------|------|------|
| 0 | 规范目录 | capabilities/structure.md | 提取内嵌CSS/JS到src/ | 无 | 分离的 src/*.css + src/*.js |
| C | Cocos Vite | capabilities/cocos-vite.md | Cocos导出+Vite构建 | 无 | entry.js + vite工程 |
| 1 | 注入大神 | capabilities/inject.md | 注入SDK+生成ds.js | structure(推荐) | ds.js + SDK-LOADER注入 |
| 2 | 审查 | capabilities/audit.md | 校验DS产物合规性 | inject(被审查物) | 审查报告 |
| 3 | 部署 | capabilities/deploy.md | 构建+打包 | 无 | deploy.zip |
| 4 | 埋点 | capabilities/game-log.md | 插入trackEvent | inject | 修改后的业务代码 |
| 5 | 持久化 | capabilities/game-storage.md | 本地/服务端存储 | 无 | game-storage.js或game-server-storage.js |
| 6 | 活动SDK | capabilities/ds-act-sdk.md | 接入ds-act-sdk | inject | configure+evoke代码 |
| 7 | 开发服务器 | capabilities/dev-server.md | HTTPS本地服务 | 无 | 运行中的server |
| 8 | 广告预览 | capabilities/ad-preview.md | 调试遮罩+点击日志 | inject(点击日志) | 遮罩/日志代码 |

### 路由规则

1. **显式指定**（旧编号或名称均可）→ 直接读对应能力文件
   - "模式1" / "注入大神" / "1" → capabilities/inject.md
   - "模式C" / "Cocos" / "C" → capabilities/cocos-vite.md
   - 编号与上表一致，纯快捷方式
2. **意图驱动**（默认）→ agent 读注册表自主选择，可组合多个能力
   - "帮我接入分享" → inject（分享是 inject 的子能力）
   - "打包上线" → audit → deploy（组合）
3. **歧义消解** → 多个能力匹配时，列出候选及区分点，询问用户
   - "加点击日志" → 候选：game-log（trackEvent 行为埋点）/ ad-preview（广告点击日志上报）。区分点：是否互动广告场景。询问用户。
4. **路径不明确** → agent 读相关能力文件的"依赖/出参"判断前置需求，向用户确认后再执行

## 能力文件统一结构

每个 `capabilities/*.md` 遵循统一契约结构（非 SOP）。**简单能力可省略标记为"无"的段**：

```markdown
# 能力名

## 依赖
- 前置能力：xxx（推荐/必须）
- 公共原语：scan-html、detect-framework
- 产物契约：contracts/xxx.md
- 外部技能：xxx

## 入参
| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| ... | 用户/原语/前置能力 | 是/否 | ... | 交互询问/可推断/前置传递 |

## 出参
| 产物 | 位置 | 契约 |
|------|------|------|
| ... | ... | contracts/xxx.md |

## 能做什么
- ...

## 不能做什么
- ...

## 判断规则
（经验性业务知识，如启发式分类表、命名模式匹配规则等。
 这类知识无法用"依赖/入参/出参"表达，但 agent 推理时必需。）

## 幂等性
- 重入行为：覆盖/跳过/报错/部分保留
- 重入条件：检测到什么标志时认为已执行

## 数据流
（能力内部操作间的数据依赖。大多数能力是串行管线，如实声明。
 仅当存在真正可并行的操作时标注"可并行"。）

## 组合
| 方向 | 能力 | 关系 | 必须/推荐 |
|------|------|------|-----------|
| 上游 | structure | 出参src/*.js是inject的注入目标 | 推荐 |
| 下游 | audit | inject出参是audit审查对象 | 必须 |
| 下游 | deploy | inject完成后可打包 | 推荐 |
```

### 关键变化（vs SOP）

- **数据流段替代时序DAG**：诚实声明大多数能力是串行管线（如 inject 的配置收集→模板填充→注入是严格数据依赖），不假装有并行空间。仅标注真正可并行的操作。
- **判断规则段承载经验性知识**：如点击事件启发式分类表（🔴/🟢/🟡 + 名称模式匹配）、Cocos 项目判定规则等。这是 SOP 时代散落在步骤里的业务判断，契约化后集中在此段。
- **入参增加"获取方式"列**：明确区分"必须交互询问"（如 APP_KEY）、"可推断"（如 SHARE_TITLE 从 `<title>` 提取）、"前置传递"（如 SELECTED_HTML_FILES 来自 scan-html）。
- **幂等性段**：声明重入行为（如 inject 检测到已存在 ds.js 时 CONFIG 块部分保留部分覆盖）。
- **组合段区分必须/推荐**：inject→audit 是必须（不带病上线），inject→deploy 是推荐。
- **简单能力可省略段**：dev-server 无组合、无判断规则，标记"无"即可。

## 原语设计

原语返回**原始结构化结果**，不含 Marker 语义，各能力自行匹配：

### scan-html

**输出**（对每个 HTML 文件）：
- 文件路径
- 所有 HTML 注释清单（位置 + 内容）— 能力自行按 Marker 模式匹配
- 内嵌 `<style>` 块清单（位置+内容）
- 内嵌 `<script>` 块清单（位置+内容，区分有src/无src）
- `<script>` 标签清单（src + type 属性）
- `<head>`/`<body>` 位置

**不做**：不修改文件、不判断框架、不做 Marker 语义识别（只返回原始注释，能力自行匹配 `[DS:XXX:START]` 模式）。

**与 contracts 的关系**：scan-html 返回"所有注释"，inject/audit 拿到后按 `contracts/ds-js-markers.md` 的 Marker 定义自行匹配。Marker 语法变了只改 contracts，scan-html 不变。

### detect-framework

**输出**：框架类型（HTML/React/Vue）+ IS_COCOS 标志。

**逻辑**：读 package.json 判 react/vue，Cocos 检测（cocos2d-js + _CCSettings）。

## 契约设计

### ds-js-markers.md

显式声明 ds.js 的 Marker 块。**template 里有 8 个块，NAV-BAR 是第 9 个但不在 template 中**（NAV-BAR 代码散落在 html.md，由 inject 在生成时追加到 ds.js）：

| Marker 块 | 在 template 中 | 职责 | 占位符 | 不变量 |
|-----------|---------------|------|--------|--------|
| [DS:CONFIG] | ✅ | 配置常量 | {EVENT_ACTION} 等 | 占位符必须全部替换 |
| [DS:MINIAPP-DETECT] | ✅ | 小程序检测 | 无 | — |
| [DS:JSSDK] | ✅ | JSSDK初始化 | 无 | ds.ready() 在 callHandler 前 |
| [DS:NS-LOG] | ✅ | NS日志 | 无 | deviceid 取 godlikeInfo |
| [DS:SHARE] | ✅ | 分享 | {SHARE_TITLE} 等 | IS_COCOS=true 时非Godlike分支no-op |
| [DS:ULINK] | ✅ | ulink跳转 | 无 | onDsUlinkReady 回调模式 |
| [DS:CLICK-PRECHECK] | ✅ | 点击预检 | 无 | thunk模式，透传...args |
| [DS:EXPORTS] | ✅ | 导出 | 无 | window挂载+export语句 |
| [DS:NAV-BAR] | ❌（在 html.md 中） | 导航栏 | {NAV_THEME} 等 | initLogin之后调用 |

每块含：定义、默认实现代码（引用 ds-js-template.js 对应行范围，NAV-BAR 引用 html.md）、不变量约束。代码块保留原始 `.js` 文件作为可 lint 的真源。

inject（生产者）按此契约生成，audit（消费者）按此契约校验，deploy 不触碰。

### sdk-loader.md

SDK-LOADER 模板 + SEO 标签契约（引用 sdk-loader-template.html）。

### miniapp.md（已决）

小程序接入原理（联登、传角选角、分享）是**声明式知识参考**，不是操作步骤。放 contracts/ 作为 inject 能力的参考知识。inject 能力文件的"判断规则"段引用此文件。

## 迁移策略

### 迁移前置检查

1. **抽查 evals**：grep 57 条 eval 的 expected_output，确认是否含 `references/` 文件路径引用。如含，需同步更新。
2. **检查 audits/ 硬引用**：grep audits/*.md 是否引用了 `references/ds-js-template.js` 的行号或旧文件路径。如含，迁移时同步修正。

### 文件映射

| 现有文件 | 新位置 | 改动 |
|----------|--------|------|
| SKILL.md | SKILL.md | 重写为 router（保留依赖检测+前置扫描） |
| references/structure.md | capabilities/structure.md | SOP→契约 |
| references/cocos-vite-integration.md | capabilities/cocos-vite.md | SOP→契约 |
| references/inject.md | capabilities/inject.md | SOP→契约 |
| references/audits/index.md | capabilities/audit.md + audits/index.md | 流程→契约，规则保留 |
| references/deploy.md | capabilities/deploy.md | SOP→契约 |
| references/game-log.md | capabilities/game-log.md | SOP→契约 |
| references/game-storage.md + game-data.md | capabilities/game-storage.md | 合并，SOP→契约 |
| references/ds-act-sdk.md + act-*.md | capabilities/ds-act-sdk.md + 子文件 | SOP→契约，子模块保留 |
| references/dev-server.md | capabilities/dev-server.md | SOP→契约 |
| references/ad-preview.md | capabilities/ad-preview.md | SOP→契约 |
| references/ds-js-template.js | contracts/ds-js-markers.md（引用）+ 保留 .js | 代码→契约引用 |
| references/sdk-loader-template.html | contracts/sdk-loader.md（引用）+ 保留 .html | 代码→契约引用 |
| references/ds-act-sdk-api.md | contracts/ds-act-sdk-api.md | 不变 |
| references/html.md / react.md / vue.md | 框架拆分（见下） | 去重 |
| references/audits/*.md | audits/*.md | 不变（修正硬引用） |
| references/miniapp.md / miniapp-h5-integration.md | contracts/miniapp.md | 合并为声明式知识 |
| references/cocos-vite-entry-skeleton.js / jslist-flow.md | capabilities/cocos-vite.md 附属 | 合并 |
| references/audit-rules.md | 删除（已被 audits/ 目录替代，旧文件残留） | 清理 |
| references/server-storage/ | capabilities/game-storage.md 附属 | 6步流程→数据流节点 |

**框架拆分（html.md / react.md / vue.md）：**
- 共享逻辑（SDK-LOADER 注入、ds.js 生成、CONFIG 块处理）→ contracts/ds-js-markers.md + sdk-loader.md
- 框架差异（hooks vs composables vs 全局函数、文件路径约定）→ 各能力文件内的"框架分支"段
- 拆分在迁移顺序中排 inject 之前（步骤 3.5）

### 迁移顺序

1. **前置检查**：抽查 evals + audits 硬引用
2. 建 `primitives/` + `contracts/` 目录骨架
3. 写 `contracts/ds-js-markers.md` + `sdk-loader.md` + `miniapp.md`（契约先行）
4. 写 `primitives/scan-html.md` + `detect-framework.md`
5. **框架拆分**：html.md/react.md/vue.md → 共享逻辑进 contracts，框架差异整理为分支说明
6. 逐个重写 `capabilities/*.md`（inject 先行作试点，验证范式）
7. 重写 `SKILL.md` router（保留依赖检测+前置扫描）
8. 重写 `CLAUDE.md` 维护说明（不是更新，是重写——模式映射表/框架检测/路径约定全失效）
9. 跑 evals 验证

**回滚点**：每 2-3 个能力重写后跑相关 eval，发现问题及时回退。不要全部重写完再统一跑 eval。

### evals 验证（A/B 对照实验）

#### 对照设计

重构完成后，同一批 eval 跑两次：
- **A 组（新版）**：当前重构分支，新版能力契约式 skill
- **B 组（旧版）**：`git checkout staging`，旧版 SOP 式 skill

两组使用相同 prompt 集，记录每条的 token 消耗和产物正确性。

#### eval 集

**第一类：现有 57 条（不退化验证）**
- 不改 prompt 和 expected_output
- 验证：新版产物结构与旧版一致

**第二类：新增对照 eval（价值验证，15 条）**
- expected_output 写**行为预期**而非死产物（如"agent 应自主规划 inject→audit→deploy，不询问用户选编号"）
- 分三组：

| 组 | 数量 | 场景示例 | 验证目标 |
|----|------|---------|---------|
| 边界情况 | 5 | 混合框架项目、ds.js Marker块不完整、多HTML部分已接入、Cocos误注入MobileShare、game-storage缺setGameId | 旧版SOP未覆盖时agent的推理能力 |
| 多能力组合 | 5 | "从零到上线"、"分享不工作帮我查"、"加任务弹窗然后打包"、"查查能不能过审查不行就修"、"接入大神+埋点+打包" | agent自主规划能力链路 |
| 歧义消解 | 3 | "加点击日志"(game-log vs ad-preview)、"接入存储"(本地vs服务端)、"检查代码"(audit vs ad-preview残留) | 路由歧义消解 |
| SOP未覆盖 | 2 | 用户项目结构异常、Cocos+React混合 | 纯推理能力 |

#### 记录指标

每条 eval 记录：

| 指标 | 说明 | 怎么量 |
|------|------|--------|
| 输入 token | agent 读取的文档总量 | 统计读取的文件行数/字节数 |
| 输出 token | agent 生成的响应 | 实测 |
| 总 token | 输入+输出 | 求和 |
| 产物正确性 | 产物是否符合预期 | 1/0 |
| 路由正确性 | 是否选对能力（仅意图驱动eval） | 1/0 |
| 是否询问用户选编号 | 旧版会问"选[0][1][2]"，新版应自主规划 | 是/否 |
| 边界处理 | 是否合理处理SOP未覆盖的情况 | 合理/胡来/卡住 |

#### 对比维度

| 维度 | 旧版预期 | 新版预期 |
|------|---------|---------|
| 现有57条正确率 | 基线 | ≥基线（不退化） |
| 边界情况eval | 卡住/胡来 | 合理处理 |
| 多能力组合eval | 询问用户选编号 | 自主规划链路 |
| 歧义消解eval | 无法消歧 | 主动询问区分点 |
| 输入token | 基线 | 减少30-40%（SOP叙述→契约声明） |
| 输出token | 少（执行器模式） | 多（推理模式） |
| 总token | 基线 | 持平或略增 |
| token/正确性比 | 基线 | 提升（能处理旧版做不到的场景） |

#### 执行时机

1. 重构全部完成（迁移顺序步骤 1-8）
2. 在重构分支跑 A 组（新版）
3. `git checkout staging` 跑 B 组（旧版）
4. 汇总对比表，写入 `docs/superpowers/specs/2026-07-07-capability-contract-refactor-result.md`

#### 重点关注

- agent 是否能自主规划多能力组合（如"打包上线"→ audit→deploy）
- 边界情况处理是否不退化（多HTML、Cocos项目、已存在ds.js）
- 意图驱动路由是否正确（如"加点击日志"能否消歧到 ad-preview vs game-log）
- token 效率：总 token 持平但能处理旧版做不到的场景 = 价值提升

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| agent 推理能力不足，自主规划时遗漏步骤 | 数据流提供依赖关系；"不能做什么"提供硬边界；"判断规则"提供经验知识；evals 验证 |
| 契约与实际 SDK 漂移 | contracts/ 文件标注"以代码为准"，SDK 升级时同步 |
| 框架特定逻辑去重后丢失细节 | 共享部分进 contracts，框架差异在能力文件"框架分支"段显式声明 |
| "不能做什么"与 audits/ 规则漂移 | audits/ 是执行层（超集），"不能做什么"是声明层。漂移时以 audits/ 为准 |
| evals 含文件路径引用 | 迁移前置检查步骤 grep 确认 |
| 依赖检测逻辑丢失 | router 明确保留 .skill-cache.json 机制 |
| 数据流段变成换皮 SOP | 诚实声明串行管线，不假装并行；"判断规则"和"组合"段才是推理空间 |
| 路由歧义（game-log vs ad-preview） | 路由规则第 3 条：歧义消解——列候选+区分点+询问用户 |

## 已决决策（原开放问题）

- **miniapp 归属**：放 `contracts/miniapp.md`。小程序接入原理是声明式知识参考，不是操作步骤。inject 能力的"判断规则"段引用它。
- **server-storage 归属**：保持为 `capabilities/game-storage.md` 附属。7 个文件中的 6 步流程改为 game-storage 能力"数据流"段的 6 个节点，API 参考保留为附属文件。

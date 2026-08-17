# 能力：游戏数据持久化（模式 5 / GAME_STORAGE）

> 为游戏业务代码接入数据持久化方案——本地存档（AES-GCM 加密 localStorage）、服务端存储（mini-game-data-sdk，玩家各存一份）、或公共表（datahub-table，多人共写共读）。
>
> 三条路径的详细操作知识见文末「附属参考」——`references/server-storage/` 7 个文件是服务端路径数据流节点的展开，`references/server-storage/common-table/` 8 个文件是公共表路径数据流节点的展开。

## 依赖

- **前置能力**：按子选项分别声明（见下）。
  - 本地存档路径：零依赖，仅需浏览器 Web Crypto API（Chrome 37+），不依赖 ds.js。
  - 服务端存储路径：不依赖 ds.js，但需用户在 CMS 后台配置游戏实例获取 `miniGameId`（非技能可自动完成的后台配置项）。**依赖 `[1] 注入大神` 提供的登录态**（`window.userInfo`），未注入则提示先执行 [1]。
  - 公共表路径：依赖 `mini-game-data-sdk`（≥ 0.2.1）+ `miniGameId` + 登录态；若已走过服务端路径（B）则 SDK 与 `setGameId` 已就绪可直接复用，否则由 `common-table/00-triage.md` 前置检查引导补齐。**登录态由 `[1] 注入大神` 提供**（公共表 `__create_uid` 内置字段依赖登录态）。
- **公共原语**：
  - `primitives/scan-html.md`——返回 HTML 注释清单、script 标签清单、head/body 区间，供定位含 DS Marker 的 HTML 文件与业务脚本引用插入点。
  - `primitives/detect-framework.md`——输出 `framework`（HTML/React/Vue）+ `IS_COCOS` 标志，决定扫描范围扩展名与状态变量检测模式。
- **外部技能**：无。服务端路径的 `miniGameId` / `billboardId` 由用户在 CMS 后台手动获取，本能力仅引导路径。

## 入参

### 公共入参（三条路径）

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| 存储方案 | 用户 | 是 | — | 交互询问（A=本地存档 / B=服务端存储 / C=公共表，见判断规则段 2） |
| `framework` | detect-framework 原语 | 是 | — | 前置传递（HTML/React/Vue，决定扫描范围扩展名） |
| 跨会话状态变量 | scan-html + 语义识别 + 用户确认 | 是 | — | 可推断 + 用户确认（扫描全局状态变量，按判断规则段 1 分类后请用户确认） |
| `SELECTED_HTML_FILES` | scan-html 原语 + 用户确认 | 是 | — | 前置传递（候选为含 DS Marker 的 HTML 文件；单文件静默默认，多文件须用户确认） |

### 本地存档路径（A）额外入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| load 插入点 | 扫描 + 用户确认 | 是 | — | 识别游戏初始化处（`init()` / `DOMContentLoaded` / 组件 `mounted`），用户确认插入位置 |
| save 插入点 | 扫描 + 用户确认 | 是 | — | 识别关键状态变更处（通关 / 存档 / 关卡完成 / 奖励领取），用户确认插入位置 |
| 插入方式 | 用户 | 是 | — | 交互询问（A=全部插入 / B=选择性逐个确认） |

### 服务端存储路径（B）额外入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| 字段表 | 语义识别 + 用户确认 | 是 | — | 可推断 + 交互确认（据现有存档逻辑或全局状态变量梳理，含 recordKey / SDK类型 / 序列化 / 进排行榜 / 客态可读 / 默认值 / 来源变量，见附属参考 `00-intake.md`） |
| `devMiniGameId` | 用户 | 是（服务端） | `'__DEV_MINI_GAME_ID__'` | 交互询问（可先占位符，后续补填） |
| `proMiniGameId` | 用户 | 是（服务端） | `'__PRO_MINI_GAME_ID__'` | 交互询问（可先占位符，上线前必补） |
| 同步策略 | 推荐表 + 用户确认 | 是 | — | 据游戏类型推荐触发器，用户确认（见判断规则段 4） |
| `devBillboardId` | 用户 | 否 | `'__DEV_BILLBOARD_ID__'` | 交互询问（仅当字段表有进排行榜字段；可先占位符） |
| `proBillboardId` | 用户 | 否 | `'__PRO_BILLBOARD_ID__'` | 交互询问（同上，上线前必补） |
| 客态读取字段 | 用户 | 否 | — | 交互询问（哪些字段需支持 queryUid 查看指定玩家；默认无） |
| B 档规则 override 声明 | 用户 | 否 | 全部应用 | 用户在第 1 步自然语言声明跳过某条 B 档规则（如"我不需要迁移 localStorage"） |

> **`miniGameId` / `billboardId` 占位符规则**：用户暂无 ID 时用占位符生成代码，不阻塞流程；占位符须在 CMS 注册阶段或上线前替换。SDK 内部通过 `IS_PRODUCTION` 自动选择 dev/pro ID，业务层不写 `if (isProd)` 判断。

### 公共表路径（C）额外入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| 公共表识别 | 00-triage 开放式识别 + 用户确认 | 是 | — | 结合项目业务判断是否存在「多人共写共读、不按 uid 分片」的数据（帖吧/广场/投稿/评论/点赞/UGC 墙/投票/世界 boss），命中后询问用户是否接入（见判断规则段 8） |
| `miniGameId` | 用户 / 复用 B 路径 | 是 | — | 已走过 B → 复用 `setGameId`；独立接入 → 用户提供（`00-triage.md` 前置检查引导补齐） |
| 登录态 | `00-triage.md` 前置检查 | 否 | — | 公共表 `__create_uid` 内置字段依赖登录态；无登录能力则「按创建者」权限位与「我的投稿」类查询不可用（提示但不阻断） |

## 出参

### 本地存档路径（A）

| 产物 | 位置 | 契约 |
|------|------|------|
| game-storage.js | 项目根目录（若有 `src/ds.js` 则生成在 `src/game-storage.js` 保持同级） | AES-GCM 加密模块（Web Crypto API，零依赖）：PBKDF2 派生密钥（从 URL pathname 提取游戏 UUID）+ AES-GCM 加密 + Base64 存储；导出 `save(state)` / `load()` / `clear()`；末尾预留 `saveRemote` / `loadRemote` TODO 注释 |
| HTML 引用 | `SELECTED_HTML_FILES` 每个文件业务脚本第一个 `<script src>` 之前 | `<script type="module" src="game-storage.js">`（或 `src/game-storage.js`） |
| 业务代码改造 | load/save 插入点所在业务文件 | `init()` 中插入 `await GameStorage.load()` 覆盖默认值；关键状态变更后插入 `await GameStorage.save({ ... })` |

### 服务端存储路径（B）

| 产物 | 位置 | 契约 |
|------|------|------|
| game-server-storage.js | 与 `ds.js`（或 `src/game.js`）同级目录 | `var ServerStorage = (() => {...})()` + `window.ServerStorage = ServerStorage`；含 `GAME_ID_CONFIG` / `BILLBOARD_CONFIG` / `DEFAULTS` / `loadFull` / `saveFull`（diff 去重 + 批量加密写入）/ `getRank` / `getUserRank` / `loadLeaderboard`（Promise.all 并行）/ `migrateFromLocalStorage`（条件生成）/ `loadForUser`（仅客态可读字段时生成）；套用 14 条规则（见附属参考 `02-best-practices.md`） |
| mini-game-data-sdk 注入 | `SELECTED_HTML_FILES` 每个文件 `<head>` 中 | 预加载 SDK UMD JS（`https://ds.res.netease.com/online/pkg/mini-game-data-sdk/0.2.1/`，≥ 0.2.1，不引入 `index.css`）；`</body>` 前插入 `<script type="module" src="src/game-server-storage.js">`（位于 `game.js` 之前，`type="module"` 是部署平台 CDN 重写的硬性条件） |
| 业务代码改造 | 游戏初始化函数 + 同步触发器所在文件 | `init()` 中 `migrateFromLocalStorage` → `loadFull` → 恢复内存状态 → 启动同步触发器（setInterval / visibilitychange / pagehide / 关键节点） |
| 榜单 UI | `SELECTED_HTML_FILES`（HTML 结构插 `</body>` 前 + CSS + JS） | 仅当字段表有进排行榜字段；固定入口按钮 + 弹层面板 + 渲染逻辑（见附属参考 `03-leaderboard.md`） |
| DataHub 批量导入 JSON | 输出给用户复制到 CMS 后台 | 字段表逐条映射为 `{ key, name, type, defaultValue, allowGuestRead? }`；type 必须大写枚举；defaultValue 类型必须匹配（见附属参考 `04-cms-register.md` + `json-key-comment.md`） |

### 公共表路径（C）

| 产物 | 位置 | 契约 |
|------|------|------|
| game-common-table.js | 与 `game-server-storage.js`（或 `game.js`）同级目录 | `type="module"`；复用 B 路径的 `setGameId`（独立接入时由顶层兜底段负责）；含 `tableUpdate` / `tablePage` / `tableIncrNumber` / `tableFindOne` 等公共表 API 封装（见附属参考 `common-table/04-code-gen.md`） |
| table.d.ts | 项目 `src/` 或根目录 | 03.5 步产出；供 AI 生成读写代码时比对字段类型（`STRING_LIST` → `string[]`、JSON 字段 → 具体结构类型），不需 import，零构建依赖 |
| TableConfig JSON | 输出给用户导入 CMS | 03 步产出；`scripts/validate.cjs` 全绿才能继续（门禁卡点）；导入 CMS「数据表」tab |
| HTML 引用 | `SELECTED_HTML_FILES` 每个文件 `<head>` 中 | `<script type="module" src="game-common-table.js">`（位于 `game-server-storage.js` 之后、`game.js` 之前；独立接入时 SDK 也在 `<head>`） |
| CMS 注册 | CMS 后台「数据表」tab | 05 步**必做卡点**；未注册则公共表 API 调用失败 |

## 能做什么

- **询问存储方案**：向用户呈现本地存档 vs 服务端存储 vs 公共表的优劣对比，由用户选择路径（见判断规则段 2）。
- **生成本地存档**：扫描业务代码识别跨会话状态变量（按判断规则段 1 分类），识别 load 点（初始化处）与 save 点（关键状态变更处），生成 `game-storage.js`（AES-GCM 加密，Web Crypto API，零依赖），注入 HTML 引用，改造业务代码插入存取调用。
- **接入服务端存储**：执行前置路由（检测已存在存档文件，见判断规则段 5）→ 梳理字段表 → 推荐同步策略 → 生成 `game-server-storage.js`（套 14 条规则）+ 注入 mini-game-data-sdk → 生成榜单 UI（若有进榜字段）→ 生成 DataHub JSON 引导 CMS 注册。
- **接入公共表**：执行 00-triage 开放式识别（判定内核：多人共写共读、不按读者 uid 分片）→ 表设计 → 索引设计 → 生成 TableConfig JSON（`scripts/validate.cjs` 门禁）→ 生成 `table.d.ts` → 生成 `game-common-table.js`（复用 `setGameId`）→ 引导 CMS 数据表注册（必做卡点）→ 审查。支持独立接入或 B 路径后自动触发。
- **识别跨会话状态变量**：按判断规则段 1 的纳入/排除标准识别需持久化的变量，排除纯 UI 状态、临时计算变量、单场对局临时分数。
- **插入存取调用**：在用户确认的 load 点（初始化处）插入 `load()` / `loadFull()`，在 save 点（关键状态变更处）插入 `save()` / `saveFull()`，展示代码预览请用户确认插入方式（全部 / 选择性）。
- **输出完成报告**：新增文件表、修改文件表、验证方式、TODO 提示（本地存档的 `saveRemote`/`loadRemote`；服务端存储的占位符待填）。

## 不能做什么

- **不删除业务代码**——仅插入存取调用，不改 handler 内部逻辑。
- **不识别纯 UI 状态 / 临时计算变量 / 单场对局临时分数**——`isModalOpen`、`currentTab`（UI 状态）、`bakePerSecond`（派生值）、本局得分（已由模式 4 trackEvent 上报）均排除，不持久化。
- **不替代后端接口**——本能力生成的是客户端存取封装（localStorage 或 mini-game-data-sdk 调用），不实现服务端存储逻辑、不提供排行榜后端、不做服务端数据校验；服务端能力由大神平台 SDK 与后台提供。
- **不依赖 ds.js**——持久化功能与 ds.js 相互独立；本地存档零依赖，服务端存储依赖 mini-game-data-sdk（由本能力注入 HTML 引用，非 ds.js 产物）。
- **本地存档不支持跨设备 / 排行榜**——数据存于玩家浏览器 localStorage，换设备或清缓存后丢失；需跨设备同步或排行榜时必须选服务端路径。
- **服务端存储字段未在 CMS 注册会静默失败**——SDK 调用返回空值但不报错，极难排查；CMS 注册是必做卡点，代码生成完必须先完成注册再验证。
- **不自动获取 miniGameId / billboardId**——需用户在 CMS 后台手动配置游戏实例并复制 ID；本能力仅引导路径，不代劳。
- **不修改 SDK 内部行为**——`setGameId` 仅调用一次，`IS_PRODUCTION` 环境切换由 SDK 内部处理，业务层不干预。
- **公共表不替代用户存储**——公共表（多人共写共读）与服务端存储（玩家各存一份）是两套独立系统（不同 JSON、不同 CMS tab、不同 `table*` API），公共表不存个人存档数据。
- **不自动建索引**——公共表的索引设计需用户确认每张表的索引覆盖规则，不自动生成。
- **不强制升级本地存档为服务端**——检测到已存在 `game-storage.js` 时询问是否升级，用户拒绝则中止，不自动迁移。
- **不做字段语义猜测**——字段表的上云策略（直接搬 / 序列化 / 丢弃）由扫描结果 + 规则推导，模糊字段标"需确认"请用户判断，不替用户决定。
- **不决定后续能力路由**——完成后可提示后续选项（audit/deploy/game-log 等），但不强制执行。

## 判断规则

### 1. 跨会话状态变量识别规则

扫描业务代码（据 `framework` 取扫描扩展名，同 inject 的框架差异表），识别**跨会话状态变量**——在多个函数/生命周期中被读写、且在游戏核心进度中有意义的变量。

**纳入标准**（典型变量）：

| 典型变量 | 类型 |
|---------|------|
| `score`、`highScore` | 分数 |
| `level`、`stage`、`chapter` | 关卡 |
| `hp`、`lives`、`energy` | 资源 |
| `coins`、`gems`、`points` | 货币 |
| `unlockedStages`、`achievements` | 解锁内容 |
| `inventory`、`items` | 道具库存 |

**排除标准**：

| 排除类型 | 示例 | 理由 |
|---------|------|------|
| 纯 UI 状态 | `isModalOpen`、`currentTab` | 不跨会话，刷新即重置 |
| 临时计算变量 | `bakePerSecond`（= 建筑数 × 系数） | 派生值，启动时重算 |
| 单场对局内临时分数 | 本局得分（已由模式 4 trackEvent 上报） | 模式 4 负责，不持久化 |

> **与模式 4 的区别**：模式 4 识别单场对局行为节点（trackEvent 日志上报，每次触发都上报）；模式 5 识别跨会话进度变量（持久化存储，跨页面刷新保留）。输出时明确标注"持久化"目的，避免用户混淆。

**识别结果为空时**：输出提示并终止——"未找到需要持久化的状态变量。建议检查业务代码是否在扫描范围内，或手动调用 GameStorage.save() / GameStorage.load()。"

### 2. 存储方案选择规则

向用户呈现对比，由用户选择：

| 维度 | 本地存档（A） | 服务端存储（B） | 公共表（C） |
|------|--------------|----------------|------------|
| 依赖 | 零依赖，Web Crypto API | mini-game-data-sdk + 后台配置 miniGameId | mini-game-data-sdk ≥ 0.2.1 + miniGameId + 登录态 |
| 数据位置 | 玩家浏览器 localStorage | 大神服务端（玩家各存一份） | 大神服务端（多人共写共读同一批数据） |
| 跨设备同步 | ❌ 不支持（换设备丢失） | ✅ 支持 | ✅ 支持 |
| 排行榜 | ❌ 不支持 | ✅ 支持 | ❌ 不适用（非排行榜场景） |
| 离线可用 | ✅ 可用 | ❌ 需联网（load 失败兜底离线运行） | ❌ 需联网 |
| 数据持久性 | 换设备 / 清缓存丢失 | 永久保存 | 永久保存 |
| 接入成本 | 低 | 中（需后台配置 + CMS 字段注册） | 中高（需表设计 + 索引 + CMS 数据表注册） |

> **推荐逻辑**：游戏有排行榜需求 / 需跨设备同步 → 服务端（B）；纯单机休闲 / 快速接入 → 本地（A）；多人共写共读的数据（帖吧/投稿/评论/点赞）→ 公共表（C）。但不替用户决定，呈现对比后由用户选择。
>
> **维度提示**：`[A]/[B]` 回答「数据存哪」（本地 vs 服务端，二选一）；`[C]` 回答「是不是多人共享的数据」——不同维度、不互斥，一个项目可同时有 `[B]` 和 `[C]`。

### 3. 字段上云策略（服务端路径）

扫描出现有存档逻辑（`localStorage.setItem` / `JSON.parse(saveData)` / `xxxSave` 变量）或全局状态变量后，按字段特征分类：

| 字段特征 | 上云策略 | 理由 |
|---------|---------|------|
| number / string / boolean 原始值 | ✅ 直接搬 | SDK 原生支持 |
| 嵌套对象 / 对象数组（建筑列表、装备列表） | ⚠️ JSON.stringify，读时 JSON.parse | SDK 仅支持一维数组；嵌套对象写入会被静默截断，不报错 |
| 时间戳 / 计时器（上次登录时间） | ✅ 直接搬 | 离线收益计算依赖 |
| 本地匿名 ID / 设备 ID | ❌ 丢弃 | 服务端有真实 uid |
| 纯 UI 状态（当前 Tab、弹窗开关） | ❌ 丢弃 | 不跨会话 |
| 派生值（每秒收益 = 建筑数 × 系数） | ❌ 丢弃 | 启动时重算 |

> **recordKey 命名规范**：下划线小写，语义清晰（如 `score_total` / `lifetime_points` / `level_current` / `prestige_level` / `buildings_json` / `last_save` / `achievements_json`）。正则约束 `^[A-Za-z0-9_-]{1,64}$`。

### 4. 同步策略推荐表（服务端路径）

据游戏类型（扫描代码特征关键词识别，可多匹配）推荐同步触发器：

| 游戏类型 | 识别特征 | 推荐策略 |
|---------|---------|---------|
| 放置 / 点击类（Idle/Clicker） | `cps` / `bakePerSecond` / 建筑列表 / 每秒自动增加 | 节流同步：setInterval 30s + visibilitychange:hidden + pagehide + 关键节点立即存 |
| 回合制 / 局末类 | `gameOver` / `endGame` / 结算弹窗 / 生命值归零 | 局末同步 + 兜底：gameOver 回调立即存 + pagehide 兜底 |
| 关卡类 | `levelUp` / `stageComplete` / 通关 / nextLevel | 关卡完成立即存 + 定时兜底：levelComplete 立即存 + setInterval 60s + pagehide |
| 卡牌 / RPG 类 | `card` / `deck` / 技能 / 角色 / 装备 / 状态buff | 操作即同步（debounce 200ms）+ pagehide 立即存 |

> **iOS webview 注意**：`beforeunload` 不可靠，统一用 `pagehide` 兜底。`visibilitychange` 在大神 App 切后台时正确触发。

### 5. 已存在存档文件的前置路由（服务端路径）

服务端路径执行前，扫描项目根目录和 `src/` 检测已存在的存档文件：

| 检测结果 | 路径 | 行为 |
|---------|------|------|
| 无存档文件 | 路径 A/B | 继续正常扫描流程（分支 A=检测到现有 localStorage 存档 / 分支 B=未检测到） |
| 检测到 `game-storage.js` | 路径 C | 询问是否从本地存档升级为服务端存储；用户同意 → 优先读取 `game-storage.js` 的 `DEFAULTS` / `save()` / `load()` 提取字段（比扫业务代码更准），生成迁移函数；用户拒绝 → 中止 |
| 检测到 `game-server-storage.js` | 路径 D | 询问意图：[1] 新增字段 / [2] 修改同步策略 / [3] 添加排行榜 / [4] 重新生成；据意图跳转对应步骤，不强制走完整 6 步流程 |

> **路径 C 迁移规则**：迁移函数 `migrateFromLocalStorage(oldKey)` 只跑一次（幂等保护 `__ss_migrated__` 标记），必须在 `loadFull` 之前执行（顺序反了会导致旧数据覆盖云端存档）。`game-storage.js` 保留用于迁移读取旧数据，迁移完成后可由用户手动删除。

### 6. 服务端存储 6 步流程作为数据流节点

服务端路径的 6 步流程（字段确定 → 同步策略 → 代码生成 → 榜单 UI → CMS 注册 → 审查）是严格串行管线，每步输出是下步唯一输入，详见「执行步骤」段。CMS 字段注册是**必做卡点**——字段未在 CMS 注册，SDK 调用静默失败（返回空值不报错），代码生成完必须先完成注册再验证。6 步的详细操作知识见文末附属参考 `references/server-storage/`。

### 7. 14 条强制规则的应用（服务端路径）

代码生成时自动套用，A 档不可 override，B 档可由用户在第 1 步自然语言声明跳过（详见附属参考 `02-best-practices.md`）：

- **A 档（违反必出 bug）**：SDK ≥ 0.2.1 且不引入 `index.css`；SDK JS 放 `<head>` 预加载 + `game-server-storage.js` 放 `</body>` 前且 `type="module"`；嵌套对象 JSON.stringify；必备 `last_save` 字段；`setGameId` 仅调一次；`var ServerStorage` 挂全局 + 显式 `window.ServerStorage`。
- **B 档（最佳实践）**：不冗余存 uid/nick/icon；放置类离线收益封顶 24h；批量写入 ≤ 20 条；load 失败兜底离线运行；缺失字段 `cloud[k] ?? defaults[k]`；自动生成迁移函数；diff 去重；榜单 Promise.all 并行；排行榜 nick/icon 不二次清洗。

### 8. 公共表识别规则（公共表路径）

**判定内核**：项目里是否存在「多人共写共读、不按读者 uid 分片」的数据。

| 命中示例 | 反例（走 B 或 billboard） |
|---------|------------------------|
| 帖吧 / 广场 / 投稿 / 评论 / 点赞 / UGC 墙 / 投票 / 世界 boss 计数 | 个人存档 / 个人最高分 / 只读排行榜 |

> 识别由 `common-table/00-triage.md` 开放式执行——结合项目实际业务判断，示例非封闭清单。命中后询问用户是否接入公共表。

### 9. 5-B → 5-C 自动触发规则

服务端路径（B）第 6 步审查通过后，**自动进入公共表识别**：读取 `common-table/00-triage.md` 执行开放式识别（见规则 8）。命中 → 询问用户是否接入；用户确认 → 走完 5-C 全流程；未命中或用户选 N → 跳过，进入 5-B 完成菜单（其中 `[8]` 仍可手动再触发公共表）。

> **独立接入**：公共表不强依赖 B 路径。从 5.0 菜单直接选 `[C]` 或 B 完成菜单选 `[8]` 均可独立进入；`00-triage.md` 会先做「基础设施就绪」前置检查（SDK/gameId + 登录态），缺则引导补齐。

## 幂等性

- **重入检测标志**：
  - 本地存档：`game-storage.js`（根目录或 `src/`）存在。
  - 服务端存储：`game-server-storage.js` 存在。
  - 公共表：`game-common-table.js` 存在。
- **重入行为**：
  - **本地存档**：检测到已存在 `game-storage.js` → 输出"⚠️ 检测到项目中已存在 game-storage.js，继续将覆盖现有文件。是否继续？(y/n)"；用户输入 `n` 终止，`y` 继续。
  - **服务端存储**：检测到已存在 `game-server-storage.js` → 走路径 D（见判断规则段 5），询问意图后增量处理，不自动覆盖。
  - **公共表**：检测到已存在 `game-common-table.js` → 询问意图（新增表 / 修改字段 / 重新生成），增量处理，不自动覆盖。CMS 数据表注册每次重入重新生成 TableConfig JSON，用户重新导入为 upsert。
  - **HTML 引用**：已存在同 src 的 `<script>` 标签 → 跳过插入。
  - **业务代码改造**：已存在 `GameStorage.load()` / `ServerStorage.loadFull()` 调用 → 跳过插入。
  - **CMS 字段注册**：每次重入重新生成 DataHub JSON（字段表变了才变），用户重新导入为 upsert（同 key 覆盖，不报错）。
  - **迁移函数**：`__ss_migrated__` 标记已存在 → 跳过迁移执行。

## 执行步骤

### 本地存档路径（A）—— 串行

```
前置检查（检测 game-storage.js 是否已存在，已存在询问覆盖）
  ↓
扫描 + 语义识别状态变量（按判断规则段 1 分类，用户确认）
  ↓
展示插入点 + 确认（load 点 / save 点，用户确认插入方式 A/B）
  ↓
生成 game-storage.js + 注入 HTML 引用 + 改造业务代码插入存取调用 + 完成报告
```

### 服务端存储路径（B）—— 6 步串行管线（含 CMS 注册卡点）

```
前置路由（检测已存在存档文件，走路径 A/B/C/D，见判断规则段 5）
  ↓
第 1 步：字段确定（扫描业务代码梳理字段表，上云策略分类，用户确认锁定 + Key 设计 + 客态读取询问）
  ↓
第 2 步：同步策略（据游戏类型推荐触发器，用户确认）
  ↓
第 3 步：代码生成（收集 miniGameId → 生成 game-server-storage.js 套 14 条规则 → 注入 mini-game-data-sdk → 改造业务代码）
  ↓
第 4 步：榜单 UI（仅当字段表有进排行榜字段：收集 billboardId → 生成 HTML+CSS+JS；无则跳过）
  ↓
第 5 步：CMS 字段注册【必做卡点】（生成 DataHub 批量导入 JSON → 引导用户后台注册 → 卡点确认；未注册则 SDK 静默失败）
  ↓
第 6 步：代码审查（读取 audits/index.md 服务端存储专项节，自动检查 + autofix）→ 审查通过后自动触发公共表识别（见判断规则段 9）
```

### 公共表路径（C）—— 串行管线（含 CMS 注册卡点 + validate.cjs 门禁）

```
前置检查（00-triage：基础设施就绪 [SDK/gameId] + 登录态 + 开放式识别，用户确认接入）
  ↓
表设计（01：表结构 / 字段类型 / 6 内置字段 / 权限位）
  ↓
索引设计（02：每张表建索引，索引覆盖规则）
  ↓
生成 TableConfig JSON（03：scripts/validate.cjs 全绿才能继续【门禁卡点】）
  ↓
类型声明（03.5：生成 table.d.ts）
  ↓
代码生成（04：生成 game-common-table.js，复用 setGameId，对照 table.d.ts 比对字段类型）
  ↓
CMS 数据表注册【必做卡点】（05：导入 CMS「数据表」tab，确认完成）
  ↓
代码审查（读取 audits/index.md 公共表专项节 → common-table.md，自动检查 + autofix）
```

## 附属参考：服务端存储 6 步流程展开

服务端路径的 6 步流程在本文件「执行步骤」段声明为串行节点；每步的详细操作知识（询问话术、代码模板、规则表、JSON 格式规范）见以下 7 个附属参考文件：

| 路径 | 对应数据流节点 | 内容 |
|------|--------------|------|
| `references/server-storage/00-intake.md` | 第 1 步：字段确定 | 前置路由 A/B/C/D + 字段表锁定 + Key 设计规范 + 客态读取询问 |
| `references/server-storage/01-sync-strategy.md` | 第 2 步：同步策略 | 游戏类型识别 + 按类型推荐同步触发器表 + iOS webview 注意事项 |
| `references/server-storage/02-best-practices.md` | 第 3 步：代码生成 | game-server-storage.js 模板 + 14 条强制规则（A 档不可 override / B 档可 override）+ HTML 引用注入 + 业务代码改造 |
| `references/server-storage/03-leaderboard.md` | 第 4 步：榜单 UI | 榜单组件生成（HTML + CSS + JS）+ 复用已有容器分支 + 样式调整询问 |
| `references/server-storage/04-cms-register.md` | 第 5 步：CMS 字段注册（卡点） | 注册清单 + DataHub 批量导入 JSON 格式 + 后台录入引导 + 占位符状态确认 |
| `references/server-storage/99-api-reference.md` | API 字典（全程可查） | mini-game-data-sdk API：setGameId / obfuscatedWriteData / obfuscatedBatchWriteData / batchReadData / getBillboardRank / getUserRank |
| `references/server-storage/json-key-comment.md` | 第 5 步：JSON 格式规范 | DataHub Key 配置 JSON 批量导入格式（与后端 DictSaveParam / ValidationRules / RateLimitSaveParam 校验逻辑对齐） |

## 附属参考：公共表流程展开

公共表路径的 8 步流程在本文件「执行步骤」段声明为串行节点；每步的详细操作知识见以下 8 个附属参考文件（均在 `references/server-storage/common-table/`）：

| 路径 | 对应数据流节点 | 内容 |
|------|--------------|------|
| `common-table/00-triage.md` | 识别 + 前置检查 | 开放式识别 + 基础设施就绪（SDK/gameId）+ 登录态前置检查 |
| `common-table/01-table-design.md` | 表设计 | 表结构 / 字段类型 / 6 内置字段 / 权限位设计 |
| `common-table/02-index-matching.md` | 索引设计 | 每张表建索引；索引覆盖规则（IndexMatchChecker 语义） |
| `common-table/03-table-config-json.md` | 生成 JSON | TableConfig JSON，`scripts/validate.cjs` 全绿才能继续（门禁卡点） |
| `common-table/03.5-table-d-ts.md` | 类型声明 | 生成 `table.d.ts`（供 AI 生成读写代码时比对字段类型；不需 import，零构建依赖） |
| `common-table/04-code-gen.md` | 代码生成 | 生成独立 `game-common-table.js`，复用 `setGameId`，对照 `table.d.ts` 比对字段类型 |
| `common-table/05-cms-register.md` | CMS 注册（卡点） | 导入 god-cms「数据表」tab，确认完成 |
| `common-table/99-api-reference.md` | API 字典（全程可查） | 公共表 API：`tableUpdate` / `tablePage` / `tableIncrNumber` / `tableFindOne` 等 |


---

## 反模式表

> 以下反模式从 SKILL.md 迁移，与 game-storage 能力（本地存档 + 服务端存储 + 公共表）相关。

| ❌ 错误写法 | ✅ 正确写法 | 原因 |
|---|---|---|
| 没有 gameId 就直接调用数据接口 | 先到小游戏管理后台配置游戏实例，拿到 gameId 再初始化 | 每个游戏有唯一 gameId，没有它 SDK 无法路由到正确数据表 |
| 直接 `new MiniGameDataSdk.RequestManager()` 传 gameId | 用 `MiniGameDataSdk.RequestManager.setGameId({ devMiniGameId, proMiniGameId })` 静态设置 | RequestManager 是静态类，不需要实例化；传入对象后 SDK 内部自动按环境选 ID |
| `setGameId` 传单个字符串 `setGameId('xxx')` | 传对象 `setGameId({ devMiniGameId: '...', proMiniGameId: '...' })` | 新 SDK 需要同时配置测试/正式两个 ID，内部通过 IS_PRODUCTION 自动切换 |
| 逐条循环 `obfuscatedWriteData` 存多个字段 | 用 `obfuscatedBatchWriteData({ items: [...] })` 批量写入（每批 ≤ 20） | 批量接口一次网络请求写多条，减少延迟；逐条循环是旧写法，不推荐 |
| 调用数据接口后不处理 code !== 200 的情况 | SDK 内部会 reject Error，在 `.catch` 里处理错误提示即可 | SDK 已做 resInterceptor 统一拦截，code !== 200 时自动 reject，业务层只需 catch |
| `batchReadData` 一次传超过50个 key | 最多50个 key，超出请分批请求 | 接口服务端限制单次最多50个 key，超出会报错 |
| `obfuscatedWriteData` 并发写同一个 key 不带 version | 需要乐观锁时，先读出 version 再带上 version 写入 | 不带 version 会覆盖写，高并发下可能丢失更新；带 version 时服务端做冲突检测 |
| `getBillboardRank` 不传 page/pageSize 就认为能拿全量 | 默认 page=1, pageSize=20，需要翻页时手动递增 page | 排行榜是分页接口，单次只返回一页数据 |
| `var ServerStorage = ...` 纯靠 IIFE 返回挂全局，未加 `window.ServerStorage = ServerStorage` | IIFE return 之后必须追加 `window.ServerStorage = ServerStorage` | 纯 `var` 在非严格模式下虽也能挂到 window，但上游脚本若含 `'use strict'`、变量遮蔽、或浏览器缓存旧 HTML 时，仍可能找不到；显式 `window` 赋值提供双重保险 |
| 修改了 `game.js` 的 `init()` 为 async 后，把旧同步逻辑中的函数调用时序打乱 | 改造 `init()` 为 async 时，确保存档恢复（`ServerStorage.loadFull()`）在 DOM 初始化逻辑之前完成 | async 改造后若存档恢复和 UI 初始化交错执行，可能出现"先渲染默认空状态，再覆盖为存档数据"的闪烁问题 |
| 把 `mini-game-data-sdk` 的 `<script>` 放在 `</body>` 之前 | `mini-game-data-sdk` JS 放在 `<head>` 中；`game-server-storage.js` 正常放 `</body>` 前、`game.js` 之前即可 | SDK 库须 `<head>` 同步阻塞预加载；业务封装层 `game-server-storage.js` 不需要进 `<head>`，只要在调用方 `game.js` 之前加载就够了 |
| `batchReadData` 传了 `queryUid` 读客态数据，结果返回 200100 错误 | 所有 key 必须在 CMS 后台开启「客态读取」开关后才能传 `queryUid` | 接口对整批 key 做统一检查，只要有一个 key 未配置客态读取，整批请求就会返回 `{"code":200100}` |
| 生成读取接口时忘记问用户是否需要客态读取 | 生成 `batchReadData` 调用前，先询问用户是否需要读取他人数据 | 客态读取是可选功能，不询问直接生成只读自己数据的代码，后期改造成本更高 |
| `mini-game-data-sdk` 引入了 `0.2.0` 及以下版本，或残留 `index.css` | 版本一律 ≥ 0.2.1（CDN 路径改为 `0.2.1/`），且不引入 `index.css`（`0.2.0` 起已移除）；历史项目升级时同步删除 `index.css` 的 `<link>` | 不升级的话，小游戏投放到 act.ds.163.com 域名会有问题；残留 `index.css` 会污染宿主页面样式 |
| 读写公共表后 UI 用本地猜测的数据，不用服务端返回值 | 每次读/写操作完成后，用服务端返回的真实数据更新 UI。写操作成功后，用返回结果或重新拉取的最新数据刷新界面，而不是仅在本地乐观地 +1/-1 或改 DOM | 本地乐观更新与服务端真实状态容易脱节：并发写、写失败、去重规则等都会让猜测值和服务端不一致。以服务端返回为准，才能保证用户在任何入口看到的数字都是对的 |
| 对公共表 `*_LIST` 字段 `JSON.stringify` 后再写、读后 `JSON.parse`；或把对象数组塞进 `STRING_LIST` | `*_LIST` 字段直接传数组、直接当数组读（元素是纯字符串/数字/布尔），不 stringify、不 parse。datahub-table 无 `OBJECT` 类型——要存对象/对象数组用 `STRING` 字段存 `JSON.stringify`、读后 `JSON.parse`。生成读写代码前先看第 3.5 步 `table.d.ts` 比对字段类型 | 服务端按 `listRules` 逐项校验数组元素：stringify 后变成"含一个 JSON 字符串的单元素数组"，长度和元素规则全部错位；把对象塞进 `STRING_LIST` 则每个元素不是 string，直接被拒 |
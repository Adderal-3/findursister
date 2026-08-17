# 第 1 步：字段确定（Agent 主动梳理 + 用户 Review）

> 目标：锁定一张「字段表」，作为后续同步策略、代码生成、榜单 UI 的唯一输入。
> 用户只需 Review 和确认，Agent 负责梳理。

---

## 1.0.0 数值任务能力门控（最先执行，先于前置路由）

**在前置路由和字段扫描之前**，先确认是否需要「小游戏数值任务与奖励发放」。该能力决定后续是否对 NUMBER 字段开放数值任务配置，并引入 ds-act-sdk 依赖。

输出以下提问：

```
本次服务端存储是否需要「小游戏数值任务与奖励发放」？
（即：玩家的某个数值达到阈值 N 时，自动完成大神活动任务并发奖）

  Y → 需要。会对 NUMBER 类型字段开放数值任务配置
  N（默认）→ 不需要。走普通存储流程，不引入任务、不依赖 ds-act-sdk
```

**用户选 N（默认）：**
- 标记 `MISSION_ENABLED = false`
- 后续字段阶段**不**询问任何数值任务配置
- **不依赖** ds-act-sdk（mode6）活动接入
- 直接进入 `## 1.0 前置路由`

**用户选 Y：** 先确认 ds-act-sdk 接入状态——数值任务的「指定活动」就是 ds-act-sdk（mode6）接入时配置的活动（actId）。

```
小游戏数值任务依赖一个已接入 ds-act-sdk 的活动（后续在该活动的「管理模块」里挂任务模块）。

你是否已经通过「大神活动接入（mode 6 / ds-act-sdk）」接入了活动？

  Y → 已接入。请提供该活动的 actId：_______________
  N → 还没接入
```

| 用户回复 | 处理 |
|----------|------|
| 已接入，提供 actId `xxx` | 标记 `MISSION_ENABLED = true`，记录 `ACT_ID = xxx`（供第 5 步图2 CMS 任务模块引导使用），进入 `## 1.0 前置路由` |
| 还没接入 | **中断本流程**，引导用户先去完成 ds-act-sdk 接入：读取并执行 `{skill_dir}/references/ds-act-sdk.md`（mode6）。完成后回到服务端存储引导，再从本门控重新进入 |

> ⚠️ 用户选 Y 但未接入 ds-act-sdk 时，**不要**继续生成存储代码或注册字段——任务模块无活动可挂，配置会半途卡住。

---

## 1.0 前置路由（最先执行，不可跳过）

**在做任何其他事情之前**，先扫描项目根目录和 `src/` 目录，检测以下两个文件是否存在：

| 文件 | 含义 |
|------|------|
| `game-storage.js` / `src/game-storage.js` | 用户之前通过本 skill 接入了**客户端存储**（AES-GCM 加密 localStorage） |
| `game-server-storage.js` / `src/game-server-storage.js` | 用户之前通过本 skill 接入了**服务端存储**（mini-game-data-sdk） |

根据检测结果，走对应路径：

---

### 路径 C：检测到 `game-storage.js`（已接入客户端存储）

输出：

```
检测到项目中已存在客户端存储方案（game-storage.js）。

你是否希望将存储方案从「本地存储（localStorage）」升级为「服务端存储（mini-game-data-sdk）」？

升级后的变化：
  ✅ 数据永久保存，换设备 / 清缓存不丢档
  ✅ 支持排行榜查询
  ⚠️ 需要到后台配置游戏实例获取 miniGameId
  ⚠️ 老用户的本地存档需要一次性迁移到服务端

是否升级？[Y/n]
```

**用户选 n（不升级）：** 中止本流程，提示：
```
好的，保持现有客户端存储方案不变。如需其他操作，请重新选择模式。
```

**用户选 Y（升级）：** 进入「路径 C 专项扫描」：

1. **优先读取 `game-storage.js`**，解析其中的 `DEFAULTS` 对象或 `save()` / `load()` 函数，提取所有已持久化字段。这是最可靠的字段来源——比扫描业务代码更准确，因为 game-storage.js 里的字段就是实际存了什么。

2. 汇报字段表（格式同 1.2 分支 A），并标注每个字段的迁移建议：

```
检测到现有客户端存储字段（来源：game-storage.js）：

| 字段名 | 类型 | 用途说明 | 迁移策略 |
|--------|------|----------|----------|
| bakeNum | number | 当前点数 | ✅ 直接搬，recordKey: bake_num |
| buildings | object[] | 建筑列表 | ⚠️ 需 JSON.stringify，recordKey: buildings_json |
| prestigeLevel | number | 飞升等级 | ✅ 直接搬，recordKey: prestige_level |
| sessionId | string | 本次会话 ID | ❌ 丢弃（每次重新生成，不持久化） |

迁移后 game-storage.js 的处理：
  · 保留文件（用于迁移函数读取旧数据）
  · 迁移完成后可由你手动删除（或保留作为离线兜底）

请确认字段表，有调整请告知。
```

3. 确认后，在 1.3 Key 设计规范阶段自动补充：
   - 对所有原 `game-storage.js` 字段，旧变量名 → 新 `recordKey` 的映射表
   - 迁移函数将从 `game-storage.js` 的 `load()` 读取旧数据，写入服务端（对应规则 #11）

4. 继续走 **1.2 分支 A** 的后续步骤（字段确认 → Key 设计 → 锁定字段表）。

---

### 路径 D：检测到 `game-server-storage.js`（已接入服务端存储）

说明用户之前已经走过本流程。输出：

```
检测到项目中已存在服务端存储方案（game-server-storage.js）。

你现在想做什么？

  [1] 新增存储字段 → 在现有基础上追加新 recordKey

  [2] 修改同步策略 → 调整触发时机或节流配置

  [3] 添加排行榜 → 现在还没有榜单，想加上

  [4] 重新生成 → 覆盖现有文件，完整重新接入

  [5] 新增数值任务 → 把某个已有 NUMBER 字段配置为数值任务（达到阈值 N 完成任务、发奖）

输入选项：
```

用户选择后，根据意图跳转到对应步骤，不强制走完整 7 步流程。

> **选 [5] 新增数值任务时：** 先走 `## 1.0.0 数值任务能力门控` 确认 ds-act-sdk 活动已接入并拿到 ACT_ID；再在现有 NUMBER 字段中选定目标字段，按 `1.3` 标记数值任务，最后到第 5 步（`04-cms-register.md`）补 `missionEnabled` 与 CMS 任务模块配置引导。不改动其他既有字段。

---

### 路径 A/B：未检测到任何存档文件 → 继续下方扫描流程

---

## 1.0.1 SDK 版本 autofix（前置路由后、字段扫描前执行）

**目的**：老项目（HTML 中已引入 `mini-game-data-sdk` 但版本 `< 0.2.1`）默认自动升级 CDN 版本号到 `0.2.1`，避免审查阶段被硬阻断。新项目（HTML 无 SDK 引用）不触发，由第 3 步代码生成直接注入 `0.2.1`。

**触发条件**：扫描所有含 DS Marker 的 HTML 文件，正则匹配 `mini-game-data-sdk/<v>/index.js`，提取 `<v>`。若任一文件 `v < 0.2.1`（含 `0.2.0` / `0.1.x` / `0.0.x`）→ 触发 autofix。

**autofix 行为**：

1. 默认自动把所有匹配的 CDN 地址版本号改为 `0.2.1`（替换 `mini-game-data-sdk/<旧v>/` → `mini-game-data-sdk/0.2.1/`）
2. 若 HTML 中存在 `mini-game-data-sdk/<旧v>/index.css` 的 `<link>`，同步删除该 `<link>`（`0.2.0` 起 SDK 不再附带样式表）
3. 记录修改文件清单与原版本号（供用户拒绝时回滚）

**输出文案**：

```
ℹ️ 检测到 mini-game-data-sdk 当前版本为 <旧v>，已自动升级到 0.2.1

不升级的话，小游戏投放到 act.ds.163.com 域名会有问题。

已修改以下文件中的 CDN 地址：
  - <file1.html>: ...mini-game-data-sdk/<旧v>/index.js → ...mini-game-data-sdk/0.2.1/index.js
  - <file2.html>: （若有 index.css 的 <link>，已同步删除）

是否保留此升级？[Y/n]
```

**用户分支**：

- **Y（默认，保留升级）**：继续后续 intake 流程（字段扫描）。无需额外操作。
- **n（拒绝，回滚）**：把所有 CDN 地址回滚到原版本号，恢复被删除的 `index.css` `<link>`（若有），输出提示：

  ```
  已回滚。审查阶段仍会因版本 < 0.2.1 阻断，建议尽快升级。
  ```

  然后继续后续 intake 流程（不强制中断，让用户自行决定何时升级）。

**新项目分支**：intake 判定为新接入（路径 A/B，HTML 无 `mini-game-data-sdk` 引用）时不触发本段 autofix，由第 3 步代码生成阶段直接注入 `0.2.1` CDN。

---

## 1.1 扫描业务代码

按以下优先级定位主要业务文件：

1. `src/game.js` / `src/main.js` / `src/app.js`（最常见）
2. 项目根目录 `game.js` / `index.js`
3. React：`src/App.tsx` / `src/store/` / `useState` / `useReducer` 用法
4. Vue：`src/store/` / `data()` 返回对象 / `reactive({})` 用法

扫描内容：
- 全局 `let` / `var` / `const` 状态变量
- `localStorage.getItem` / `localStorage.setItem` / `JSON.parse(saveData)` 痕迹
- 已知存档 key 命名模式（如 `xxxClickerSave`、`gameData`、`saveData`）
- `Object.assign` / `Object.keys` 的对象映射模式（常见于游戏存档）

---

## 1.2 分支路由

### 分支 A：检测到现有本地存档

**判断条件：** 代码中存在 `localStorage.setItem` / `localStorage.getItem` / `JSON.parse(` 模式，或存在类似 `xxxSave` / `saveData` / `gameData` 的存档变量。

提取现有字段，按下方格式汇报给用户：

```
检测到现有存档逻辑（localStorage key: [存档 key 名]）
当前持久化字段如下：

| 字段名 | 类型 | 用途说明 | 上云策略 |
|--------|------|----------|----------|
| bakeNum | number | 当前点数 | ✅ 直接搬 |
| buildings | [{id,count}] | 建筑列表（嵌套对象） | ⚠️ 需 JSON.stringify |
| lastSugarLump | number | 上次糖块时间戳 | ✅ 直接搬 |
| myUid | string | 本地匿名 ID | ❌ 丢弃（云端有真 uid） |
| currentTab | string | 当前激活 Tab | ❌ 丢弃（UI 临时状态） |

排行榜候选字段：[字段名]（理由：[说明，如"飞升不清零，单调递增"等]）

请确认：
  · 字段表是否需要调整？
  · 有没有还在内存里没存到 localStorage 的字段，也想上云？
  · 是否需要生成旧 localStorage 到服务端的一次性迁移函数？（推荐：是）
```

**上云策略判断规则：**

| 字段特征 | 策略 |
|--------|------|
| number / string / boolean 原始值 | ✅ 直接搬 |
| 嵌套对象 / 对象数组（如建筑列表、装备列表） | ⚠️ JSON.stringify，读时 JSON.parse |
| 本地匿名 ID / 设备 ID | ❌ 丢弃（服务端有真实 uid） |
| 纯 UI 状态（当前页 Tab、弹窗开关） | ❌ 丢弃（不跨会话） |
| 派生值（每秒收益 = 建筑数量 × 系数） | ❌ 丢弃（启动时重算） |
| 时间戳 / 计时器（上次登录时间） | ✅ 直接搬（离线收益依赖） |

---

### 分支 B：未检测到存档逻辑

扫描所有全局状态变量，按三类输出：

```
未检测到现有存档逻辑。识别出以下状态变量：

【建议上云】跨会话有意义的玩家进度数据
  bakeNum（当前点数）
  lifetimePoints（历史总点数）
  prestigeLevel（飞升等级）
  buildings（建筑列表，⚠️ 需序列化）
  ...

【建议不存】临时状态或派生值
  bakePerSecond → 派生值，启动时根据 buildings 重算
  goldenCookieTimer → 随机回合计时器，不持久化
  currentTab → UI 状态

【需要你判断】
  startTime — 玩家首次进入时间？是否保留用于成就计算？
  prestigeCount — 是否要作为排行榜字段？

建议排行榜字段：[建议] / 未识别到合适字段，请告知哪个数值代表核心成就

请确认字段表，之后进入第 2 步
```

---

## 1.3 Key 设计规范

在汇报字段表时，同步给出推荐的 `recordKey` 命名和类型。

**SDK 支持的数据类型：**

| 类型 | 说明 | 示例值 |
|------|------|--------|
| `number` | 整数或浮点数 | `100`, `3.14` |
| `number`（精度可选） | 高精度数值建议备注小数位数 | `12345.678` |
| `string` | 字符串 | `"hello"` |
| `boolean` | 布尔值 | `true` / `false` |
| `number[]` | 数字数组 | `[1, 2, 3]` |
| `string[]` | 字符串数组 | `["a", "b"]` |
| `boolean[]` | 布尔数组 | `[true, false]` |
| **不支持** | 嵌套对象 / 对象数组 → 必须 JSON.stringify 转为 string | `"{\"id\":1}"` |

**recordKey 命名建议：** 下划线小写，语义清晰

| 用途 | 推荐命名 |
|------|----------|
| 核心得分/点数 | `score_total` / `bake_num` |
| 历史累计值（排行榜用） | `lifetime_points` / `total_score` |
| 关卡/进度 | `level_current` / `stage_progress` |
| 飞升等级 | `prestige_level` |
| 建筑列表（序列化） | `buildings_json` |
| 最后存档时间 | `last_save` |
| 成就列表 | `achievements_json` |

---

### 1.3.1 数值任务标记（仅当 MISSION_ENABLED = true）

**仅当 `## 1.0.0` 门控中用户选择需要数值任务（`MISSION_ENABLED = true`）时执行本小节。** 否则整段跳过，字段表不含任何任务标记。

对字段表中**每个 `NUMBER` 类型字段**逐个询问：

```
字段 [recordKey]（NUMBER）是否配置为「数值任务」？
（开启后：玩家写入此值时，后端会按"数值达到阈值 N 完成任务"推送任务完成事件并发奖）

  Y → 配为数值任务，导出 JSON 时该字段携带 missionEnabled: true
  N（默认）→ 普通数值字段
```

> ⚠️ **只允许 `NUMBER` 类型配置数值任务。** `STRING` / `BOOLEAN` / `STRING_LIST` / `NUMBER_LIST` / `BOOLEAN_LIST` 字段 **MUST NOT** 出现此询问，也不可被标记为数值任务（任务类型 `minigame_common_task_max` 语义为"单个数值达到 N"，只有标量数值字段成立）。

被标记的字段在 1.4 字段表「数值任务」列记为 ✅，第 5 步（`04-cms-register.md`）据此为该 key 生成 `missionEnabled: true` 并输出 CMS 任务模块配置引导。

> 📌 **Agent 强制记录**：将所有标记 ✅ 的 key 记入会话记忆，格式为「数值任务 key [key1, key2]」。第 5 步生成 DataHub 批量导入 JSON 时，这些 key 的条目**必须**携带 `"missionEnabled": true`，禁止遗漏。

---

## 1.4 输出：锁定字段表

用户确认字段后，**先追问客态读取需求**，再输出最终字段表：

```
是否有字段需要支持「客态读取」？
（即：用 queryUid 查看指定玩家的数据，例如排行榜点击某玩家展示其详情）

  Y → 请告知哪些字段需要客态读取，后续会引导你在 CMS 开启对应开关
  N（默认）→ 跳过，所有字段仅支持读取当前登录用户自己的数据
```

**处理逻辑：**
- 用户选 Y，标记对应字段为「客态可读: ✅」；第 3 步生成代码后，在 CMS 注册阶段（`04-cms-register.md`）一并输出需要开启客态读取开关的字段清单
- 用户选 N / 默认，字段表「客态可读」列均为「否」

用户确认后，输出最终字段表（后续步骤的输入）：

```
✅ 字段表已锁定

| recordKey | SDK类型 | 序列化 | 进排行榜 | 客态可读 | 数值任务 | 默认值 | 来源变量 |
|-----------|---------|--------|----------|----------|----------|--------|----------|
| bake_num | number | 否 | 否 | 否 | 否 | 0 | game.bakeNum |
| lifetime_points | number | 否 | ✅ billboardId待填 | ✅ | ✅ 达到N完成 | 0 | game.lifetimePoints |
| prestige_level | number | 否 | 否 | 否 | 否 | 0 | game.prestigeLevel |
| buildings_json | string | JSON.stringify | 否 | 否 | 否 | "[]" | game.buildings |
| last_save | number | 否 | 否 | 否 | 否 | 0 | Date.now() |

排行榜字段：lifetime_points
billboardId：[待用户提供]
客态可读字段：lifetime_points（需在第 5 步 CMS 注册时开启 allowGuestRead，见 `04-cms-register.md`）
数值任务字段：lifetime_points（需在第 5 步导出 JSON 携带 missionEnabled，并配置 CMS 任务模块，见 `04-cms-register.md`）
```

> **注意：** 「数值任务」列仅在 `MISSION_ENABLED = true` 时出现；为 false 时省略该列。仅 `NUMBER` 字段可标 ✅。

> **注意：** 如果用户还没有 miniGameId 和 billboardId，先引导获取（见 `99-api-reference.md`）。字段表可先锁定，billboardId 在第 4 步榜单 UI 生成时再填。

---

## 1.5 进入第 2 步

字段表确认后，读取 `01-sync-strategy.md` 继续。

> 同步策略（第 2 步）确认后、生成代码（第 3 步）前，先读 `02.5-storage-keys-d-ts.md` 由锁定的字段表产出轻量 `storage-keys.d.ts` 类型声明，供代码生成阶段比对每个 recordKey 的值类型（防 `*_LIST` 被 stringify、STRING 存 JSON 漏 parse）。

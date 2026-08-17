# DS:ACT-SDK 块审查（条件触发）

> 仅当文件中存在 `/* ========== DS:ACT-SDK BEGIN ==========` 标记时执行本章节，否则跳过。
>
> 审查依据：`{skill_dir}/references/contracts/ds-act-sdk-api.md`（以 SDK 源码为准）

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

**校验规则：** 扫描正则 `DsActSdk\.([a-zA-Z_][a-zA-Z0-9_]*)[\.(]`，提取一级 `<name>`。对于链式调用（如 `DsActSdk.Role.evoke`），先匹配一级 name `Role`，再检查后续 `.evoke(` 是否为合法方法。一级 name 若不在白名单的根属性中（`configure`/`dsActStore`/`taskListPopupState`/`Role`/`TaskModule`/`CpsUniversalBar`/`TaskChecker`/`evokeRoleSelection`/`actPreCheck`/`preBindRoleCheck`/`preCheck`），或链式调用的方法不在对应组件的 `evoke` 中 → 标记为 **❌ 阻断项**：

```
❌ [DS:ACT-SDK] DsActSdk.<name> 不是 ds-act-sdk 的合法 API
    文件：src/ds.js
    问题：DsActSdk.<name>(...) 在 ds-act-sdk API 文档中不存在，疑似 AI 生成错误
    你需要：对照 references/contracts/ds-act-sdk-api.md 修正为正确的 API 调用
```

### 结构完整性校验

- [ ] `DS:ACT-SDK BEGIN` / `DS:ACT-SDK END` 注释标记成对存在
- [ ] `DsActSdk.configure()` 建议仅配置 `production` 字段，若含 `staging` 字段 → **警告**：`⚠️ 线上活动建议只配置 production，staging 仅供本地调试，可删除`（SDK 源码支持 staging 但生产环境会忽略，不阻断）
- [ ] `production.actId` 非占位符 `__ACT_ID__`（若角色绑定/任务弹窗/回流任务已选中）
- [ ] `production.appKey` 非占位符 `__APP_KEY__` 且非空
- [ ] `production.frontId` 若存在，非占位符 `__FRONT_ID__`

### 容器元素校验

> evoke 的 `container` 参数接受任意 CSS 选择器，不强制固定 ID。审查时从 evoke 调用中提取 container 选择器，检查该选择器对应的 DOM 元素在页面 HTML 中存在。

- [ ] 若某页面引用的 JS 中含 `DsActSdk.Role.evoke(`，提取其 `container` 参数值，该页面 HTML 中存在对应 DOM 元素 → 缺失即**阻断**（按页面粒度检查，非每个页面都需要）
- [ ] 若某页面引用的 JS 中含 `DsActSdk.TaskModule.evoke(`，提取其 `container` 参数值，该页面 HTML 中存在对应 DOM 元素 → 缺失即**阻断**（按页面粒度检查，非每个页面都需要）
- [ ] 若某页面引用的 JS 中含 `DsActSdk.CpsUniversalBar.evoke(`，提取其 `container` 参数值，该页面 HTML 中存在对应 DOM 元素 → 缺失即**阻断**（按页面粒度检查，非每个页面都需要）

### frontId 配置校验

- [ ] 若代码中含 `DsActSdk.CpsUniversalBar.evoke(`，`DsActSdk.configure()` 中 `frontId` 已配置且非占位符 → 缺失即**阻断**（CPS 底部栏依赖 frontConfig 拉取后台配置）

### HTML 加载顺序校验

- [ ] 遍历所有含 DS Marker 的 HTML 文件，`ds-act-sdk.min.css` 和 `ds-act-sdk.min.js` 的 `<link>` / `<script>` 标签存在于需要 ds-act-sdk 的页面中 → 缺失即**阻断**
- [ ] `ds-act-sdk.min.js` 的加载顺序在 `src/ds.js` 之前（SDK 必须先于调用方就位）→ 顺序错误即**阻断**
- [ ] SDK 的 `<script src>` 指向 `ds.res.netease.com/online/pkg/ds-act-sdk/` 域名（需与 `ds-act-sdk.md` 步骤 2 保持一致，禁止自行修改 CDN 地址）
- [ ] **`ds-act-sdk` 版本检查**：当前最新版本为 `0.3.1`。遍历所有含 DS Marker 的 HTML 文件中的 CDN 地址，任一文件版本低于 `0.3.1`，输出提示引导升级：`⚠️ ds-act-sdk 当前版本为 x.x.x，最新版本为 0.3.1，建议升级：将 CDN 地址中的版本号替换为 0.3.1`

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

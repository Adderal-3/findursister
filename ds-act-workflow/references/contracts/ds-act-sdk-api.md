# ds-act-sdk API 文档

> **以代码为准**（`~/ds-act/ds-act-sdk/src`）。官方 docs/components/ 下文档部分已过时（如 task-checker.md 描述的 `useTaskChecker` hook 不存在，实际是 `TaskChecker` 类）。
>
> UMD 引用（推荐）：`https://ds.res.netease.com/online/pkg/ds-act-sdk/0.3.1/ds-act-sdk.min.js`
> 全局变量：`window.DsActSdk`

---

## 一、核心机制

### 1.1 自动启动流程

```
configure({ production: { actId, appKey, frontId } })   ← 仅写配置到内存，不挂载任何东西
        ↓
DsActProvider 挂载（两条路径）：
  ① 业务方声明式 <DsActProvider> 包裹
  ② 任意 UI 组件 .evoke() → mountComponent → ensureRoot → createRoot(<DsActProvider>)
        ↓
  <LoginBoot/> 挂载
        ↓ useEffect[]（挂载时一次）
  onInitGodlikeInfo()                    ← 站内：ds.ready → checkLogined → getMyInfo → getGodlikeInfo
  useLogin()                             ← 站外：dsLogin.hasLoggedIn()
        ↓
  isLoginLoading: true → false
        ↓ useEffect[actId, isLoginLoading]
  fetchActInfo(actId) → setActInfoState  ← 自动拉取活动信息写入 store
        ↓
  <FrontConfigBoot/>                     ← 若有 frontId，非阻塞拉取前端配置
  fetchActFrontConfig(frontId) → setFrontConfigState + fan-out squareId
```

### 1.2 evoke 与 Provider 的关系（关键）

`evoke/manager.ts` 是全局单例 Provider 管理器：

- 首次 `evoke()` → `ensureRoot()` 创建隐藏 div `#__ds-act-sdk-root__` → `createRoot` → `render(<DsActProvider>{portals}</DsActProvider>)`
- 各 `evoke` 调用通过 `createPortal` 将组件渲染到用户指定容器
- **所有 evoke 共用同一个 `dsActStore`，状态天然同步**
- `DsActProvider` 只挂载一次，`LoginBoot` 只执行一次

**五个 UI 组件的 `.evoke` 都走 `mountComponent` → 挂 Provider：** Role / TaskList / TaskModule / CpsUniversalBar / CpsDownloadModal

**不挂 Provider 的 API：** `evokeRoleSelection()` / `TaskChecker`（类）/ `actPreCheck()` / `preBindRoleCheck()` / `preCheck()` / `showCpsDownloadModal()` / 所有 services 函数

> 注：`showCpsDownloadModal()` 是命令式方法，本身不触发 Provider 挂载（挂载靠 `CpsDownloadModal.evoke`，该方法只依赖已挂载的宿主）。未先 `evoke` 直接调用 → `console.error` 且不弹窗。

### 1.3 触发矩阵

| 调用 | 挂 Provider？ | LoginBoot 跑？ | actInfo 写入 store？ |
|---|---|---|---|
| `configure()` | ❌ | ❌ | ❌ |
| `Role.evoke()` | ✅ | ✅ | ✅ |
| `TaskList.evoke()` | ✅ | ✅ | ✅ |
| `TaskModule.evoke()` | ✅ | ✅ | ✅ |
| `CpsUniversalBar.evoke()` | ✅ | ✅ | ✅ |
| `CpsDownloadModal.evoke()` | ✅ | ✅ | ✅ |
| `evokeRoleSelection()` | ❌ | ❌ | ❌（依赖 store 已有 actInfo） |
| `new TaskChecker()` | ❌ | ❌ | ❌（私有缓存，不写 store） |
| `actPreCheck()` 等 | ❌ | ❌ | ❌（读 store） |

> **陷阱：** 纯函数 `evokeRoleSelection()` 依赖 `dsActStore.get(actInfoState).appKey`，若此前无 UI evoke，store 里 actInfo 为空，绑角失败。

---

## 二、配置 API

### configure(cfg) — 全局配置入口

**源码：** `src/core/configure.ts:65`

```typescript
function configure(cfg: DsActConfig): void
```

**入参 `DsActConfig`：**

```typescript
interface DsActConfig {
  staging?: DsActEnvConfig;      // 测试环境配置
  production?: DsActEnvConfig;   // 正式环境配置
  // 以下为不区分环境的通用配置
  actId?: string;
  appKey?: string;
  frontId?: string;
  env?: 'development' | 'staging' | 'production';
}

interface DsActEnvConfig {
  actId?: string;
  appKey?: string;
  frontId?: string;
  env?: DsActEnv;
}
```

**行为：**
- 环境选择：优先 `cfg.env`，否则 `process.env.UMI_APP_DEPLOY_ENV`，默认 `staging`
- 选中环境后取对应 `staging`/`production` 配置合并
- 顶层 `actId`/`appKey`/`frontId` 在有值时覆盖
- **合并语义**：`env` 字段强制覆盖（`cfg.env || detectEnvFromHostname()`）；`actId`/`appKey`/`frontId` 顶层字段仅在显式传值时才覆盖环境配置中的对应字段

**示例：**

```javascript
// 环境感知（推荐）
DsActSdk.configure({
  staging: { actId: 'test-xxx', appKey: 'u5', frontId: 'yyy' },
  production: { actId: 'prod-yyy', appKey: 'u5', frontId: 'zzz' },
});

// 通用（不区分环境）
DsActSdk.configure({
  production: { actId: '6954c5d472bbb96d77fe687c', appKey: 'u5', frontId: 'yyy' },
});
```

### getConfig() — 读取当前配置

**源码：** `src/core/configure.ts:92`

```typescript
function getConfig(): Readonly<ResolvedConfig>
// Returns: { env, actId?, appKey?, frontId? }
```

### isProdEnv() — 是否生产环境

**源码：** `src/core/configure.ts:97`

```typescript
function isProdEnv(): boolean
```

---

## 三、Provider

### DsActProvider — 一键装配

**源码：** `src/provider/DsActProvider.tsx:152`

```typescript
interface DsActProviderProps {
  actId?: string;       // 活动 ID（也可通过 configure 注入）
  appKey?: string;      // 游戏 appKey
  frontId?: string;     // 前端配置 ID
  children?: ReactNode;
}
```

**职责：**
1. 提供 jotai `<Provider store={dsActStore}>`
2. 将 actId/appKey 写入 atoms（props 或 configure 来源）
3. `LoginBoot`：自动初始化站内/站外登录态，登录后自动 `fetchActInfo`
4. `FrontConfigBoot`：若有 frontId，非阻塞拉取前端配置写入 `frontConfigState`，fan-out `squareId`
5. render 阶段同步 `initUniversalLogin()`（站外登录组件）

**使用：** 通常不需要手动声明，`evoke()` 内部自动挂载。React 宿主可声明式包裹。

---

## 四、UI 组件 API

> 四个 UI 组件均有 `.evoke()` 命令式挂载，内部走 `mountComponent` → 自带 DsActProvider。
> 返回值统一为 `{ unmount: () => void }`。

### 4.1 Role — 角色选择入口

**源码：** `src/modules/role/index.tsx`

**`Role.evoke(opts)` 签名：**

```typescript
interface RoleEvokeOpts extends RoleProps {
  container: string | HTMLElement;  // ✅ 必填，挂载容器
  actId?: string;                   // 首次写入，不覆盖已有
  appKey?: string;                  // 首次写入，不覆盖已有
}

interface RoleProps {
  changeIcon?: string;              // 切换角色图标 URL，默认 CDN
  arrowIcon?: string;               // 未绑角色箭头图标 URL，默认 CDN
  onClick?: () => void;             // 点击回调（供埋点）
  onGoToGodlike?: (url?: string) => void;  // 非大神端跳转
  placeholder?: string;             // 未绑角色占位文案，默认 "请选择角色"
}

// Returns: { unmount: () => void }
```

**行为：**
- 展示当前已绑角色（图标+昵称+切换箭头）或占位文案
- 点击 → `onActPreCheck(handleBindRole)` → 未绑角时 `handleBindRole()` → `evokeRoleSelection()`
- 已绑角色且 `actInfo.switchBindingRole === true` 时显示切换入口
- `actInfo.appKey` 为空时渲染空 div

**示例：**

```javascript
const { unmount } = DsActSdk.Role.evoke({
  container: '#role-root',
  placeholder: '点击选择角色',
});
```

### 4.2 TaskList — 任务列表

**源码：** `src/modules/task/TaskList.tsx`

**`TaskList.evoke(opts)` 签名：**

```typescript
interface TaskListEvokeOpts extends Omit<TaskListProps, 'emptyFallback'> {
  container: string | HTMLElement;  // ✅ 必填
  actId?: string;
  appKey?: string;
  // squareId 不通过 evoke 传入，由 FrontConfigBoot 从 frontConfig 自动注入
  emptyFallback?: string;           // evoke 场景传字符串
}

interface TaskListProps {
  taskOptions?: UseUserTaskOptions;
  onGoToGodlike?: (url?: string) => void;
  onTaskCompleted?: (type: 'auto-sign' | 'share-task' | 'operate' | 'prize') => void;
  emptyFallback?: React.ReactNode;
  className?: string;
}

// Returns: { unmount: () => void }
```

**行为：**
- 挂载后自动拉取全量任务列表（`fetchAllTaskList`）
- 登录后自动执行签到任务（asType=1），完成触发 `onTaskCompleted('auto-sign')`
- 检测分享完成标记时自动执行分享补打（asType=2），触发 `onTaskCompleted('share-task')`
- 活动已结束时不执行自动签到和补打

**示例：**

```javascript
const { unmount } = DsActSdk.TaskList.evoke({
  container: '#task-list-root',
  emptyFallback: '暂无任务数据',
  onTaskCompleted: (type) => {
    if (type === 'auto-sign') refreshRemainCount();
  },
});
```

### 4.3 TaskModule — 任务半屏弹窗

**源码：** `src/modules/task-module/TaskModule.tsx`

**`TaskModule.evoke(opts)` 签名：**

```typescript
interface TaskModuleEvokeOpts extends Omit<TaskModuleProps, 'emptyFallback'> {
  container: string | HTMLElement;  // ✅ 必填
  actId?: string;
  appKey?: string;
  // squareId 不通过 evoke 传入，由 FrontConfigBoot 从 frontConfig 自动注入
  emptyFallback?: string;
}

interface TaskModuleProps {
  title?: string;                   // 弹窗标题，默认 "全部任务"
  showClose?: boolean;              // 显示关闭按钮，默认 true
  showRole?: boolean;               // 弹窗顶部展示 Role 组件，默认 false
  roleProps?: Omit<RoleProps, 'onGoToGodlike'>;  // 传透给 Role
  taskOptions?: UseUserTaskOptions;
  onGoToGodlike?: (url?: string) => void;
  onTaskCompleted?: (type: 'auto-sign' | 'share-task' | 'operate' | 'prize') => void;
  emptyFallback?: React.ReactNode;
  className?: string;
}

// Returns: { unmount: () => void }
```

**显隐控制（非受控）：**

```javascript
// 打开弹窗
DsActSdk.dsActStore.set(DsActSdk.taskListPopupState, true);
// 关闭弹窗
DsActSdk.dsActStore.set(DsActSdk.taskListPopupState, false);
```

**行为：**
- `GlPopup` + `TaskList` 封装的半屏弹窗
- 显隐通过 `taskListPopupState` atom 管理，不通过 props
- `showRole: true` 时弹窗顶部展示 Role 组件（角色选择入口）
- 内部复用 TaskList，任务拉取/签到/分享补打逻辑由 TaskList 处理

**示例：**

```javascript
// 挂载
DsActSdk.TaskModule.evoke({
  container: '#ds-task-root',
  title: '全部任务',
  showRole: true,
});

// 按钮点击打开弹窗
document.getElementById('task-btn').addEventListener('click', () => {
  DsActSdk.dsActStore.set(DsActSdk.taskListPopupState, true);
});
```

### 4.4 CpsUniversalBar — CPS 通用底部栏

**源码：** `src/modules/cps-universal-bar/index.tsx`

**`CpsUniversalBar.evoke(opts)` 签名：**

```typescript
interface CpsUniversalBarEvokeOpts {
  container: string | HTMLElement;  // ✅ 必填
  actId?: string;                   // 首次写入，不覆盖
  appKey?: string;                  // 首次写入，不覆盖
}

// Returns: { unmount: () => void }
```

**行为：**
- 所有配置通过 `frontConfig.cpsUniversalBarConfig.ext` 注入（后台配置）
- SDK 自动注入 `loginedUser.uid`（从 `myGodlikeInfoState`）和 `onLogin`（站内 `ds.openLoginPage`，站外 `universal-login`）
- 自动注入 CSS 变量 `--cps-bar-bottom`，卸载时清除
- `appKey` 为空时 `return null` 不渲染
- 内置关闭按钮，点击后隐藏并清除 CSS 变量

**后台配置字段（frontConfig.cpsUniversalBarConfig.ext）：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `appKey` | string | 游戏代号，为空不渲染 |
| `icon` | string | 自定义图标 |
| `title` | string | 自定义标题 |
| `zIndex` | number | 层级，默认 900 |
| `menu` | `{ text?, list: {text,link}[] }` | 中间菜单，最多 4 项 |
| `linkButton` | `{ text, link, icon? }` | 跳转按钮 |
| `appointDownloadButton` | `{ type:'link', text, link } \| { type:'appointDownload' }` | 右侧按钮 |
| `downloadConfig` | `{ link?, iosLink?, androidLink? }` | 下载链接 |
| `bookStatusRefreshNum` | number | 预约状态刷新触发值 |
| `onBookSuccessed` | () => void | 预约成功回调 |
| `hideAfterInstalled` | boolean | 已安装后隐藏（仅 Android） |

**页面需添加底部预留：**

```css
body { padding-bottom: var(--cps-bar-bottom, 0px); }
```

**示例：**

```javascript
DsActSdk.CpsUniversalBar.evoke({
  container: '#ds-cps-bar-root',
});
```

---

### 4.5 CpsDownloadModal — CPS 下载引导弹窗

**源码：** `src/modules/cps-download-modal/index.tsx`

**`CpsDownloadModal.evoke(opts)` 签名：**

```typescript
interface CpsDownloadModalEvokeOpts {
  container: string | HTMLElement;  // ✅ 必填（宿主 return null，挂隐藏节点）
  actId?: string;                   // 首次写入，不覆盖
  appKey?: string;                  // 首次写入，不覆盖
}

// Returns: { unmount: () => void }

// 零参命令式入口（挂宿主后调起弹窗，站内四步/站外两步自动分发）：
function showCpsDownloadModal(): void;
```

**行为：**
- 宿主组件 `return null`，仅作为 `usePreCpsDownload` 的运行宿主；`evoke` 挂宿主 + 自带 DsActProvider（自动登录态 + frontConfig 拉取）
- `showCpsDownloadModal()` **零参**，内部按 `isGodlike()` 分发：站内四步走 / 站外两步走，调用方无需选环境
- 与任务面板（TaskModule）**完全独立**，不依赖 `taskListPopupState`
- 所有展示配置来自 `frontConfig.cpsModalConfig.ext`
- `isWydsCpsUser` 由 SDK 自动计算注入（仅 Android 大神端）
- iOS 不支持 CPS，底层 Toast「暂不支持ios设置」；业务应在调起前判断 `ds.isIOS` 短路走后续流程
- 站外需 `cpsCanDownloadOutside = true`，否则 Toast 提示不弹窗；社交内置浏览器走 `GlBrowserGuid()` 引导系统浏览器
- 未先 `evoke` 挂宿主直接调 `showCpsDownloadModal()` → `console.error` 且不弹窗

**后台配置字段（frontConfig.cpsModalConfig.ext）：**

| 字段 | 类型 | 说明 |
|---|---|---|
| `icon` | string | 游戏图标 |
| `name` | string | 游戏名称 |
| `desc` | string | 描述文案 |
| `cpsUrl` | string | CPS 下载链接 |
| `packageName` | string | 包名 |
| `cpsCanDownloadOutside` | boolean | 是否允许站外下载 |
| `showGuide` | boolean | 是否展示「引导用户前往设置」UI，默认 `false` |

**示例：**

```javascript
// 页面加载时挂宿主（只调一次）
DsActSdk.CpsDownloadModal.evoke({
  container: '#ds-cps-download-modal-root',
});

// 业务时机零参调起（如抽奖后、点击下载）
DsActSdk.CpsDownloadModal.showCpsDownloadModal();
```

---

## 五、纯逻辑 API

### 5.1 TaskChecker — 回流任务检测类

**源码：** `src/core/TaskChecker.ts:104`

> 与 jotai store **完全隔离**，自己维护 actInfo 私有缓存，可脱离 Provider 独立使用。

**构造：**

```typescript
new TaskChecker(actId: string, asId: string)
```

**方法：**

| 方法 | 类型 | 说明 |
|---|---|---|
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

interface TaskPrizeResult {
  winPrizeList?: PrizeItem[];
  grantPrizeResultList?: GrantPrizeResultItem[];
  missedPrizeList?: PrizeType[];
  grantEmptyPrizeInfos?: any[];
}
```

**错误码：**

| code | 来源 | 含义 |
|---|---|---|
| 200 | 领奖 | 领奖成功 |
| -1 | 领奖 | 任务未完成 / 任务不存在（taskList 为空） |
| -2 | 领奖 | 奖励已领取 |
| -999 | 领奖 | 网络或接口异常 |
| 801 | 预检 | 非大神端（需在大神 APP 内） |
| 802 | 预检 | 未登录 |
| 803 | 预检 | 活动未开始 / 已结束 |
| 805 | 预检 | 未绑角色 |

> `claim()` 内部先调 `actPreCheck()` 预检，预检失败时返回预检错误码（801/802/803/805）；预检通过后另有领奖错误码（-1/-2/-999）。

**示例：**

```javascript
var tc = new DsActSdk.TaskChecker(actId, 'task-login-return-01');
var matched = await tc.isMatched();
if (!matched) return;

await tc.query();
if (!tc.isCompleted()) {
  // 引导完成任务
} else if (tc.isClaimable()) {
  var result = await tc.claim();
  if (result.code === 200) {
    // 领奖成功
  }
}
```

### 5.2 evokeRoleSelection — 唤起选角流程

**源码：** `src/services/role-binding.ts:134`

```typescript
async function evokeRoleSelection(opts?: {
  onBound?: () => void;  // 绑定成功回调
}): Promise<void>
```

**行为：** `fetchRoleList` → `RoleBindPopup.evoke`（选角弹窗）→ `bindDsActRole` → `refreshActInfo`

**依赖：** 直接读写 `dsActStore`，需要 `actInfoState.appKey` 已就位（即 Provider 已挂载或手动 fetchActInfo 已写入 store）

**示例：**

```javascript
// ⚠️ 需确保 store 里 actInfo 已就位（先有 UI evoke 或 Provider 挂载）
DsActSdk.evokeRoleSelection({
  onBound: () => console.log('绑角成功'),
});
```

### 5.3 预检函数

**源码：** `src/core/precheck.ts`

| 函数 | 签名 | 说明 |
|---|---|---|
| `actPreCheck` | `(cb?, isPreActEnd=true?, onGoToGodlike?) → Promise<PrecheckResult>` | 完整预检：环境/登录/活动起止/角色绑定。未绑角时触发 cb |
| `preBindRoleCheck` | `(cb?, onGoToGodlike?) → Promise<PrecheckResult>` | 仅检查环境/登录/角色绑定，不检查活动起止 |
| `preCheck` | `(onGoToGodlike?) → Promise<PrecheckResult>` | 仅检查环境/登录（严格大神端，不接受站外） |

```typescript
interface PrecheckResult {
  code: number;  // 200 通过
  msg: string;
}
```

**依赖：** 读 `dsActStore` 的 `isLoginState`/`actInfoState`，未绑角时调 `evokeRoleSelection`

---

## 六、Hooks API

> 所有 hooks 需在 `DsActProvider` 内使用（依赖 jotai Provider）。

### useGodlike(options?) — 大神端身份/预检

**源码：** `src/hooks/useGodlike.ts:31`

```typescript
interface UseGodlikeOptions {
  onGoToGodlike?: (url?: string) => void;
}

// Returns: {
//   onInitGodlikeInfo,
//   onActPreCheck, onPreBindRoleCheck, onPreCheck
// }
// 注：isLogin / myGodlikeInfo 不返回，需 useAtomValue(isLoginState) / useAtomValue(myGodlikeInfoState) 自行读取
```

### useActInfo() — 活动信息/角色绑定

**源码：** `src/hooks/useActInfo.ts:29`

```typescript
// Returns: {
//   getActInfo, bindDsActRole, handleBindRole, onLoginOut
// }
// 注：actInfo / actRoleInfo 不返回，需 useAtomValue(actInfoState) / useAtomValue(actRoleInfoState) 自行读取
```

- `handleBindRole(cb?)` → 内部调 `evokeRoleSelection({ onBound: cb })`

### useLogin(options?) — 站外登录态

**源码：** `src/hooks/useLogin.ts:31`

```typescript
interface UseLoginOptions {
  onLoginSuccess?: () => void;  // 默认 location.reload
  onLoginFail?: () => void;
}

// Returns: { isLogin }
```

### useUserTask(options?) — 任务操作

**源码：** `src/hooks/useUserTask.ts:36`

```typescript
interface UseUserTaskOptions {
  upGradePopupConfig?: any;
}

// Returns: { fetchAllTaskList, getTaskPrize, onOperateTask, onComplateTaskByType, onComplateMuiltTasks, getTaskInfoPrize }
// 注：allTaskList 不返回，需 useAtomValue(allTaskListState) 自行读取
```

- `gameInfo`（icon/name/desc/packageName）从 `frontConfigState.gameInfo` 读取

---

## 七、Services API

> 纯接口封装，不依赖 React。站内/站外自动走不同 axios 实例。

**源码：** `src/services/act.ts`

| 函数 | 签名 | 接口 |
|---|---|---|
| `fetchActInfo(actId)` | `→ Promise<ActInfoResult>` | 站内 `/v1/act/module/common/actInfo`，站外 `/v1/act-web/module/common/actInfo` |
| `fetchActFrontConfig(id)` | `→ Promise<FrontConfigResult>` | `/v1/act/pageConf/commonAppConfig` |
| `bindActRole(params)` | `→ Promise<BindRoleResult>` | 站内 `/v1/act/module/common/bindRole`，站外 `/v1/act-web/...` |
| `fetchGameRoleList(appKey, actId)` | `→ Promise<ApiResult>` | `/v1/act-web/module/common/roleListByUrsV2` |
| `fetchBindRoleList()` | `→ Promise<ApiResult>` | `/v1/web/role-list-query/getBindList` |

### 自定义接口请求：actDsAxios / actWebAxios

**直接对接后端接口时**（活动自己的抽奖、排行榜、自定义任务等接口，SDK 未封装），用 SDK 透传的 `window.DsActSdk.actDsAxios`（站内）/ `actWebAxios`（站外）发请求：**接口只写相对路径即可，请求域名（baseURL）默认固定走正式域名，无需自己填域名、也无需询问用户选域名**；签名头和错误提示也已内置。

> 📖 **完整用法**（站内默认带签名、站外请求、动态选实例）见 `{skill_dir}/references/capabilities/ds-act-sdk/ds-act-sdk-axios.md`（对应 SDK 的 `examples/html/axios.html` 演示页）。仅当接口只发了测试、还没发正式（等 QA）时才临时改域名，属特殊场景。

---

## 八、Store & Atoms

### dsActStore — 全局 jotai store 单例

**源码：** `src/core/store.ts:10`

```typescript
const dsActStore = createStore();

// 读取：dsActStore.get(atom)
// 写入：dsActStore.set(atom, value)
```

### Atoms 清单

**源码：** `src/core/atoms.ts`

| Atom | 类型 | 说明 |
|---|---|---|
| `actIdState` | `string \| undefined` | 活动 ID |
| `appKeyState` | `string \| undefined` | 游戏 appKey |
| `squareIdState` | `string \| undefined` | 圈子 ID |
| `deviceFingerprintState` | `string \| undefined` | 设备指纹 |
| `deviceUdidState` | `string \| undefined` | 设备 UDID |
| `isLoginState` | `boolean` | 登录态 |
| `isLoginLoadingState` | `boolean` | 登录加载中（初始 true） |
| `myGodlikeInfoState` | `GodlikeUserInfo \| undefined` | 大神用户信息 |
| `actInfoState` | `ActInfoType` | 活动信息（初始 `{}`） |
| `actInfoLoadingState` | `boolean` | 活动信息加载中 |
| `actRoleInfoState` | `ActRoleInfoPropsType \| undefined` | 已绑角色信息 |
| `isWydsCpsUserState` | `boolean` | 是否 CPS 用户 |
| `gameRoleListState` | `any[] \| null` | 角色列表 |
| `allTaskListState` | `TaskItemInfoType[] \| null` | 全量任务列表 |
| `isFinishShareState` | `boolean` | 一般性分享完成 |
| `isFinishTaskShareState` | `boolean` | 分享类任务完成 |
| `upGradePopupConfigState` | `any` | 升级弹窗配置 |
| `taskListPopupState` | `boolean` | 任务弹窗显隐 |
| `taskInfoLoadingState` | `boolean` | 任务模块加载态 |
| `taskModuleListAtom` | `ActModulePropsType[]` | 衍生：asType===4 的任务模块 |
| `frontConfigState` | `SetConfigType` | 前端配置 |
| `currencyInfoState` | `CurrencyInfo \| undefined` | 货币余额（跨模块共享，积分抽奖/商城等可复用） |
| `luckydrawMapState` | `Record<string, LuckydrawInfo>` | Map<asId, 抽奖信息> |
| `luckydrawModuleAtom` | `ActModulePropsType \| null` | 派生：抽奖模块（从 `actInfoState.moduleList` 过滤 `asType===2`，仅支持单模块——0 个或多个返回 `null`） |
| `luckydrawInfoAtom` | `LuckydrawInfo \| undefined` | 派生：当前抽奖信息（从 map 按 module.asId 取） |

---

## 九、核心类型定义

**源码：** `src/types/act.ts`

### ActInfoType — 活动信息

```typescript
interface ActInfoType {
  actAccount: string;
  actId: string;
  uid: string;
  currentTime: number;
  startTime: number;
  endTime: number;
  hasNewPrize: boolean;
  appKey: string;
  minRoleLevel: number;
  actEnded: boolean;
  switchBindingRole?: boolean;       // 是否支持换绑角色
  bindRoleBelongUrs?: boolean;       // 绑定角色是否限当前账号
  moduleList: ActModulePropsType[];  // 活动模块列表
  actRoleInfo?: ActRoleInfoPropsType; // 已绑角色
  canOffsiteJoin?: boolean;          // 是否允许站外参与
}
```

### ActRoleInfoPropsType — 已绑角色

```typescript
interface ActRoleInfoPropsType {
  appKey: string;
  nick: string;
  roleId: string;
  icon: string;
  roleLevel: string | number;
  server: string | number;
  serverName: string;
}
```

### ActModulePropsType — 活动模块

```typescript
interface ActModulePropsType {
  actId: string;
  asId: string;
  asType: number;          // 4 = 回流任务
  title: string;
  subTitle: string;
  startTime: number;
  endTime: number;
  needBdUsers: boolean;
  minRoleLevel: number;
  appKey: string;
  drawType?: 3 | 4 | 6 | 7;
  playType?: string;
}
```

### TaskItemInfoType — 任务详情

```typescript
interface TaskItemInfoType {
  asId: string;
  asType: number;
  title: string;
  subTitle: string;
  completed: boolean;       // 是否完成
  alreadyGot: boolean;      // 是否已领奖
  hasQualification: boolean;
  prizeList: ModulePrizeType[];
  doTaskType: 1 | 2;        // 1=跳转 2=自动
  doTaskUrl?: string;
  taskType: number;
  taskValue: number;
  continueDays: number;
  continueType: 'TOTAL' | 'CONTINUE';
  prizeApplyType: 'SERVER' | 'USER' | 'SEMI_AUTO';
  cpsDownloadUrl?: string;
  cpsTaskCheckType: 'FINGERPRINT' | 'BIND_ROLE';
  nonAppCanJoin: boolean;
  // ...更多字段见源码
}
```

---

## 十、参考资料

- SDK 源码：`~/ds-act/ds-act-sdk/src/`
- UMD 在线地址：`https://ds.res.netease.com/online/pkg/ds-act-sdk/0.3.1/ds-act-sdk.min.js`
- 小游戏接入前端配置说明：`https://docs.popo.netease.com/team/pc/dsfekb/pageDetail/f16bf2ba8be5406993a2093bfd91b57e`
- CPS 通用悬浮栏组件文档：`https://fe.docs-opd.nie.netease.com/page/ds-act-business-components/cps-universal-bar`
- gitlab-pages：`https://fe.docs-opd.nie.netease.com/page/ds-act-sdk`

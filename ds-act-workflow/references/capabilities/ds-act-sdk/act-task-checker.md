# 子模块 C：回流任务检测

> 本文件由 `ds-act-sdk.md` 步骤 7 加载执行，依赖骨架代码中已完成的 SDK 注入和 `configure()`。
>
> API 详情见 `{skill_dir}/references/contracts/ds-act-sdk-api.md` 第 5.1 节。

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

> **⚠️ 生成规则（必须遵守）：**
> - 只生成 `new TaskChecker` + 调用链骨架（注释形式）
> - **禁止封装成函数**——不要用 `function checkReturnTask() {}` 或任何包装函数包裹调用链，这是旧版废弃写法。直接在 DS:ACT-SDK 块中写裸调用链，由业务方在需要的地方自行调用 `tc.isMatched()` 等方法
> - **禁止询问触发模式**（如"玩家死亡时触发？登录后触发？"）——调用时机完全由业务方决定
> - `isMatched()` / `query()` / `claim()` 是 async，`isCompleted()` / `isClaimable()` / `getStatus()` / `getTask()` 是 sync
> - `claim()` 内部会调 `actPreCheck()` 预检（环境/登录/活动起止/角色绑定），预检失败直接返回错误码不领奖

---

## C.4 填充占位符

| 占位符 | 替换为 |
|--------|--------|
| `__ACT_ID__` | 骨架代码中已填充的 actId（直接复用同一值） |
| `__AS_ID__` | 实际任务 ID 字符串，如 `'6a0455ecf20d41361aa734f3'` |

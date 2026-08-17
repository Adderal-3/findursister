# API 参考：mini-game-data-sdk

> **定位：** 纯 API 字典。日常接入请走 8 步流程（`00-intake.md` 起），遇到具体 API 参数疑问时来查此文件。

---

## 获取 miniGameId

每个游戏在测试/正式环境各有一个 `miniGameId`，SDK 通过内部 `IS_PRODUCTION` 标志自动选择。

- **测试环境后台**：<https://god-cms-test.gameyw.netease.com/cms/>
- **正式环境后台**：<https://god-cms.gameyw.netease.com/cms/>

路径：一级导航 → **活动** → 二级 → **小游戏管理** → 找到对应游戏 → 复制游戏 ID

---

## 获取 billboardId

排行榜同样区分测试/正式，在同一后台的「榜单配置」中分别创建：

路径：**活动** → **小游戏管理** → 选择游戏 → **数值管理** → **榜单配置** → 复制榜单 ID

---

## 引入 SDK 资源

遍历选中的 HTML 文件（候选为含 DS Marker 的文件），在每个文件的 `<head>` 中添加：

```html
<!-- mini-game-data-sdk UMD 包（版本 ≥ 0.2.1） -->
<script src="https://ds.res.netease.com/online/pkg/mini-game-data-sdk/0.2.1/index.js"></script>
```

> **不要引入 `index.css`：** `0.2.0` 起 SDK 不再附带样式表，其 CSS 会污染宿主页面与其他 SDK 的样式。历史项目升级版本时需同步删除 `mini-game-data-sdk/${version}/index.css` 的 `<link>`。

---

## 初始化 setGameId

```javascript
// SDK 内部通过 IS_PRODUCTION 自动选择 devMiniGameId 或 proMiniGameId
const req = MiniGameDataSdk.RequestManager;
req.setGameId({
  devMiniGameId: 'YOUR_DEV_MINI_GAME_ID', // 测试环境 ID
  proMiniGameId: 'YOUR_PRO_MINI_GAME_ID', // 正式环境 ID
});
```

**参数（`GameIdConfig`）：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `devMiniGameId` | string | 测试/开发环境游戏 ID（`IS_PRODUCTION=false` 时生效） |
| `proMiniGameId` | string | 正式环境游戏 ID（`IS_PRODUCTION=true` 时生效） |

> `RequestManager` 是静态类，不需要 `new`。`setGameId` 全局调用一次即可，后续所有接口自动使用。

---

## obfuscatedWriteData — 单条加密写入

适用于只写一个字段的场景（多字段存档推荐用 `obfuscatedBatchWriteData`）。

```javascript
req.obfuscatedWriteData({ recordKey: 'score_total', value: 100 })
  .then(result => {
    console.log('写入成功，版本号：', result.version);
  })
  .catch(err => console.error('写入失败：', err.message));
```

**参数（`WriteDataParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `recordKey` | string | ✅ | 数据键，建议下划线命名如 `score_total` |
| `value` | any | ✅ | 数据值；SDK 内部自动做 XSS 转义；嵌套对象须先 `JSON.stringify` |
| `version` | number | ❌ | 乐观锁版本号；防并发覆写时，先读出 version 再带上 |

**返回值（`WriteDataResult`）：**

| 字段 | 说明 |
|------|------|
| `recordKey` | 写入时的数据键，原样返回 |
| `version` | 当前版本号，每次成功写入后 +1 |
| `updateTime` | 最近写入时间（毫秒时间戳） |

---

## obfuscatedBatchWriteData — 批量加密写入 ⭐ 推荐

存档时用此接口替代逐条 `obfuscatedWriteData`，减少网络请求次数。

```javascript
req.obfuscatedBatchWriteData({
  items: [
    { recordKey: 'bake_num', value: 100 },
    { recordKey: 'prestige_level', value: 3 },
    { recordKey: 'buildings_json', value: '[]' },
  ]
}).then(result => {
  // result: { items: [{ recordKey, success, version?, updateTime?, errorCode?, errorMsg? }] }
  result.items.forEach(item => {
    if (!item.success) console.error('写入失败：', item.recordKey, item.errorMsg);
  });
}).catch(err => console.error('批量写入失败：', err.message));
```

**参数（`BatchWriteDataParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `items` | `WriteDataParams[]` | ✅ | 批量数据项列表，**最多 20 条**；每条 value SDK 自动 XSS 转义 |

**返回值（`BatchWriteDataResult`）：**

`result.items` 数组，每条对应一个 `recordKey` 的写入结果：

| 字段 | 说明 |
|------|------|
| `recordKey` | 数据键 |
| `success` | 是否写入成功 |
| `version` | 当前版本号（仅成功时有值） |
| `updateTime` | 写入时间戳（仅成功时有值） |
| `errorCode` | 错误码（仅失败时有值） |
| `errorMsg` | 错误信息（仅失败时有值） |

---

## batchReadData — 批量读取数据

**读取当前登录用户数据（常规用法）：**

```javascript
req.batchReadData({ keys: ['bake_num', 'prestige_level'] })
  .then(result => {
    result.records.forEach(r => console.log(r.recordKey, '=', r.value));
  })
  .catch(err => console.error('读取失败：', err));
```

**读取指定用户数据（客态读取）：**

```javascript
req.batchReadData({ keys: ['bake_num', 'prestige_level'], queryUid: '目标用户uid' })
  .then(result => {
    result.records.forEach(r => console.log(r.recordKey, '=', r.value));
  })
  .catch(err => console.error('读取失败：', err));
// 注意：所有 key 必须在 CMS 后台开启「客态读取」开关，否则返回：
// { "code": 200100, "errmsg": "key gain_prize_num 不支持客态读取" }
```

**参数（`BatchReadDataParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keys` | string[] | ✅ | 要读取的字段名列表，**最多 50 个** |
| `queryUid` | string | ❌ | 客态读取目标用户 uid；为空或等于当前登录用户时不校验 |

**返回值（`result.records` 数组，每条包含）：**

| 字段 | 说明 |
|------|------|
| `recordKey` | 数据键 |
| `value` | 数据值（类型与写入时一致） |
| `valueType` | 类型描述，如 `"number"`、`"string"` |
| `updateTime` | 最近写入时间（毫秒时间戳） |
| `version` | 当前版本号 |

---

## getBillboardRank — 查询排行榜

SDK 内部根据 `IS_PRODUCTION` 自动选择 `devBillboardId` 或 `proBillboardId`。

```javascript
req.getBillboardRank({
  devBillboardId: 'YOUR_DEV_BILLBOARD_ID',
  proBillboardId: 'YOUR_PRO_BILLBOARD_ID',
  page: 1,
  pageSize: 10,
}).then(result => {
  result.records.forEach(r => {
    console.log(`第${r.rank}名：${r.nick}，分数：${r.num}`);
  });
}).catch(err => console.error('排行榜查询失败：', err));
```

**参数（`GetBillboardRankParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `devBillboardId` | string | ✅ | 测试/开发环境榜单 ID（`IS_PRODUCTION=false` 时使用） |
| `proBillboardId` | string | ✅ | 正式环境榜单 ID（`IS_PRODUCTION=true` 时使用） |
| `page` | number | ❌ | 页码，默认 1 |
| `pageSize` | number | ❌ | 每页条数，默认 20 |

**返回值（`GetBillboardRankResult`）：**

| 字段 | 说明 |
|------|------|
| `page` | 当前页码 |
| `pageSize` | 每页条数 |
| `total` | 榜单总人数 |
| `records` | 本页排名列表（`BillboardRecord[]`） |

`records` 每条（`BillboardRecord`）：

| 字段 | 说明 |
|------|------|
| `rank` | 名次 |
| `uid` | 玩家账号 ID |
| `nick` | 玩家昵称 |
| `icon` | 玩家头像地址 |
| `num` | 得分 |
| `ts` | 上榜时间（毫秒时间戳） |
| `ext` | 扩展字段 |

---

## getUserRank — 查询当前用户排名

```javascript
req.getUserRank({
  devBillboardId: 'YOUR_DEV_BILLBOARD_ID',
  proBillboardId: 'YOUR_PRO_BILLBOARD_ID',
}).then(result => {
  console.log(`你的排名：第 ${result.rank} 名，共 ${result.total} 人`);
}).catch(err => console.error('用户排名查询失败：', err));
```

**参数（`GetUserRankParams`）：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `devBillboardId` | string | ✅ | 测试环境榜单 ID |
| `proBillboardId` | string | ✅ | 正式环境榜单 ID |
| `uid` | string | ❌ | 不传则查当前登录用户 |

**返回值（`GetUserRankResult`）：**

| 字段 | 说明 |
|------|------|
| `billboardId` | 实际使用的榜单 ID（已按环境解析） |
| `rank` | 名次，未上榜时为 0 |
| `uid` | 用户 ID |
| `nick` | 用户昵称 |
| `icon` | 头像地址 |
| `num` | 得分 |
| `total` | 榜单总人数 |
| `ts` | 上榜时间（毫秒时间戳） |

---

## 注意事项

- **SDK 引入顺序**：SDK UMD JS → 业务脚本（0.2.0 起无 index.css，不引入样式表），不能乱
- **setGameId 时机**：任何接口调用之前，只调用一次；传 `{ devMiniGameId, proMiniGameId }` 对象
- **环境自动切换**：SDK 通过 `IS_PRODUCTION` 决定使用 dev 还是 pro 的 ID，业务层不需要判断
- **value 类型**：SDK 内部会做 XSS 转义；嵌套对象须先 `JSON.stringify`，读取后须 `JSON.parse`
- **batchReadData 上限**：单次最多 50 个 key，超出分批请求
- **客态读取**：传 `queryUid` 时，列表中**所有 key** 必须开启客态读取，否则整批请求失败（错误码 200100）。开启方式有两种：
  - **批量导入 JSON 时**：在对应字段条目中加 `"allowGuestRead": true`（推荐，一步到位）
  - **CMS 后台手动开启**：活动 → 小游戏管理 → 对应小游戏 key 配置 → 编辑 → 客态读取开关
- **obfuscatedBatchWriteData 上限**：单次最多 20 条，超出分批请求
- **排行榜分页**：`total` 是总量，翻页递增 `page`
- **code !== 200**：SDK 已内置 Toast，`.catch` 只需处理业务降级逻辑

---

## App webview 调试方法

大神 App webview 里看不到 Console，遇到问题用以下方法排查：

**方法一：挂全局错误捕获**（在 `game-server-storage.js` 顶部临时加，上线前移除）

```javascript
window.__ssErrors = [];
window.addEventListener('error', e => window.__ssErrors.push(e.message));
window.addEventListener('unhandledrejection', e => window.__ssErrors.push(e.reason));
// 在页面某处加调试按钮：alert(JSON.stringify(window.__ssErrors))
```

**方法二：可视化 Log**（在含 DS Marker 的 HTML 文件中加隐藏触发区，上线前移除）

```html
<div id="debug-log" style="display:none; position:fixed; top:0; left:0; right:0;
  background:rgba(0,0,0,0.9); color:#0f0; font-size:11px; padding:8px;
  z-index:99999; max-height:50vh; overflow-y:auto; white-space:pre-wrap;"></div>
<div style="position:fixed;bottom:0;left:0;width:40px;height:40px;z-index:99999;opacity:0"
  onclick="document.getElementById('debug-log').style.display='block'"></div>
```

```javascript
const _log = console.log.bind(console);
console.log = (...a) => { _log(...a); appendDebugLog('LOG', a); };
console.warn = (...a) => { _log(...a); appendDebugLog('WARN', a); };
console.error = (...a) => { _log(...a); appendDebugLog('ERR', a); };
function appendDebugLog(level, args) {
  const el = document.getElementById('debug-log');
  if (!el) return;
  el.textContent += `[${level}] ${args.map(a => JSON.stringify(a)).join(' ')}\n`;
}
```

> 点击页面左下角隐藏区域即可显示 Log 面板。

**常见报错排查：**

| 现象 | 排查方向 |
|------|----------|
| `setGameId` 相关报错 / 401 403 | `setGameId` 未在接口调用前执行，检查初始化顺序 |
| CORS 报错 | 服务未用 HTTPS，确认用 [7] 启动开发环境 |
| value 为 `null` / `undefined` | 检查序列化逻辑和 `DEFAULTS` 兜底 |
| 排行榜返回空 | 检查 `devBillboardId` 是否已替换占位符，CMS 后台是否已注册榜单 |

---

## 待团队回填的未知项

首次接入用户遇到以下问题后，请告知答案，直接编辑此文件沉淀结论：

| # | 问题 | 当前状态 |
|---|------|----------|
| Q1 | 内网测试 App 从哪下载？iOS / Android 分开吗？需要白名单工号吗？ | ❓未知 |
| Q2 | mini-game-data-sdk 怎么区分 test / prod 环境？UA 判定还是 URL 判定？ | ❓未知 |
| Q3 | 写入后 CMS 多久能看到？是否有缓存延迟？ | ❓未知 |
| Q4 | 同时写 N 个 key 的上限？ | ✅ `obfuscatedBatchWriteData` 单次最多 20 条，超出分批循环 |
| Q5 | 测试期如何快速清除自己账号的所有存档？ | ❓未知，CMS 后台是否有清除入口 |
| Q6 | 灰度白名单：上线前能否对特定工号灰度？在哪配置？ | ❓未知，联系 SDK 团队 |


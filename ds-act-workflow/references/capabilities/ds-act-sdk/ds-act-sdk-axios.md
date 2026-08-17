# 自定义接口请求：actDsAxios / actWebAxios

> **场景：** **直接对接后端接口**——活动自己的抽奖、排行榜、自定义任务等接口，SDK 未封装。用这两个预配好的 axios 实例发请求，**无需自己配 baseURL、签名头和错误提示**。
>
> 演示页：`ds-act-sdk/examples/html/axios.html`（四个按钮分别对应下文四种用法）

**来源：** 由 `@opd-fe/ds-act-hooks` 导出，经 `ds-act-sdk` 透传。UMD 环境下挂在 `window.DsActSdk.actDsAxios` / `window.DsActSdk.actWebAxios`。

---

## 一、两个实例的区别

| 实例 | 用途 | baseURL（构建时固化） | 自动携带 |
| --- | --- | --- | --- |
| `actDsAxios` | **站内**（大神 App 内）接口，路径 `/v1/act/**` | 正式 `https://god-act.gameyw.netease.com`，测试 `https://god-act-dev.gameyw.netease.com` | `useGlClientHeader`、statActId、dsRequest 签名 |
| `actWebAxios` | **站外**（浏览器/微信等）接口，路径 `/v1/act-web/**` | 正式 `https://inf-act.ds.163.com`，测试 `https://inf-act-test.ds.163.com` | `withCredentials`、`GL-DeviceId`、`GL-X-XSRF-TOKEN`、`GL-Uid`、`GL-ClientType=60`、POST 自动加 `GL-CheckSum` sha1 签名 |

**两个实例都已内置：**

- ✅ 10s 超时 + 统一网络错误 Toast（4xx/5xx/断网自动提示）
- ✅ 响应拦截已解包——`.post()` resolve 的**直接是接口返回体**（无需再取 `res.data`）
- ✅ baseURL 随构建环境固化，运行时无需判断 dev/prod

---

## 二、接入前的询问与确认

### 2.1 默认走正式域名，接口还在测试阶段才临时覆盖

运营的小游戏**只有正式环境**，`actDsAxios` / `actWebAxios` 的 baseURL 默认就固定指向正式域名（见「一」的表格），**SDK 不会自动切换环境**。

- **常规情况** → 直接用内置正式 baseURL，**不需要询问、不需要任何覆盖**。
- **唯一例外** → **服务端接口只发了测试、还没发正式（等 QA 验证）**：此时正式域名上还没有这个接口，需要**临时把 baseURL 覆盖到测试域名**联调；等接口发布正式后，**移除覆盖代码**即可恢复走正式。

接入前先问用户一句，判断走哪条路：

```text
你要对接的接口，服务端发正式了吗？
  [已发正式] → 直接用（默认正式域名，无需改动）
  [还在测试/等 QA] → 临时覆盖 baseURL 到测试域名（下方「四」），接口发正式后记得删掉覆盖
```

**测试域名**（仅接口未发正式时临时用）：

| 实例 | 测试域名 |
| --- | --- |
| `actDsAxios` | `https://god-act-dev.gameyw.netease.com` |
| `actWebAxios` | `https://inf-act-test.ds.163.com` |

> ⚠️ 覆盖 baseURL 到测试域名只是**联调期临时手段**，**必须在接口发正式后删除**，否则线上小游戏会请求测试接口导致故障。

### 2.2 还需确认一件事：站内还是站外

| 确认项 | 影响 |
| --- | --- |
| 接口是**站内**还是**站外** | 决定用 `actDsAxios`（站内，默认带签名）还是 `actWebAxios`（站外） |

> 💡 签名不用逐个问：**站内默认带签名**（见「三、1」），仅当后端明确说某接口不验签时才去掉。
>
> 💡 站内/站外若不确定，用「三、3」的 `ds.isGodlike()` 动态选实例即可，同样无需询问。

---

## 三、四种用法（对应 axios.html 四个按钮）

### 1. 站内请求（默认带签名）

> ✅ **生成站内接口代码时，默认就写成带签名的形式**（`useGlClientSignature: true` + `JSON.stringify`）。不要写不带签名的版本，除非用户/后端**明确说这个接口不验签**。

站内请求两个要点：

1. 第三参传 `{ useGlClientSignature: true }`，SDK 自动补签名头
2. body 必须 `JSON.stringify(params)` 传字符串——签名基于原始字符串计算，直接传对象会因序列化差异导致验签失败；无入参也要传 `JSON.stringify({})`

```javascript
const { actDsAxios } = window.DsActSdk;

// 默认写法：站内接口一律带签名
async function checkLostRole() {
  const data = await actDsAxios.post(
    '/v1/mini-game/lost-role/check',
    JSON.stringify({}),            // 无入参也传 JSON.stringify({})
    { useGlClientSignature: true } // 默认开启客户端签名
  );
  return data; // 已解包，直接是返回体
}

// 带入参同理
async function drawPrize(actId) {
  const data = await actDsAxios.post(
    '/v1/act/module/myGame/draw',
    JSON.stringify({ actId }),
    { useGlClientSignature: true }
  );
  return data;
}
```

> ⚠️ **例外（少数）：** 只有当后端明确告知某接口不验签时，才去掉 `{ useGlClientSignature: true }` 并直接传对象：`actDsAxios.post(url, { actId })`。默认情况下**不要**这样简化。

### 2. 站外请求

站外（浏览器 / 微信打开）走 `actWebAxios`，默认已带大神请求头，一般无需额外签名参数：

```javascript
const { actWebAxios } = window.DsActSdk;

async function fetchRank(actId) {
  const data = await actWebAxios.post('/v1/act-web/module/myGame/rank', { actId });
  return data;
}
```

### 3. 站内/站外动态选实例

用 SDK 的 `ds.isGodlike()` 判断运行环境，动态选实例：

```javascript
const { actDsAxios, actWebAxios, ds } = window.DsActSdk;

// 注意 ds 是 SDK 导出的命名空间，isGodlike 是函数（带括号调用）
const axiosInstance = ds.isGodlike() ? actDsAxios : actWebAxios;
const url = ds.isGodlike()
  ? '/v1/act/module/myGame/xxx'      // 站内前缀
  : '/v1/act-web/module/myGame/xxx'; // 站外前缀
// 站内/站外路径前缀不同，后端需同时提供两套接口
```

---

## 四、临时覆盖 baseURL 到测试域名（接口未发正式时）

> 仅用于「2.1」说的场景：**服务端接口只发了测试、还没发正式**，需要临时把请求打到测试域名联调。**接口发正式后必须删除覆盖代码。**

这两个实例是标准 axios 实例，baseURL 默认走正式域名（见「一」）。临时改到测试域名有三种方式：

```javascript
const { actDsAxios, actWebAxios } = window.DsActSdk;

// 【方式一 · 推荐】全局改默认——一处集中改，接口发正式后一起删，不易漏
actDsAxios.defaults.baseURL = 'https://god-act-dev.gameyw.netease.com'; // 站内测试域名
actWebAxios.defaults.baseURL = 'https://inf-act-test.ds.163.com';       // 站外测试域名

// 【方式二】单次请求覆盖（只影响本次）
actWebAxios.post(url, data, { baseURL: 'https://inf-act-test.ds.163.com' });

// 【方式三】url 直接写完整地址（http 开头时 axios 忽略 baseURL）
actWebAxios.post('https://inf-act-test.ds.163.com/v1/act-web/xxx', data);
```

> ⚠️ 这是**联调期临时手段**。接口发正式后务必删掉上述覆盖，否则线上小游戏会请求测试接口导致故障。建议把覆盖代码集中写在一处并加注释标记，方便回收。

---

> ⚠️ **不要**自己 `new axios()` 或写死域名请求活动接口——会缺签名头导致鉴权失败。统一走这两个实例。

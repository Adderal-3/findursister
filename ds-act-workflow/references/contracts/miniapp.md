# 契约：小程序接入原理（声明式知识参考）

> 本文件是 inject 能力的**声明式知识参考**，不是操作步骤 SOP。inject 能力文件的"判断规则"段引用本文件。
>
> 合并自旧 `miniapp.md` 与 `miniapp-h5-integration.md`（已迁移删除），去除操作步骤叙述，保留原理性知识。

## 前置条件

所有小程序能力依赖微信 JSSDK（`jweixin-1.6.0.js`，无需权限验证）。环境检测函数 `isWechatMiniProgram()` 仅判 UA（`navigator.userAgent.toLowerCase().includes('miniprogram')`），不判 `window.wx` 可用性——SDK 可用性需另行检查 `typeof window.wx !== 'undefined'`。

## 一、登录与联登

小程序内嵌 H5 的登录有三条路径：

### 1. 手动登录

H5 内触发 `wx.miniProgram.navigateTo({ url: '/pages/login/index' })` 跳转小程序登录页，用户登录后小程序自动返回 H5。页面跳转带来交互影响，需留意。

### 2. URS Cookie 联登

用户登录小程序后打开 H5 时，小程序服务端用 H5 页面链接、大神 token、大神登录签名调用大神服务端接口，接口内部完成 H5 域名合规判断、token 校验、置换 URS Cookie，并将 URS Cookie 设置到 `.163.com` 下。

**H5 职责**：
- 注入 `universal-login` CDN（`2.1.4` 版本，css + umd.js）。已存在 `2.1.4` 则跳过；存在旧版本（如 `/latest/`）则替换（旧版本必须替换，不可跳过）。
- 页面加载后初始化 `Ulogin`，调用 `hasLoggedIn()` 自动读取 URS Cookie 完成登录。

**API 契约**：
- `new Ulogin({ env, loginSuccess, loginFail, loginTypeTips })` — 构造实例。
- `hasLoggedIn()` → `Promise<false | UserInfoType>`。已登录返回 `UserInfoType`（含 `uid`、`roleId` 等），未登录返回 `false`。
- 联登失败时跳转小程序登录页（`wx.miniProgram.navigateTo`）。

### 3. 大神开放平台联登

用户登录小程序后打开 H5 时，小程序服务端调用大神服务端接口，接口内部完成 H5 合规判断、token 校验、置换授权 code，并将授权 code 拼接到 H5 URL 后重定向。

**H5 职责**：读取 URL 上的授权 code，调用相关接口完成授权登录。

## 二、传角与选角

### 1. 传角（Passive）

小程序在跳转 H5 时，向 H5 传递角色信息——链接上携带 `appletSelectRole` 字段，值为 `JSON.stringify(AppletSelectRoleObj)`。

**H5 职责**：
- 向小程序策划提需求将 H5 加入白名单（仅白名单内 H5 跳转时支持传角）。
- 从 URL 读取并 `JSON.parse` 解析 `appletSelectRole` 字段。

### 2. 选角（Active）

H5 内需用户选择角色时，`wx.miniProgram.redirectTo` 重定向到小程序原生选角页（此时 H5 页面销毁）。

**选角页参数**：

```typescript
interface ParsedSearchParams {
  appKey: string       // 游戏代号
  squareId: string     // 游戏圈子ID
  redirectUrl: string  // 选角成功后的回调URL，需 encodeURIComponent
  currentRole?: string // 当前角色，JSON.stringify(AppletSelectRoleObj)
}

interface AppletSelectRoleObj {
  appKey: string;
  icon?: string;
  nick: string;
  server: string | number;
  serverName?: string;
  roleId: string;
  level?: string | number;
  roleLevel?: string | number;
  roleLevelStr?: string;
  roleOccup?: string;
}
```

选角完成后，小程序重定向回 `redirectUrl`，URL 末尾追加 `appletSelectRole` 字段（`${redirectUrl}&appletSelectRole={JSON.stringify(appletSelectRoleObj)}`），H5 按传角方式解析即可。

## 三、自定义分享

小程序内 H5 的页面分享通过 `wx.miniProgram.postMessage` 向小程序发送分享配置。小程序在 `后退`、`组件销毁`、`分享`、`复制链接`时收到消息数组。

**消息结构**：

```javascript
wx.miniProgram.postMessage({
  data: {
    pageId: window.location.pathname,  // 页面唯一标识，去 query/hash
    shareConfig: {
      title: '分享标题',
      imageUrl: '分享图片URL，宽高比 5:4',  // 可传空字符串，使用小程序默认截图
      url: '分享H5页面URL',  // 无需 encode；联登时需配置为 ds.163.com / cbg.163.com / gm.163.com / m.ing.163.com 域名及子域名
    }
  }
})
```

**与 ds.js 的关系**：`[DS:SHARE]` 块的 `initShare()` 小程序分支即调用此 API（见 `ds-js-markers.md`）。`pageId` 取 `window.location.pathname`，`title`/`imageUrl` 取 CONFIG 块的 `SHARE_TITLE`/`SHARE_ICON`。

## 与 inject 能力的关系

inject 能力生成 ds.js 时，`[DS:MINIAPP-DETECT]`、`[DS:JSSDK]`（含 Ulogin 联登分支）、`[DS:SHARE]`（含小程序 postMessage 分支）、`[DS:CLICK-PRECHECK]`（含小程序分支）已内置小程序支持。本文件提供这些分支背后的原理性知识，供 inject 在判断是否需要额外注入（如 universal-login CDN、微信 JSSDK）时参考。

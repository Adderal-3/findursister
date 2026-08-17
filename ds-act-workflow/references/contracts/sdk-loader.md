# 契约：SDK-LOADER 模板 + SEO 标签

> SDK-LOADER 是注入到 HTML `<head>` 的资源加载块，由 inject 能力按本契约生成，audit 能力按本契约校验。
>
> 代码真源：`references/templates/sdk-loader-template.html`（可 lint）。本文件引用其行范围，不内联全部代码。

## 模板结构

SDK-LOADER 模板由两部分组成：**SEO 标签区**（`<head>` 元信息）+ **SDK 加载区**（`[DS:SDK-LOADER:START]` / `[DS:SDK-LOADER:END]` 注释对界定）。

**代码引用**：`references/templates/sdk-loader-template.html`（全文 1-140 行）

### SEO 标签区（1-21 行）

固定元信息标签，inject 时整体注入到目标 HTML 的 `<head>` 开头：

| 行 | 标签 | 说明 |
|----|------|------|
| 1 | `<meta charset="utf-8">` | 字符编码 |
| 2 | viewport | 移动端适配（禁缩放） |
| 3 | X-UA-Compatible | IE 兼容 |
| 4-5 | author / copyright | 网易版权 |
| 6 | keywords | 大神关键词 |
| 7 | description | 大神描述 |
| 8-10 | og:site_name / og:title / og:image | Open Graph |
| 11 | shortcut icon | 大神 favicon |
| 12-14 | preconnect | g.166.net / ok.166.net / img.166.net |
| 15-21 | dns-prefetch | g.166.net / s.166.net / ok.166.net / img.166.net / urswebzj.nosdn.127.net / nie.res.netease.com / cstaticdun.126.net |

### SDK 加载区（22-140 行）

`[DS:SDK-LOADER:START]`（24 行）到 `[DS:SDK-LOADER:END]`（140 行），含 6 个 `<script>` 块：

| 行 | 脚本 | 职责 |
|----|------|------|
| 25-43 | NS 统计 | NetStats 初始化 + pageview + timeOnSessionTracker |
| 44-89 | 错误采集 | `window.error` / `unhandledrejection` 上报 NS（fe_mini_game_error） |
| 90-93 | ds-js-sdk | `ds-js-sdk/1.0.87/ds-js-sdk.min.js`（crossorigin） |
| 94-116 | ds-ulink2 | 非 Godlike UA 时动态加载 ulink2，`onDsUlinkReady` 回调队列 |
| 117-139 | mobile-share | `!{IS_COCOS}` 且非 Godlike UA 时加载 mobile-share，`onMobileShareReady` 回调队列 |

## 占位符

### `{IS_COCOS}`

**位置**：117-139 行的 mobile-share 加载块（`if (!{IS_COCOS} && !/Godlike/i.test(...))`）。

**替换规则**：inject 根据前置扫描的 Cocos 检测结果替换为布尔字面量 `true` / `false`（无引号）。

**语义**：
- `true`（Cocos 工程）：mobile-share 不加载。原因：MobileShare 会间接加载微信 JSSDK，Cocos 引擎检测到 `window.wx` 后误判为微信小游戏环境进入错误分支。
- `false`（非 Cocos）：非 Godlike UA 时加载 mobile-share，供普通浏览器分享使用。

> 与 `ds-js-markers.md` 的 `[DS:CONFIG]` 块中 `{IS_COCOS}` 同源同值，inject 必须保证两处一致。

## SEO 标签去重规则

inject 将 SEO 标签区注入目标 HTML `<head>` 时，按标签类型去重（已存在则跳过，不重复注入）：

| 标签类型 | 去重键 | 规则 |
|----------|--------|------|
| `<meta name="...">` | name 属性 | 已存在同名 meta 则跳过 |
| `<meta property="...">` | property 属性 | 已存在同 property 则跳过 |
| `<link rel="...">` | rel + href | 已存在相同 rel 且相同 href 则跳过 |
| `<link rel="preconnect" href="...">` | href | 已存在相同 href 则跳过 |
| `<link rel="dns-prefetch" href="...">` | href | 已存在相同 href 则跳过 |

> 去重以目标 HTML 已有标签为准——inject 不覆盖用户已有的 SEO 标签，仅补齐缺失项。

## SDK 加载区去重规则

`[DS:SDK-LOADER:START]` / `[DS:SDK-LOADER:END]` 注释对作为幂等标志：

- 目标 HTML 中已存在该注释对 → 跳过整个 SDK 加载区注入（幂等）。
- 不存在 → 整体注入。

单个 `<script src="...">`（如 ds-js-sdk、微信 JSSDK）的去重：已存在相同 src 的 script 标签则跳过。

## 生产者 / 消费者

| 角色 | 能力 | 职责 |
|------|------|------|
| 生产者 | inject（`capabilities/inject.md`） | 按本契约注入 SEO 标签 + SDK 加载区，替换 `{IS_COCOS}`，去重 |
| 消费者 | audit（`capabilities/audit.md` + `audits/*.md`） | 按本契约校验：SDK-LOADER 块存在、`{IS_COCOS}` 已替换、SEO 标签齐全、无重复标签 |
| 不触碰 | deploy | 仅打包，不修改 HTML head |

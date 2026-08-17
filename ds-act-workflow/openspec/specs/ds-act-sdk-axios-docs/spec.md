# ds-act-sdk-axios-docs

## Purpose

规范 ds-act-sdk skill 文档对 `actDsAxios` / `actWebAxios` 两个内置 axios 实例的说明，指导 AI 在生成自定义接口请求代码时正确选型、默认带签名、避免裸 `new axios()` 或写死域名。

## Requirements

### Requirement: 提供两个 axios 实例的选型指引

skill 文档 SHALL 说明 `actDsAxios`（站内，路径 `/v1/act/**`）与 `actWebAxios`（站外，路径 `/v1/act-web/**`）的区别，包括各自的正式/测试 baseURL 及自动携带的请求头。AI 生成自定义接口请求代码时 SHALL 从这两个实例中选择，SHALL NOT 自行 `new axios()` 或写死域名。

#### Scenario: 站内活动请求
- **WHEN** 用户要对接大神 App 站内的自定义接口（如小游戏抽奖）
- **THEN** 生成的代码使用 `window.DsActSdk.actDsAxios`，路径为相对路径 `/v1/act/**`

#### Scenario: 站外活动请求
- **WHEN** 用户要对接浏览器/微信环境的站外接口
- **THEN** 生成的代码使用 `window.DsActSdk.actWebAxios`，路径为相对路径 `/v1/act-web/**`

#### Scenario: 拒绝裸 new axios
- **WHEN** 现有代码用 `new axios()` 或写死完整域名请求活动接口
- **THEN** 审查/生成时 SHALL 指出会缺签名头导致鉴权失败，并建议改用 `actDsAxios` / `actWebAxios`

### Requirement: 站内请求默认带客户端签名

生成站内接口代码时 SHALL 默认带签名：第三参传 `{ useGlClientSignature: true }`，且 body SHALL 用 `JSON.stringify(params)` 传字符串（无入参也传 `JSON.stringify({})`）。仅当后端明确说明某接口不验签时 SHALL NOT 带签名参数。

#### Scenario: 带入参的站内请求
- **WHEN** 生成一个带参数的站内 POST 请求
- **THEN** body 为 `JSON.stringify({ ...params })`，第三参含 `useGlClientSignature: true`

#### Scenario: 无入参的站内请求
- **WHEN** 生成一个无参数的站内 POST 请求
- **THEN** body 仍为 `JSON.stringify({})`，第三参含 `useGlClientSignature: true`

### Requirement: baseURL 默认走正式，测试域名仅临时覆盖

文档 SHALL 说明两个实例的 baseURL 在构建时固化为正式域名，运行时无需判断环境，常规情况下 SHALL NOT 询问或覆盖域名。仅当服务端接口只发了测试、尚未发正式时，SHOULD 临时覆盖 baseURL 到测试域名联调，并 SHALL 提示接口发正式后必须删除覆盖代码。

#### Scenario: 常规接入
- **WHEN** 用户要对接的接口已发正式
- **THEN** 直接使用内置正式 baseURL，不询问、不覆盖域名

#### Scenario: 接口未发正式
- **WHEN** 服务端接口只发了测试、还在等 QA
- **THEN** 临时覆盖 baseURL 到测试域名，并提示接口发正式后移除覆盖代码

### Requirement: 支持动态选择实例

当运行环境（站内/站外）不确定时，文档 SHALL 提供用 `ds.isGodlike()` 动态选择实例的写法，并说明站内/站外路径前缀不同、需后端同时提供两套接口。

#### Scenario: 环境不确定的请求
- **WHEN** 活动同时可能在站内和站外打开
- **THEN** 用 `ds.isGodlike()` 判断，站内选 `actDsAxios` 用 `/v1/act/**`，站外选 `actWebAxios` 用 `/v1/act-web/**`

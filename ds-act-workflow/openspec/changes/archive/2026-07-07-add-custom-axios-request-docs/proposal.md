# 新增 actDsAxios / actWebAxios 自定义接口请求文档能力

## Why

活动经常需要直接对接后端接口（自己的抽奖、排行榜、自定义任务等），这些接口 SDK 未封装。此前 skill 缺少这方面指引，AI 生成代码时容易自己 `new axios()` 或写死域名，导致缺签名头、鉴权失败、环境域名错乱。SDK 已透传 `actDsAxios`（站内）/ `actWebAxios`（站外）两个预配实例，本次为 skill 补齐对应用法文档与 eval 覆盖，让 AI 生成的自定义请求代码默认正确。

## What Changes

- 新增 `references/ds-act-sdk-axios.md`：完整讲解两个 axios 实例的区别、接入前询问确认、四种用法（站内带签名 / 站外 / 动态选实例 / 临时覆盖 baseURL）
- `references/ds-act-sdk-api.md` 第七章追加「自定义接口请求」小节，指向新文档
- `references/ds-act-sdk.md` 顶部导航追加 axios 文档链接
- `SKILL.md` description 新增「对接接口 / 调后端接口」触发关键词
- `evals/evals.json` 新增 5 条 eval（id 58-62），覆盖站内签名、query 签名、覆盖测试域名、动态选实例、禁止裸 new axios
- `.gitignore` 忽略 `.DS_Store`

## Impact

- Affected specs: +`ds-act-sdk-axios-docs`
- Affected code:
  - `references/ds-act-sdk-axios.md`（新增）
  - `references/ds-act-sdk-api.md`
  - `references/ds-act-sdk.md`
  - `SKILL.md`
  - `evals/evals.json`
  - `.gitignore`

## Out of Scope

- 不改动 SDK 本身的 axios 实现（`@opd-fe/ds-act-hooks` 导出、`ds-act-sdk` 透传），本次仅补 skill 文档
- 不涉及 SDK 已封装的高层接口（任务、角色列表等）的用法，那些在 `ds-act-sdk-api.md` 已覆盖

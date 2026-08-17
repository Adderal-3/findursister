# Tasks

## 1. 文档编写

- [x] 1.1 新建 `references/ds-act-sdk-axios.md`，说明 `actDsAxios` / `actWebAxios` 两个实例的区别（用途、baseURL 固化、自动携带的头）
- [x] 1.2 编写「接入前的询问与确认」：默认走正式域名，仅接口未发正式时临时覆盖；确认站内/站外
- [x] 1.3 编写四种用法示例：站内带签名、站外请求、`ds.isGodlike()` 动态选实例、临时覆盖 baseURL 到测试域名
- [x] 1.4 补充「不要自己 new axios / 写死域名」的警示

## 2. 现有文档接入

- [x] 2.1 `references/ds-act-sdk-api.md` 第七章追加「自定义接口请求：actDsAxios / actWebAxios」小节并指向新文档
- [x] 2.2 `references/ds-act-sdk.md` 顶部导航追加 axios 文档链接
- [x] 2.3 `SKILL.md` description 新增「对接接口 / 调后端接口」触发关键词

## 3. Eval 覆盖

- [x] 3.1 新增 id 58：站内请求默认带签名 + body `JSON.stringify` + 相对路径
- [x] 3.2 新增 id 59：query/无入参也带签名、空 body 也 `JSON.stringify({})`
- [x] 3.3 新增 id 60：站外 `actWebAxios` + 覆盖测试域名 + 提示发正式后移除
- [x] 3.4 新增 id 61：`ds.isGodlike()` 动态选实例 + 站内外路径前缀不同
- [x] 3.5 新增 id 62：识别裸 `new axios` 反模式并建议改用 `actDsAxios`

## 4. 配置

- [x] 4.1 `.gitignore` 忽略 `.DS_Store`

## 5. 提交

- [x] 5.1 `docs(ds-act-sdk): 新增 actDsAxios/actWebAxios 自定义接口请求用法文档`
- [x] 5.2 `test(ds-act-sdk): 新增 actDsAxios/actWebAxios 自定义接口请求 eval`

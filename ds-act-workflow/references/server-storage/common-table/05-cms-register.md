# 公共表接入 · 第 5 步：CMS 数据表注册（代码生成后必做）

> 目标：把第 3 步生成并校验通过的 TableConfig JSON，导入 god-cms「数据表」tab，表才能真正读写。
> 这一步必须在内网验证之前完成——表没注册，`table*` 调用会失败。
> 输入：第 3 步锁定并 `validate.cjs` 全绿的 TableConfig JSON。

---

## 5.1 生成注册清单（文字）

根据锁定的表配置，输出「待注册表清单」：

```
📋 需要在 god-cms「数据表」tab 注册以下表（共 N 张）：

| 序号 | tableKey | 显示名 | 业务字段数 | 索引数 | creatorOnlyRead/Modify/Delete |
|------|----------|--------|-----------|--------|-------------------------------|
| 1 | submission    | 职业投稿记录 | 9 | 4 | false / false / false |
| 2 | plaza_comment | 广场评论     | 5 | 1 | false / false / false |
| 3 | plaza_like    | 广场点赞     | 1 | 1 | false / false / true  |

（每张表另含 6 个系统内置字段，自动创建，无需注册）
```

---

## 5.2 输出 TableConfig 导入 JSON

⚠️ 直接输出第 3 步 `validate.cjs` 全绿的 TableConfig 数组（格式规范见 `03-table-config-json.md`）：

```
📋 数据表批量导入 JSON（可直接复制到后台「数据表」tab 的导入功能）：

[此处输出第 3 步锁定的 TableConfig JSON 数组]
```

输出前自检（Agent 内部执行）：
1. 顶层是数组，每元素含 `tableKey`/`displayName`/`fields`；
2. `fields` 未包含任何 `__` 开头的内置字段；
3. `fieldType` / `fieldMeta` 严格匹配，ENUM 有 `enumRules.allowedValues`；
4. 索引未手写 `indexName`、未在末尾加 `__delete_time`；
5. `validate.cjs` 已全绿（结构 + 索引覆盖）。

任一不通过 → 回第 3 步重新生成，不输出 JSON。

---

## 5.3 输出注册引导

```
上方 JSON 已可复制。

后台录入路径：
  测试环境：https://god-cms-test.gameyw.netease.com/cms/
  活动 → 小游戏管理 → 选择游戏 → 数据管理 →「数据表」tab → 导入 → 粘贴 → 确认

请问现在方便录入吗？
  [Y] 我现在去录入，录完告诉我
  [N] 先跳过，后面再录（审查阶段会提醒）
```

**用户选 N 时：**
- 在 `game-common-table.js` 顶部注释保留 `__TABLE_NOT_REGISTERED__` 标记（见 `04-code-gen.md` 模板）；
- `GAME_ID_CONFIG` 保持现有占位符不变；
- 附上已生成的 TableConfig JSON，方便后续粘贴；
- 审查阶段（`references/audits/common-table.md`）检测到该标记会提醒。

> `__TABLE_NOT_REGISTERED__` 与用户维度的 `__FIELDS_NOT_REGISTERED__` 是两个独立标记，互不冲突，可同时存在。

---

## 5.4 引导进入后台

```
请按以下步骤在 god-cms 后台注册数据表：

【测试环境（现在必做）】
🔗 https://god-cms-test.gameyw.netease.com/cms/
操作路径：活动 → 小游戏管理 → 找到对应游戏 → 数据管理 →「数据表」tab

在「数据表」tab：
  1. 点击「导入」，粘贴上方 TableConfig JSON → 确认导入
  2. 导入后核对：每张表的字段数（业务字段 + 6 内置字段）、索引数是否与清单一致
  3. 确认 devMiniGameId 已填入 game-common-table.js（或 game-server-storage.js）

【正式环境（上线前必做，现在可跳过）】
🔗 https://god-cms.gameyw.netease.com/cms/
操作路径相同，重复导入所有表；正式环境的 proMiniGameId 同样填入代码。
```

---

## 5.5 确认后的检查

用户确认完成后，输出状态摘要：

```
✅ 已收到确认

当前状态：
  · 已注册表：submission / plaza_comment / plaza_like
  · GAME_ID_CONFIG.devMiniGameId：[已填 / 占位符待填]
  · GAME_ID_CONFIG.proMiniGameId：[已填 / 占位符待填 ⚠️ 上线前必须补]
  · game-common-table.js 顶部 __TABLE_NOT_REGISTERED__ 标记：[已移除 / 仍存在 ⚠️]

提醒：
  · 字段类型创建后通常不可更改，如有疑问先在测试环境确认
  · 点赞类字段所在表的 creatorOnlyModify 必须为 false

进入代码审查（公共表专项）→ 读取 references/audits/index.md 定位 common-table.md
```

---

## 5.6 注册完成后的下一步

表注册确认后，读取 `references/audits/index.md`，按加载清单定位到公共表专项审查子文档 `common-table.md` 执行审查。

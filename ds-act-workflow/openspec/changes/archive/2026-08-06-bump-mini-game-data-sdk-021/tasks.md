## 1. 审查门禁阈值与文案更新（audits/）

- [x] 1.1 更新 `references/audits/server-storage.md:13` 版本门禁条目：阈值 `0.2.0` → `0.2.1`，重写阻断文案（去掉「路由未修复 / 请求内网 / TypeError / table* 接口缺失」技术术语，只说「不升级的话，小游戏投放到 act.ds.163.com 域名会有问题」，给出 0.2.1 CDN 地址）
- [x] 1.2 同步更新 `references/audits/server-storage.md:13` 条目内的「0.0.9 及以下还缺 tableUpdate...」解释段——0.2.0 已含 table* 接口，旧解释不再适用；新版只保留「投放到 act 域名会有问题」一句理由
- [x] 1.3 更新 `references/audits/server-storage.md:16` 阻断输出示例文案：`请升级到 0.2.0` → `请升级到 0.2.1`，CDN URL 同步改为 `0.2.1/index.js`
- [x] 1.4 更新 `references/audits/common-table.md:17-18` 版本门禁条目：阈值 `0.2.0` → `0.2.1`，文案与 server-storage.md 对齐（共用同一文案，注明「与用户存储审查共用」）
- [x] 1.5 更新 `references/audits/common-table.md:64` 表格行：`≥0.2.0` → `≥0.2.1`
- [x] 1.6 验证 `references/audits/server-storage.md` 与 `references/audits/common-table.md` 两处门禁阈值数值完全一致（均为 `0.2.1`）

## 2. 代码生成模板 CDN 字符串更新（references/server-storage/ 与 capabilities/）

- [x] 2.1 更新 `references/server-storage/02-best-practices.md`：line 90「版本 ≥ 0.2.0」→「版本 ≥ 0.2.1」；line 306-307 注释与 CDN URL `0.2.0/` → `0.2.1/`
- [x] 2.2 更新 `references/server-storage/99-api-reference.md`：line 31 注释 `0.2.0` → `0.2.1`；line 32 CDN URL；line 35「0.2.0 起 SDK 不再附带样式表」保留不动（事实仍成立）；line 259「SDK 引入顺序：SDK UMD JS → 业务脚本（0.2.0 起无 index.css...）」→ `0.2.1 起` 或保留 `0.2.0 起`（取决于是否强调首次移除版本——选保留 `0.2.0 起`，因 index.css 是 0.2.0 首次移除的事实陈述）
- [x] 2.3 更新 `references/server-storage/common-table/00-triage.md:58`：「版本 ≥ `0.2.0`」→「版本 ≥ `0.2.1`」，`0.2.0 起不再引入 index.css` 保留不动
- [x] 2.4 更新 `references/server-storage/common-table/04-code-gen.md`：line 26-27「0.2.0」→ `0.2.1`；line 46「依赖 mini-game-data-sdk >= 0.2.0」→ `>= 0.2.1`
- [x] 2.5 更新 `references/server-storage/common-table/99-api-reference.md`：line 4「最低 SDK 版本：**0.2.0**」→ `0.2.1`；line 10「版本 ≥ `0.2.0`」→ `0.2.1`；line 13 CDN URL `0.2.0/` → `0.2.1/`
- [x] 2.6 更新 `references/capabilities/game-storage.md`：line 12「≥ 0.2.0」→ `≥ 0.2.1`；line 75 CDN URL；line 151「≥ 0.2.0」；line 211「SDK ≥ 0.2.0」；line 348 FAQ 版本号与解释（去掉技术术语，对齐新文案原则）
- [x] 2.7 grep `0.2.0` 全 `references/` 目录，确认无 mini-game-data-sdk 相关残留（`index.css` 是 0.2.0 起移除的事实陈述可保留，但 SDK JS 版本号必须全 `0.2.1`）

## 3. 开发期 autofix 逻辑新增（00-intake.md）

- [x] 3.1 在 `references/server-storage/00-intake.md` 现有「检测已有存档文件」路由逻辑之后，新增「检测 SDK 版本」段落
- [x] 3.2 段落定义 autofix 触发条件：扫描 HTML 中 `mini-game-data-sdk/<v>` CDN 引用，提取 `v`，若 `v < 0.2.1` 则触发
- [x] 3.3 段落定义 autofix 行为：默认自动把所有匹配的 CDN 地址版本号改为 `0.2.1`，若有 `index.css` 残留 `<link>` 同步删除
- [x] 3.4 段落定义输出文案：列出修改文件清单 + 升级说明（「不升级的话，投放到 act.ds.163.com 域名会有问题」）+ 询问「是否保留此升级？」
- [x] 3.5 段落定义用户拒绝分支：回滚 CDN 字符串到原版本，输出「已回滚。审查阶段仍会因版本 < 0.2.1 阻断，建议尽快升级」，继续后续 intake 流程
- [x] 3.6 段落定义新项目分支：intake 判定新接入时不触发 autofix，由 code-gen 直接注入 0.2.1

## 4. eval 用例同步

- [x] 4.1 grep `evals/evals.json` 中所有 `mini-game-data-sdk` 相关 expected_output，定位版本号引用（至少 line 357、722）
- [x] 4.2 更新 line 357 expected_output：`0.0.7 版本（CSS + JS）` → `0.2.1 版本（仅 JS，不引入 index.css）`，并同步调整后续条目（如「引入 mini-game-data-sdk 的 script 标签」描述对齐新版本）
- [x] 4.3 更新 line 722 expected_output：`版本 ≥ 0.2.0` → `版本 ≥ 0.2.1`
- [x] 4.4 grep `evals/evals.json` 确认无其他 `0.0.7` / `0.0.9` / `0.1.0` / `0.2.0` mini-game-data-sdk 版本号残留（`ds-act-sdk` 的 `0.1.2` / `0.1.5` 不动）

## 5. 全仓库验证

- [x] 5.1 grep `mini-game-data-sdk` 全仓库，逐条核对版本号：所有 SDK JS CDN URL 路径版本号 = `0.2.1`；所有「≥ X.Y.Z」门禁声明 = `0.2.1`；所有「最低版本 X.Y.Z」声明 = `0.2.1`
- [x] 5.2 确认 `index.css` 相关说明保留 `0.2.0 起`（事实陈述，首次移除版本）
- [x] 5.3 运行 evals（若可执行）：确认 5-B 服务端存储正向用例与公共表正向用例 expected_output 与新版本号一致
- [x] 5.4 人工 review `references/audits/server-storage.md` 与 `common-table.md` 阻断文案：确认不含「路由 / 内网 / TypeError / table* 接口」技术术语，只说「投放到 act.ds.163.com 域名会有问题」
- [x] 5.5 人工 review `00-intake.md` 新增 autofix 段落：确认触发条件、autofix 行为、询问、拒绝分支、新项目分支齐全

## Why

`mini-game-data-sdk` 0.2.0 及以下版本未识别 `act.ds.163.com` 投放域名：小游戏投放到该域名时，SDK 内部接口请求会打到内网地址，造成事故。0.2.1 修复了该域名识别逻辑，且完全向后兼容 0.2.0。`act.ds.163.com` 线上已有投放，静态审查无法判断项目是否投放该域名，必须全量强制升级。

## What Changes

1. **BREAKING**：审查门禁阈值 `0.2.0` → `0.2.1`（硬阻断）
   - `references/audits/server-storage.md`、`references/audits/common-table.md`
   - 任何引入 `mini-game-data-sdk` 的项目，CDN 版本号 `< 0.2.1` → 阻断
2. 代码生成模板 CDN 字符串 `0.2.0` → `0.2.1`（11 处文档与 `game-server-storage.js` / `game-common-table.js` 模板）
3. 开发阶段新增 autofix：mode 5-B intake 检测到 HTML 中 `mini-game-data-sdk/<v>` 且 `v < 0.2.1` → **默认自动把 CDN 版本号改为 0.2.1**，用户可拒绝（拒绝后继续流程，但审查阶段仍会硬阻断）
4. 审查阻断文案简化：去掉「路由未修复 / 请求内网 / TypeError / table* 接口」等技术术语，只说「不升级的话，小游戏投放到 act.ds.163.com 域名会有问题」
5. eval 用例版本号同步 0.2.1（`evals/evals.json` 2 处 expected_output）

## Capabilities

### New Capabilities

- `mini-game-data-sdk-version-gate`: mini-game-data-sdk 版本门禁策略——最低版本（0.2.1）、act.ds.163.com 域名事故原因、审查硬阻断行为、开发期 autofix 升级行为、代码生成模板版本基线。作为版本策略单一事实源，未来 SDK 版本 bump 只改本 spec。

### Modified Capabilities

无。现有 `common-table-storage`、`audit-rules-modular` 等 spec 均未在 spec 层 pin 具体版本号（版本号是 references 文档实现细节），本次只改 references 文档内容，不改这些 spec 的 requirements。

## Impact

- `references/audits/server-storage.md`、`references/audits/common-table.md` — 门禁阈值 0.2.0 → 0.2.1，文案重写
- `references/server-storage/00-intake.md` — 新增老项目 SDK 版本 autofix 逻辑
- `references/server-storage/02-best-practices.md`、`99-api-reference.md`、`common-table/00-triage.md`、`common-table/04-code-gen.md`、`common-table/99-api-reference.md` — CDN 模板字符串 0.2.0 → 0.2.1
- `references/capabilities/game-storage.md` — 依赖说明与 FAQ 版本号同步
- `evals/evals.json` — 2 处 expected_output 版本号同步
- 不涉及任何运行时代码、构建脚本、CI 配置改动

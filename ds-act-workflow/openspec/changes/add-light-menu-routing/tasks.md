## 1. SKILL.md

- [x] 1.1 新增"## 能力菜单展示"小节（有条件展示 + 菜单示例 + 状态仅标已具备）
- [x] 1.2 新增"## 能力执行后推荐"小节（主流程完成后推荐下一步，[7]/[C] 不强制）
- [x] 1.3 能力注册表 [5] 依赖列从"无"改为"本地无 / 服务端+公共表需 [1]"

## 2. 能力文件

- [x] 2.1 game-storage.md 依赖段：[5] 服务端/公共表补充 [1] 登录态依赖

## 3. 文档同步

- [x] 3.1 CONTEXT.md 加"能力菜单展示""链式推荐"术语
- [ ] 3.2 归档时 sync spec 到 openspec/specs/menu-routing/spec.md

## 4. Evals

- [x] 4.1 新增 eval 覆盖首次菜单展示（可 grep 验证菜单表格 + 推荐路径）
- [x] 4.2 新增 eval 覆盖链式推荐（执行后重新展示 + 推荐下一步）
- [x] 4.3 新增 eval 覆盖明确指定能力不强制弹菜单

## 5. 验证

- [ ] 5.1 派 subagent 真跑 eval 验证规则生效
- [ ] 5.2 openspec verify --change add-light-menu-routing

## ADDED Requirements

### Requirement: 自包含参数收集
回流任务子模块 SHALL 自行收集 asId（任务 ID，必填）和触发时机（A 登录后自动 / B 点击触发 / C 手动调用）。

#### Scenario: 选择 A 模式
- **WHEN** 用户选择登录后自动检测
- **THEN** 生成 checkReturnTask 调用直接放在登录检测回调内

#### Scenario: 选择 B 模式
- **WHEN** 用户选择点击触发并描述了元素
- **THEN** 生成 addEventListener 绑定该元素的 checkReturnTask 调用

#### Scenario: 选择 C 模式
- **WHEN** 用户选择纯函数手动调用
- **THEN** 只生成 checkReturnTask 函数定义，不生成自动调用

---

### Requirement: 代码追加到 DS:ACT-SDK 块
回流任务子模块 SHALL 将 `checkReturnTask()` 函数定义和触发代码追加到 `DS:ACT-SDK END` 之前。

#### Scenario: 代码追加
- **WHEN** 子模块执行完成
- **THEN** DS:ACT-SDK 块内出现 checkReturnTask 函数，包含 TaskChecker 实例化、isMatched/isCompleted/isClaimable/claim 完整流程

## ADDED Requirements

### Requirement: 步骤 6 拆分为静态产物自检与运行时网络自检

`references/cocos-vite-integration.md` 步骤 6 SHALL 拆分为 6.1 静态产物自检（stat）与 6.2 运行时网络自检（必做）两段。6.1 段对照构建产物清单逐项 stat `dist/` 下的预期文件，任一缺失立即返回排查不允许带着缺失项进入运行验证。

#### Scenario: 6.1 静态产物自检通过

- **WHEN** 用户执行 6.1 对所有清单项 stat 全部成功
- **THEN** 进入 6.2 运行时网络自检

#### Scenario: 6.1 静态产物自检失败

- **WHEN** 用户执行 6.1 发现某项 dist 文件缺失（如 `dist/<前缀><jsList url>` 不存在）
- **THEN** skill 报告该项缺失并要求返回上一步排查，不允许进入 6.2

### Requirement: 步骤 6.2 运行时网络自检必须程序化

6.2 运行时网络自检 SHALL 程序化采集 preview 启动后所有 HTTP 响应状态，验证「入口与引擎组」（`/`、`/assets/index-*.js`、`/assets/index-*.css`、entry.js 的 `?url` import 对应路径）与「运行时资源组」（每项 jsList 部署路径、至少一个 bundle 入口）全部返回 200。skill SHALL NOT 仅以"打开浏览器肉眼看启动画面"作为唯一验证手段。

#### Scenario: curl 逐项检查全部 200

- **WHEN** 用户使用 `curl -s -o /dev/null -w "%{http_code}\n"` 对每条预期路径请求
- **THEN** 每条返回 200 才算 6.2 通过；任一返回非 200 → 6.2 不通过，回排错章节

#### Scenario: headless 浏览器监听 404 与 pageerror

- **WHEN** 用户使用 headless 浏览器打开 preview 页面，监听 `response` 事件收集 `status() === 404` 与监听 `pageerror` 事件
- **THEN** 两个收集结果同时为空数组才算 6.2 通过；任一非空 → 6.2 不通过

#### Scenario: 拒绝肉眼验证作为唯一手段

- **WHEN** 文档建议步骤 6 验证手段
- **THEN** 文档明确禁止"打开浏览器肉眼看启动画面"作为唯一验证手段，并解释原因（启动画面在 jsList 加载前就显示、控制台 404 必须主动开 DevTools）

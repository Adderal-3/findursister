## ADDED Requirements

### Requirement: 自包含参数收集
CPS 通用悬浮栏子模块 SHALL 自行收集 downloadConfig（必填，至少一项）、appointDownloadButton 模式（link / appointDownload）、以及可选参数（icon / title / zIndex / menu / linkButton）。appKey 从入口编排器复用。

#### Scenario: 选择 link 模式
- **WHEN** 用户选择 link 模式并填入 text 和 link
- **THEN** 生成代码中 appointDownloadButton 为 `{ type: 'link', text, link }`

#### Scenario: 选择 appointDownload 模式
- **WHEN** 用户选择 appointDownload 模式
- **THEN** 生成代码中 appointDownloadButton 为 `{ type: 'appointDownload' }`，并展示版本警告（DS JS-SDK >= 1.97.0）

---

### Requirement: HTML 容器注入
CPS 通用悬浮栏子模块 SHALL 在 index.html `</body>` 前插入 `#ds-cps-bar-root` 容器。

#### Scenario: 容器插入
- **WHEN** 模块被加载执行
- **THEN** index.html 中出现 `<div id="ds-cps-bar-root"></div>`

---

### Requirement: 代码追加到 DS:ACT-SDK 块
CPS 通用悬浮栏子模块 SHALL 将 `sdk.CpsUniversalBar.evoke()` 调用追加到 `DS:ACT-SDK END` 之前。

#### Scenario: 代码追加
- **WHEN** 子模块执行完成
- **THEN** DS:ACT-SDK 块内出现 CpsUniversalBar.evoke 调用，包含 container、appKey、downloadConfig 和用户选择的配置

## ADDED Requirements

### Requirement: SKILL.md 1b 扫描豁免 Cocos 启动块

`SKILL.md` 第一节 1b H5 结构扫描 SHALL 在 1a 判定为 Cocos 项目时，对每个 `*.html` 文件中的非 SDK-LOADER、非 src 外链业务 `<script>` 内嵌块做 Cocos 启动块判定：若内嵌块内容包含 `_CCSettings` / `window.boot` / `cocos2d-js` / `loadScript` 任一关键词，则该块豁免、不计入"业务脚本内嵌"警告。

#### Scenario: Cocos 项目典型启动 IIFE 命中豁免

- **WHEN** 1a 判定为 Cocos 项目，且 `index.html` 含一段内嵌 `<script>` 内容含 `loadScript(debug ? 'cocos2d-js.js' : 'cocos2d-js-min.5cf79.js', ...)` 与 `window.boot()`
- **THEN** 1b 扫描豁免该块，不报"业务脚本内嵌"警告

#### Scenario: 非 Cocos 项目内嵌脚本不豁免

- **WHEN** 1a 未命中（非 Cocos 项目），且 HTML 含业务脚本内嵌
- **THEN** 1b 扫描照常报"业务脚本内嵌"警告，建议提取到 `src/game.js`

#### Scenario: Cocos 项目但内嵌块不含豁免关键词

- **WHEN** 1a 判定为 Cocos 项目，但某内嵌 `<script>` 块四个豁免关键词都未命中
- **THEN** 1b 扫描照常报"业务脚本内嵌"警告（保护真业务脚本不被漏报）

### Requirement: Cocos 项目扫描结果展示阻止错误推荐 [0]

扫描结果展示 SHALL 在 1a 命中（Cocos 项目）时仅显示 🎮 行不显示业务脚本内嵌警告，并在 🎮 行下附"Cocos 项目请勿先选 [0]"红色警示，明确"内联 `<script>` 是 Cocos 启动块、将被 [C] 的 entry.js 替换、提取到 `src/game.js` 反而错误"。

#### Scenario: 1a 命中显示 Cocos 推荐与警示

- **WHEN** 1a 命中
- **THEN** 输出含「🎮 检测到 Cocos Creator web-mobile 导出 / 推荐先执行 [C] / 请勿先选 [0]」三行，不显示「⚠️ 检测到内容未分离」与「业务脚本内嵌」相关行

#### Scenario: 1a 未命中且 1b 命中只显示分离警告

- **WHEN** 1a 未命中且 1b 命中
- **THEN** 仅显示「⚠️ 检测到内容未分离」相关行，不显示 🎮 行

#### Scenario: 两项均未命中静默跳过

- **WHEN** 1a 与 1b 均未命中
- **THEN** 不展示任何前置扫描提示，直接进入模式选择菜单

## ADDED Requirements

### Requirement: 步骤 1 必须发现 jsList 运行时前缀

执行 `references/cocos-vite-integration.md` 步骤 1 时，skill SHALL 在 main 文件中定位把 `settings.jsList` 传给 loader 的调用点，并提取 `.map(...)` 或字符串拼接中的运行时前缀（可能为空字符串、`'src/'`、或自定义 `BASE_URL`），将该前缀作为步骤 1 的发现项之一。

#### Scenario: main 文件含 src 前缀拼接

- **WHEN** main 文件中存在 `cc.assetManager.loadScript(settings.jsList.map(x => 'src/' + x), cb)`
- **THEN** skill 提取前缀 `src/` 并记入步骤 1 发现结果

#### Scenario: main 文件直接传 jsList 不加前缀

- **WHEN** main 文件中存在 `cc.assetManager.loadScript(settings.jsList, cb)` 或 `.map(x => x)`
- **THEN** skill 记录前缀为空字符串

#### Scenario: main 文件无 jsList 引用

- **WHEN** main 文件中 grep `jsList` 或 `loadScript` 都找不到把 settings.jsList 传给 loader 的调用点
- **THEN** skill 报错退出并提示"导出不完整或 main 文件不是 Cocos 标准导出"，不进入步骤 2

### Requirement: 步骤 4 jsList 部署路径必须含运行时前缀

执行步骤 4 第二类（jsList 插件脚本部署）时，skill SHALL 把每个 jsList 项部署到 `public/<前缀><jsList url>`，其中 `<前缀>` 是步骤 1 发现的运行时前缀。skill SHALL NOT 直接复制到 `public/<jsList url>` 而忽略前缀。

#### Scenario: 前缀为 src 的标准 Cocos 项目

- **WHEN** 步骤 1 发现前缀 `src/` 且 jsList 项 `assets/scripts/plugins/foo.js`
- **THEN** skill 把源文件复制到 `public/src/assets/scripts/plugins/foo.js`

#### Scenario: 前缀为空的 Cocos 项目

- **WHEN** 步骤 1 发现前缀为空字符串且 jsList 项 `assets/scripts/plugins/foo.js`
- **THEN** skill 把源文件复制到 `public/assets/scripts/plugins/foo.js`

#### Scenario: 验证部署路径含前缀

- **WHEN** 步骤 4 部署完成后做存在性验证
- **THEN** skill 对每项验证 `public/<前缀><jsList url>` 文件存在，任一缺失立即报告该项的 jsList url 与计算出的部署路径，不允许 MISSING 进入步骤 5

### Requirement: jsList flow 文档以前缀为路径计算核心

`references/cocos-vite-jslist-flow.md` SHALL 在背景与处理流程中以"前缀 + jsList 字符串"作为部署路径的计算公式，而不是按源文件磁盘路径推断或假设 jsList 字符串就是最终 URL。

#### Scenario: jsList flow 文档处理流程

- **WHEN** 用户阅读 jsList flow 文档的处理流程章节
- **THEN** 文档明确给出 `public/<prefix><url>` 作为目标部署路径的计算方式，并要求进入流程前先在主文档步骤 1 完成前缀发现

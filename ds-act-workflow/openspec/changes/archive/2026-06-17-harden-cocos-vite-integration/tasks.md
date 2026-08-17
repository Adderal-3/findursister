## 1. cocos-vite-jslist-prefix

- [x] 1.1 在 `references/cocos-vite-integration.md` 步骤 1 发现表格新增「jsList 运行时前缀」行
- [x] 1.2 在步骤 1 增加「jsList 运行时前缀发现（必做）」段落，含 grep 流程、三种典型前缀示例（`'src/' + x`、空、`BASE_URL + x`）、未发现报错退出规则
- [x] 1.3 在步骤 1 边界规则补「jsList 运行时前缀未能发现 → 报错退出」
- [x] 1.4 把步骤 4 第二类标题改为「jsList 插件脚本（按步骤 1 的 jsList 清单 + 运行时前缀处理）」
- [x] 1.5 步骤 4 第二类核心原则改为 `public/<前缀><jsList url>` 部署路径，附三种前缀的部署路径示例表格
- [x] 1.6 步骤 4 判定标准与边界规则同步前缀概念
- [x] 1.7 解法表 L24 jsList 行措辞同步为「按 `<前缀><jsList url>` 放置」
- [x] 1.8 验证表 L162 同步为「步骤 4 第二类计算出的部署路径」
- [x] 1.9 排错章节「preview 404 找不到 jsList 插件」从三种可能改为四种，前两种是新坑（前缀没发现 / 部署路径没含前缀）
- [x] 1.10 重写 `references/cocos-vite-jslist-flow.md`：背景说明前缀作用、前置确认前缀、处理流程使用 `public/<prefix><url>`、验证以前缀 + url 拼接为准

## 2. cocos-vite-physics-detection

- [x] 2.1 步骤 1 「physics 启用判定」表项改为指向新的优先级判定子段
- [x] 2.2 在步骤 1 新增「physics 启用判定（按优先级，命中即停）」四级决策树：main grep CC_PHYSICS_* → HTML 内联 loadScript physics → 兜底人工确认 → 不启用
- [x] 2.3 在新决策树中明确说明 `CC_PHYSICS_BUILTIN` / `CC_PHYSICS_CANNON` 由 Cocos 编译期注入到 main 文件，不在 `_CCSettings` 里
- [x] 2.4 步骤 1 边界规则改为「physics 文件不存在但判定 1 或 2 命中 → 报错退出」
- [x] 2.5 排错章节新增「physics 启用判定错误」条目，澄清信号源并指引按优先级判定重新执行

## 3. cocos-vite-runtime-verification

- [x] 3.1 步骤 6 拆分为 6.1 静态产物自检（stat）与 6.2 运行时网络自检两段
- [x] 3.2 6.1 段说明「对照清单逐项 stat dist/，任一缺失立即返回上一步排查，不允许带着缺失项进入运行验证」
- [x] 3.3 6.2 段强制要求程序化采集，列出两组路径（入口与引擎组、运行时资源组）的具体内容
- [x] 3.4 6.2 段提供两种程序化方式（curl 逐项 / headless 浏览器监听 response 与 pageerror），明确"任一项不为 200 / 有 404 / 有 pageerror → 步骤 6 不通过"
- [x] 3.5 6.2 段尾加粗禁止「打开浏览器肉眼看启动画面」作为唯一验证手段，并解释原因（启动画面在 jsList 加载之前就显示、控制台 404 必须主动开 DevTools）

## 4. cocos-boot-block-exemption

- [x] 4.1 在 `SKILL.md` 1b H5 结构扫描节增加「Cocos 启动块豁免」段落，定义豁免关键词集（`_CCSettings` / `window.boot` / `cocos2d-js` / `loadScript`）与豁免触发条件（1a 命中 + 内嵌 `<script>` 含任一关键词）
- [x] 4.2 在「扫描结果展示」节加入展示规则：1a 命中仅显示 🎮 行 + ⚠️ 请勿先选 [0] 警示；1a 未命中且 1b 命中仅显示分离警告；两项均未命中静默
- [x] 4.3 在示例输出的 🎮 行下加红色警示「Cocos 项目请勿先选 [0] —— HTML 内联 `<script>` 是启动块, 将被 [C] 的 entry.js 替换, 提取到 src/game.js 反而错误」

## 5. 验证

- [x] 5.1 在 drink/ 项目（Cocos web-mobile 导出）按新文档完整跑一遍 [C] 模式：步骤 1 发现前缀 `src/`、physics 启用、5 个 jsList 项部署到 `public/src/assets/scripts/plugins/`
- [x] 5.2 步骤 6.1 stat 通过，6.2 用 headless 浏览器监听 → 0 个 404、0 个 pageerror
- [x] 5.3 SKILL.md 1b 在 drink/ 项目重新扫描：1a 命中 + 内嵌脚本含 `loadScript` 关键词 → 豁免，仅显示 🎮 行

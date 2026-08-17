## Why

实战发现 Cocos Vite 集成 skill 存在四类硬故障：(1) jsList 部署忽略运行时前缀导致 100% 404；(2) physics 启用判定只看 `_CCSettings`，漏掉 main 文件中的 `CC_PHYSICS_*` 注入信号；(3) 步骤 6 验证仅"肉眼看启动画面"，404 与 pageerror 容易漏；(4) 模式选择时 H5 扫描误把 Cocos 启动块当作"业务脚本内嵌"，错误推荐 [0] 规范目录结构。当前 skill 文档按部就班执行就跑不通，必须修复后再让用户继续使用。

## What Changes

- `references/cocos-vite-integration.md` 步骤 1 新增「jsList 运行时前缀发现」必做项与「physics 启用判定（按优先级）」决策树。
- `references/cocos-vite-integration.md` 步骤 4 第二类部署路径改为 `public/<前缀><jsList url>`，含示例表格。
- `references/cocos-vite-integration.md` 步骤 6 拆分为 6.1 静态产物自检（stat）+ 6.2 运行时网络自检（curl 或 headless 监听 404/pageerror，必做）。
- `references/cocos-vite-integration.md` 排错章节新增「physics 误判」「jsList 前缀坑」对应条目；解法表 jsList 行措辞同步前缀概念。
- `references/cocos-vite-jslist-flow.md` 全文按"前缀 + jsList 字符串"重写部署路径计算。
- `SKILL.md` 1b H5 扫描节新增「Cocos 启动块豁免」规则与展示规则；🎮 行下补红色警示阻止"先 [0] 再 [C]"的错误引导。

非破坏性：现有非 Cocos 项目（HTML / React / Vue / 普通 H5）的扫描与提示行为完全不变。

## Capabilities

### New Capabilities
- `cocos-vite-jslist-prefix`: 步骤 1 发现 jsList 运行时前缀（在 main 文件中 grep `jsList` 调用点提取 `.map(...)` 前缀），步骤 4 按 `public/<前缀><jsList url>` 部署，jsList flow 文档以前缀为核心计算路径。
- `cocos-vite-physics-detection`: 步骤 1 按优先级判定 physics 启用——main 文件 grep `CC_PHYSICS_*` → index.html 内联 loadScript → 兜底人工确认，不再以 `_CCSettings` 为唯一信号源。
- `cocos-vite-runtime-verification`: 步骤 6 拆分为静态产物 stat 与运行时网络自检；运行时自检必须程序化（curl 或 headless 监听），禁止以"肉眼看启动画面"作为唯一手段。
- `cocos-boot-block-exemption`: SKILL.md 1b 扫描发现 Cocos 项目（1a 命中）且内嵌 `<script>` 含 `_CCSettings`/`window.boot`/`cocos2d-js`/`loadScript` 任一关键词时，豁免该块、不计入业务脚本内嵌警告，并在 🎮 行附"请勿先选 [0]"红色警示。

### Modified Capabilities
（无：现有 spec 中未涵盖 Cocos Vite 集成相关行为，不存在要修改的 capability。）

## Impact

- **文档**：`references/cocos-vite-integration.md`、`references/cocos-vite-jslist-flow.md`、`SKILL.md` 第一节扫描子节。
- **依赖**：无新增第三方依赖；运行时网络自检建议工具任选 `curl` 或 headless 浏览器（执行环境自带）。
- **行为差异**：Cocos 项目用户不再被错误引导到 [0] 模式；按新流程执行 [C] 不再因 jsList 前缀缺失而首次构建失败；physics 启用项目不再被漏装 physics import。
- **现存项目**：已按旧文档跑通的 Cocos 项目无需重做（构建产物正确即不影响）；按旧文档卡 404 / 白屏的项目重跑步骤 1+4+6 即可。

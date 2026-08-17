## Context

ds-act-workflow skill 的 [C] Cocos Vite 集成模式（`references/cocos-vite-integration.md`）来自最早一次实战，文档把 Cocos web-mobile 导出产物从 `<script src=...>` 串行加载迁移到 Vite 的 `?url` import + `public/` 双轨模型。最近一次真实项目（drink/，Cocos Creator 导出）按文档严格执行后命中 4 个硬故障：

1. **jsList 100% 404**：文档假设 `_CCSettings.jsList` 字符串就是浏览器最终请求 URL，部署到 `public/<jsList url>`。实际 Cocos main 文件在加载时可能给每项加运行时前缀（drink 项目是 `'src/' + x`），最终请求 URL 是 `/src/assets/scripts/plugins/foo.js`。
2. **physics 启用判定漏判**：文档的"settings 文件 grep `CC_PHYSICS_*`"判定逻辑错把 `_CCSettings` 作为信号源。这两个常量由 Cocos 编译期注入到 main 文件，不在 settings 里——按旧规则 100% 漏判。
3. **步骤 6 验证不可靠**：原文要求"浏览器看启动画面 + 控制台无 404"。启动画面在 jsList 加载之前就显示，画面出现 ≠ jsList 加载成功；控制台 404 必须用户主动开 DevTools，容易漏。
4. **扫描误导用户**：SKILL.md 1b 把 Cocos 启动 IIFE 错认为"业务脚本内嵌"，提示用户先选 [0] 提取到 `src/game.js`——而 [C] 的 entry.js 就是来替代这个 IIFE 的，先做 [0] 是反向操作。

修复需在 skill 文档层做，下游所有用 [C] 模式的 Cocos 项目首次构建是否能通过都依赖于此。

## Goals / Non-Goals

**Goals:**
- 步骤 1 必须能机械化发现 jsList 运行时前缀，发现失败时报错退出而不是猜默认值。
- 步骤 1 physics 启用判定按"main grep → HTML 内联 → 兜底人工"优先级，覆盖 main 编译期注入信号。
- 步骤 6 强制程序化网络自检（任一可执行方式：curl 逐项 200 / headless 浏览器监听 404+pageerror），禁止"肉眼看启动画面"作为唯一手段。
- SKILL.md 1b 扫描在判定为 Cocos 项目时豁免内嵌 `<script>`，避免错误推荐 [0]。

**Non-Goals:**
- 不修改 Cocos 引擎或 Vite 行为本身，纯文档改动。
- 不引入 jsList 前缀的多种自适应推断——如果 main 文件没找到 `jsList` 引用就报错退出，让用户人工介入而不是猜。
- 不改变非 Cocos 项目（HTML / React / Vue / 普通 H5）的扫描与提示行为。
- 不改 [C] 之外的其他模式（[0]、[1–7]）。

## Decisions

### 决策 1：jsList 前缀作为「步骤 1 必须发现」项，而非步骤 4 的可选优化

**选择**：把"jsList 运行时前缀发现"放进步骤 1 的发现表格，与 settings/main/cocos2d 等文件并列；步骤 4 部署路径直接用步骤 1 的发现结果计算 `public/<前缀><jsList url>`。

**为什么**：jsList 前缀决定 jsList 文件的部署路径。如果发现放在步骤 4，相当于步骤 4 同时做"发现 + 部署"两件事——一旦发现失败，部署也失败，但错误归因模糊。前置到步骤 1，发现失败时立刻报错退出，根本不进入 entry.js / public/ 操作。

**Alternatives**：
- 在步骤 4 内联前缀发现：被否决，归因模糊。
- 默认前缀 `src/` 作为兜底：被否决，drink 项目恰好是 `src/`，但这是巧合不是规律；其他 Cocos 项目可能是空、`assets/`、自定义 BASE_URL，猜错的代价是构建产物正确但部署时 100% 404。

### 决策 2：physics 启用判定改用决策树而非单一条件

**选择**：按优先级链 `main grep CC_PHYSICS_*` → `index.html 内联 loadScript('physics...', ...)` → 兜底人工确认；前两个命中即停。

**为什么**：`CC_PHYSICS_BUILTIN` / `CC_PHYSICS_CANNON` 是 Cocos 编译期常量，注入位置由 Cocos 决定——目前观察到 main 文件是稳定来源，HTML 内联块的 loadScript 调用是次稳定来源。两个信号源串联，覆盖 Cocos 不同导出版本。

**Alternatives**：
- 只看 main 文件：被否决，未来 Cocos 版本可能改变注入位置。
- 只看 HTML 内联块：被否决，HTML 可能被用户改写过，main 文件更接近原始导出。
- 默认始终启用：被否决，physics 文件不存在的项目会因 entry.js import physics 而构建失败。

### 决策 3：步骤 6 拆分为静态 stat + 运行时网络两段，运行时段必做且程序化

**选择**：6.1 静态产物 stat（构建产物清单逐项可 stat）；6.2 运行时网络自检，要求 curl 或 headless 浏览器机器化采集所有响应状态——404 列表为空、pageerror 列表为空才通过。

**为什么**：这次实战恰好用 headless 浏览器抓到 14 条 jsList 404 才发现前缀缺失。静态产物 stat 只能验证文件存在，无法验证文件被请求时的实际 URL；只有运行时观察网络请求才能发现"部署路径 vs 请求路径"的不匹配。

**Alternatives**：
- 只 stat 静态产物：被否决，无法捕获前缀类问题。
- 强制要求 headless 浏览器：被否决，curl 逐项也能达到同效，工具选择交执行环境。
- 不强制方式，只要求"控制台无 404"：被否决，肉眼看 DevTools 容易漏，必须程序化。

### 决策 4：SKILL.md 1b Cocos 启动块豁免基于关键词白名单而非 AST 解析

**选择**：1a 命中且内嵌 `<script>` 内容包含 `_CCSettings` / `window.boot` / `cocos2d-js` / `loadScript` 任一关键词，则该块豁免不计入业务脚本内嵌。

**为什么**：Cocos 启动 IIFE 的固定特征就是这四个标识符的组合（settings 引用 / boot 调用 / 引擎名 / 加载函数）。AST 解析杀鸡用牛刀，关键词白名单足以区分。误报代价（把真业务脚本豁免）需要四个关键词同时不命中，概率极低；漏报代价（把启动块当业务脚本）已经被旧版本验证为现实问题。

**Alternatives**：
- AST 解析 IIFE 结构：被否决，开发成本高、维护成本高。
- 只看 `_CCSettings` 一个关键词：被否决，未来 Cocos 版本可能改名，多关键词 OR 更鲁棒。
- 跳过所有 Cocos 项目的内嵌脚本扫描：被否决，太粗暴——理论上 Cocos 项目用户也可能在 HTML 加业务脚本，应该按内容判定。

## Risks / Trade-offs

- **风险：Cocos 版本演进改变 jsList 拼接逻辑或 main 中 `CC_PHYSICS_*` 注入位置**。缓解：步骤 1 的发现都基于"在 main 文件 grep"，未来版本若改名只需更新 grep 关键词。文档每个判定步骤都标注"在 main 文件中 grep XXX"，调整路径明确。
- **风险：步骤 6 运行时网络自检对执行环境的要求**。某些 CI 环境可能没有 headless 浏览器或 curl。缓解：文档明确"任选其一"，curl 是最小依赖；如果两者都没有，6.2 段落要求用户至少手动开 DevTools 全表勾 404 过滤——但这种情况下违反了"程序化"原则，需在文档中注明这是降级路径。
- **Trade-off：步骤 1 发现失败的报错退出 vs 兜底默认值**。选择前者会让首次集成 Cocos 项目的用户多一次"main 文件 grep 不到 jsList"的中断；选择后者首次顺利但部署时 404 难定位。优先选前者：错误前置归因清晰。
- **Trade-off：四个 capability 拆分粒度**。可以合并为一个 `cocos-vite-integration-hardening`，但分四个 spec 文件让每条要求与原始故障 1:1 对应，归档时单独可追溯。

## Why

互动游戏广告场景下，小游戏被嵌入客户端 WebView，屏幕顶部（状态栏 + 集数/倍速导航栏）和底部（广告下载面板）被客户端 UI 遮挡且不可点击。运营拿到全屏小游戏 HTML 后，无法直观看到核心玩法是否被遮挡，缺少一个"标尺"来把游戏内容收进真实可操作区域。

## What Changes

- 新增模式 `[8] 🎯 互动游戏广告模式预览`，提供三个子操作：
  - **添加遮罩**：在页面注入上下两块固定遮罩（上 94px / 下 220px，宽 100vw，贴屏幕边缘，吃掉点击），用 marker + 固定 class 双重锚定；可由运营提供背景图 url，缺省用半透明红框兜底；添加后落盘安全区标尺记录并输出一段可复制的"适配 prompt"，引导运营喂给 AI 改造项目。
  - **移除遮罩**：按 marker / class 精准删除注入内容，不留残渣。
  - **检查残留**：扫描所有 HTML，发现遮罩残留即阻断。
- 残留遮罩检查挂入主审查链（mode 2 审查 / mode 3 部署始终执行），作为"调试遮罩禁止带上线"的安全网。
- **关键边界**：适配引导（标尺记录 + 适配 prompt）仅在用户主动进入 mode 8 添加遮罩时触发；其他模式（0/1/2/3/4/5/6/7）一律不提示、不引导、不主动注入遮罩。

## Capabilities

### New Capabilities
- `ad-preview-mode`: 互动游戏广告模式预览 —— 调试遮罩的添加/移除、安全区标尺记录与适配 prompt 引导，以及触发边界约束。
- `ad-preview-cover-audit`: 互动广告调试遮罩残留审查 —— 在主审查链中扫描遮罩 marker / class 残留并阻断部署。

### Modified Capabilities
<!-- 无既有 capability 的 spec 级行为变更 -->

## Impact

- `SKILL.md`：模式选择菜单新增 `[8]`，路由表新增对应 reference 文件映射。
- 新增 `references/ad-preview.md`：mode 8 执行流程（添加 / 移除 / 检查 / prompt / 标尺记录）。
- 新增 `references/audits/ad-preview-cover.md`：遮罩残留阻断规则。
- `references/audits/index.md`：审查规则加载清单新增一行（始终触发）。
- 注入产物固定命名：marker `[DS:AD-PREVIEW-COVER:START/END]`，class `ds-act-ad-preview-cover`、`ds-act-ad-preview-cover--top`、`ds-act-ad-preview-cover--bottom`。
- 标尺记录写入项目 `CLAUDE.md`（追加"互动广告安全区"节）。

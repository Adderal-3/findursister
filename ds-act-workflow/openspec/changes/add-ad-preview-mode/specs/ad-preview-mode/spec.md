## ADDED Requirements

### Requirement: 模式入口与路由
系统 SHALL 在 `SKILL.md` 模式选择菜单新增 `[8] 🎯 互动游戏广告模式预览`，并在路由表中映射到 `references/ad-preview.md`。

#### Scenario: 用户选择模式 8
- **WHEN** 用户在模式选择菜单输入 `8`
- **THEN** 系统读取并执行 `{skill_dir}/references/ad-preview.md`
- **AND** 进入添加 / 移除 / 检查 子操作选择

### Requirement: 添加调试遮罩
系统 SHALL 在目标 HTML 注入上下两块调试遮罩，用 marker 与固定 class 双重锚定。上遮罩高 94px，下遮罩高 220px，宽均 100vw。

注入结构 SHALL 形如：
```html
<!-- [DS:AD-PREVIEW-COVER:START] -->
<div class="ds-act-ad-preview-cover ds-act-ad-preview-cover--top"></div>
<div class="ds-act-ad-preview-cover ds-act-ad-preview-cover--bottom"></div>
<!-- [DS:AD-PREVIEW-COVER:END] -->
```

遮罩样式 SHALL 满足：`position: fixed`，上遮罩 `top:0`、下遮罩 `bottom:0`，`width:100vw`，高值 `z-index`，且 SHALL 拦截点击与触摸（`pointer-events:auto` + `touch-action:none`），MUST NOT 使用 `pointer-events:none`。

#### Scenario: 注入上下遮罩
- **WHEN** 用户在 mode 8 选择"添加遮罩"
- **THEN** 系统在目标 HTML 注入被 `[DS:AD-PREVIEW-COVER:START/END]` marker 包裹的上下两块遮罩
- **AND** 上遮罩高 94px 贴顶、下遮罩高 220px 贴底，宽均 100vw
- **AND** 遮罩拦截点击与触摸，模拟客户端 UI 遮挡

#### Scenario: 提供背景图 url
- **WHEN** 运营提供上/下遮罩背景图 url
- **THEN** 对应遮罩用 `background-image` 还原真实视觉

#### Scenario: 未提供背景图 url
- **WHEN** 运营未提供背景图 url
- **THEN** 遮罩使用半透明红色 + 边框作为标尺兜底样式

### Requirement: 移除调试遮罩
系统 SHALL 按 marker 与 class 精准删除注入的遮罩内容，不留残渣。

#### Scenario: 移除遮罩
- **WHEN** 用户在 mode 8 选择"移除遮罩"
- **THEN** 系统删除 `[DS:AD-PREVIEW-COVER:START]` 到 `END` 之间的整块内容（含 marker）
- **AND** 删除后 HTML 中不再存在 `ds-act-ad-preview-cover` 相关 class 与 marker

### Requirement: 安全区标尺记录
系统 SHALL 在添加遮罩后，将安全区标尺写入项目 `CLAUDE.md` 的"互动广告安全区（调试标尺）"节，记录顶部 94px、底部 220px、可操作区 `calc(100vh - 314px)`。重复执行 SHALL 覆盖更新而非重复追加。

#### Scenario: 首次写入标尺
- **WHEN** 用户添加遮罩且 CLAUDE.md 无"互动广告安全区"节
- **THEN** 系统追加该节，记录 94px / 220px / `calc(100vh - 314px)`

#### Scenario: 重复写入标尺
- **WHEN** 用户再次添加遮罩且 CLAUDE.md 已存在"互动广告安全区"节
- **THEN** 系统覆盖更新该节，不产生重复节

### Requirement: 适配 prompt 输出
系统 SHALL 在添加遮罩后输出一段可复制的适配 prompt，说明顶部 94px、底部 220px 不可点击，要求把游戏核心交互收进 `calc(100vh - 314px)`，遮挡区只放装饰元素。

#### Scenario: 添加后输出 prompt
- **WHEN** 用户完成"添加遮罩"
- **THEN** 系统输出可复制的适配 prompt 文本

### Requirement: 适配引导触发边界
系统 SHALL 仅在用户主动进入 mode 8 的"添加遮罩"子操作时输出标尺记录与适配 prompt。其他模式（0/C/1/2/3/4/5/6/7）MUST NOT 主动提示适配、主动注入遮罩或主动输出适配 prompt。

#### Scenario: 仅 mode 8 触发引导
- **WHEN** 用户在 mode 8 添加遮罩
- **THEN** 系统输出标尺记录与适配 prompt

#### Scenario: 其他模式不触发引导
- **WHEN** 用户运行 mode 0/C/1/2/3/4/5/6/7
- **THEN** 系统不输出任何互动广告适配引导或 prompt
- **AND** 不主动注入遮罩

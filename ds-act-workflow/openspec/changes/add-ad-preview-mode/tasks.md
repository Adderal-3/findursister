## 1. 模式入口与路由（SKILL.md）

- [x] 1.1 在模式选择菜单新增 `[8] 🎯 互动游戏广告模式预览` 条目及简介
- [x] 1.2 更新输入提示行（`输入 0、C、1...7` → 含 8）
- [x] 1.3 在路由表新增 `8 → {skill_dir}/references/ad-preview.md` 映射
- [x] 1.4 更新描述区/触发词，加入"互动游戏广告模式预览""遮罩预览"等触发短语

## 2. 模式执行流程（references/ad-preview.md）

- [x] 2.1 新建 `references/ad-preview.md`，定义子操作菜单：添加 / 移除 / 检查
- [x] 2.2 编写"添加遮罩"流程：询问上/下背景图 url（可选）→ 注入 marker + 双 class 结构（上 94px/下 220px/100vw/fixed 贴边/拦截点击）
- [x] 2.3 定义遮罩 CSS（fixed、top:0 / bottom:0、width:100vw、高 z-index、pointer-events:auto、touch-action:none；无 bgUrl 时半透明红框兜底）
- [x] 2.4 编写"标尺记录"逻辑：写入/覆盖 CLAUDE.md "## 互动广告安全区（调试标尺）"节（94/220/calc(100vh - 314px)）
- [x] 2.5 编写"适配 prompt"输出模板（可复制文本，含安全区约束说明）
- [x] 2.6 编写"移除遮罩"流程：按 marker 区间整块删除，校验无残留 class/marker
- [x] 2.7 编写"检查残留"子操作：调用同 audits 规则扫描并报告
- [x] 2.8 明确触发边界说明：引导/prompt 仅本模式触发，审查阻断不含引导

## 3. 残留审查规则（references/audits/ad-preview-cover.md）

- [x] 3.1 新建 `references/audits/ad-preview-cover.md`
- [x] 3.2 定义扫描范围：所有 HTML（不限已接入大神的页面）
- [x] 3.3 定义阻断检查项：命中 `[DS:AD-PREVIEW-COVER]` marker 或 `ds-act-ad-preview-cover` class → 🔴 阻断 + 删除提示
- [x] 3.4 明确不含适配引导/ prompt 文案

## 4. 接入主审查链（references/audits/index.md）

- [x] 4.1 在"审查规则加载清单"新增一行指向 `./ad-preview-cover.md`，标注"始终"触发
- [x] 4.2 在审查报告"阻断项"渲染模板中纳入遮罩残留检测结果
- [x] 4.3 确认条件触发判定语义节无需为本规则添加条件（始终触发）

## 5. 一致性与验证

- [x] 5.1 通读 SKILL.md / ad-preview.md / ad-preview-cover.md / audits/index.md，确认命名（marker/class）全文一致
- [x] 5.2 校验添加→移除往返后 HTML 干净无残留
- [x] 5.3 校验 mode 0-7 流程未引入任何互动广告引导文案
- [x] 5.4 运行 `openspec verify-change add-ad-preview-mode` 确认 spec 与实现一致（实际命令：`openspec validate add-ad-preview-mode` → valid）

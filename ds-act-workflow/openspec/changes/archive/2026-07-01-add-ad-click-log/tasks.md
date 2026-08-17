## 1. 广告点击日志代码块（注入源码归属 [L]，不进基础模板）

- [x] 1.1 在 `references/ad-preview.md` 的 `[L]` 步骤3 提供 `[DS:AD-CLICK-LOG:START/END]` 注入代码块（复用 `APP_KEY`/`SQUARE_ID`/`userInfo`/`window.ns`）；**不**写入基础模板 `ds-js-template.js`，避免普通项目被无差别注入
- [x] 1.2 实现 `reportAdClick()`：`typeof window.ns !== 'function'` 守卫；用 `URLSearchParams` 解析 `ad_id`/`creative_id`/`material_id`（缺省 `-2`）
- [x] 1.3 实现 minigame_id 解析：`location.pathname.match(/\/minigame\/([^/]+)/)`，无匹配取空串
- [x] 1.4 组装 `window.ns('send', ...)`：`hitType='event'`、`eventCategory='interstitial_ad_minigame'`、`eventAction='clk_new_2_926_1'`、`eventLabel` 含 `uid/game/community_id/minigame_id/ad_info`
- [x] 1.5 顶层绑定 `document.addEventListener('click', reportAdClick, true)`，确认不 `preventDefault`/`stopPropagation`

## 2. 模式 8 流程：前置检查与子操作

- [x] 2.1 在 `references/ad-preview.md` 入口新增 ds.js 前置检查说明（无 ds.js 时阻断，提示先跑模式 1；与模式 5 同构）
- [x] 2.2 子操作菜单新增「注入广告点击日志」项
- [x] 2.3 编写该子操作执行流程：检查 ds.js → 幂等检测 `[DS:AD-CLICK-LOG:START]`（已存在则跳过提示）→ 注入代码块 → 完成报告与验证提示
- [x] 2.4 在 `[R]` 移除遮罩流程中显式声明"仅删除 `[DS:AD-PREVIEW-COVER]`，不动 `[DS:AD-CLICK-LOG]`"
- [x] 2.5 在 `[A]` 添加遮罩流程中自动执行 `[L]` 注入（含 ds.js 检查：无则不阻断遮罩，仅提示补跑模式1）

## 3. 菜单描述

- [x] 3.1 更新 `SKILL.md` 模式 8 菜单描述，追加「注入广告小游戏全局点击日志上报」说明

## 4. 审查边界确认

- [x] 4.1 核对 `references/audits/ad-preview-cover.md`，确认残留审查仅扫遮罩 marker/class，未纳入 `[DS:AD-CLICK-LOG]`（如已如此则无需改动，仅确认）
- [x] 4.2 核对 `references/audits/index.md` 加载清单，确认无需为点击日志新增阻断规则

## 5. 验证

- [x] 5.1 手动构造 URL `.../minigame/<uuid>/index.html?ad_id=A&creative_id=B&material_id=C`，点击后确认 NS 日志上报字段正确
- [x] 5.2 验证缺参场景：`ad_info` 各字段缺省 `-2`、未登录 `uid=-9999`、无 `/minigame/` 段 `minigame_id=''`
- [x] 5.3 验证生命周期分离：跑 `[R]` 移除遮罩后 `[DS:AD-CLICK-LOG]` 仍在；跑模式 2 审查不报点击日志残留、不阻断
- [x] 5.4 验证前置检查：无 ds.js 项目进入该子操作被阻断并提示模式 1

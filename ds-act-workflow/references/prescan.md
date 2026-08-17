# 前置扫描（自动检测，手动选择）

> 本文件由 SKILL.md `### 前置扫描` 迁入（ticket 03 progressive disclosure）。进入能力路由前执行，只输出报告不自动修改。


进入能力路由**之前**，并行执行以下两项检测，**只输出报告，不自动执行任何修改**：

#### 1a. Cocos web-mobile 检测

检查当前目录是否为 Cocos Creator web-mobile 导出（**两项条件必须同时满足**才判定为 Cocos 项目）：

1. 项目内存在 `cocos2d-js*.js` 文件（glob 匹配，不限目录层级，排除 `node_modules`、`dist`）
2. 项目内任意 `.js` 文件内容包含 `_CCSettings`（同上排除 `node_modules`、`dist`）

#### 1b. H5 结构扫描

扫描所有的 `*.html` 文件，检测是否存在：

- `<style>` 内嵌样式块
- 非 SDK-LOADER、非 `src` 外链的业务 `<script>` 内嵌块

**Cocos 启动块豁免：** 若 1a 判定为 Cocos 项目，且内嵌 `<script>` 内容包含 `_CCSettings` / `window.boot` / `cocos2d-js` / `loadScript` 任一关键词,则该内嵌块视为 Cocos 启动代码,**不计入"业务脚本内嵌"**——它将被 [C] Cocos Vite 集成的 `entry.js` 整体替换,无需也不应提取到 `src/game.js`。

#### 扫描结果展示

将两项检测结果合并输出，**仅展示命中的项**（未命中则不显示对应行）：

```
📋 前置扫描结果

  🎮 检测到 Cocos Creator web-mobile 导出
     👉 推荐先执行 [C] Cocos Vite 集成（capabilities/cocos-vite.md）
     ⚠️  Cocos 项目请勿先选 [0] —— HTML 内联 &lt;script&gt; 是启动块, 将被 [C] 的 entry.js 替换, 提取到 src/game.js 反而错误

  ⚠️  检测到内容未分离：
       - <style> 内嵌样式（建议提取到 src/style.css）
       - 业务脚本内嵌（建议提取到 src/game.js）
     👉 推荐先选 [0] 规范目录结构，再进行其他操作
```

**展示规则：**
- 1a 命中（Cocos 项目）→ 仅显示 🎮 行,不显示业务脚本内嵌警告（哪怕原始 HTML 真有内联 `<script>`,因为含 Cocos 关键字的已被启动块豁免规则过滤；不含 Cocos 关键字的罕见内嵌脚本仍会被抑制,但实际 Cocos web-mobile 导出不会产生此类脚本）
- 1a 未命中且 1b 命中 → 仅显示 ⚠️ 行
- 两项均未命中 → 静默跳过,不展示任何提示

扫描结果**只作为参考**，由用户在下一步能力路由中自行决定执行哪一项；本节绝不自动跳转或自动执行任何能力文件。

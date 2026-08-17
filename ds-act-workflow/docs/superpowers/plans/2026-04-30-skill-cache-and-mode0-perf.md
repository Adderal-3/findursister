# Skill 检测缓存 & 模式0 性能优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 ds-act-skills 每次启动时重复检测依赖技能的开销，并将模式0的执行从多轮 Read/Edit 交互优化为单次 Read → 内存处理 → Write。

**Architecture:** Task 1 修改 `SKILL.md` 的"零、技能依赖"部分，引入 `.skill-cache.json` 持久化缓存；Task 2 重写 `references/structure.md` 步骤1-4，合并为单次 Read + 3次 Write，去掉确认交互。两个 Task 独立，互不依赖。

**Tech Stack:** Markdown（skill 指令文档），JSON（缓存文件格式）

---

## Task 1：SKILL.md — 添加 Skill 检测持久化缓存

**Files:**
- Modify: `SKILL.md:9-42`（替换"零、技能依赖与前置检查"部分）

### 背景

当前"零、技能依赖"部分：每次调用 `/ds-act-skills` 都对三个技能逐一调用 `Skill()`，无缓存。新逻辑：先读 `.skill-cache.json`，命中则跳过，未命中才检测，检测通过后写入缓存。

- [ ] **Step 1：确认当前内容**

  用 Read 工具读取 `SKILL.md` 第 9-42 行，确认与预期一致（三技能表格 + 检测方式 + 阻断规则）。

- [ ] **Step 2：替换"零、技能依赖与前置检查"部分**

  将 `SKILL.md` 第 9-42 行整段替换为以下内容：

  ````markdown
  ## 零、技能依赖与前置检查
  
  本 skill 依赖以下技能：
  
  | 技能 | 说明 | 下载地址 |
  |------|------|---------|
  | `appkey-naming` | 查询游戏 appkey 和圈子 ID | https://skills.netease.com/skills/skill_3e712e5971bf |
  | `dsjssdk` | 大神 JSSDK 深度校验 | https://skills.netease.com/skills/skill_765023538775 |
  | `html-security-scan` | HTML 安全漏洞扫描 | https://skills.netease.com/skills/skill_44d5f061a2a2 |
  
  **检测流程（含缓存）：**
  
  1. 读取 `~/.claude/skills/ds-act-skills/.skill-cache.json`（若存在）
  2. 对比缓存中 `verified` 数组与上表要求的技能列表（`["appkey-naming", "dsjssdk", "html-security-scan"]`）：
     - **完全一致** → 跳过检测，直接进入前置扫描（第一节）
     - **缓存不存在 / 列表不完整 / 有新增技能** → 执行下方完整检测
  3. 对每个技能调用 `Skill()`，若加载成功则标记 ✅，失败则标记 ❌
  4. **全部 ✅** → 将以下内容写入 `.skill-cache.json`，然后进入前置扫描：
     ```json
     { "verified": ["appkey-naming", "dsjssdk", "html-security-scan"] }
     ```
  5. **任意 ❌** → 删除 `.skill-cache.json`（若存在），立即阻断，输出：
     ```
     ❌ 检测到依赖技能缺失，请先安装后再重新运行 /ds-act-skills
     
     缺失技能下载地址：
       - [技能名]: [下载链接]
     ```
  
  **输出检查结果（仅在执行实际检测时输出，命中缓存时静默跳过）：**
  
  ```
  ## 依赖技能检查
  
  | 技能 | 状态 |
  |------|------|
  | appkey-naming | ✅ 可用 / ❌ 未安装 → https://skills.netease.com/skills/skill_3e712e5971bf |
  | dsjssdk | ✅ 可用 / ❌ 未安装 → https://skills.netease.com/skills/skill_765023538775 |
  | html-security-scan | ✅ 可用 / ❌ 未安装 → https://skills.netease.com/skills/skill_44d5f061a2a2 |
  ```
  ````

- [ ] **Step 3：验证修改**

  Read `SKILL.md` 第 9-60 行，确认：
  - 含"检测流程（含缓存）"标题
  - 含 `.skill-cache.json` 路径
  - 含"命中缓存时静默跳过"文字
  - 原有三技能表格和下载链接均保留

- [ ] **Step 4：提交**

  ```bash
  git add SKILL.md
  git commit -m "feat: add persistent skill detection cache via .skill-cache.json"
  ```

---

## Task 2：structure.md — 模式0 一次性处理优化

**Files:**
- Modify: `references/structure.md:1-148`（替换步骤1-4，保留步骤5不变）

### 背景

旧步骤1-4：扫描 → 展示计划 → 等确认 → 逐步 Read/Edit CSS → 逐步 Read/Edit JS → 摘要。  
新步骤1-4：Read 一次 → 内存分析 → 内存构建三份输出 → 3次 Write → 摘要。

- [ ] **Step 1：确认 structure.md 当前步骤1-4 的范围**

  Read `references/structure.md` 第 1-148 行，确认：
  - 第 7-59 行：步骤1（扫描+展示计划+确认）
  - 第 63-84 行：步骤2（CSS 提取，多次 Edit）
  - 第 88-127 行：步骤3（JS 提取，多次 Edit）
  - 第 131-147 行：步骤4（输出摘要）
  - 第 151 行起：步骤5（生成 CLAUDE.md，保持不变）

- [ ] **Step 2：替换步骤1-4（第 1-148 行）**

  将 `references/structure.md` 第 1 行到第 148 行整段替换为以下内容：

  ````markdown
  # 模式 0：规范目录结构（MODE 0: STRUCTURE）
  
  将 `index.html` 中内嵌的 CSS 和业务 JS 提取为独立文件，修正引用，并生成 `CLAUDE.md` 记录目录约定。
  
  ---
  
  ## 步骤 1：Read index.html（1次工具调用）
  
  - 若当前目录下不存在 `index.html` → 立即中止，输出：
    ```
    ❌ 未找到 index.html，无法执行 MODE 0，请在 H5 项目根目录下运行。
    ```
  - 使用 Read 工具读取 `index.html` 全文，载入内存。后续所有分析和构建均在内存中完成，**不再调用额外的 Read 工具**。
  
  ---
  
  ## 步骤 2：内存分析（0次工具调用）
  
  在内存中分析 `index.html` 全文，找出：
  
  **内嵌 CSS：**
  - 所有 `<style>` 块（含标签和内容），按 DOM 顺序记录
  
  **内嵌业务 JS：**
  - 所有没有 `src` 属性的 `<script>` 块，按 DOM 顺序记录
  - **跳过以下脚本**（不提取）：
    - 已是 `<script src="...">` 外链形式的标签
    - 被 `<!-- [DS:SDK-LOADER` 注释区域包围的 `<script>` 块（判断方式：从当前 `<script>` 向上扫描，忽略空白行，若遇到含 `[DS:SDK-LOADER` 的 HTML 注释则跳过；或 `<script>` 标签自身内容中含有 `[DS:SDK-LOADER` 字样）
  
  **多个同类块的处理：**
  - 多个 `<style>` 块 → 按 DOM 顺序合并内容
  - 多个内嵌 `<script>` 块 → 按 DOM 顺序合并内容
  
  **如果未检测到任何可提取内容：**
  直接跳至步骤 5 生成 CLAUDE.md，跳过步骤 3-4。
  
  ---
  
  ## 步骤 3：内存中构建三份输出（0次工具调用）
  
  **`new_html`（修改后的 index.html）：**
  1. 从原 HTML 中移除所有已提取的 `<style>` 块（整个标签含内容）
  2. 从原 HTML 中移除所有已提取的内嵌 `<script>` 块（整个标签含内容）
  3. 在 `</head>` 之前插入（去重检查：规范化路径后若已存在则跳过）：
     ```html
     <link rel="stylesheet" href="src/style.css">
     ```
     若不存在 `</head>` → 追加到文件末尾，并标记警告
  4. 在 `</body>` 之前插入（去重检查：规范化路径后若已存在则跳过）：
     ```html
     <script src="src/game.js"></script>
     ```
     若不存在 `</body>` → 追加到文件末尾，并标记警告
  5. **加载顺序检查**（若 `src/ds.js` 的引用存在于 new_html 中）：
     - `src/ds.js` 必须在 `src/game.js` 之前
     - SDK-LOADER 块必须在 `src/ds.js` 之前
     - 若顺序错误 → 在内存中调整位置，并标记警告
  
  **`style_css`（提取的 CSS 内容）：**
  - 检查 `src/style.css` 是否已存在（用 Read 工具读取，若报错则视为不存在）
    - **不存在** → `style_css` = 所有 `<style>` 块内容按 DOM 顺序合并（不含标签本身）
    - **已存在** → `style_css` = 原文件内容 + 注释分隔符 + 提取内容：
      ```
      [原 src/style.css 内容]
      
      /* ===== 从 index.html 提取（YYYY-MM-DD）===== */
      [提取的 CSS 内容]
      ```
  
  **`game_js`（提取的 JS 内容）：**
  - 检查 `src/game.js` 是否已存在（用 Read 工具读取，若报错则视为不存在）
    - **不存在** → `game_js` = 所有内嵌 `<script>` 块内容按 DOM 顺序合并（不含标签本身）
    - **已存在** → `game_js` = 原文件内容 + 注释分隔符 + 提取内容：
      ```
      [原 src/game.js 内容]
      
      // ===== 从 index.html 提取（YYYY-MM-DD）=====
      [提取的 JS 内容]
      ```
  
  （`YYYY-MM-DD` 替换为执行当天的实际日期）
  
  ---
  
  ## 步骤 4：一次性写入 & 输出摘要
  
  **写入（最多 4 次工具调用）：**
  
  1. 若 `src/` 目录不存在 → 创建目录
  2. `Write` → `index.html`（写入 `new_html`）
  3. `Write` → `src/style.css`（写入 `style_css`）
  4. `Write` → `src/game.js`（写入 `game_js`）
  
  **输出警告（若步骤 3 中标记了警告）：**
  
  ```
  ⚠️  src/style.css 已存在，已将内容追加到末尾
  ⚠️  src/game.js 已存在，已将内容追加到末尾
  ⚠️  已调整加载顺序：src/ds.js 移至 src/game.js 之前（大神SDK必须先加载）
  ⚠️  未找到 </head>，已将 <link> 追加到文件末尾，请手动确认位置。
  ⚠️  未找到 </body>，已将 <script> 追加到文件末尾，请手动确认位置。
  ```
  （仅输出实际触发的警告，未触发的不输出）
  
  **输出摘要：**
  
  ```
  ## ✅ 目录结构整理完成
  
  | 操作 | 详情 |
  |------|------|
  | src/style.css | ✅ 已创建（从 index.html 提取 N 行） |
  | src/game.js   | ✅ 已创建（从 index.html 提取 N 行） |
  | index.html    | ✅ 已更新：移除内嵌块，添加 <link> 和 <script src> 引用 |
  ```
  
  ```
  💡 建议执行 git diff 确认所有变更符合预期。
  ```
  
  ---
  ````

- [ ] **Step 3：验证步骤5 未被修改**

  Read `references/structure.md` 第 149 行起，确认"步骤 5：生成 CLAUDE.md"的内容完整，开头含 `## 步骤 5：生成 CLAUDE.md` 字样。

- [ ] **Step 4：验证新步骤1-4 关键内容**

  Read `references/structure.md` 第 1-148 行，确认：
  - 含"Read index.html（1次工具调用）"
  - 含"内存分析（0次工具调用）"
  - 含"内存中构建三份输出（0次工具调用）"
  - 含"一次性写入 & 输出摘要"
  - **不含**"确认执行？[Y/n]"
  - **不含**"展示提取计划"表格

- [ ] **Step 5：提交**

  ```bash
  git add references/structure.md
  git commit -m "perf: rewrite mode0 to single Read + in-memory processing + batch Write"
  ```

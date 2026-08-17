# Design: Skill 检测缓存 & 模式0 性能优化

**日期：** 2026-04-30  
**项目：** ds-act-skills  
**状态：** 已批准

---

## 问题背景

### 问题1：Skill 检测重复执行

每次调用 `/ds-act-skills` 时，都对 `appkey-naming`、`dsjssdk`、`html-security-scan` 三个依赖技能逐一调用 `Skill()`。技能是否已安装是稳定状态，无需每次重新检测。

### 问题2：模式0 token 消耗过高

模式0（规范目录结构）在提取 `index.html` 中内嵌的 CSS/JS 时，存在多轮 Read/Edit 操作、展示计划等待确认等步骤，导致 token 消耗高、执行效率低。

---

## 设计1：Skill 检测持久化缓存

### 缓存文件

**位置：** `~/.claude/skills/ds-act-skills/.skill-cache.json`

**格式：**
```json
{
  "verified": ["appkey-naming", "dsjssdk", "html-security-scan"]
}
```

### 检测逻辑（替换现有"零、技能依赖"流程）

```
1. 读取 .skill-cache.json（若存在）
2. 对比 verified 列表 与 SKILL.md 中要求的依赖列表
   - 完全一致 → 跳过检测，直接进入前置扫描
   - 缓存不存在 / 列表不匹配 → 执行完整检测流程
3. 检测全部通过 → 写入 .skill-cache.json
4. 任何一个失败 → 阻断，同时删除 .skill-cache.json（避免脏缓存）
```

### 关键决策

- **无 TTL**：技能安装是稳定状态，不需要过期机制
- **列表对比触发重检**：SKILL.md 新增依赖时自动重检，无需手动清缓存
- **失败时删除缓存**：防止部分安装状态被缓存

---

## 设计2：模式0 一次性处理优化

### 核心原则

**旧流程：** N次Read + N次Edit + 确认交互  
**新流程：** 1次Read → 内存处理 → 最多4次Write

### 新执行步骤

#### 步骤1：Read index.html（1次工具调用）
全文载入内存，后续分析全在内存中完成。

#### 步骤2：内存分析（0次工具调用）
- 找出所有 `<style>` 块的内容和位置
- 找出所有内嵌 `<script>` 块（跳过 SDK-LOADER 块、`src=` 外链）
- 若无可提取内容 → 直接跳至步骤5（生成 CLAUDE.md）

#### 步骤3：内存构建三份输出（0次工具调用）
- `new_html`：原 HTML 移除提取块，插入 `<link rel="stylesheet" href="src/style.css">` 和 `<script src="src/game.js"></script>`
- `style_css`：所有 CSS 内容按 DOM 顺序合并
- `game_js`：所有 JS 内容按 DOM 顺序合并

#### 步骤4：一次性写入（最多4次工具调用）
- `Write` → `index.html`（new_html）
- `Write` → `src/style.css`（若已存在：追加注释头 `/* ===== 从 index.html 提取（YYYY-MM-DD）===== */` 后写入）
- `Write` → `src/game.js`（若已存在：追加注释头 `// ===== 从 index.html 提取（YYYY-MM-DD）=====` 后写入）
- 若 `src/` 不存在，在写入前创建目录

#### 步骤5：生成 CLAUDE.md（逻辑不变）

#### 最后：输出摘要

### 去掉的步骤

| 去掉的内容 | 原因 |
|-----------|------|
| 展示提取计划表格 | 减少输出 token，摘要已覆盖结果 |
| "确认执行？[Y/n]" 交互 | 减少往返，模式0 本身已是用户主动选择的操作 |
| 多轮 Read/Edit 操作 | 合并为单次 Read + 单次 Write |

### 保留的逻辑

- ✅ SDK-LOADER 块跳过逻辑（不提取平台脚本）
- ✅ 加载顺序检查（ds.js 必须在 game.js 之前）
- ✅ 已存在文件时追加而非覆盖
- ✅ 去重检查（不重复插入 `<link>` / `<script src>`）
- ✅ 末尾摘要输出

### 预期效果

| 指标 | 旧流程 | 新流程 |
|------|--------|--------|
| 工具调用次数 | 8-12次 | 4-5次 |
| Token 消耗 | 高（多轮读写） | 减少约 60-70% |
| 用户交互轮次 | 2轮（计划确认+执行） | 1轮（直接执行+摘要） |

---

## 实施范围

| 文件 | 修改内容 |
|------|---------|
| `SKILL.md` | 替换"零、技能依赖"部分，加入缓存检测逻辑 |
| `references/structure.md` | 重写步骤1-4，合并为单次 Read + Write 流程，删除确认交互 |

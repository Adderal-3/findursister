# 依赖技能检测（含缓存）

> 本文件由 SKILL.md `### 依赖技能检测（含缓存）` 迁入（ticket 02 progressive disclosure）。进入能力路由前执行。


本 skill 依赖以下技能：

| 技能                 | 说明                      | 必需性           | 下载地址                                             |
| -------------------- | ------------------------- | ---------------- | ---------------------------------------------------- |
| `appkey-naming`      | 查询游戏 appkey 和圈子 ID | 软必需(仅inject) | https://skills.netease.com/skills/skill_3e712e5971bf |
| `dsjssdk`            | 大神 JSSDK 深度校验       | 软必需(仅audit)  | https://skills.netease.com/skills/skill_765023538775 |
| `html-security-scan` | HTML 安全漏洞扫描         | 软必需(仅audit)  | https://skills.netease.com/skills/skill_44d5f061a2a2 |

- **硬必需**：缺失 → 阻断整个 skill。本 skill 无硬必需依赖。
- **软必需**：缺失 → 仅禁用依赖它的 capability，其他 capability 仍可运行。禁用时向用户说明"因缺 <dep>，<cap> 不可用，其他 capability 仍可跑"。

**检测流程（含缓存）：**

1. 读取 `{skill_dir}/.skill-cache.json`（若存在）：
   - 若文件不可解析（非合法 JSON）→ 视同"缓存不存在"，执行完整检测
2. 对比缓存中 `verified` 数组与上表要求的技能列表（顺序与表格一致：`["appkey-naming", "dsjssdk", "html-security-scan"]`）：
   - **完全一致** → 跳过检测，直接进入前置扫描
   - **缓存不存在 / `verified` 字段缺失 / 列表不完整**（含 `verified` 为空数组 `[]`）**/ 有新增技能** → 执行下方完整检测
3. 对每个技能调用 `Skill()`，若加载成功则标记 ✅，失败则标记 ❌
4. **全部 ✅** → 将以下内容写入 `{skill_dir}/.skill-cache.json`，然后进入前置扫描：
   ```json
   { "verified": ["appkey-naming", "dsjssdk", "html-security-scan"] }
   ```
5. **任意 ❌** → 删除 `{skill_dir}/.skill-cache.json`（若存在），输出缺失技能及影响的 capability，**仅禁用依赖该技能的 capability，不阻断整个 skill**：

   ```
   ❌ 检测到依赖技能缺失，以下 capability 不可用：

   | 缺失技能 | 影响的 capability | 下载地址 |
   |----------|-----------------|----------|
   | [技能名] | [capability] | [下载链接] |

   其他 capability 仍可正常使用。
   ```

   依赖映射：appkey-naming → inject；dsjssdk + html-security-scan → audit。

**输出检查结果（仅在执行实际检测时输出，命中缓存时静默跳过）：**

```
## 依赖技能检查

| 技能 | 状态 |
|------|------|
| appkey-naming | ✅ 可用 / ❌ 未安装 → https://skills.netease.com/skills/skill_3e712e5971bf |
| dsjssdk | ✅ 可用 / ❌ 未安装 → https://skills.netease.com/skills/skill_765023538775 |
| html-security-scan | ✅ 可用 / ❌ 未安装 → https://skills.netease.com/skills/skill_44d5f061a2a2 |
```

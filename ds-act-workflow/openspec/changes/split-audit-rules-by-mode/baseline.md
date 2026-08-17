# 迁移前基线快照

- 源文件：`references/audit-rules.md`
- 总行数：443
- `- [ ]` 检查项总数：159
- 章节清单（按出现顺序）：
  1. SDK-LOADER 块
  2. CONFIG 块
  3. JSSDK 块
  4. NS 日志块
  5. 分享块
  6. Ulink 块
  7. CLICK-PRECHECK 块
  8. EXPORTS 块
  9. HTML 加载顺序检查（含 `<script type>` 审查示例 + 重复逻辑检测子节）
  10. 服务端存储专项审查（mode 5-B 专用）
  11. HTML 安全审查（调用 `/html-security-scan`）
  12. 小程序支持审查（条件触发）
  13. wx 调用前置检查
  14. 导航栏审查（条件触发）
  15. DS:ACT-SDK 块审查（条件触发）

迁移后期望：`references/audits/*.md` 累计 `- [ ]` = 159；15 个子文件 + 1 个索引文件（`audit-rules.md`）。

# 互动广告调试遮罩残留审查（始终触发）

> 互动游戏广告模式预览（mode 8）注入的上下调试遮罩是**纯调试标尺**，上线前必须移除。本规则**无条件**扫描项目内所有 HTML，残留即阻断，确保调试遮罩绝不带上线。

## 扫描范围

- **所有** `*.html` 文件（排除 `node_modules`、`dist`），**不限于**已接入大神（含 DS Marker）的页面。
- 若项目存在 `src/style.css` 等样式文件，一并扫描其中的遮罩 class。

## 阻断检查项

- [ ] 不存在 marker `<!-- [DS:AD-PREVIEW-COVER:START] -->` / `<!-- [DS:AD-PREVIEW-COVER:END] -->` → 命中即 🔴 **阻断**
- [ ] 不存在 class `ds-act-ad-preview-cover`（含 `--top` / `--bottom` 修饰类）→ 命中即 🔴 **阻断**

命中任一即判定为"调试遮罩未移除"，输出：

```
❌ [AD-PREVIEW-COVER] 调试遮罩未移除，禁止部署
    文件：[文件路径]
    问题：检测到互动广告调试遮罩残留（marker [DS:AD-PREVIEW-COVER] 或 class ds-act-ad-preview-cover）
    你需要：重新运行 /ds-act-workflow 选择 [8] 互动游戏广告模式预览 → [R] 移除调试遮罩，移除后再部署
```

无残留则该项通过（✅）。

## 边界说明

本审查只执行"扫描残留 → 提示删除 → 阻断"。**禁止**在审查输出中包含任何安全区适配引导或适配 prompt —— 适配引导仅属于 mode 8 添加遮罩流程。

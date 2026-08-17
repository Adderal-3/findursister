## 1. 能力契约文件

- [x] 1.1 新建 `references/capabilities/resource-optimization.md`（mode 9 能力契约：依赖/入参/出参/能做什么/不能做什么/判断规则/幂等性/执行步骤）
- [x] 1.2 执行步骤含：扫描 >300KB 图 → 查 cache 去重 → 告知确认 → sharp 压缩（quality 80 保格式不 resize）→ 更新 cache → vite build 验证 → 能力提交
- [x] 1.3 幂等性：`.compress-cache.json` 内容 hash 去重，已压缩跳过

## 2. SKILL.md 注册表

- [x] 2.1 能力注册表新增 mode 9 行（编号 9 / 资源优化 / `references/capabilities/resource-optimization.md` / 一句话 / 依赖无 / 出参压缩后的图+cache）
- [x] 2.2 路由规则加 mode 9 触发词（"压缩图片"/"图片太大"/"资源优化"）

## 3. deploy 软门禁 A 形态引导

- [x] 3.1 `references/capabilities/deploy.md` 软门禁体积警告段加"建议执行 mode 9 资源优化"引导（等 MR !39 合并后补）
- [x] 3.2 引导是提示不是阻断（软门禁不阻断）

## 4. .compress-cache.json 约定

- [x] 4.1 `.gitignore` 不排除 `.compress-cache.json`（cache 进 git）
- [x] 4.2 能力文件说明 cache 格式：`{"compressed": [{"file": "src/assets/x.png", "hash": "abc123"}]}`

## 5. evals

- [x] 5.1 case A：超阈图片压缩（mode 9 触发，sharp 压缩 + cache 更新 + build 验证）
- [x] 5.2 case B：跳过已压缩图片（cache hash 匹配，跳过）
- [x] 5.3 case C：压后仍超阈接受+告知（png 大图压完仍 >300KB，不重压）
- [x] 5.4 case D：deploy 软门禁引导 mode 9（大图警告含引导）

## 6. CONTEXT.md 术语

- [x] 6.1 已在阶段 1 完成（资源优化 + 压缩去重缓存术语，commit 6ebade5）

## 7. 验证

- [x] 7.1 eval drift check 通过
- [x] 7.2 eval id collision check（staging max id 114，新 case 用 115+）
- [x] 7.3 `openspec validate add-mode9-resource-optimization`

# 能力：资源优化（模式 9 / RESOURCE-OPTIMIZATION）

> 用 `scripts/compress-images.mjs` 压缩项目目录下所有 >300KB 图片（sharp quality 80，只压质量不 resize，保格式），内容 hash 去重避免重复压缩，压缩后 vite build 验证。音频/视频超阈只报告不处理。改源码能力，Git 门禁自动能力提交。

## 执行步骤

```
扫描项目目录下所有图片（.png/.jpg/.jpeg/.webp，排除 node_modules/dist/.git），筛选 >300KB
  ↓
查 .compress-cache.json 内容 hash，已压缩的跳过
  ↓
告知运营"X 张图将压缩，质量损失不可逆，Git 基线可回退"，等确认
  ↓
运行 compress-images.mjs（sharp quality 80，保格式不 resize）
  ↓
更新 .compress-cache.json
  ↓
npx vite build 验证（H1 退出码 0）—— 破坏构建则阻断，不能力提交
  ↓
Git 门禁能力提交（压缩后的图 + cache）
```

### 直接执行命令

```bash
# 确保 sharp 可用（首次执行，在项目目录执行）
npm install sharp

# 运行压缩脚本（扫描、压缩、去重、生成 cache、报告音频/视频）
node "{skill_dir}/scripts/compress-images.mjs" --project . --image-threshold 300
```

## 脚本做什么 / 不做什么

**做**：扫描超阈图片 quality 80 压缩（保格式不 resize）· 内容 hash 去重（已压缩跳过）· 扫描超阈音频/视频并报告（不处理）· 生成 `.compress-cache.json`

**不做**：不 resize · 不删除重复文件（仅报告）· 不自动压缩音频/视频（审美决策，呈现方案让用户选）· 不重压到达标（压完仍超阈接受+告知）

## 幂等性

`.compress-cache.json` 内容 hash 匹配则跳过，重入不重复压缩。Git 门禁基线可 `git reset --hard` 回退原图。

## 反模式表

| ❌ 错误写法 | ✅ 正确写法 | 原因 |
|---|---|---|
| resize 图片 | 只压质量不 resize | 尺寸难定，破坏运营设计意图 |
| `.compress-cache.json` gitignore | cache 进 git | 跨人重复压缩累积损失 |
| 压缩前不告知直接改 | 告知"质量损失，Git 可回退"+确认 | 有损操作值得一次确认 |
| 不跑 vite build 就提交 | 压缩后 build 验证 | 压缩可能损坏图片破坏构建 |

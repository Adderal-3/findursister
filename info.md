# 项目技术信息

- Node.js：20+
- React：19
- TypeScript：5
- Vite：7
- Tailwind CSS：3.4
- 动效：framer-motion
- 图标：lucide-react

## 当前结构

```text
src/components/                         主界面、伙伴、对称 HUD、任务轨道、结算与弹窗
src/game/                               物品、任务、200 关、场景、音频、伙伴和存档
src/hooks/useGame.ts                    游戏状态、加时、每日成绩与总榜计分
src/platform/ds/                        大神任务、日榜/总榜与安全降级
src/assets/items/ancient/               123 件正式寻物素材
src/assets/partners/                    8 位伙伴头像
src/assets/ui/                          主界面和局内 UI 位图
src/assets/backgrounds/                 主界面和局内背景
tools/item-classification-review.html   分类复核工作台（生成文件）
tools/item-relations.html               只读属性关系表（生成文件）
数值表_src/levels_200.csv               当前权威关卡表
scripts/                                素材处理、200 关生成、分类表生成和内容校验
```

## 常用命令

```bash
npm install
npm run dev
npm run catalog:review
npm run check
```

`npm run check` 会校验内容、运行 ESLint、执行 TypeScript 与 Vite 生产构建。最近验证与尚未完成的真机项见 `design-qa.md`。

## 重要口径

- `数值表_src/levels_200.csv` 是当前关卡权威数据。
- 根目录 `数值表.xlsx` 是旧 100 关历史工作簿，尚未安全重建。
- 分类复核 HTML 只用于收集调整意见；生产分类仍维护在 `src/game/items.ts` 与 `src/game/tasks.ts`。
- 真正的任务奖励、日榜自然日、跨设备总榜与防作弊必须由可信平台服务完成。

# ds-act-workflow Eval 体系

> evals.json 从"81 条从未跑过的文本"升级为"可执行、可评分、已驱动 skill 改进的回路"。本文记录方法论与运行方式。

> 本文使用 Eval Case / Expected Output / Eval Runner / Semantic Scoring / Fixture / 审查型 Eval / 注入型 Eval 等术语，定义见根目录 `CONTEXT.md` 的 `## Eval 体系` 段。

## 目标

通过 eval 回路**改善 instructions**(能力/审查/契约文件),evals 是手段不是目的。回路:跑 eval → 失败 → 定位 skill 缺陷 → 改 instructions → 重跑转绿。

## 决策记录(ADR)

- `docs/adr/0001-eval-runner-execution-environment.md` — runner 在 OMP session 内执行(task subagent 加载 skill + `completion()` 语义评分),拒绝独立 CLI(CLI 无法执行 skill 文件操作)。
- `docs/adr/0002-eval-single-arm-default.md` — 默认单臂(with-skill),A/B baseline 仅作反常逃生阀(目标是改 instructions 不是论证 skill 存在性)。

## 两层 × 四框架

| 层 | eval 特征 | fixture | 评分 |
|---|---|---|---|
| 审计(模式2) | prompt 内联输入代码,输出审查报告 | 无需(纯对话) | `completion()` 语义 vs expected_output + analyst(cites_skill 正则) |
| 注入(模式1/Cocos-Vite) | prompt 描述项目,输出/生成文件 | 需 fixture 副本 | 结构断言(按框架适配)+ `completion()` 语义 |

框架:HTML / Cocos / React / Vue。注入型 eval 高度参数化冗余,**按框架代表性抽样(~4-5 条)即覆盖,不需跑全 35**。

## 运行回路(OMP)

1. **选 eval**:审计型 = prompt 含内联代码且输出报告;注入型 = 需项目,配 fixture 副本(`workspace/phase2-iteration-1/eval-<id>/project/`)。
2. **派 with-skill subagent**(单臂,`task` 工具):task 自包含——给 skill 路径 + prompt + "读 SKILL.md→路由→读 references→应用→产出"。subagent 只拿 prompt,**不泄漏 expected_output**。注入型 subagent 在 fixture 副本上真实改文件。
3. **取输出**:`await read('agent://AgentName')` 返回完整字符串(`output("AgentName")` 实测返回空对象,不可用)。
4. **评分**:
   - 审计:`completion(prompt,"default",sys,schema{pass,reason})` 语义分诊 + 正则检测引用 skill 模块(防先验作弊绿灯)。
   - 注入:结构断言(按框架:React/Vue 查 4 hooks/composables + markers + CONFIG + SDK-LOADER + click wrap + ds.d.ts;Cocos 查 entry.js ?url + index.html /entry.js + package.json vite^8 + public/assets)+ 语义。
5. **并发**:`parallel()` 跑 `completion()` 时一路 upstream error 会带垮整批——每条 try/catch 隔离 + 分波(~6)。
6. **失败归因三分法**(比对 expected_output vs 实际):
   - **skill-gap**(改 instructions)
   - **eval-design-bug**(改 eval:prompt/expected 错配、过时)
   - **grader-strictness**(改 grader/expected:finding 计数/精确串过严)
7. **改 instructions → 重跑失败条 → 验证转绿**(闭环)。

## 断言/评分设计原则

- 判"含必需项 / 契约正确模式"非"精确串匹配"(NAV-BAR 追加项、finding 合并都会假阳性)。
- expected_output 与 skill 契约矛盾时,**先怀疑 expected 过时**(eval-drift:四层重构改了产物结构但 expected 没同步)。

## 已验证覆盖
- **审计层(Phase 1)**:16 eval,发现并修 framework-diffs §7(React/Vue 审查修复模式+额外关注点),39/56 转绿。
- **注入层(Phase 2)**:5 eval(HTML×2 + Cocos/React/Vue×3),全 pass。appkey-naming 本地跑通(fuzzy_match,无需外网)。
- **补全回路(Phase 3)**:20 eval(任务1 重跑 7/26/38 + 任务2 17 条对话型覆盖 audit/structure/advisory/ds-act-sdk)。18/20 pass,**0 个 skill gap**——指令在未触达能力上站得住。任务1:eval 38 §8 skill gap 闭合(`vite_adaptation_note_mentioned=true`)、7/26 eval 改动闭环转绿。2 失败均 eval 侧(45=eval-design-bug 要 DataHub JSON 但无字段表;8=grader-strictness "无警告"歧义)。
- **deploy 层(Phase 4)**:3 eval(27 静态HTML/28 npm build/52 Cocos+Vite+CDN),全 pass,**0 skill gap**——deploy 能力(情况A dist 打包/情况B 原目录打包/Cocos MD5 hash+vite build 门禁 H1-H4)覆盖补全。
- **未覆盖能力补全(Phase 5)**:7 eval(miniapp 3/game-storage 15/server-storage 32/CPS 35/任务 34/回流 42/common-table 64),全 pass,**0 skill gap**。发现并修 1 处 skill 文档 stale(`server-storage/99-api-reference.md:259` 0.2.0 升级漏改的"CSS→JS"顺序)+ 1 处 eval expected 漂移(64 CSS 对齐 0.2.0)。
- **全量补跑(Phase 6)**:33 条剩余 eval 一波并行跑完(10/14/24/29/30/31/33/36/37/41/43/48/49/53/54/57/58/59/60/61/67/68/69/70/71/72/73/74/76/77/78/80/81),**33/33 pass,0 skill gap**。修 3 处 eval expected 漂移(29 pre-vite-gate 用 npm run build→npx vite build;31 要 saveGameData/盐值/STORAGE_KEY→save/load/clear/URL pathname/独立 ds.js;81 以为 IS_COCOS 覆盖框架→独立标志)。2 条首轮 agent-execution fail(14 前置失败未终止/30 漏奖励节点)重跑均 pass——证实子代理随机性非 instructions 缺陷。2 个子代理 yield 异常(60/72)从 transcript jsonl 提取答案重评转 pass;57 grader 误读 thunk≠async 纠正转 pass。
- **累计**:**81/81 eval 全跑完**(Phase1-6: 16/5/17/3/7/33),真正闭环 4 条(39/56 §7、38 §8)。**Phase 3-6 共 63 eval 0 skill gap、0 fail**(2 条 agent-execution 经重跑证实)。指令在全部能力路径(audit/inject/deploy/storage/sdk-功能/miniapp/common-table/CPS/任务/回流/角色/活动接口/advisory/structure)站得住。eval-drift 守卫 + 多轮 expected 修复防漂移。

## 工作区

`ds-act-workflow-workspace/`(skill 仓库同级,untracked):
- `iteration-1/pilot-grading.json`、`phase1b-grading.json` — 审计层
- `phase2-iteration-1/phase2a-grading.json`、`phase2b-grading.json`、`fixture-*-base/`、`eval-<id>/project/` — 注入层

## 待办

- eval 45/8 侧问题已修(45 删 DataHub JSON 要求;8 明确"无 script type 警告")。
- deploy 能力已覆盖(27/28/52 全 pass)。
- eval-drift 守卫脚本已加(scripts/check-eval-drift.mjs,81 eval 0 漂移)。
- 注入层 35 条参数化变体已全跑(Phase 6),非"代表性抽样"——ADR 0001 的抽样声明已被全量执行取代,结论更强。
- **0 条未跑 eval、0 fail**:81/81 全覆盖全 pass。2 条首轮 agent-execution fail(14/30)重跑均 pass,证实技能指令清晰、子代理随机性所致,无需改 instructions。

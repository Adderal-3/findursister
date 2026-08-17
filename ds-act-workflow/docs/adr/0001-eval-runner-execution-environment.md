# Eval Runner 在 OMP Session 内执行

evals.json 定义了 62 个 eval case(prompt + expected_output),但从未有 runner 执行过。决定 runner 在 OMP session 内执行:用 agent()/task subagent 加载 ds-act-workflow skill 处理每个 prompt,用 completion() 做 LLM 语义评分(pass/fail + 理由)。拒绝了独立 CLI 方案(scripts/run-evals.mjs 调 LLM API),因为独立 CLI 无法真正加载 skill 上下文——只能把 SKILL.md 内容注入 system prompt,agent 无法执行 skill 的文件操作(注入 SDK-LOADER、生成 ds.js、审查报告等),行为保真度低。代价是 runner 非独立可重复的 CLI,每次需在 OMP session 中执行。

## 待定

Fixture 模式(纯对话 / fixture 项目 / 混合)尚未决定,影响 runner 验证 skill 的哪一层行为(理解推理层 vs 完整文件操作层)。待后续确认。
## 决议(2026-07-16)

Fixture 模式定为**混合**:审查型 eval(输入内联在 prompt、输出为报告)走纯对话,无需 fixture;注入型 eval(需生成 ds.js / 改 index.html 等文件操作)走 fixture 项目层,用少量规范化输入项目(非 81 个 bespoke)。执行排序:审查型先跑(零 fixture 立即产生回路信号),注入型后补 fixture。

理由:0/81 fixture 使 in-session runner 当前无法做文件操作,fixture 决策是解锁本 ADR"文件操作保真度"理由的钥匙;审查型今天可跑、先产生信号,注入型再投入 fixture,避免"81 bespoke 项目"的不可维护陷阱。

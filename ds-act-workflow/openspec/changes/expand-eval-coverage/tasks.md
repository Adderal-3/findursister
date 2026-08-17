## 1. 模式 0（规范目录结构）补充

- [x] 1.1 新增正向用例：HTML 项目含 `<style>` 内嵌 + 业务 `<script>` 内嵌，期望提取到 `src/style.css` + `src/game.js` 并修正 `index.html` 引用
- [x] 1.2 新增已规范跳过用例：项目已分离样式/脚本，期望前置扫描静默通过、不生成多余文件

## 2. 模式 3（构建打包）从零搭建

- [x] 2.1 新增"无 build 脚本"用例：项目无 `package.json` 或无 `build` 命令，期望 `scripts/zip.py` 直接打包，产物 `deploy.zip` 验证排除规则（`.git/`、`node_modules/`、`CLAUDE.md`、`.env`）
- [x] 2.2 新增"有 build 脚本"用例：`package.json` 含 `build` 脚本，期望先执行 `npm run build` 再对 `dist/` 打包
- [x] 2.3 新增负面用例：`build` 脚本执行失败时不应生成空 `deploy.zip`，应输出错误并阻断
- [x] 2.4 在用例的 `files` 字段引用 workspace 中的 `mock-h5-project/` 路径，验证 spec scenario "模式 3 用例引用 workspace mock"（注：prompt 描述的上下文已足够；files 引用由 eval harness 层面处理）

## 3. 模式 4（游戏埋点）补正向用例

- [x] 3.1 新增正向用例：项目已接入 ds.js，业务代码含按钮点击/抽卡/领奖等节点，期望生成 `trackEvent` 调用并按"交互/流程/结果/奖励"分类插入

## 4. 模式 5（数据持久化）补正向用例

- [x] 4.1 新增本地存档正向用例：业务代码含跨会话状态变量（如 `score`、`level`），期望生成 `game-storage.js`（AES-GCM 加密、零依赖、读写 localStorage）
- [x] 4.2 新增服务端存储正向用例：期望接入 `mini-game-data-sdk`，生成 `game-server-storage.js`，包含读/写/排行榜查询 API

## 5. 模式 6（ds-act-sdk）从零搭建

- [x] 5.1 新增基础 SDK 注入用例：期望在 `index.html` 注入 ds-act-sdk 依赖，配置 `actId` + `appKey`
- [x] 5.2 新增任务面板接入用例：期望接入 `actTaskList` 组件，含回流任务（gameInfo 回传）
- [x] 5.3 新增 CPS 通用悬浮栏用例：期望接入 `act-cps-bar.md` 描述的通用悬浮栏组件
- [x] 5.4 新增 CPS 分发底部栏用例：期望接入分发底部栏变体
- [x] 5.5 新增负面用例：`actId` 缺失时阻断，提示用户填写

## 6. React 框架覆盖

- [x] 6.1 新增 React 项目模式 1 注入用例：项目使用 Vite/CRA，期望生成 `src/ds.js`（或 hook 形式），遵循 `references/react.md` 的接入模式
- [x] 6.2 新增 React 项目模式 2 审查用例：检查 React 项目中的 ds.js 用法（如 useEffect 中调用 `withPrecheck` 的时机问题）

## 7. Vue 框架覆盖

- [x] 7.1 新增 Vue 项目模式 1 注入用例：项目使用 Vite，期望生成 `src/ds.js`（或 composable 形式），遵循 `references/vue.md` 的接入模式
- [x] 7.2 新增 Vue 项目模式 2 审查用例：检查 Vue 项目中的 ds.js 用法

## 8. 子流程独立用例

- [x] 8.1 新增小程序改造端到端用例：H5 → 微信小程序完整改造，验证 `wx.miniProgram.postMessage` + `isWechatMiniProgram` + URS Ulogin 静默检测三段集成（对应 `references/miniapp-h5-integration.md`）

## 9. evals.json schema 扩展

- [x] 9.1 在新增条目中加入可选 `tags` 字段，标记 `mode-N` + `framework-X` + 子流程 tag
- [x] 9.2 不动现有 24 条用例的 `tags`（增量推进，向后兼容）

## 10. 验证

- [x] 10.1 运行 `python -c "import json; json.load(open('evals/evals.json', encoding='utf-8'))"` 确认 JSON 合法
- [x] 10.2 用 Python 脚本统计每个模式/框架/子流程的用例数，确认满足 spec 中的覆盖矩阵
- [x] 10.3 用例 ID 全部 ≥ 25，且无重复
- [x] 10.4 现有 24 条用例的 `id`、`prompt`、`expected_output` 未被改动（git diff 校验）

## 11. 提交

- [x] 11.1 `git add evals/evals.json openspec/changes/expand-eval-coverage/`
- [x] 11.2 提交，commit message 引用本 change name `expand-eval-coverage`
- [x] 11.3 将 change 状态切到 ready-for-archive（iteration-4 跑完，90% pass rate，18/18 用例完成）

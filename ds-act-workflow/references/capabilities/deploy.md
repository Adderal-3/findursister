# 能力：构建打包部署（模式 3 / DEPLOY）

> 将 H5 项目构建（若需）并打包为 `deploy.zip`，供上传至大神开发者平台（da.ds.163.com）。
>
> 核心逻辑：检测项目类型 → vite 构建门禁（`npx vite build`，全量项目必过）→ 路由到情况 A（打包 `dist/`）或情况 B（原目录打包）→ 生成 `deploy.zip`。

## 依赖

- **前置能力**：无（本能力可独立执行）。`capabilities/audit.md` 为推荐前置——audit 通过后再打包，避免带病上线；用户明确跳过审查时直接执行。
- **公共原语**：无。项目类型检测（Cocos / build 脚本）由本能力"判断规则"段内联完成，不依赖 `primitives/detect-framework.md`（deploy 的检测口径独立：Cocos 判定看 `cocos2d-js*.js` + `_CCSettings`，与 inject 的 `IS_COCOS` 判据不同源，因 deploy 关注的是部署结构而非 SDK 注入分支）。
- **外部工具**：
  - `zip.py`（`scripts/zip.py`）——统一打包脚本，情况 A 传 `dist` 参数、情况 B 无参。排除规则：`.gitignore`（优先）+ 硬编码黑名单（`EXCLUDE_DIRS`/`EXCLUDE_FILES`）+ `.env` 机密文件（保留 `.env.example`/`.env.sample`/`.env.template`）。
  - `npm`/`npx`（全量项目）——构建门禁阶段 `npm install`（缺 `node_modules` 时确保 vite 可用）与 `npx vite build` / `npx vite preview`（构建门禁，见判断规则 2）。
- **产物契约**：无（`deploy.zip` 是终端交付物，不被下游能力消费）。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| 项目根目录 | 工作目录 | 是 | 当前 cwd | 自动取（不询问用户） |
| `RUN_AUDIT` | 用户 | 否 | `true` | 交互询问（是否先审查再打包；Enter=审查 / S=跳过） |
| `zip.py` 路径 | Skill Base directory | 是 | — | Skill 加载时提示的 `Base directory` 拼接 `scripts/zip.py`（不硬编码） |

> **`RUN_AUDIT` 获取规则**：默认推荐先审查。用户选审查 → 读取并执行 `references/audits/index.md`，审查完成后继续；用户选跳过 → 直接进入检测路由。跳过审查仅在用户明确知道代码已审查过时使用，潜在问题不会被检测。

> **无业务参数收集**：deploy 不询问游戏圈子名、APP_KEY 等——这些是 inject/audit 的入参，打包阶段已固化在产物中。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| `deploy.zip` | 项目根目录 `./deploy.zip` | 情况 A：仅含 `dist/` 构建产物；情况 B：含项目原目录结构（排除 `.gitignore` + 黑名单 + `.env`）。ZIP_DEFLATED 压缩，相对路径保留。 |

> **部署去向**（非本能力产物，仅提示）：用户手动前往 https://da.ds.163.com/ 点击"上传H5"上传 `deploy.zip`。本能力不执行上传。

## 能做什么

- **检测项目类型并路由**：按短路逻辑判定 Cocos / 非 Cocos 有 build / 非 Cocos 无 build，路由到情况 A 或 B（见判断规则）。
- **执行 vite 构建门禁（全量项目，打包前必过）**：所有项目打包前必须通过 `npx vite build` 构建门禁（H1 构建成功 / H2 产物全 hash / H3 public 无图 / H4 preview 静态资源 200），门禁不过则不打包。理由：上传 zip 后部署平台会再触发一次 vite 构建，本地预检不过平台同样会失败。
- **情况 A 打包构建产物**：门禁产出的 `dist/` 经 `zip.py dist` 仅打包构建产物。
- **情况 B 原目录打包**：调用 `zip.py`（无参）打包当前目录全部文件，保持原始目录结构，适合直接部署到 CDN。
- **统一排除规则**：两种情况均经 `zip.py`，排除 `.gitignore` 匹配项 + 硬编码黑名单（`node_modules`/`.git`/`deploy.zip`/lock 文件/配置文件/`.env` 机密等），确保包内无开发态冗余与机密泄露。
- **输出部署指引**：生成 `deploy.zip` 后提示文件名/路径，并给出上传到大神开发者平台的操作步骤。

## 不能做什么

- **不上传部署包**——只生成 `deploy.zip`，上传到 da.ds.163.com 由用户手动完成。
- **不修改业务代码（门禁自动修复除外）**——构建（`npx vite build`）是只读变换，打包是文件收集，均不改业务逻辑；但 H2/H3 门禁命中时触发自动修复（改 `import`/移图片到 `src/`），属构建合规修正非业务逻辑改动。
- **不替代 audit**——跳过审查时不做任何合规校验，潜在 Marker 残留/占位符未替换等问题不会被检测。
- **不处理 H1/H4 构建失败**——`npx vite build`（H1）退出码非 0 或 preview 静态资源（H4）非 200/有 404 时阻断交还用户手动修复，不自动修复（那是调试范畴）。H2/H3（产物未全 hash / 图片误放 public）则触发自动修复 + 重建循环（≤3 轮，见判断规则 2）。
- **不决定 Cocos 是否接 Vite**——Cocos 项目一律走情况 B（原目录打包），即使 `package.json` 含 build 脚本也不走情况 A。原因见判断规则。
- **不排除 `dist/` 之外的手动产物**——情况 A 仅打包 `dist/`，若构建产物散落在外（如 `public/` 拷贝），不会收集；情况 B 则按原目录全量打包（受排除规则约束）。

## 判断规则

### 1. 项目类型检测短路逻辑（核心路由）

检测分两步，**有短路逻辑**——Cocos 命中后不再检测 package.json：

| 步骤 | 检测条件（均排除 `node_modules`、`dist`） | 命中 → 路由 |
|------|------------------------------------------|------------|
| ① Cocos 检测 | 存在 `cocos2d-js*.js` 文件 **且** 任意 `.js` 含 `_CCSettings` | **情况 B**（短路，不再走步骤②） |
| ② 非 Cocos → build 脚本检测 | `package.json` 存在且 `scripts.build` 存在 | **情况 A** |
| ② fallback | 上述均不满足 | **情况 B** |

> **为什么 Cocos 走情况 B？** Cocos web-mobile 部署到 CDN 时需要根目录原样结构（`index.html` + 引擎 JS + `assets/` bundle），路径是硬编码的。即使接了 Vite，`npx vite build` 后的 `dist/` 仅作门禁预检，部署时仍需按 H5 原目录结构打包。故 Cocos 命中即短路到情况 B，无视 package.json。

> **Cocos 检测口径与 inject 的 `IS_COCOS` 不同源**：inject 的 `IS_COCOS` 服务于"是否跳过微信 JSSDK 注入"，deploy 的 Cocos 检测服务于"是否走原目录打包"。两者判据相近但用途独立，不互相传递。

### 2. vite 构建门禁（打包前必过）

> 所有项目部署前必须通过 `npx vite build` 构建门禁。上传 zip 后部署平台会再触发一次 vite 构建——本地预检不过，平台同样会失败。**门禁不过则不打包。**

**硬门禁（必须通过，不过则修复后重跑、不打包）：**

**H1 — `npx vite build` 构建成功（退出码 0）**〔全量项目〕

语法错误 / import 解析失败 / vite.config 非法 / 入口 index.html 缺失 / Cocos 引擎脚本未走 entry.js `?url` 被 Rollup 解析——均体现在退出码非 0。相对路径 `<script>` 缺 `type="module"` 不导致构建失败（Vite 只忽略/警告），由 H2 兜底（产物里残留裸路径 → 无 hash → fail）。

**H2 — 产物资源全 hash 校验**〔仅非 Cocos〕

构建后扫 `dist/` 里构建后的 HTML/JS，校验其中**所有本地（相对路径）js/css/img 引用都是 hashed URL**（`/assets/[name]-[hash].[ext]`），证明被 Vite 构建：

- 本地引用是 hashed URL = 被 Vite 构建图纳入（含 `import.meta.glob` 收集的图片）→ OK
- 本地引用是裸路径/无 hash（如 `./assets/questions/` + 变量、`assets/x.png` 原样残留）→ 没被 Vite 构建（动态拼接漏网，或 `public/` 原样复制）→ ❌ fail
- 豁免：外部 `http(s)://` URL（CDN SDK：JSSDK、ds-act-sdk、mini-game-data-sdk、微信 JSSDK、universal-login、mobile-share、导航栏——Vite 故意不动外部 URL，按原样保留）；`data:` URI（Vite 默认 `assetsInlineLimit: 4096`，小于 4KB 的资源即使 `?url` 引入也内联为 `data:` URI 而非 hashed 文件——属正常构建行为）；`favicon.ico`

> 原理：源码用 `import`/`import.meta.glob` 的，产物里本地引用是 hashed URL；动态拼接的或 `public/` 里的，产物里是裸路径/无 hash。退出码抓不到，hash 校验能抓到。**只查本地引用、外部 CDN URL 豁免**——否则会误杀每个 DS 项目。纯静态项目打包源码不打 dist，但 hash 校验仍有效——dist 从源码构建，源码有问题则产物有问题，修复落在源码，平台重建即干净。

> **平台构建与本地 Vite 的差异（关键）**：`import x from 'file.png'`（不带 `?url`）在本地 Vite 构建中会转为 URL 字符串，但**平台构建可能把非 JS 文件当模块加载** → 浏览器 MIME type 检查失败（`image/png` ≠ JS）。规则：非 JS 资源 import 一律带 query 后缀——图片/音频 `?url`、JSON/文本 `?raw` + `JSON.parse()`。小文件（< ~6KB）被 inline 为 data URI 不报错，大文件发成独立模块文件才报错——本地测试可能通过但平台失败。
>
> **H2 补充检查：plain `<script src>` 未 hash**：扫 `dist/index.html`，若 plain `<script src="...">`（非 `type="module"`）引用的本地文件未 hash → 报警。Vite 只处理 `<script type="module">`，plain script 原样保留。修复：改为 ES module `import './file.js'` 在 JS 中引入。

**H3 — 媒体资源禁止放 `public/`**〔仅非 Cocos，源码检查〕

扫 `public/` 下媒体资源文件（图片 `.png`/`.jpg`/`.webp`/`.svg`/`.gif`，音频 `.mp3`/`.wav`/`.ogg`，视频 `.mp4`/`.webm`）：有 → ❌ 阻断（`public/` 媒体原样复制不带 hash，违反 H2，且路径原样暴露含特殊字符致服务器异常如 505），必须移到 `src/` 用 `import`/`import.meta.glob` 引用。豁免：`favicon.ico`。

**H4 — preview 静态资源验证**〔全量项目〕

构建后 `npx vite preview` 启动，程序化校验**静态资源**（js/css/img）：静态资源路径返回 HTTP 200、无 404。**不查 pageerror、不查 DS SDK/登录/后端 API 的非 200**——大神活动 H5 依赖宿主环境（`ServerStorage.loadFull`、`isInDashenApp`、DS SDK init、后端 API），无头 preview 跑在大神 App 之外，SDK/登录/API 必然报错，属运行时环境问题非构建问题。豁免：`favicon.ico`（404 可容忍）。

> 程序化方式任选：`curl` 逐项检查 `dist/index.html` 与 built JS 引用的资源路径，或 headless 浏览器监听 `response` 事件收集静态资源 404。

**Cocos 门禁**〔H1 + cocos-vite 验证步骤〕

Cocos 的 `public/assets/<bundle>/`、jsList、`_CCSettings` 资源是引擎按固定路径加载、**故意不 hash**（走编辑器 MD5 Cache，见 `references/capabilities/cocos-vite.md`）。H2/H3 对 Cocos 引擎资源技术上无法满足，强制会破坏引擎，故 Cocos 不走 H2/H3：

- **H1**：`npx vite build` 退出码 0
- 重跑 `references/capabilities/cocos-vite.md`「执行步骤」的**验证**步骤（build → dist/ 静态 stat → preview 运行时 HTTP 200 + 无 404）。**deploy 门禁覆盖该步骤的 pageerror 检查——降级为软门禁**：原文「无 pageerror」在 deploy 门禁中不适用，理由同 H4——大神活动 H5 在 App 外 preview 时 SDK/登录/API 必然抛 pageerror，属运行时环境问题非构建问题。

任一缺失 / 静态资源非 200 / 有 404 → 阻断。

**自动修复 + 重建循环**：H2/H3 命中 → 回源码定位 → 改写 → 重建 → 重校验，**上限 3 轮**；仍不过 → 阻断交还用户手动修复。

- H2 未带 hash（动态拼接漏网）：定位 → 改 `import x from 'file.png?url'`（单图，**必须带 `?url`**）/ `import.meta.glob`（多图，`{ eager: true, query: '?url', import: 'default' }` 生成 `键 → hashed URL` 映射）/ `import raw from 'file.json?raw'` + `JSON.parse()`（JSON，**不用直接 import 也不用 fetch**）
- H3 媒体资源在 `public/`：移到 `src/`，引用改 `import`/`import.meta.glob`

> Cocos 豁免一致性：源码扫描与产物扫描（H2）都豁免 Cocos 引擎管理路径（`settings*/main*/cocos2d-js*/physics*.js`、`public/` 下 bundle/jsList、`cc.resources.load`/`cc.assetManager.loadResources`/`loadBundle` 等）。

> **产品审美决策不自动执行**：音频压缩参数（时长截取、码率、单/双声道）、图片质量等级（有损 palette vs 无损）属产品/审美选择。命中软门禁时先呈现方案（如"A: 60s/64kbps/mono → 470KB" vs "B: 45s/96kbps/stereo → 430KB" vs "C: 不压缩"），让用户选，不自动执行。

**软门禁（警告，不阻断）：** vite 构建警告（chunk 过大、废弃 API 等）、`console.log`/`debugger`/`alert` 残留、SDK CDN 版本过旧（JSSDK / ds-act-sdk / mini-game-data-sdk）提示升级、**资源体积超阈**（扫 `dist/assets/` 图片 > 300KB / 音频 > 500KB / 视频 > 3MB → ⚠️ 提示压缩：tinypng / 转 webp / 资产管理上传大音频，或执行 mode 9 资源优化自动压缩；软门禁不阻断，因体积阈值难统一，硬阻断误杀）。阈值可配置，见 `references/capabilities/resource-optimization.md`。

**执行：**

```bash
# 1) 确保 vite 可用（有 package.json 且 node_modules 缺失 → npm install；无 package.json → npx 自动拉取）
# 2) npx vite build（H1）
# 3) 非 Cocos：H3 扫 public/ 媒体资源 + H2 扫 dist 全 hash；Cocos：重跑 cocos-vite 验证步骤
# 4) npx vite preview 静态资源 200/无 404（H4）
# 5) 软门禁：扫 dist/assets/ 媒体体积超阈（阈值见上方软门禁段 → 警告）
npx vite build
npx vite preview
```

- 硬门禁不过 → ❌ 阻断，自动修复源码 + 重建 ≤3 轮；仍不过交还用户，**不打包**
- 软门禁 → ⚠️ 警告，继续
- 全部硬门禁通过 → ✅ 继续打包目标路由

> 不检测包管理器类型（yarn/pnpm）——统一用 `npm` 确保 vite 可用，因大神 H5 项目以 npm 为主流。若项目仅含 `yarn.lock`/`pnpm-lock.yaml`，`npm install` 仍可工作（生成 `package-lock.json`），但 `zip.py` 会排除这些 lock 文件不打入包内。
>
> 本地构建产物 `dist/` 仅作预检。是否打包 `dist/` 取决于打包目标路由（情况 A 打包 dist/，情况 B 打包当前目录）。

### 3. 打包目标路由

| 路由结果 | `zip.py` 调用 | 打包源 |
|---------|--------------|--------|
| 情况 A | `python "{skill_dir}/scripts/zip.py" dist` | 仅 `dist/` 子目录 |
| 情况 B | `python "{skill_dir}/scripts/zip.py"` | 当前目录（cwd） |

## 幂等性

- **重入检测标志**：项目根目录存在 `deploy.zip`。
- **重入行为**：
  - **`deploy.zip` 已存在**：直接覆盖（`zip.py` 以 `'w'` 模式打开，不追加）。不询问用户确认——deploy 产物本就是可重生成的，旧包无保留价值。
  - **情况 A 重入**：重新执行 vite 构建门禁（`npx vite build` 本身应幂等，产物覆盖 `dist/`），再重新打包覆盖 `deploy.zip`。
  - **情况 B 重入**：重新扫描当前目录打包，覆盖 `deploy.zip`。
- **无副作用残留**：本能力不写任何项目源文件，仅生成 `deploy.zip`（位于项目根，被 `zip.py` 排除规则排除自身，不会自包含）。

## 执行步骤

本能力是**串行管线**，无可并行节点：

```
RUN_AUDIT 询问
  ├─ 是 → 执行 audit（references/audits/index.md）→ 审查完成
  └─ 否 → 跳过
  ↓
项目类型检测（短路逻辑）
  ├─ Cocos 命中 → 情况 B
  └─ 非 Cocos → build 脚本检测 → 情况 A / 情况 B
  ↓
vite 构建门禁（全量项目，门禁不过则不打包）
  ├─ H1 npx vite build 退出码 0
  ├─ 非 Cocos：H2 产物全 hash + H3 public 无图；Cocos：重跑 cocos-vite 验证步骤
  ├─ H4 preview 静态资源 200/无 404
  └─ 硬门禁不过 → 自动修复 + 重建 ≤3 轮；仍不过 → 阻断交还用户
  ↓
媒体体积软门禁（stat `dist/assets/` 媒体体积——vite build 不警告体积，须自检）
  ├─ 图片 >300KB / 音频 >500KB / 视频 >3MB → ⚠️ 警告（不阻断）
  ├─ 命中 → 呈现压缩方案 A/B/C 让用户选（产品审美决策**不自动执行**，见软门禁段）；选压缩 → 执行 mode 9 资源优化
  └─ 无超阈 / 用户选不压缩 → 继续
  ↓
[情况 A] zip.py dist（打包门禁产出的 dist/）
[情况 B] zip.py（无参，打包当前目录）
  ↓
deploy.zip 生成（覆盖旧包）
  ↓
部署指引输出（提示上传到 da.ds.163.com）
```

## 反模式表

> 以下反模式从 SKILL.md 迁移，与 deploy 能力相关。

| ❌ 错误写法 | ✅ 正确写法 | 原因 |
|---|---|---|
| 浏览器缓存了旧版 HTML，新增的 script 标签未生效 | 部署后强制刷新（Ctrl+Shift+R），或用 URL 参数加版本号 `?v=20260604` | `ServerStorage` 等新变量报 `is not defined` 且 console 中确认对应 `<script>` 标签确实存在于 HTML 中，99% 是浏览器缓存旧版 HTML 导致；旧版 HTML 没有对应的 `<script src="...">` 标签，自然不会定义这些变量 |
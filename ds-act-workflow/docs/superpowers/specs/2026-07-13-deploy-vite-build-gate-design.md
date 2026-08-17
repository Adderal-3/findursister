# Deploy 构建门禁设计（npx vite build gate）

> 日期：2026-07-13
> 范围：`references/deploy.md` 步骤 2「构建门禁」的硬/软门禁定义与流程。
> 目标：deploy 打包前先 `npx vite build` 预检，确保上传 deploy.zip 后部署平台的 vite 构建无问题；门禁不过则不打包。

## 背景

原 deploy 流程（情况 A）用 `npm run build` 产出 `dist/` 后直接 `zip.py dist`，无构建门禁。问题：

1. 退出码 0 ≠ 产物正确：动态拼接的图片路径 Vite 无法静态分析，不进构建图，退出码仍 0，但产物运行时 404。
2. public/ 里的资源被原样复制、不带 hash，等于没被 Vite 构建。
3. 上传 zip 后部署平台会再触发一次 vite 构建；本地不预检，平台构建失败才发现。

## 设计

所有项目（Cocos / 非 Cocos / 纯静态）部署前都跑 `npx vite build` 预检。门禁分硬/软；硬门禁不过则修复后重跑，**不打包**。

### 硬门禁

**H1 — `npx vite build` 构建成功（退出码 0）**〔全量项目〕

语法错误 / import 解析失败 / vite.config 非法 / 入口 index.html 缺失 / Cocos 引擎脚本未走 entry.js `?url` 被 Rollup 解析 —— 均体现在退出码非 0。相对路径 `<script>` 缺 `type="module"` 不导致构建失败（Vite 只忽略/警告），由 H2 兜底（产物里残留裸路径 → 无 hash → fail）。

**H2 — 产物资源全 hash 校验**〔仅非 Cocos〕

构建后扫 `dist/` 里构建后的 HTML/JS，校验其中**所有本地（相对路径）js/css/img 引用都是 hashed URL**（`/assets/[name]-[hash].[ext]`），证明被 Vite 构建：

- 本地引用是 hashed URL = 被 Vite 构建图纳入（含 `import.meta.glob` 收集的图片）→ OK
- 本地引用是裸路径/无 hash（如 `./assets/questions/` + 变量、`assets/x.png` 原样残留）→ 没被 Vite 构建（动态拼接漏网，或 `public/` 原样复制）→ ❌ fail
- 豁免：
  - 外部 `http(s)://` URL（CDN SDK：JSSDK、ds-act-sdk、mini-game-data-sdk、微信 JSSDK、universal-login、mobile-share、导航栏——Vite 故意不动外部 URL，按原样保留）
  - `data:` URI（Vite 默认 `assetsInlineLimit: 4096`，小于 4KB 的资源即使 `?url` 引入也内联为 `data:` URI 而非 hashed 文件——属正常构建行为，证明资源已进构建图）
  - `favicon.ico`

> 原理：源码用 `import`/`import.meta.glob` 的，产物里本地引用是 hashed URL；动态拼接的或 `public/` 里的，产物里是裸路径/无 hash。退出码抓不到，hash 校验能抓到。**只查本地引用、外部 CDN URL 豁免**——否则会误杀每个 DS 项目（它们都注入了未 hash 的外部 SDK）。纯静态项目打包源码不打 dist，但 hash 校验仍有效：dist 从源码构建，源码有问题 → dist 产物有问题 → 抓到；修复落在源码，平台重建即干净。

**H3 — 图片禁止放 public/**〔仅非 Cocos，源码检查〕

扫 `public/` 下图片文件（`.png`/`.jpg`/`.webp`/`.svg`/`.gif`）：

- 有 → ❌ 阻断：public/ 图片被原样复制不带 hash（违反 H2），必须移到 `src/` 用 `import`/`import.meta.glob` 引用
- 豁免：`favicon.ico`

**H4 — preview 静态资源验证**〔全量项目〕

构建后 `npx vite preview` 启动，程序化校验**静态资源**（js/css/img）：

- 静态资源路径返回 HTTP 200
- 无 404
- 豁免：`favicon.ico`（404 可容忍）

> **不查 pageerror、不查 DS SDK/登录/后端 API 的非 200**：这些是大神活动 H5 页，依赖大神宿主环境（登录态 `ServerStorage.loadFull`、`isInDashenApp`、DS SDK init、后端 API）。`npx vite preview` 在无头浏览器跑在大神 App 之外，SDK/登录/API 必然报错——属运行时环境问题，不是构建问题。构建门禁只管"产物静态资源能不能加载"。
>
> 程序化方式任选：`curl` 逐项检查 `dist/index.html` 与 built JS 引用的资源路径，或 headless 浏览器监听 `response` 事件收集静态资源的 404（参考 `cocos-vite-integration.md` 步骤 6.2）。

**Cocos 门禁**〔H1 + cocos-vite 步骤 6〕

Cocos 的 `public/assets/<bundle>/`、jsList、`_CCSettings` 资源是引擎按固定路径加载、**故意不 hash**（走编辑器 MD5 Cache，见 `cocos-vite-integration.md`）。H2（全 hash）/H3（图片不放 public）对 Cocos 引擎管理资源技术上无法满足，强制会破坏引擎。故 Cocos 不走 H2/H3，改为：

- H1：`npx vite build` 退出码 0
- 重跑 `cocos-vite-integration.md` 步骤 6（**deploy 门禁覆盖 6.2 的 pageerror 检查——降级为软门禁**：6.2 原文「pageerror 必须为空数组」在 deploy 门禁中不适用，理由同 H4——大神活动 H5 在 App 外 preview 时 SDK/登录/API 必然抛 pageerror，属运行时环境问题非构建问题）：
  - **6.1 静态产物自检（stat）**：`dist/` 含预期 hashed 引擎文件（settings/main/cocos2d/physics 经 `?url` import 带 hash）、`dist/assets/index-*.js`、`dist/assets/index-*.css`、各 bundle 子目录、jsList 部署路径（含运行时前缀）
  - **6.2 运行时网络自检**：preview 后入口/引擎组 + 运行时资源组的**静态资源**全部 200、无 404（= H4 的 Cocos 实例；**pageerror 降级为软门禁**，不阻断）

任一缺失 / 静态资源非 200 / 有 404 → 阻断。

### 自动修复 + 重建循环

H2/H3 命中 → 回源码定位 → 改写 → 重建 → 重校验：

- H2 未带 hash（动态拼接漏网）：用审查 4.5.5 扫描定位动态拼接 → 改 `import`（单图）/ `import.meta.glob`（多图，`{ eager: true, query: '?url', import: 'default' }` 生成 `键 → hashed URL` 映射）
- H3 图片在 public/：移到 `src/`，引用改 `import`/`import.meta.glob`
- 重新 `npx vite build` → 重跑 H2/H4
- 循环至全过，**上限 3 轮**；仍不过 → 阻断，交还用户手动修复

> Cocos 豁免一致性：源码扫描（审查 4.5.5）与产物扫描（H2）都豁免 Cocos 引擎管理路径（`settings*/main*/cocos2d-js*/physics*.js`、`public/` 下 bundle/jsList、`cc.resources.load`/`cc.assetManager.loadResources`/`loadBundle` 等）。

### 软门禁（警告，不阻断）

- vite 构建警告（chunk 过大、废弃 API 等）
- `console.log` / `debugger` / `alert` 残留
- SDK CDN 版本过旧（JSSDK / ds-act-sdk / mini-game-data-sdk）提示升级

### 流程

```
步骤 1（可选审查）
步骤 2 构建门禁：
  npx vite build                              → H1 退出码 0
  ├─ 非 Cocos：
  │    H3 扫 public/ 图片（有则移 src/ + 改 import）
  │    H2 扫 dist/ 产物 js/css/img 全带 hash（favicon 豁免）
  │    H4 preview 静态资源 200/无 404（favicon 豁免；不查 pageerror / DS SDK 非 200）
  └─ Cocos：重跑 cocos-vite 步骤6（stat + preview，= H1+H4）
  命中 → 自动修复源码 + 重建，≤3 轮；硬门禁不过 → 不打包
  软门禁 → 警告
步骤 3 打包路由（不变：Cocos→当前目录 / 非Cocos+build→dist / 纯静态→当前目录）
步骤 4 部署完成
```

## 不在范围内

- 打包内容/路由不变（非 Cocos + build 脚本 → dist；Cocos / 纯静态 → 当前目录）。
- `scripts/zip.py` 排除规则不变。
- 审查模式 4.5.5 的自动修复已另行修正为 import/import.meta.glob（见 `add-static-asset-path-audit` 变更）。

## 验收

- 非 Cocos 项目：源码动态拼接图片 → H2 扫到无 hash → 自动修复为 import/import.meta.glob → 重建后全 hash → 才 zip；public/ 放图片 → H3 阻断/修复；preview 静态资源有 404 → H4 阻断。
- Cocos 项目：H1 + 步骤 6（stat + preview）全过才 zip；`public/` bundle 不被误判。
- 构建失败（H1/H2/H3/H4 任一）→ 不生成 deploy.zip。

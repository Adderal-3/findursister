# 能力：启动开发服务器（模式 7 / DEV-SERVER）

> 在本地启动 HTTPS 静态服务器伺服 H5 项目根目录，配置 hosts 与 nohost 规则，终端输出二维码供手机扫码调试。

## 依赖

- **前置能力**：无。
- **公共原语**：无。
- **产物契约**：无。
- **外部工具**：
  - Node.js ≥ 18——伺服脚本运行时。
  - `mkcert`——生成本地受信 HTTPS 证书。缺失时输出安装命令（macOS `brew install mkcert` / Windows `choco install mkcert`）。
  - `scripts/detect-identity.mjs`——检测工号、内网 IP、域名。
  - `scripts/server.mjs`——hono + serveStatic 静态服务器，qrcode-terminal 输出 ASCII 二维码。
- **外部技能**：无。

## 入参

| 参数 | 来源 | 必填 | 默认 | 获取方式 |
|------|------|------|------|----------|
| H5 项目根目录 | 用户 | 是 | — | 交互询问（待伺服的项目路径） |
| 端口 | 用户 | 否 | `8443` | 可推断（默认 8443，用户可覆盖） |
| 工号 | detect-identity.mjs | 是 | — | 前置传递（脚本自动检测） |
| 内网 IP | detect-identity.mjs | 是 | — | 前置传递（须为 `10.255.*` 段，否则报错退出） |
| hostname | 拼接 | 是 | — | 可推断（`{工号}.ds.163.com`） |

> **hostname 推导规则**：`hostname = "{工号}.ds.163.com"`，由 detect-identity.mjs 输出，agent 不询问用户。

## 出参

| 产物 | 位置 | 契约 |
|------|------|------|
| 运行中的 HTTPS 服务器 | 后台进程（TaskStart） | 伺服 H5 项目根目录，端口默认 8443，使用 `{hostname}` 证书 |
| HTTPS 证书 | `scripts/.dev-cert/{hostname}-key.pem` + `{hostname}.pem` | mkcert 生成，已存在则跳过 |
| hosts 条目 | 系统 hosts 文件 | `127.0.0.1 {hostname}` |
| nohost 规则状态 | `scripts/.dev-server-state.json` | 记录已配置 IP，IP 变化时提醒更新 |
| 终端二维码 | stdout | qrcode-terminal 输出，URL 为 `https://{hostname}:{端口}` |

## 能做什么

- **检测身份**：运行 detect-identity.mjs 输出工号、内网 IP、hostname；未检测到 `10.255.*` 段 IP 则报错退出并提示连接公司有线网络或 Netease-WiFi。
- **生成 HTTPS 证书**：检查 `scripts/.dev-cert/{hostname}-key.pem` 与 `{hostname}.pem` 是否已存在；缺失任一才执行 `mkcert -install` + 生成证书，已存在则跳过。
- **写入 hosts**：将 `127.0.0.1 {hostname}` 追加到系统 hosts 文件；权限不足时输出对应平台手动命令（win32 管理员终端 / macOS·Linux `sudo`）。
- **引导 nohost 配置**：询问用户是否打开 nohost 规则页（`https://nohost.dev.cc.163.com/data.html#rules`）；已配置且 IP 未变 → 静默跳过；IP 变化 → 提醒更新。打开后提示选择 `cc_fe/大神域名开发`，填入域名 + IP。
- **启动服务器**：运行 `node scripts/server.mjs "{H5项目根目录}" {端口} {hostname}`，hono serveStatic 伺服目录、自动处理 MIME 与默认 `index.html`，qrcode-terminal 输出二维码。
- **告知关闭方式**：启动后明确告知用户"对我说'关闭开发服务器'或'停止 server'"，收到请求时用 TaskStop 停止后台任务。
- **输出手机调试指引**：连接 Netease-5G WiFi → 代理 `7.26.15.254:8900` → 扫描终端二维码。

## 不能做什么

- **不伺服非 H5 项目**——server.mjs 是静态文件服务器，不处理构建步骤；Cocos/React/Vue 项目须先构建出静态产物。
- **不绕过 `10.255.*` 段校验**——未连公司网络时直接报错退出，不降级为 HTTP 或 localhost。
- **不强制 nohost 配置**——仅引导询问，用户拒绝则跳过（但手机扫码可能打不开）。
- **不管理证书信任**——`mkcert -install` 安装本地 CA，但系统信任弹窗需用户手动确认。
- **不决定后续能力路由**——服务器运行期间可配合 inject/ad-preview 等能力调试，但不强制执行。

## 判断规则

### 1. IP 段校验

detect-identity.mjs 输出的内网 IP 须匹配 `10.255.*` 段。不匹配 → 报错退出，提示"确认已连接公司有线网络或 Netease-WiFi"。不降级、不询问是否继续。

### 2. 证书存在性判定

| 条件 | 行为 |
|------|------|
| `{hostname}-key.pem` 与 `{hostname}.pem` 均存在 | 跳过生成（幂等） |
| 缺失任一文件 | 执行 `mkcert -install` + 生成两个文件 |

> hostname 变化（工号不同）时证书路径不同，视为新证书重新生成。

### 3. nohost 规则状态判定

| `.dev-server-state.json` 记录 | 当前 IP | 行为 |
|------|------|------|
| 已记录且等于当前 IP | — | 静默跳过引导 |
| 已记录但不等于当前 IP | 变化 | 提醒用户更新 nohost 规则中的 IP |
| 无记录 | — | 询问是否打开 nohost 规则页 |

## 幂等性

- **重入检测标志**：
  - 证书：`scripts/.dev-cert/{hostname}-key.pem` + `{hostname}.pem` 存在。
  - hosts：系统 hosts 文件含 `127.0.0.1 {hostname}` 行。
  - nohost：`.dev-server-state.json` 记录的 IP 等于当前 IP。
  - 服务器：端口已被占用（EADDRINUSE）。
- **重入行为**：
  - **证书**：已存在 → 跳过生成。
  - **hosts**：已含目标行 → 跳过追加（避免重复行）。
  - **nohost**：IP 未变 → 静默跳过引导；IP 变化 → 提醒更新。
  - **服务器**：**端口占用时报错**——不自动换端口、不静默复用旧进程。提示用户先关闭已有服务器（"关闭开发服务器"）再重试。

## 执行步骤

本能力是**串行管线**，每步输出是下一步输入：

```
detect-identity.mjs（工号 + 内网 IP + hostname，IP 段校验）
  ↓
证书生成（检查存在性 → 缺失则 mkcert 生成）
  ↓
hosts 写入（追加 127.0.0.1 {hostname}，已存在则跳过）
  ↓
nohost 配置引导（读 .dev-server-state.json → IP 未变跳过 / 变化提醒 / 无记录询问）
  ↓
启动 server.mjs（HTTPS 静态伺服 + 终端二维码）
  ↓
输出手机调试指引 + 关闭方式告知
```


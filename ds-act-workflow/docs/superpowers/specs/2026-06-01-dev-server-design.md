# Dev Server — 大神 H5 本地开发环境快速启动

## 目标

在 ds-act-workflow 技能中新增模式 [7]，一键启动 HTTPS 静态资源服务器，自动配置 hosts，
终端输出二维码供手机扫码调试，引导用户配置 nohost 代理规则。

## 约束

| 项 | 决策 |
|------|------|
| **菜单** | SKILL.md 新增 [7] 启动开发环境 |
| **references** | `references/dev-server.md`（Claude 读取的执行手册） |
| **脚本** | `scripts/dev-server.js`（Node 单文件，零 npm 依赖） |
| **域名** | `{工号}.ds.s163.com`，工号从 `os.userInfo().username` 取 |
| **IP** | 自动取 `10.255.*` 网段第一个地址，找不到则报错"未连接公司内网" |
| **HTTPS** | mkcert 签发证书，缓存到 `scripts/.dev-cert/` |
| **hosts** | 自动追加 `127.0.0.1 {hostname}` 标记块，不清除、不回滚 |
| **nohost 引导** | Y/n/s 三选项 + 状态记忆 (.dev-server-state.json) + IP 变化检测 |
| **服务端口** | 默认 8443，被占自动 +1（最多 5 次） |
| **服务器监听** | 0.0.0.0（接受 nohost 代理转发） |
| **二维码** | 终端 ASCII（约 25×13 半块字符 QR），零依赖 |
| **浏览器** | 启动后自动打开，跨平台（open/start/xdg-open） |
| **交互** | 前台运行，Ctrl+C 退出 |
| **git 忽略** | `.dev-cert/`、`.dev-server-state.json` |
| **测试** | `node:test` + `node:assert`，放在 `scripts/test_dev_server.js` |

## 架构

```
SKILL.md
  └── [7] → references/dev-server.md（Claude 执行步骤）
                └── node scripts/dev-server.js
```

dev-server.js 内部模块：

```
detectIdentity()     → 工号 + 10.255.* IP
ensureCert(hostname) → mkcert 签发，缓存到 .dev-cert/
ensureHosts(hostname) → 追加标记块到系统 hosts
loadState() / saveState() → .dev-server-state.json 读写
maybeOpenNohost({hostname, lanIp}) → Y/n/s 询问 → 打开 nohost 配置页
createServer({root, port, keyPath, certPath}) → HTTPS 静态文件服务
printQRCode(url) → 终端 ASCII 二维码
openBrowser(url) → 跨平台打开
trapSignals(server) → Ctrl+C 退出
```

## 关键设计决策

### hosts 不回滚
员工通常长期从事大神经 H5 开发，hosts 常驻更合理，避免每次启动都改系统文件。

### 零依赖
仅依赖 Node 内置模块（https, fs, os, path, readline, child_process, crypto 等）
和外部工具 mkcert（独立二进制）。首次启动无需任何 npm install。

### nohost 状态记忆
.nohost-state.json 记录"用户是否已配置过"和"上次的 lan_ip"。
IP 变化时提醒用户更新 nohost 规则；相同 IP 且已标记 configured 则静默跳过。

### 端口自动递增
8443 默认端口，被占自动尝试 8444、8445... 最多 5 次。
避免多人同时开发或之前进程残留导致端口冲突。

## 文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `SKILL.md` | 改 | 菜单加 [7]，映射表加行 |
| `references/dev-server.md` | 新 | Claude 读的执行步骤 |
| `scripts/dev-server.js` | 新 | 主脚本 |
| `scripts/test_dev_server.js` | 新 | 测试用例 |
| `.gitignore` | 改 | 加 .dev-cert/、.dev-server-state.json |

## 测试覆盖

| 被测单元 | 场景 |
|----------|------|
| detectIdentity | 正常取工号、正常取 10.255.* IP、多网卡选第一个、无 10.255 抛错 |
| ensureHosts | 标记块已存在跳过、不存在追加、权限不足、跨平台路径 |
| loadState/saveState | 文件不存在、正常读写、JSON 损坏回退、合并写入 |
| createServer | 端口被占+1、路径穿越 403、MIME 映射、目录→index.html、404 |
| printQRCode | 输出含 https:// 和 hostname |
| maybeOpenNohost | 已配置+IP 未变跳、IP 变化提示、三选项各自行为 |
| ensureCert | 证书已存在跳过、mkcert 未安装抛错 |

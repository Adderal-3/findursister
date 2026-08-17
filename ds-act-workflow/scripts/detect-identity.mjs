import os from 'node:os'

const raw = os.userInfo().username
const username = raw
  .toLowerCase()
  .replace(/^.*\\/, '')
  .replace(/[^a-z0-9]/g, '-')
  .replace(/--+/g, '-')
  .replace(/^-|-$/g, '')

const nets = os.networkInterfaces()
let lanIp = null
for (const addrs of Object.values(nets)) {
  if (!addrs) continue
  for (const a of addrs) {
    if (a.family === 'IPv4' && !a.internal && a.address.startsWith('10.255.')) {
      lanIp = a.address
      break
    }
  }
  if (lanIp) break
}

if (!lanIp) {
  console.error('未检测到 10.255.* 段 IP，请确认已连接公司内网（有线或 Netease-WiFi）。')
  process.exit(1)
}

const result = { username, lanIp, hostname: `${username}.ds.163.com` }

// Pretty print for human, raw JSON for scripts
if (process.stdout.isTTY) {
  console.log(`工号:   ${result.username}`)
  console.log(`内网IP: ${result.lanIp}`)
  console.log(`域名:   ${result.hostname}`)
} else {
  console.log(JSON.stringify(result))
}

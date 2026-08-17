#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { resolve, basename, sep } from 'node:path'
import https from 'node:https'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { serve } from '@hono/node-server'
import qrcode from 'qrcode-terminal'

const root = resolve(process.argv[2] || process.cwd())
const port = parseInt(process.argv[3] || '8443', 10)
const hostname = process.argv[4] || null

// Resolve cert files relative to this script
const scriptDir = import.meta.dirname
const certDir = resolve(scriptDir, '.dev-cert')
let key, cert

if (hostname) {
  const keyPath = resolve(certDir, `${hostname}-key.pem`)
  const certPath = resolve(certDir, `${hostname}.pem`)
  if (existsSync(keyPath) && existsSync(certPath)) {
    key = readFileSync(keyPath)
    cert = readFileSync(certPath)
    console.log(`使用证书: ${hostname}`)
  }
}

const app = new Hono()

// Block hidden files and parent-dir traversal before static serving
app.use('/*', async (c, next) => {
  const path = decodeURIComponent(c.req.path)
  const segments = path.split('/').filter(Boolean)
  if (segments.some(s => s.startsWith('.') || s === '..')) {
    return c.text('403 Forbidden', 403)
  }
  await next()
})

app.use('/*', serveStatic({ root }))

const url = `https://${hostname || 'localhost'}:${port}/`

if (key && cert) {
  serve({
    fetch: app.fetch,
    port,
    serverOptions: { key, cert },
    createServer: (options, handler) => https.createServer(options, handler),
  }, () => {
    printInfo()
  })
} else {
  console.warn('未提供证书，使用 HTTP 模式（不推荐用于手机调试）')
  serve({ fetch: app.fetch, port }, () => {
    printInfo()
  })
}

function printInfo() {
  console.log(`\n  ${'='.repeat(24)}`)
  console.log(`  ds-act-skills 开发环境`)
  console.log(`  根目录: ${root}`)
  console.log(`  本地:   ${url}`)
  console.log(`  ${'='.repeat(24)}\n`)
  qrcode.generate(url, { small: true })
  console.log('\n  按 Ctrl+C 关闭服务器')
}

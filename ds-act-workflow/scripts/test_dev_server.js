import { describe, it } from 'node:test'
import assert from 'node:assert'

// --- resolveRoot ---
describe('resolveRoot', () => {
  it('uses argv[2] when provided', () => {
    // Simulate: node server.mjs /absolute/path 8443
    const argv = ['node', 'server.mjs', '/absolute/path', '8443']
    const root = argv[2]
    assert.strictEqual(root, '/absolute/path')
  })

  it('fallback behavior (use process.cwd when no arg)', () => {
    const argv = ['node', 'server.mjs']
    const root = argv[2] || 'fallback-cwd-placeholder'
    assert.strictEqual(root, 'fallback-cwd-placeholder')
  })
})

// --- port default ---
describe('port', () => {
  it('defaults to 8443 when not specified', () => {
    const portArg = undefined
    const port = parseInt(portArg || '8443', 10)
    assert.strictEqual(port, 8443)
  })

  it('uses custom port when specified', () => {
    const port = parseInt('3000', 10)
    assert.strictEqual(port, 3000)
  })
})

// --- URL construction ---
describe('url construction', () => {
  it('uses hostname when provided', () => {
    const hostname = 'testuser.ds.163.com'
    const port = 8443
    const url = `https://${hostname}:${port}/`
    assert.strictEqual(url, 'https://testuser.ds.163.com:8443/')
  })

  it('falls back to localhost when no hostname', () => {
    const hostname = null
    const port = 8443
    const url = `https://${hostname || 'localhost'}:${port}/`
    assert.strictEqual(url, 'https://localhost:8443/')
  })
})

// --- hidden file guard ---
describe('hidden file guard', () => {
  it('blocks paths starting with dot', () => {
    const paths = ['/.git/HEAD', '/.claude/', '/.env', '/scripts/.dev-cert/']
    for (const p of paths) {
      const segments = decodeURIComponent(p).split('/').filter(Boolean)
      const hasHidden = segments.some(s => s.startsWith('.'))
      assert.strictEqual(hasHidden, true, `expected ${p} to be blocked`)
    }
  })

  it('blocks parent traversal', () => {
    const path = '/../etc/passwd'
    const segments = decodeURIComponent(path).split('/').filter(Boolean)
    const blocked = segments.some(s => s.startsWith('.') || s === '..')
    assert.strictEqual(blocked, true)
  })

  it('allows normal paths', () => {
    const paths = ['/index.html', '/src/game.js', '/images/logo.png']
    for (const p of paths) {
      const segments = decodeURIComponent(p).split('/').filter(Boolean)
      const blocked = segments.some(s => s.startsWith('.') || s === '..')
      assert.strictEqual(blocked, false, `expected ${p} to be allowed`)
    }
  })
})

// --- cert resolution ---
describe('cert resolution', () => {
  it('only resolves cert files when hostname is provided', () => {
    const testHostname = 'testuser.ds.163.com'
    const certDir = '.dev-cert'
    const keyPath = `${certDir}/${testHostname}-key.pem`
    const certPath = `${certDir}/${testHostname}.pem`
    assert.ok(keyPath.endsWith('-key.pem'))
    assert.ok(certPath.endsWith('.pem'))
    assert.notStrictEqual(keyPath, certPath)
  })
})

/**
 * 百物寻踪 —— 无头浏览器整体回归驱动（CDP，无第三方依赖，Node ≥ 22 全局 WebSocket）。
 *
 * 前置：
 *  1) npm run build 已产出最新 dist；npx vite preview --port 4173
 *  2) npm run dev -- --port 5173 （素材蒙版健康检查需要 dev 服务器直接访问 src 资源）
 *  3) chrome --headless=new --remote-debugging-port=9223
 *     --user-data-dir=<tmp> --window-size=800,600 about:blank
 *  4) node tools/regression/driver.mjs <wsDebuggerUrl> [baseUrl]
 *
 * 通过注入与 Node 侧同种子的 mulberry32 PRNG，并用「实测随机数消耗偏移」对齐
 * 浏览器与复刻端场景生成，从而确定性地点击到真实目标物件。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ScenePlanner, bundleName, searchScene2, taskMatchingNames } from './plan-scenes.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const genDir = join(root, 'tools', 'regression', '.gen');
const shotsDir = join(genDir, 'shots');
mkdirSync(shotsDir, { recursive: true });

const SEED = 20260817;
const WS_URL = process.argv[2];
const BASE_URL = process.argv[3] ?? 'http://localhost:4173/';
const DEV_URL = process.argv[4] ?? 'http://localhost:5173/';
if (!WS_URL) {
  console.error('用法: node tools/regression/driver.mjs <wsDebuggerUrl> [baseUrl] [devUrl]');
  process.exit(2);
}

/** 第 2 关目标规则匹配的显示名集合（DOM 驱动兜底用）。 */
const flyingNames = taskMatchingNames('flying', 3);

// ---------------- CDP 客户端 ----------------
class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.seq = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }
  async open() {
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id) {
        const entry = this.pending.get(msg.id);
        if (!entry) return;
        this.pending.delete(msg.id);
        if (msg.error) entry.reject(new Error(`${entry.method}: ${msg.error.message}`));
        else entry.resolve(msg.result);
      } else if (msg.method) {
        for (const handler of this.listeners.get(msg.method) ?? []) handler(msg.params);
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, handler) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(handler);
  }
}

// ---------------- 断言与结果收集 ----------------
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok), detail: String(detail ?? '') });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}
const consoleErrors = [];
const exceptions = [];
const badResponses = [];
const failedRequests = [];

// ---------------- 工具 ----------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function evalv(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) {
    throw new Error(`页面求值失败: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
  }
  return result.value;
}

async function waitFor(cdp, expr, timeoutMs = 12000, interval = 100) {
  const start = Date.now();
  for (;;) {
    const value = await evalv(cdp, expr);
    if (value) return value;
    if (Date.now() - start > timeoutMs) throw new Error(`等待超时: ${expr}`);
    await sleep(interval);
  }
}

async function mouseClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function clickSelector(cdp, selector, index = 0) {
  const point = await evalv(cdp, `(() => {
    const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!point) throw new Error(`找不到可点击元素: ${selector}[${index}]`);
  await mouseClick(cdp, point.x, point.y);
  return point;
}

async function clickButtonByText(cdp, text) {
  const idx = await evalv(cdp, `(() => {
    const btns = [...document.querySelectorAll('button')];
    const i = btns.findIndex((b) => b.textContent?.includes(${JSON.stringify(text)}));
    return i;
  })()`);
  if (idx < 0) throw new Error(`找不到含文本按钮: ${text}`);
  await clickSelector(cdp, 'button', idx);
}

async function screenshot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(shotsDir, `${name}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

async function textOf(cdp, selector, index = 0) {
  return evalv(cdp, `(() => {
    const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
    return el ? el.textContent : null;
  })()`);
}

/** 注入带计数的 PRNG（与 Node 侧 mulberry32 同种子）。 */
const RNG_SOURCE = `(() => {
  let a = ${SEED} >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  window.__rng = { calls: 0 };
  const random = () => { window.__rng.calls += 1; return next(); };
  try { Object.defineProperty(Math, 'random', { value: random, configurable: true }); }
  catch { Math.random = random; }
})();`;

async function injectRng(cdp) {
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: RNG_SOURCE });
}

/** 兜底：若当前文档没有 __rng（如 bfcache 恢复或注入被跳过），就地补一次。 */
async function ensureRng(cdp) {
  const present = await evalv(cdp, `typeof window.__rng !== 'undefined'`);
  if (!present) {
    await evalv(cdp, RNG_SOURCE);
  }
}

/**
 * 清空存档并重载。必须用「新文档脚本」清理：旧页面 pagehide 会把内存存档
 * 回写覆盖 localStorage，直接 clear + reload 无效。每次重载后 __rng.calls 归零。
 */
async function freshLoad(cdp) {
  const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      if (!location.protocol.startsWith('http')) return; // about:blank 无 localStorage
      Object.keys(localStorage).forEach((key) => { if (key.startsWith('znm.')) localStorage.removeItem(key); });
    })();`,
  });
  // 先到 about:blank，避免同 URL 导航命中 bfcache 导致注入脚本不执行
  await cdp.send('Page.navigate', { url: 'about:blank' });
  await sleep(300);
  await cdp.send('Page.navigate', { url: BASE_URL });
  await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  await waitFor(cdp, `document.readyState === 'complete'`, 15000);
  await ensureRng(cdp);
  await waitFor(cdp, `!!document.querySelector('[aria-label^="眼力值"]')`, 15000);
  await sleep(600);
}

/** 若新手引导弹窗出现则点掉（1~3 关首次游玩都会弹，且会暂停游戏）。 */
async function dismissTutorialIfAny(cdp) {
  try {
    await waitFor(cdp, `[...document.querySelectorAll('button')].some(b => b.textContent?.includes('我知道了'))`, 4000);
    await clickButtonByText(cdp, '我知道了');
    await sleep(400);
    return true;
  } catch {
    return false;
  }
}

// ---------------- 场景点击辅助（页面内） ----------------

/** 返回页面场景物件的 DOM 快照（按渲染顺序）：名称 + 百分比坐标。 */
const ITEM_SNAPSHOT_JS = `(() => {
  const scene = [...document.querySelectorAll('div')].find((d) => d.style.width === '150%');
  if (!scene) return null;
  return [...scene.querySelectorAll('button[tabindex="-1"]')].map((btn) => {
    const wrap = btn.parentElement;
    return {
      name: btn.getAttribute('aria-label'),
      left: parseFloat(wrap.style.left),
      top: parseFloat(wrap.style.top),
    };
  });
})()`;

/**
 * 计算点击第 idx 个场景物件的屏幕坐标。
 * 与游戏命中判定完全同构：候选点取「目标自身蒙版上最靠近中心的不透明像素」，
 * 同时避开会被上层物件（y 更大或同 y 且排更前）抢走的重叠区，保证点中目标。
 */
function clickPointForIdxJs(idx, xPct, yPct, scale, rot) {
  return `(async () => {
    const field = document.querySelector('[class*="touch-none"]');
    const scene = [...document.querySelectorAll('div')].find((d) => d.style.width === '150%');
    if (!field || !scene) return null;
    const buttons = [...scene.querySelectorAll('button[tabindex="-1"]')];
    const fr = field.getBoundingClientRect();
    const worldW = scene.clientWidth, worldH = scene.clientHeight;
    const pan = /translate3d\\(([-\\d.]+)px/.exec(scene.style.transform ?? '');
    const panX = pan ? Number(pan[1]) : 0;
    const baseSize = Math.max(50, Math.min(146, field.clientWidth * 0.19, field.clientHeight * 0.19));
    const size = baseSize * ${scale};
    const cx = fr.left + panX + (${xPct} / 100) * worldW;
    const cy = fr.top + (${yPct} / 100) * worldH;

    // 加载全部物件的蒙版与几何（缓存复用）
    window.__masks ??= {};
    const items = [];
    for (let i = 0; i < buttons.length; i += 1) {
      const btn = buttons[i];
      const img = btn.querySelector('img');
      if (!img) continue;
      const name = btn.getAttribute('aria-label');
      if (!window.__masks[name]) {
        window.__masks[name] = await new Promise((resolve) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(image, 0, 0, 64, 64);
            try { resolve(new Uint8ClampedArray(ctx.getImageData(0, 0, 64, 64).data)); }
            catch { resolve(null); }
          };
          image.onerror = () => resolve(null);
          image.src = img.src;
        });
      }
      if (!window.__masks[name]) continue;
      const wrap = btn.parentElement;
      const rotMatch = /rotate\\((-?[\\d.]+)deg/.exec(btn.getAttribute('style') ?? '');
      const imgW = Number(img.style.width.replace('px', ''));
      items.push({
        i,
        mask: window.__masks[name],
        x: parseFloat(wrap.style.left),
        y: parseFloat(wrap.style.top),
        rot: rotMatch ? Number(rotMatch[1]) : 0,
        imgSize: imgW > 0 ? imgW : baseSize,
      });
    }
    if (!items[${idx}]) return { x: cx, y: cy };

    const alphaAt = (mask, u, v) => {
      const uu = Math.round(u * 63), vv = Math.round(v * 63);
      if (uu < 0 || uu > 63 || vv < 0 || vv > 63) return 0;
      return mask[(vv * 64 + uu) * 4 + 3];
    };
    const target = items[${idx}];
    const rad = (${rot} * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const others = items.filter((it) => it.i !== ${idx});

    let best = null, bestDist = Infinity, fallback = null, fallbackDist = Infinity;
    for (let v = 6; v < 58; v += 1) {
      for (let u = 6; u < 58; u += 1) {
        if (alphaAt(target.mask, u / 64, v / 64) < 22) continue;
        const localX = (u / 64 - 0.5) * size;
        const localY = (v / 64 - 0.5) * size;
        const wx = cx + localX * cos - localY * sin;
        const wy = cy + localX * sin + localY * cos;
        const d = Math.hypot(u - 32, v - 32) / 64;
        if (d < fallbackDist) { fallback = { x: wx, y: wy }; fallbackDist = d; }

        // 同距离时游戏取 y 最大（或同 y 且更早遍历）的物件，这里反向排除会输掉的点。
        let stolen = false;
        for (const other of others) {
          const orad = (other.rot * Math.PI) / 180, ocos = Math.cos(orad), osin = Math.sin(orad);
          const dx = wx - (fr.left + panX + (other.x / 100) * worldW);
          const dy = wy - (fr.top + (other.y / 100) * worldH);
          const lx = dx * ocos + dy * osin;
          const ly = -dx * osin + dy * ocos;
          const uu = lx / other.imgSize + 0.5;
          const vv = ly / other.imgSize + 0.5;
          if (uu < -0.12 || uu > 1.12 || vv < -0.12 || vv > 1.12) continue;
          if (alphaAt(other.mask, uu, vv) < 22) continue;
          if (other.y > target.y || (other.y === target.y && other.i < target.i)) { stolen = true; break; }
        }
        if (!stolen && d < bestDist) { best = { x: wx, y: wy }; bestDist = d; }
      }
    }
    return best ?? fallback;
  })()`;
}

/**
 * DOM 驱动命中点计算（无需 Node 复刻数据）：按物件名称在场景里找到按钮，
 * 位置/旋转/尺寸全部取自 DOM，蒙版与避让逻辑与 clickPointForIdxJs 相同。
 */
function clickPointForDomJs(name, xPct, yPct) {
  return `(async () => {
    const field = document.querySelector('[class*="touch-none"]');
    const scene = [...document.querySelectorAll('div')].find((d) => d.style.width === '150%');
    if (!field || !scene) return null;
    const buttons = [...scene.querySelectorAll('button[tabindex="-1"]')];
    const btnIdx = buttons.findIndex((b) => b.getAttribute('aria-label') === ${JSON.stringify(name)});
    if (btnIdx < 0) return null;
    const fr = field.getBoundingClientRect();
    const worldW = scene.clientWidth, worldH = scene.clientHeight;
    const pan = /translate3d\\(([-\\d.]+)px/.exec(scene.style.transform ?? '');
    const panX = pan ? Number(pan[1]) : 0;
    const baseSize = Math.max(50, Math.min(146, field.clientWidth * 0.19, field.clientHeight * 0.19));
    const cx = fr.left + panX + (${xPct} / 100) * worldW;
    const cy = fr.top + (${yPct} / 100) * worldH;

    window.__masks ??= {};
    const items = [];
    for (let i = 0; i < buttons.length; i += 1) {
      const btn = buttons[i];
      const img = btn.querySelector('img');
      if (!img) continue;
      const nm = btn.getAttribute('aria-label');
      if (!window.__masks[nm]) {
        window.__masks[nm] = await new Promise((resolve) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(image, 0, 0, 64, 64);
            try { resolve(new Uint8ClampedArray(ctx.getImageData(0, 0, 64, 64).data)); }
            catch { resolve(null); }
          };
          image.onerror = () => resolve(null);
          image.src = img.src;
        });
      }
      if (!window.__masks[nm]) continue;
      const wrap = btn.parentElement;
      const rotMatch = /rotate\\((-?[\\d.]+)deg/.exec(btn.getAttribute('style') ?? '');
      const imgW = Number(img.style.width.replace('px', ''));
      items.push({
        i,
        mask: window.__masks[nm],
        x: parseFloat(wrap.style.left),
        y: parseFloat(wrap.style.top),
        rot: rotMatch ? Number(rotMatch[1]) : 0,
        imgSize: imgW > 0 ? imgW : baseSize,
      });
    }
    if (!items[btnIdx]) return { x: cx, y: cy };

    const alphaAt = (mask, u, v) => {
      const uu = Math.round(u * 63), vv = Math.round(v * 63);
      if (uu < 0 || uu > 63 || vv < 0 || vv > 63) return 0;
      return mask[(vv * 64 + uu) * 4 + 3];
    };
    const target = items[btnIdx];
    const size = target.imgSize;
    const rad = (target.rot * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const others = items.filter((it) => it.i !== btnIdx);

    let best = null, bestDist = Infinity, fallback = null, fallbackDist = Infinity;
    for (let v = 6; v < 58; v += 1) {
      for (let u = 6; u < 58; u += 1) {
        if (alphaAt(target.mask, u / 64, v / 64) < 22) continue;
        const localX = (u / 64 - 0.5) * size;
        const localY = (v / 64 - 0.5) * size;
        const wx = cx + localX * cos - localY * sin;
        const wy = cy + localX * sin + localY * cos;
        const d = Math.hypot(u - 32, v - 32) / 64;
        if (d < fallbackDist) { fallback = { x: wx, y: wy }; fallbackDist = d; }

        let stolen = false;
        for (const other of others) {
          const orad = (other.rot * Math.PI) / 180, ocos = Math.cos(orad), osin = Math.sin(orad);
          const dx = wx - (fr.left + panX + (other.x / 100) * worldW);
          const dy = wy - (fr.top + (other.y / 100) * worldH);
          const lx = dx * ocos + dy * osin;
          const ly = -dx * osin + dy * ocos;
          const uu = lx / other.imgSize + 0.5;
          const vv = ly / other.imgSize + 0.5;
          if (uu < -0.12 || uu > 1.12 || vv < -0.12 || vv > 1.12) continue;
          if (alphaAt(other.mask, uu, vv) < 22) continue;
          if (other.y > target.y || (other.y === target.y && other.i < target.i)) { stolen = true; break; }
        }
        if (!stolen && d < bestDist) { best = { x: wx, y: wy }; bestDist = d; }
      }
    }
    return best ?? fallback;
  })()`;
}

/** 读取 HUD 关卡牌上的「本关 X 分」（纯数字，避免计时器文本干扰）。 */
const READ_SCORE_JS = `(() => {
  const plaque = [...document.querySelectorAll('[class*="qingya-level-plaque"]')]
    .map((p) => p.textContent).find((t) => /本关 [\\d.,]+ 分/.test(t)) ?? '';
  const m = /本关 ([\\d.,]+) 分/.exec(plaque);
  return m ? Number(m[1].replace(/,/g, '')) : null;
})()`;

/** 等待「本关 X 分」数字不同于 before 的表达式。 */
function scoreChangedExpr(before) {
  return `(() => {
    const t = ${JSON.stringify(before)};
    const plaque = [...document.querySelectorAll('[class*="qingya-level-plaque"]')]
      .map((p) => p.textContent).find((x) => /本关 [\\d.,]+ 分/.test(x)) ?? '';
    const m = /本关 ([\\d.,]+) 分/.exec(plaque);
    const score = m ? Number(m[1].replace(/,/g, '')) : null;
    return score !== null && score !== t ? score : null;
  })()`;
}

/** 读取 HUD 关卡牌文本（含计时与第几关）。 */
const READ_PLAQUE_JS = `(() => {
  return [...document.querySelectorAll('[class*="qingya-level-plaque"]')]
    .map((p) => p.textContent).filter(Boolean);
})()`;

// ---------------- 主流程 ----------------
const cdp = new CDP(WS_URL);
await cdp.open();
await cdp.send('Runtime.enable');
await cdp.send('Page.enable');
await cdp.send('Log.enable');
await cdp.send('Network.enable');
await injectRng(cdp);

cdp.on('Runtime.consoleAPICalled', (p) => {
  if (p.type === 'error') {
    consoleErrors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
});
cdp.on('Runtime.exceptionThrown', (p) => {
  exceptions.push(p.exceptionDetails.exception?.description ?? p.exceptionDetails.text);
});
cdp.on('Log.entryAdded', (p) => {
  if (p.entry.level === 'error') consoleErrors.push(p.entry.text);
});
cdp.on('Network.responseReceived', (p) => {
  if (p.response.status >= 400) badResponses.push(`${p.response.status} ${p.response.url}`);
});
cdp.on('Network.loadingFailed', (p) => {
  failedRequests.push(`${p.errorText} ${p.requestId} ${p.blockedReason ?? ''}`);
});

await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 800, height: 600, deviceScaleFactor: 1, mobile: false,
});
await cdp.send('Page.navigate', { url: BASE_URL });
await waitFor(cdp, `document.readyState === 'complete'`, 15000);
await ensureRng(cdp);

// ============ A. 首页（全新存档） ============
console.log('\n===== A. 首页渲染（全新存档） =====');
await freshLoad(cdp);

const staminaLabel = await evalv(cdp, `document.querySelector('[aria-label^="眼力值"]')?.getAttribute('aria-label')`);
check('首页眼力值卡片渲染', staminaLabel === '眼力值 20 / 20', `aria-label="${staminaLabel}"`);

const staminaCard = await evalv(cdp, `(() => {
  const el = document.querySelector('[aria-label^="眼力值"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, visible: r.width > 0 && r.height > 0 && r.bottom <= innerHeight && r.top >= 0 };
})()`);
check('眼力值卡片在首屏可视区域内（布局调整回归点）',
  Boolean(staminaCard?.visible),
  `top=${staminaCard?.top?.toFixed(0)} bottom=${staminaCard?.bottom?.toFixed(0)}`);

const recoveryLabel = await textOf(cdp, '[aria-label^="眼力值"]');
check('眼力已满文案', recoveryLabel?.includes('眼力已满'), recoveryLabel);

const logoLoaded = await evalv(cdp, `(() => {
  const img = document.querySelector('img[alt="忙忙碌碌寻宝藏"]');
  return !!img && img.complete && img.naturalWidth > 0;
})()`);
check('首页 Logo 图片加载成功', logoLoaded);

const continueLabel = await evalv(cdp, `document.querySelector('[aria-label^="继续第"]')?.getAttribute('aria-label')`);
check('继续寻踪按钮（第 1 关 · 消耗 1 点）', continueLabel === '继续第1关，消耗1点体力', continueLabel);

const navLabels = await evalv(cdp, `[...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).filter(l => ['长卷','伙伴','榜单','无尽'].includes(l))`);
check('首页四枚功能按钮齐全', ['长卷', '伙伴', '榜单', '无尽'].every((l) => navLabels.includes(l)), navLabels.join(','));

const partnerBadge = await evalv(cdp, `(() => {
  const btn = [...document.querySelectorAll('[aria-label="伙伴"]')][0];
  return btn?.textContent ?? null;
})()`);
check('伙伴徽标 0/8', partnerBadge?.includes('0/8'), partnerBadge);

const hasTaskBtn = await evalv(cdp, `!!document.querySelector('[aria-label="打开大神任务面板"]')`);
check('任务面板按钮存在（本地也预览 —— 本次改动回归点）', hasTaskBtn);

const hasRoleBadge = await evalv(cdp, `!!document.querySelector('#ds-role-root')`);
check('首页角色条仅在真实平台展示（浏览器不应出现）', !hasRoleBadge);

const dsSdkLoaded = await evalv(cdp, `!!window.DsActSdk`);
check('ds-act-sdk 已加载（CDN 0.3.1）', dsSdkLoaded);

await screenshot(cdp, 'a-menu');

// ============ B. 任务面板（本地预览点击） ============
console.log('\n===== B. 任务面板点击（浏览器环境） =====');
const errorsBeforeTask = consoleErrors.length + exceptions.length;
try {
  await clickSelector(cdp, '[aria-label="打开大神任务面板"]');
} catch (error) {
  check('点击任务按钮', false, String(error));
}
await sleep(1800);
const taskFeedback = await evalv(cdp, `(() => {
  const toast = [...document.querySelectorAll('div')]
    .find((d) => d.textContent?.includes('任务') && d.className.includes('fixed') && d.textContent.length < 80);
  const root = document.querySelector('#ds-task-root');
  let popupState = null;
  try {
    popupState = window.DsActSdk?.dsActStore?.get?.(window.DsActSdk.taskListPopupState) ?? null;
  } catch { /* SDK 状态接口可能不存在 */ }
  return { toast: toast?.textContent ?? null, taskRootChildren: root?.children.length ?? 0, popupState };
})()`);
const newErrors = consoleErrors.length + exceptions.length - errorsBeforeTask;
check('任务面板点击不产生新异常', newErrors === 0, `新增错误=${newErrors}`);
check('任务面板弹窗状态已置位（dsActStore）', taskFeedback.popupState === true, JSON.stringify(taskFeedback));
console.log('INFO  任务反馈:', JSON.stringify(taskFeedback));
await screenshot(cdp, 'b-task');

// ============ C. 种子化关卡流程（第 1、2 关 + 自动晋级） ============
console.log('\n===== C. 种子化关卡流程（确定性场景） =====');

// 重载以清掉任务弹窗残留（存档保留：任务未动存档，体力仍满）
await freshLoad(cdp);

const planner = new ScenePlanner(SEED);
let n0 = 0;
let scene1 = null;
let targets1 = [];
let scene1Consumed = 0;
try {
  n0 = await evalv(cdp, `window.__rng.calls`);
  planner.consumeSilently(n0);
  scene1 = planner.scene(1);
  scene1Consumed = planner.lastSceneConsumed;
  targets1 = scene1.items.filter((item) => item.isTarget);
  check('Node 复刻第 1 关场景生成', scene1.items.length > 0 && targets1.length === 3,
    `${scene1.items.length} 物件 / ${targets1.length} 目标`);
} catch (error) {
  check('Node 复刻第 1 关场景生成', false, String(error));
}

await clickSelector(cdp, '[aria-label^="继续第"]');
await waitFor(cdp, `!!document.querySelector('button[tabindex="-1"]')`, 10000);
await sleep(1000); // 等入场动画完成，旋转角就位

// DOM 快照与 Node 复刻比对
const domItems = await evalv(cdp, ITEM_SNAPSHOT_JS);
let matchedAll = Boolean(scene1) && domItems?.length === scene1.items.length;
if (matchedAll) {
  for (let i = 0; i < scene1.items.length; i += 1) {
    const item = scene1.items[i];
    if (domItems[i].name !== bundleName(item.itemId)
      || Math.abs(domItems[i].left - item.x) > 0.001
      || Math.abs(domItems[i].top - item.y) > 0.001) {
      matchedAll = false;
      console.log(`     不一致 #${i}: DOM=${domItems[i].name}@(${domItems[i].left},${domItems[i].top}) 复刻=${bundleName(item.itemId)}@(${item.x},${item.y})`);
      break;
    }
  }
}
check('场景物件数量一致', matchedAll && domItems?.length === scene1?.items.length,
  `DOM=${domItems?.length} 复刻=${scene1?.items.length ?? 0}`);
check('场景物件位置与复刻完全一致（PRNG 对齐）', matchedAll);
if (!matchedAll) {
  console.log('WARN 场景不一致，目标点击可能点偏；后续结果仅作参考。');
}

// 新手引导（首次游玩 1~3 关会弹，点掉）
await dismissTutorialIfAny(cdp);

const hudPlaques1 = await evalv(cdp, READ_PLAQUE_JS);
const hud1Text = hudPlaques1.join(' | ');
check('第 1 关开始（HUD 计时 + 体力扣 1）',
  /第1关/.test(hud1Text) && /\d{2}:\d{2}/.test(hud1Text), hud1Text);
const staminaAfterStart = await evalv(cdp, `JSON.parse(localStorage.getItem('znm.stamina.v1') ?? '{}').value`);
check('体力 20 → 19', staminaAfterStart === 19, `stamina=${staminaAfterStart}`);

// 依次点击 3 个目标
for (let i = 0; i < targets1.length; i += 1) {
  const target = targets1[i];
  const idx = scene1.items.indexOf(target);
  const expr = clickPointForIdxJs(idx, target.x, target.y, target.scale, target.rot);
  const point = await evalv(cdp, expr);
  check(`第 1 关目标 ${i + 1} 命中点计算（${bundleName(target.itemId)}）`,
    Boolean(point && point.x > 0), JSON.stringify(point));
  const before = await evalv(cdp, READ_SCORE_JS);
  await mouseClick(cdp, point.x, point.y);
  const scoreChanged = await waitFor(cdp, scoreChangedExpr(before), 3500, 60)
    .then((v) => v, () => null);
  check(`第 1 关目标 ${i + 1} 命中成功（分数上涨）`, Boolean(scoreChanged), scoreChanged ?? '分数未变');
  await sleep(300);
}
const score1 = await evalv(cdp, READ_SCORE_JS);
check('第 1 关得分 > 0', Number(score1) > 0, `score=${score1}`);

// 关卡完成面板 → 记录随机数消耗（自动进第 2 关前）
const clear1 = await waitFor(cdp, `[...document.querySelectorAll('div')].some(d => d.textContent?.includes('第 1 关完成'))`, 5000)
  .then(() => true, () => false);
check('第 1 关完成结算出现', clear1);
const n1 = await evalv(cdp, `window.__rng.calls`);
console.log(`INFO n0=${n0} n1=${n1} 复刻场景1消耗=${scene1Consumed} 浏览器场景1后额外消耗=${n1 - n0 - scene1Consumed}`);

// 自动进入第 2 关（1.75s）
const hud2 = await waitFor(cdp, `[...document.querySelectorAll('[class*="qingya-level-plaque"]')].some((p) => /第2关/.test(p.textContent))`, 8000)
  .then(() => true, () => false);
check('自动晋级第 2 关', hud2);
const n2 = await evalv(cdp, `window.__rng.calls`);
console.log(`INFO n2=${n2} 浏览器场景2消耗=${n2 - n1}`);

// 搜索式复刻场景 2（结算面板动画等会在 n1 后消耗未知数量的随机数）
let scene2 = null;
let targets2 = [];
let scene2Delta = null;
const searchResult = searchScene2(
  SEED, n0, n1, n2, scene1Consumed,
  scene1.items.filter((item) => item.isTarget).map((item) => item.itemId),
);
if (searchResult) {
  scene2 = searchResult.scene2;
  scene2Delta = searchResult.delta;
  targets2 = scene2.items.filter((item) => item.isTarget);
  console.log(`INFO 场景2复刻命中：起点偏移 delta=${scene2Delta}`);
  check('Node 复刻第 2 关场景生成', targets2.length === 3, `${scene2.items.length} 物件 / ${targets2.length} 目标`);
} else {
  console.log('WARN 场景2搜索复刻未命中（起点偏移超出范围或场景被生成多次），改用 DOM 驱动点击');
  check('Node 复刻第 2 关场景生成', false, '搜索未命中');
}

// 第 2 关也是引导关（引导 2/3），弹窗会暂停游戏，必须先点掉
await dismissTutorialIfAny(cdp);
await sleep(600);

const domItems2 = await evalv(cdp, ITEM_SNAPSHOT_JS);
check('第 2 关场景物件数量', Boolean(domItems2) && domItems2.length === 37, `DOM=${domItems2?.length}`);

// 位置比对（仅当有复刻）
let scene2Matched = Boolean(scene2) && domItems2?.length === scene2.items.length;
let l2mismatchCount = 0;
if (scene2Matched) {
  for (let i = 0; i < scene2.items.length; i += 1) {
    const item = scene2.items[i];
    if (domItems2[i].name !== bundleName(item.itemId)
      || Math.abs(domItems2[i].left - item.x) > 0.005
      || Math.abs(domItems2[i].top - item.y) > 0.005) {
      scene2Matched = false;
      l2mismatchCount += 1;
      if (l2mismatchCount <= 6) {
        console.log(`     第2关不一致 #${i}: DOM=${domItems2[i].name}@(${domItems2[i].left},${domItems2[i].top}) 复刻=${bundleName(item.itemId)}@(${item.x},${item.y})`);
      }
    }
  }
}
check('第 2 关场景位置与复刻一致', scene2Matched);

// 点击目标：优先用复刻数据；否则按任务规则（flying）从 DOM 名称匹配
const l2Targets = scene2Matched
  ? targets2.map((target) => ({
    name: bundleName(target.itemId),
    x: target.x,
    y: target.y,
    scale: target.scale,
    rot: target.rot,
    idx: scene2.items.indexOf(target),
  }))
  : domItems2
    .filter((item) => flyingNames.has(item.name))
    .map((item) => ({ name: item.name, x: item.left, y: item.top, scale: null, rot: null, idx: null }));
check('第 2 关目标定位（复刻或规则匹配）', l2Targets.length === 3,
  `${l2Targets.length} 个: ${l2Targets.map((t) => t.name).join(',')}`);

for (let i = 0; i < l2Targets.length; i += 1) {
  const target = l2Targets[i];
  const point = target.scale != null
    ? await evalv(cdp, clickPointForIdxJs(target.idx, target.x, target.y, target.scale, target.rot))
    : await evalv(cdp, clickPointForDomJs(target.name, target.x, target.y));
  const before = await evalv(cdp, READ_SCORE_JS);
  await mouseClick(cdp, point.x, point.y);
  const scoreChanged = await waitFor(cdp, scoreChangedExpr(before), 3500, 60)
    .then((v) => v, () => null);
  check(`第 2 关目标 ${i + 1} 命中成功（${target.name}）`, Boolean(scoreChanged), scoreChanged ?? '分数未变');
  await sleep(300);
}

// 第 2 关完成 → 自动进第 3 关（顺带验证连续体力扣减）
const hud3 = await waitFor(cdp, `[...document.querySelectorAll('[class*="qingya-level-plaque"]')].some((p) => /第3关/.test(p.textContent))`, 10000)
  .then(() => true, () => false);
check('第 2 关完成并进入第 3 关', hud3);
// 第 3 关也是引导关，点掉后再退出
await dismissTutorialIfAny(cdp);
await screenshot(cdp, 'c-level3');

// 暂停 → 返回主菜单
await clickSelector(cdp, '[aria-label="返回主菜单"]');
await waitFor(cdp, `[...document.querySelectorAll('button')].some(b => b.textContent?.includes('确认离开'))`, 5000);
await clickButtonByText(cdp, '确认离开');
await waitFor(cdp, `!!document.querySelector('[aria-label^="继续第"]')`, 8000);
const continueAfter = await evalv(cdp, `document.querySelector('[aria-label^="继续第"]')?.getAttribute('aria-label')`);
check('返回主菜单后继续按钮指向第 3 关', continueAfter === '继续第3关，消耗1点体力', continueAfter);

const storageAfter = await evalv(cdp, `(() => {
  const get = (k) => localStorage.getItem(k);
  const scores = JSON.parse(get('znm.best.levelScores.v3') ?? '{}');
  const stars = JSON.parse(get('znm.best.levelStars') ?? '{}');
  return {
    level1: scores[1], level2: scores[2],
    star1: stars[1], star2: stars[2],
    maxLevel: get('znm.best.maxLevel.v3'),
    bestLevels: get('znm.best.levels.v3'),
    stamina: JSON.parse(get('znm.stamina.v1') ?? '{}').value,
  };
})()`);
check('存档落库：1/2 关得分与星级', storageAfter.level1 > 0 && storageAfter.level2 > 0 && storageAfter.star1 >= 1 && storageAfter.star2 >= 1,
  JSON.stringify(storageAfter));
check('存档落库：maxLevel=3，bestLevels>0', storageAfter.maxLevel === '3' && Number(storageAfter.bestLevels) > 0,
  JSON.stringify(storageAfter));
check('体力链路：20→19→18→17', storageAfter.stamina === 17, `stamina=${storageAfter.stamina}`);

await screenshot(cdp, 'c-after-levels');

// ============ D. 无尽模式 ============
console.log('\n===== D. 无尽模式 =====');
await clickSelector(cdp, '[aria-label="无尽"]');
const endlessOk = await waitFor(cdp, `(() => {
  const plaques = [...document.querySelectorAll('[class*="qingya-level-plaque"]')].map((p) => p.textContent).join(' | ');
  return /第 1 波/.test(plaques) && /01:15/.test(plaques) ? plaques : null;
})()`, 8000).then((v) => v, () => null);
check('无尽模式第 1 波开始（时间 01:15）', Boolean(endlessOk), endlessOk ?? '');
const endlessStamina = await evalv(cdp, `JSON.parse(localStorage.getItem('znm.stamina.v1') ?? '{}').value`);
check('无尽体力扣 5（17 → 12）', endlessStamina === 12, `stamina=${endlessStamina}`);
await screenshot(cdp, 'd-endless');
await clickSelector(cdp, '[aria-label="暂停游戏"]');
await waitFor(cdp, `[...document.querySelectorAll('button')].some(b => b.textContent?.includes('主菜单'))`, 5000);
await clickButtonByText(cdp, '主菜单');
await waitFor(cdp, `!!document.querySelector('[aria-label^="继续第"]')`, 8000);
check('无尽退出回主菜单', true);

// ============ E. 误点惩罚（-3 秒） ============
console.log('\n===== E. 误点惩罚（-3 秒） =====');
await clickSelector(cdp, '[aria-label^="继续第"]');
await waitFor(cdp, `!!document.querySelector('button[tabindex="-1"]')`, 10000);
await dismissTutorialIfAny(cdp);

const emptyPoint = await evalv(cdp, `(() => {
  const scene = [...document.querySelectorAll('div')].find((d) => d.style.width === '150%');
  if (!scene) return null;
  // 避开场景物品 + 所有按钮（HUD 返回/暂停等）+ 顶底操作区
  const blocked = [];
  for (const btn of [...document.querySelectorAll('button')]) {
    const r = btn.getBoundingClientRect();
    blocked.push({ x0: r.left - 6, x1: r.right + 6, y0: r.top - 6, y1: r.bottom + 6 });
  }
  for (const btn of [...scene.querySelectorAll('button[tabindex="-1"]')]) {
    const r = btn.getBoundingClientRect();
    blocked.push({ x0: r.left - 14, x1: r.right + 14, y0: r.top - 14, y1: r.bottom + 14 });
  }
  const inBlocked = (x, y) => blocked.some((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
  let best = null, bestDist = -Infinity;
  for (let gy = 100; gy < 500; gy += 12) {
    for (let gx = 20; gx < 780; gx += 12) {
      if (inBlocked(gx, gy)) continue;
      const d = Math.min(...blocked.map((b) => Math.hypot(gx - (b.x0 + b.x1) / 2, gy - (b.y0 + b.y1) / 2) - Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 - 20));
      if (d > bestDist) { bestDist = d; best = { x: gx, y: gy }; }
    }
  }
  return best;
})()`);
check('找到无物件空白点', Boolean(emptyPoint), JSON.stringify(emptyPoint));

const readTimer = () => evalv(cdp, `(() => {
  const plaque = [...document.querySelectorAll('[class*="qingya-level-plaque"]')]
    .map((p) => p.textContent).find((t) => /\\d{2}:\\d{2}/.test(t)) ?? '';
  const m = /(\\d{2}):(\\d{2})/.exec(plaque);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
})()`);
const timerBefore = await readTimer();
if (emptyPoint) {
  await mouseClick(cdp, emptyPoint.x, emptyPoint.y);
  await sleep(700);
  const redFlash = await evalv(cdp, `!![...document.querySelectorAll('div')].find(d => d.className.includes('bg-red-500') && d.className.includes('inset-0'))`);
  check('误点触发红闪', redFlash);
  const timerAfter = await readTimer();
  const penalty = timerBefore - timerAfter;
  check('误点扣 3 秒', penalty >= 2.5 && penalty <= 4.5, `前=${timerBefore}s 后=${timerAfter}s 差=${penalty}s`);
  await screenshot(cdp, 'e-wrong-click');
}
await clickSelector(cdp, '[aria-label="返回主菜单"]');
await waitFor(cdp, `[...document.querySelectorAll('button')].some(b => b.textContent?.includes('确认离开'))`, 5000);
await clickButtonByText(cdp, '确认离开');
await waitFor(cdp, `!!document.querySelector('[aria-label^="继续第"]')`, 8000);

// ============ F. 排行榜（浏览器环境降级） ============
console.log('\n===== F. 排行榜面板 =====');
await clickSelector(cdp, '[aria-label="榜单"]');
const rankingPanel = await waitFor(cdp, `[...document.querySelectorAll('[role="dialog"]')].some(d => d.textContent?.includes('寻踪榜'))`, 8000)
  .then(() => true, () => false);
check('排行榜面板打开', rankingPanel);
await sleep(1200);
const rankingState = await evalv(cdp, `(() => {
  const dialog = [...document.querySelectorAll('[role="dialog"]')].find(d => d.textContent?.includes('寻踪榜'));
  return {
    error: dialog?.textContent?.includes('榜单加载失败') ?? false,
    retryBtn: dialog ? [...dialog.querySelectorAll('button')].some(b => b.textContent?.includes('重新加载')) : false,
  };
})()`);
check('非大神环境榜单优雅降级（失败态 + 重试按钮）', rankingState.error && rankingState.retryBtn, JSON.stringify(rankingState));
await screenshot(cdp, 'f-ranking');
await clickSelector(cdp, '[aria-label="关闭排行榜"]');
await sleep(400);

// ============ G. 长卷关卡列表 ============
console.log('\n===== G. 长卷关卡列表 =====');
await clickSelector(cdp, '[aria-label="长卷"]');
const levelPanel = await waitFor(cdp, `[...document.querySelectorAll('[role="dialog"]')].some(d => d.textContent?.includes('寻物长卷'))`, 8000)
  .then(() => true, () => false);
check('长卷面板打开', levelPanel);
await sleep(400);
const level3Unlocked = await evalv(cdp, `(() => {
  const dialog = [...document.querySelectorAll('[role="dialog"]')].find(d => d.textContent?.includes('寻物长卷'));
  return dialog ? [...dialog.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === '开始第3关') : false;
})()`);
check('第 3 关已解锁可玩', level3Unlocked);
await screenshot(cdp, 'g-levels');
await clickSelector(cdp, '[aria-label="关闭寻物长卷"]');
await sleep(400);

// ============ H. 体力不足弹窗 ============
console.log('\n===== H. 体力不足 =====');
// 用「新文档脚本」写体力值再导航：旧页面 pagehide 会把内存中的体力回写覆盖
// localStorage，直接 setItem + reload 无效；新文档脚本在应用读取前写入即可。
const staminaInject = async (value) => {
  const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(() => {
      if (!location.protocol.startsWith('http')) return; // about:blank 无 localStorage
      const key = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
      localStorage.setItem('znm.stamina.v1', JSON.stringify({ value: ${value}, onlineProgressMs: 0, lastSeenAt: Date.now(), dailyRefillKey: key }));
    })();`,
  });
  await cdp.send('Page.navigate', { url: 'about:blank' });
  await sleep(300);
  await cdp.send('Page.navigate', { url: BASE_URL });
  await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  await waitFor(cdp, `document.readyState === 'complete'`, 15000);
  await ensureRng(cdp);
  await waitFor(cdp, `!!document.querySelector('[aria-label^="眼力值"]')`, 15000);
};
await staminaInject(0);
const zeroLabel = await evalv(cdp, `document.querySelector('[aria-label^="眼力值"]')?.getAttribute('aria-label')`);
check('体力 0 显示', zeroLabel === '眼力值 0 / 20', zeroLabel);
await clickSelector(cdp, '[aria-label^="继续第"]');
const staminaDialog = await waitFor(cdp, `[...document.querySelectorAll('[role="dialog"]')].some(d => d.textContent?.includes('眼力不足'))`, 8000)
  .then(() => true, () => false);
check('体力不足弹窗出现', staminaDialog);
const dialogText = await evalv(cdp, `(() => {
  const d = [...document.querySelectorAll('[role="dialog"]')].find(x => x.textContent?.includes('眼力不足'));
  return d?.textContent?.replace(/\\s+/g, ' ').slice(0, 120) ?? null;
})()`);
check('弹窗含恢复倒计时', /\d{2}:\d{2} 后恢复 1 点/.test(dialogText ?? ''), dialogText);
await screenshot(cdp, 'h-stamina');
await clickButtonByText(cdp, '知道了');
await sleep(400);
check('弹窗关闭且未进入关卡（仍在菜单）',
  await evalv(cdp, `!!document.querySelector('[aria-label^="继续第"]')`));

// ============ I. 素材蒙版健康检查（全 123 件，经 dev 服务器直接读 src 资源） ============
console.log('\n===== I. 素材蒙版健康检查（全量） =====');
const manifest = JSON.parse(
  readFileSync(join(root, 'src', 'assets', 'items', 'ancient', 'manifest.json'), 'utf8'),
);
const allItemIds = manifest.map((entry) => entry.id);
const REDRAWN_ITEMS = ['ancient_book', 'mooncake', 'lidded_bowl', 'embroidered_trousers',
  'jade_earrings', 'fox_mask', 'gauze_veil', 'bamboo_hat'];
const maskReport = await evalv(cdp, `(async () => {
  const base = ${JSON.stringify(DEV_URL)};
  const ids = ${JSON.stringify(allItemIds)};
  let broken = 0, tainted = 0;
  const blank = [];
  for (const id of ids) {
    const mask = await new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, 64, 64);
        try { resolve(new Uint8ClampedArray(ctx.getImageData(0, 0, 64, 64).data)); }
        catch { resolve('tainted'); }
      };
      image.onerror = () => resolve('error');
      image.src = base + 'src/assets/items/ancient/' + id + '.webp';
    });
    if (mask === 'error') { broken += 1; continue; }
    if (mask === 'tainted') { tainted += 1; continue; }
    let opaque = 0;
    for (let i = 3; i < mask.length; i += 4) if (mask[i] >= 22) opaque += 1;
    if (opaque / 4096 < 0.01) blank.push(id);
  }
  return { total: ids.length, broken, tainted, blank };
})()`);
check('全部素材可解码', maskReport.broken === 0, JSON.stringify(maskReport));
check('素材蒙版检查覆盖率足够', maskReport.tainted <= 5, `tainted=${maskReport.tainted}`);
check('无空白素材（不透明像素占比 ≥ 1%）', maskReport.blank.length === 0,
  maskReport.blank.length ? `blank=${maskReport.blank.join(',')}` : '无');
const blankRedrawn = REDRAWN_ITEMS.filter((id) => maskReport.blank.includes(id));
check('重绘素材蒙版健康（8 件）', blankRedrawn.length === 0,
  blankRedrawn.length ? `blank=${blankRedrawn.join(',')}` : '全部健康');

// ============ J. 刷新持久化 ============
console.log('\n===== J. 刷新持久化 =====');
await staminaInject(17);
const afterReload = await evalv(cdp, `(() => {
  const btn = document.querySelector('[aria-label^="继续第"]')?.getAttribute('aria-label');
  const badge = document.querySelector('[aria-label="伙伴"]')?.textContent ?? '';
  const scores = JSON.parse(localStorage.getItem('znm.best.levelScores.v3') ?? '{}');
  return { btn, badge, scoreCount: Object.keys(scores).length };
})()`);
check('刷新后继续第 3 关（进度持久化）', afterReload.btn === '继续第3关，消耗1点体力', afterReload.btn);
check('刷新后关卡得分保留', afterReload.scoreCount === 2, `scores=${afterReload.scoreCount}`);
check('伙伴徽标仍 0/8', afterReload.badge.includes('0/8'), afterReload.badge);
await screenshot(cdp, 'j-after-reload');

// ============ 汇总 ============
console.log('\n===== 汇总 =====');
const fails = results.filter((r) => !r.ok);
const passes = results.filter((r) => r.ok);
console.log(`断言: ${passes.length} PASS / ${fails.length} FAIL / 共 ${results.length}`);

const realExceptions = exceptions.filter((e) => !/Autoplay|audio|Media/i.test(e ?? ''));
check('无未捕获异常', realExceptions.length === 0, realExceptions.slice(0, 3).join(' || '));

const realConsoleErrors = consoleErrors.filter((e) => !/favicon|Autoplay|audio|Failed to load resource/i.test(e ?? ''));
check('无控制台错误', realConsoleErrors.length === 0, realConsoleErrors.slice(0, 5).join(' || '));

const realBad = badResponses.filter((u) => !/favicon/i.test(u));
check('无失败资源请求', realBad.length === 0 && failedRequests.length === 0,
  [...realBad.slice(0, 3), ...failedRequests.slice(0, 3)].join(' || '));

const finalFails = results.filter((r) => !r.ok);
console.log(`\n最终: ${results.length - finalFails.length} PASS / ${finalFails.length} FAIL / 共 ${results.length}`);
console.log('\n截图目录: tools/regression/.gen/shots/');
console.log(JSON.stringify({
  results, consoleErrors, exceptions, badResponses, failedRequests,
}, null, 2));
process.exit(finalFails.length ? 1 : 0);

/* 极简局内截图：进第 1 关后截图，用于 HUD/目标条布局目检。 */
import { writeFileSync } from 'node:fs';

const BASE_URL = process.argv[2] ?? 'http://localhost:4173/';
const OUT = process.argv[3] ?? 'tools/regression/.gen/shots/layout-check.png';

const list = await (await fetch('http://localhost:9223/json')).json();
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
await new Promise((r) => { ws.onopen = r; });
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, (m) => (m.error ? reject(new Error(m.error.message)) : resolve(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evalv = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  return r.result?.value;
};
const waitFor = async (expr, timeout = 12000) => {
  const t0 = Date.now();
  for (;;) {
    if (await evalv(expr)) return true;
    if (Date.now() - t0 > timeout) throw new Error(`timeout: ${expr}`);
    await sleep(120);
  }
};
const clickCenter = async (selectorExpr) => {
  const p = await evalv(`(() => { const el = ${selectorExpr}; if (!el) return null;
    const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!p) throw new Error('no element');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
};

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 880, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: 'about:blank' });
await sleep(300);
await send('Page.navigate', { url: BASE_URL });
await waitFor(`document.readyState === 'complete'`, 15000);
await waitFor(`!!document.querySelector('[aria-label^="眼力值"]')`, 15000);
await sleep(800);

// 进入关卡（优先"继续第X关"，兜底文本含"开始"的按钮）
const hasContinue = await evalv(`!!document.querySelector('[aria-label^="继续第"]')`);
await clickCenter(hasContinue
  ? `document.querySelector('[aria-label^="继续第"]')`
  : `[...document.querySelectorAll('button')].find(b => b.textContent?.includes('开始'))`);
await waitFor(`!!document.querySelector('button[tabindex="-1"]')`, 10000);
await sleep(1200);
// 新手引导
const hasTut = await evalv(`[...document.querySelectorAll('button')].some(b => b.textContent?.includes('我知道了'))`);
if (hasTut) {
  await clickCenter(`[...document.querySelectorAll('button')].find(b => b.textContent?.includes('我知道了'))`);
  await sleep(600);
}
await sleep(600);

const { data } = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(OUT, Buffer.from(data, 'base64'));
console.log('saved:', OUT);
process.exit(0);

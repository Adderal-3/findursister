/**
 * 任务视频奖励（看视频加时 / 复活）端到端冒烟（CDP，无第三方依赖，Node ≥ 22）。
 *
 * 前置：
 *  1) npm run build 已产出最新 dist；npx vite preview --port 4173
 *  2) chrome --headless=new --remote-debugging-port=9223
 *     --user-data-dir=<tmp> --window-size=420,900 about:blank
 *  3) node tools/regression/smoke-video.mjs <wsDebuggerUrl> [baseUrl]
 *
 * 覆盖路径：
 *  开局 → 免费加时 → 再次加时出任务弹窗 → 打开视频弹窗 → 视频播放且有效观看倒计时递减
 *  → 未看满退出二次确认 → 放弃回到局内 → 连续点空判负 → 结算页出现「看视频复活」
 *  → 打开复活视频弹窗 → 放弃回到结算页。
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const shotsDir = join(dirname(fileURLToPath(import.meta.url)), '.gen', 'shots');
const WS_URL = process.argv[2];
const BASE_URL = process.argv[3] ?? 'http://localhost:4173/';
if (!WS_URL) {
  console.error('用法: node tools/regression/smoke-video.mjs <wsDebuggerUrl> [baseUrl]');
  process.exit(2);
}

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.seq = 0; this.pending = new Map(); this.listeners = new Map(); }
  async open() {
    await new Promise((resolve, reject) => { this.ws.onopen = resolve; this.ws.onerror = reject; });
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

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

async function evalv(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(`页面脚本异常: ${JSON.stringify(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text)}`);
  }
  return result.result.value;
}

async function waitFor(cdp, expression, timeoutMs = 10000) {
  const start = Date.now();
  for (;;) {
    if (await evalv(cdp, expression)) return true;
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function clickButton(cdp, predicateJs) {
  return evalv(cdp, `(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => ${predicateJs});
    if (!btn) return false;
    btn.click();
    return true;
  })()`);
}

async function shot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(shotsDir, name), Buffer.from(data, 'base64'));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** 页面剩余秒数文案（再有效观看 N 秒）。 */
const remainJs = `(() => {
  const el = [...document.querySelectorAll('div')]
    .find((d) => d.children.length === 0 && /再有效观看 \\d+ 秒/.test(d.textContent ?? ''));
  const m = el?.textContent?.match(/(\\d+)/);
  return m ? Number(m[1]) : null;
})()`;
const gameOverJs = `[...document.querySelectorAll('div')]
  .some((d) => d.children.length === 0 && d.textContent === '时间到！')`;

const cdp = new CDP(WS_URL);
await cdp.open();
const consoleErrors = [];
cdp.on('Runtime.exceptionThrown', (params) => {
  consoleErrors.push(params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text);
});
await cdp.send('Runtime.enable');
await cdp.send('Page.enable');

// 0) 清空存档后重载（旧页面 pagehide 会回写存档，必须用新文档脚本清理）
const { identifier } = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `(() => {
    if (!location.protocol.startsWith('http')) return;
    Object.keys(localStorage).forEach((key) => { if (key.startsWith('znm.')) localStorage.removeItem(key); });
  })();`,
});
await cdp.send('Page.navigate', { url: 'about:blank' });
await sleep(300);
await cdp.send('Page.navigate', { url: BASE_URL });
await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });

// 1) 首页 → 开局
check('首页渲染', await waitFor(cdp, `!!document.querySelector('[aria-label^="眼力值"]')`, 15000));
check('点击继续寻踪开局', await clickButton(cdp, `b.getAttribute('aria-label')?.startsWith('继续第')`));
check('进入对局', await waitFor(cdp, `!!document.querySelector('[class*="qingya-level-plaque"]')`));
// 新手引导会暂停游戏：点掉「我知道了」，若仍处于暂停面板则恢复
await clickButton(cdp, `b.textContent?.includes('我知道了')`);
await sleep(400);
await clickButton(cdp, `b.textContent?.includes('继续游戏')`);
await sleep(300);
check('对局处于进行态（无暂停面板）', await waitFor(cdp,
  `![...document.querySelectorAll('button')].some((b) => b.textContent?.includes('继续游戏'))`));
// 站外登录 SDK 可能弹二维码浮层：隐藏以免遮挡真实指针事件与截图
await evalv(cdp, `(() => {
  const qr = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('点击刷新二维码'));
  const dialog = qr?.closest('[role="dialog"]') ?? qr?.closest('div[class*="fixed"]');
  if (dialog) dialog.style.display = 'none';
  return true;
})()`);

// 2) 免费加时 → 再次加时出任务弹窗
check('首次免费加时', await clickButton(cdp, `b.getAttribute('aria-label') === '免费加时30秒'`));
await sleep(400);
check('再次点击加时（任务档）', await clickButton(cdp, `b.getAttribute('aria-label') === '任务视频加时30秒'`));
check('任务加时提示弹窗（+30 秒文案）', await waitFor(cdp,
  `[...document.querySelectorAll('div')].some((d) => d.children.length <= 3 && d.textContent === '任务加时 · +30 秒')`));

// 3) 打开视频弹窗
check('打开任务视频', await clickButton(cdp, `b.textContent?.includes('观看视频')`));
check('视频弹窗渲染（含 <video>）', await waitFor(cdp,
  `!!document.querySelector('[role="dialog"][aria-label="看视频 · 任务加时"] video')`));
await sleep(700); // 等弹窗淡入动画完成再截图/验层叠
check('视频弹窗层叠在提示弹窗之上', await evalv(cdp, `(() => {
  const el = document.elementFromPoint(Math.floor(innerWidth / 2), Math.floor(innerHeight / 2));
  return !!el?.closest('[role="dialog"][aria-label="看视频 · 任务加时"]');
})()`));
await shot(cdp, 'smoke-video-boost.png');

// 4) 视频真实播放时，有效观看倒计时应从 30 递减（依赖 vod 源可达；静音兜底保证可播）
const remain0 = await evalv(cdp, remainJs);
await sleep(4000);
const remain1 = await evalv(cdp, remainJs);
check('有效观看倒计时递减', remain0 != null && remain1 != null && remain1 < remain0, `${remain0}s → ${remain1}s`);

// 5) 看满 30s：弹窗自动关闭、奖励到账 toast、局内恢复（视频 < 30s 会自动切下一只继续累计）
check('看满 30 秒弹窗自动关闭', await waitFor(cdp,
  `!document.querySelector('[role="dialog"][aria-label="看视频 · 任务加时"]')`, 45000));
check('加时奖励到账 toast', await waitFor(cdp,
  `[...document.querySelectorAll('div')].some((d) => d.children.length === 0 && d.textContent?.includes('任务奖励已到账 · +30 秒'))`));
check('发奖后局内恢复（提示弹窗关闭）', await evalv(cdp,
  `![...document.querySelectorAll('div')].some((d) => d.children.length <= 3 && d.textContent === '任务加时 · +30 秒')`));

// 6) 连续点空扣时判负（每下 -3s，Input 域派发真实指针事件），直到出现「时间到」
const fieldRect = await evalv(cdp, `(() => {
  const field = document.querySelector('[class*="touch-none"]');
  if (!field) return null;
  const rect = field.getBoundingClientRect();
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
})()`);
check('棋盘区域可定位', fieldRect != null);
const plaqueTime = await evalv(cdp, `(() => {
  const plaque = document.querySelector('[class*="qingya-level-plaque"]');
  const m = plaque?.textContent?.match(/(\\d{2}):(\\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
})()`);
const maxTaps = Math.min(90, Math.ceil(((plaqueTime ?? 60) + 9) / 3));
for (let i = 0; i < maxTaps; i += 1) {
  if (await evalv(cdp, gameOverJs)) break;
  // 贴近棋盘左右边缘的稀疏条带点空，尽量避免点中目标物
  const x = fieldRect.left + fieldRect.width * (i % 2 === 0 ? 0.03 : 0.97);
  const y = fieldRect.top + fieldRect.height * (0.05 + (i % 4) * 0.04);
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  await sleep(110);
}
check('判负结算页（时间到）', await waitFor(cdp, gameOverJs, 15000));

// 7) 结算页复活入口：先验证「未看满退出二次确认」，再看满 30s 真正复活
check('「看视频复活」按钮出现', await waitFor(cdp,
  `[...document.querySelectorAll('button')].some((b) => b.textContent?.includes('看视频复活'))`));
await shot(cdp, 'smoke-revive-entry.png');
check('打开复活视频', await clickButton(cdp, `b.textContent?.includes('看视频复活')`));
check('复活视频弹窗渲染', await waitFor(cdp,
  `!!document.querySelector('[role="dialog"][aria-label="看视频 · 原地复活"] video')`));
await sleep(2500);
await shot(cdp, 'smoke-video-revive.png');
check('关闭复活视频', await clickButton(cdp, `b.getAttribute('aria-label') === '关闭视频'`));
check('退出二次确认出现', await waitFor(cdp,
  `[...document.querySelectorAll('div')].some((d) => d.children.length === 0 && d.textContent === '现在退出拿不到奖励')`));
await shot(cdp, 'smoke-video-exit-confirm.png');
check('放弃复活奖励', await clickButton(cdp, `b.textContent?.includes('放弃奖励并退出')`));
check('回到结算页', await waitFor(cdp, gameOverJs));

// 8) 重新打开复活视频，看满 30s → 原地复活回到对局
check('再次打开复活视频', await clickButton(cdp, `b.textContent?.includes('看视频复活')`));
check('复活视频弹窗再次渲染', await waitFor(cdp,
  `!!document.querySelector('[role="dialog"][aria-label="看视频 · 原地复活"] video')`));
check('看满 30 秒复活到账', await waitFor(cdp,
  `[...document.querySelectorAll('div')].some((d) => d.children.length === 0 && d.textContent?.includes('复活成功 · +30 秒'))`, 45000));
check('复活后回到对局且倒计时恢复', await waitFor(cdp, `(() => {
    if (!!document.querySelector('[role="dialog"][aria-label="看视频 · 原地复活"]')) return false;
    if (${gameOverJs.replace(/\n\s*/g, ' ')}) return false;
    const plaque = document.querySelector('[class*="qingya-level-plaque"]');
    const m = plaque?.textContent?.match(/(\\d{2}):(\\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) > 10 : false;
  })()`));

check('无页面运行时异常', consoleErrors.length === 0, consoleErrors[0] ?? '');

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 通过`);
process.exit(failed.length ? 1 : 0);

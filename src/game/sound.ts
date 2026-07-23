// ============================================================
// 百物寻踪 —— 音效（Web Audio 合成，无外部素材）
// ============================================================

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) {
    const AudioContextConstructor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) throw new Error('当前浏览器不支持 Web Audio');
    ctx = new AudioContextConstructor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

/** 在首次用户交互时调用，解锁移动端音频 */
export function unlockAudio() {
  try { ac(); } catch { /* ignore */ }
}

function vibrate(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch { /* ignore */ }
}

/** 移动端轻触觉反馈；不支持振动的浏览器会自动忽略。 */
export const haptics = {
  correct(combo = 1) { vibrate(combo >= 4 ? [18, 24, 28] : 18); },
  wrong() { vibrate([45, 35, 45]); },
  hint() { vibrate([12, 30, 12]); },
  win() { vibrate([18, 38, 18, 38, 52]); },
};

interface Note {
  freq: number;
  t: number;      // 相对开始时间（秒）
  dur: number;
  type?: OscillatorType;
  vol?: number;
}

function play(notes: Note[]) {
  if (muted) return;
  try {
    const a = ac();
    const now = a.currentTime;
    for (const n of notes) {
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = n.type ?? 'sine';
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(n.vol ?? 0.18, now + n.t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.dur);
      osc.connect(gain).connect(a.destination);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.dur + 0.02);
    }
  } catch { /* ignore */ }
}

export const sfx = {
  /** 找对：轻快上行双音 */
  correct(combo = 1) {
    const lift = Math.min(combo, 8) * 30;
    play([
      { freq: 620 + lift, t: 0, dur: 0.1, type: 'triangle' },
      { freq: 930 + lift, t: 0.07, dur: 0.14, type: 'triangle' },
    ]);
  },
  /** 点错：低沉嗡鸣 */
  wrong() {
    play([{ freq: 140, t: 0, dur: 0.22, type: 'square', vol: 0.12 }]);
  },
  /** 倒计时滴答 */
  tick() {
    play([{ freq: 1100, t: 0, dur: 0.045, type: 'square', vol: 0.06 }]);
  },
  /** 提示道具：闪亮感 */
  hint() {
    play([
      { freq: 1200, t: 0, dur: 0.12, type: 'sine' },
      { freq: 1600, t: 0.1, dur: 0.18, type: 'sine' },
    ]);
  },
  /** 过关：小号角 */
  win() {
    play([
      { freq: 523, t: 0, dur: 0.12, type: 'triangle' },
      { freq: 659, t: 0.12, dur: 0.12, type: 'triangle' },
      { freq: 784, t: 0.24, dur: 0.12, type: 'triangle' },
      { freq: 1047, t: 0.36, dur: 0.3, type: 'triangle' },
    ]);
  },
  /** 游戏结束：下行音 */
  gameOver() {
    play([
      { freq: 420, t: 0, dur: 0.18, type: 'sawtooth', vol: 0.1 },
      { freq: 320, t: 0.18, dur: 0.18, type: 'sawtooth', vol: 0.1 },
      { freq: 220, t: 0.36, dur: 0.34, type: 'sawtooth', vol: 0.1 },
    ]);
  },
  /** 点击按钮 */
  click() {
    play([{ freq: 800, t: 0, dur: 0.05, type: 'triangle', vol: 0.1 }]);
  },
};

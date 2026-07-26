/**
 * 静态 H5 存档适配层：保留既有 key，浏览器禁用 localStorage 时自动退化为内存存档。
 * 这里只保存游戏进度，不保存密码、令牌或登录 Cookie。
 */
const memoryFallback = new Map<string, string>();

export const SAVE_KEYS = {
  // v3 是“十类古风百物”版本，保留旧 key 但不混用旧版分数口径。
  bestLevels: 'znm.best.levels.v3',
  bestEndless: 'znm.best.endless.v3',
  maxLevel: 'znm.best.maxLevel.v3',
  levelScores: 'znm.best.levelScores.v3',
  levelStars: 'znm.best.levelStars',
  collection: 'znm.collection.items.v1',
  stamina: 'znm.stamina.v1',
  // v2 将原来的三关分段教学合并为一次性总览，旧用户也只需重新看这一次。
  tutorial: 'znm.tutorial.seen.v2',
  partnerRecruited: 'znm.partner.recruited',
  partnerRecruitedAt: 'znm.partner.recruitedAt',
  partnerOnlineSec: 'znm.prog.onlineSec',
  partnerDailyPlaySec: 'znm.prog.dailyPlaySec',
  partnerDailyPlayDate: 'znm.prog.dailyPlayDate',
  partnerTotalFound: 'znm.prog.totalFound',
  partnerBestBaseScore: 'znm.prog.bestBaseScore',
  partnerBestCombo: 'znm.prog.bestCombo',
  muted: 'znm.settings.muted.v1',
  dailyLevelScores: 'znm.ranking.dailyLevelScores.v1',
} as const;

export const gameStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key) ?? memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },
  set(key: string, value: string): void {
    memoryFallback.set(key, value);
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Safari 隐私模式或宿主禁用存储时，本次会话仍可使用内存存档。
    }
  },
};

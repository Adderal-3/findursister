/**
 * 静态 H5 存档适配层：浏览器禁用 localStorage 时自动退化为内存存档。
 * 这里只保存游戏进度，不保存密码、令牌或登录 Cookie。
 *
 * 数据隔离（2026-08-17 起）：
 * - key 前缀为 `znm.<appKey>.<uid>` —— 同一域名部署多个同类游戏（不同圈子/appKey）
 *   时存档互不污染；同一设备切换账号后各玩各的，不会窜分。
 * - 未登录（本地预览 / 登录完成前）落在 `guest` 桶；登录完成后切换到 uid 桶。
 * - 切换 uid 时通过监听器通知外层重挂载，React 状态随之从新桶重建。
 */
import { dsConfig } from '../platform/ds/config';

const memoryFallback = new Map<string, string>();

export const SAVE_KEYS = {
  // v3 是“十类古风百物”版本，保留旧 key 但不混用旧版分数口径。
  bestLevels: 'best.levels.v3',
  bestEndless: 'best.endless.v3',
  maxLevel: 'best.maxLevel.v3',
  levelScores: 'best.levelScores.v3',
  levelStars: 'best.levelStars',
  collection: 'collection.items.v1',
  // v2 将原来的三关分段教学合并为一次性总览，旧用户也只需重新看这一次。
  tutorial: 'tutorial.seen.v2',
  partnerRecruited: 'partner.recruited',
  partnerRecruitedAt: 'partner.recruitedAt',
  partnerOnlineSec: 'prog.onlineSec',
  partnerDailyPlaySec: 'prog.dailyPlaySec',
  partnerDailyPlayDate: 'prog.dailyPlayDate',
  partnerTotalFound: 'prog.totalFound',
  partnerBestBaseScore: 'prog.bestBaseScore',
  partnerBestCombo: 'prog.bestCombo',
  muted: 'settings.muted.v1',
} as const;

type NamespaceListener = (namespace: string) => void;

let currentUid = 'guest';
const listeners = new Set<NamespaceListener>();

function namespace(): string {
  return `znm.${dsConfig.appKey}.${currentUid}`;
}

function prefixed(key: string): string {
  return `${namespace()}.${key}`;
}

/**
 * 登录态确定后由平台层调用，切换存档命名空间。
 * uid 变化（含切账号）时通知监听器；相同 uid 重复调用是幂等 no-op。
 */
export function setStorageIdentity(uid: unknown): void {
  const next = uid != null && uid !== '' && uid !== -9999 ? String(uid) : 'guest';
  if (next === currentUid) return;
  currentUid = next;
  const ns = namespace();
  for (const listener of listeners) listener(ns);
}

export function getStorageNamespace(): string {
  return namespace();
}

export function onStorageNamespaceChange(listener: NamespaceListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const gameStorage = {
  get(key: string): string | null {
    const fullKey = prefixed(key);
    try {
      return window.localStorage.getItem(fullKey) ?? memoryFallback.get(fullKey) ?? null;
    } catch {
      return memoryFallback.get(fullKey) ?? null;
    }
  },
  set(key: string, value: string): void {
    const fullKey = prefixed(key);
    memoryFallback.set(fullKey, value);
    try {
      window.localStorage.setItem(fullKey, value);
    } catch {
      // Safari 隐私模式或宿主禁用存储时，本次会话仍可使用内存存档。
    }
  },
};

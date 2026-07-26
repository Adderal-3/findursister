import { COLLECTIBLE_ITEMS, getItem } from './items';
import { gameStorage, SAVE_KEYS } from './storage';

import imgAfu from '../assets/partners/afu.png';
import imgXixi from '../assets/partners/xixi.png';
import imgGugu from '../assets/partners/gugu.png';
import imgYuanyuan from '../assets/partners/yuanyuan.png';
import imgPaopao from '../assets/partners/paopao.png';
import imgXingxing from '../assets/partners/xingxing.png';
import imgMimi from '../assets/partners/mimi.png';
import imgMeimei from '../assets/partners/meimei.png';

export type PartnerId =
  | 'afu'
  | 'xixi'
  | 'gugu'
  | 'yuanyuan'
  | 'paopao'
  | 'xingxing'
  | 'mimi'
  | 'meimei';

export type PartnerMetric =
  | 'online'
  | 'dailyPlay'
  | 'natureCollection'
  | 'threeStarLevels'
  | 'totalFound'
  | 'bestBaseScore'
  | 'bestCombo'
  | 'bond';

export interface PartnerDefinition {
  id: PartnerId;
  name: string;
  image: string;
  metric: PartnerMetric;
  threshold: number;
  progressLabel: (value: number) => string;
  lockedHint: string;
  recruitMessage: string;
}

export interface PartnerProgress extends PartnerDefinition {
  value: number;
  progress: number;
  recruited: boolean;
}

export interface PartnerClockState {
  onlineSec: number;
  dailyPlaySec: number;
  dailyPlayDate: string;
}

export interface PartnerCheckResult {
  partners: PartnerProgress[];
  recruited: PartnerId[];
  newlyRecruited: PartnerId[];
  bonusRate: number;
}

const clampDisplay = (value: number, max: number) => Math.min(Math.max(0, Math.floor(value)), max);
const minutesLabel = (value: number, maxMinutes: number, prefix: string) => (
  `${prefix} ${clampDisplay(value / 60, maxMinutes)}/${maxMinutes} 分钟`
);

export const PARTNERS: PartnerDefinition[] = [
  {
    id: 'afu',
    name: '叶问舟',
    image: imgAfu,
    metric: 'online',
    threshold: 1800,
    progressLabel: (value) => minutesLabel(value, 30, '累计在线'),
    lockedHint: '累计在线30分钟，叶问舟就会加入队伍。',
    recruitMessage: '叶问舟已加入寻宝队。',
  },
  {
    id: 'xixi',
    name: '燕无归',
    image: imgXixi,
    metric: 'dailyPlay',
    threshold: 1200,
    progressLabel: (value) => minutesLabel(value, 20, '今日游玩'),
    lockedHint: '任意一天累计游玩20分钟，燕无归就会加入队伍。',
    recruitMessage: '燕无归已加入寻宝队。',
  },
  {
    id: 'gugu',
    name: '叶雪青',
    image: imgGugu,
    metric: 'natureCollection',
    threshold: 15,
    progressLabel: (value) => `自然发现 ${clampDisplay(value, 15)}/15`,
    lockedHint: '发现15种植物、动物或飞行生灵，叶雪青就会加入队伍。',
    recruitMessage: '叶雪青已加入寻宝队。',
  },
  {
    id: 'yuanyuan',
    name: '方承意',
    image: imgYuanyuan,
    metric: 'threeStarLevels',
    threshold: 10,
    progressLabel: (value) => `三星通关 ${clampDisplay(value, 10)}/10`,
    lockedHint: '拿下10关三星评价，方承意就会加入队伍。',
    recruitMessage: '方承意已加入寻宝队。',
  },
  {
    id: 'paopao',
    name: '阿初',
    image: imgPaopao,
    metric: 'totalFound',
    threshold: 500,
    progressLabel: (value) => `累计寻物 ${clampDisplay(value, 500)}/500`,
    lockedHint: '累计找到500件物品，重复找到也会计入。',
    recruitMessage: '阿初已加入寻宝队。',
  },
  {
    id: 'xingxing',
    name: '花将离',
    image: imgXingxing,
    metric: 'bestBaseScore',
    threshold: 1500,
    progressLabel: (value) => `单关最高 ${clampDisplay(value, 1500)}/1500`,
    lockedHint: '单关基础分达到1500分，花将离就会加入队伍。',
    recruitMessage: '花将离已加入寻宝队。',
  },
  {
    id: 'mimi',
    name: '无情',
    image: imgMimi,
    metric: 'bestCombo',
    threshold: 8,
    progressLabel: (value) => `最高连击 ${clampDisplay(value, 8)}/8`,
    lockedHint: '在一局中达成8连击，无情就会加入队伍。',
    recruitMessage: '无情已加入寻宝队。',
  },
  {
    id: 'meimei',
    name: '姬蜜儿',
    image: imgMeimei,
    metric: 'bond',
    threshold: 7,
    progressLabel: (value) => `伙伴集结 ${clampDisplay(value, 7)}/7`,
    lockedHint: '把其余7位伙伴都找齐，姬蜜儿就会加入队伍。',
    recruitMessage: '姬蜜儿已加入寻宝队。',
  },
];

export const PARTNER_MAP = new Map(PARTNERS.map((partner) => [partner.id, partner]));
const STANDARD_PARTNERS = PARTNERS.filter((partner) => partner.id !== 'meimei');

function loadNumber(key: string): number {
  const value = Number(gameStorage.get(key));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(gameStorage.get(key) ?? '');
    return parsed == null ? fallback : parsed as T;
  } catch {
    return fallback;
  }
}

function localDayKey(now = Date.now()): string {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadPartnerClock(now = Date.now()): PartnerClockState {
  const today = localDayKey(now);
  const storedDate = gameStorage.get(SAVE_KEYS.partnerDailyPlayDate) ?? today;
  const dailyPlaySec = storedDate === today
    ? loadNumber(SAVE_KEYS.partnerDailyPlaySec)
    : 0;
  if (storedDate !== today) {
    gameStorage.set(SAVE_KEYS.partnerDailyPlayDate, today);
    gameStorage.set(SAVE_KEYS.partnerDailyPlaySec, '0');
  }
  return {
    onlineSec: loadNumber(SAVE_KEYS.partnerOnlineSec),
    dailyPlaySec,
    dailyPlayDate: today,
  };
}

export function advancePartnerClock(
  state: PartnerClockState,
  elapsedSec: number,
  isPlaying: boolean,
  now = Date.now(),
): PartnerClockState {
  const today = localDayKey(now);
  const dailyPlaySec = state.dailyPlayDate === today ? state.dailyPlaySec : 0;
  return {
    onlineSec: state.onlineSec + Math.max(0, elapsedSec),
    dailyPlaySec: dailyPlaySec + (isPlaying ? Math.max(0, elapsedSec) : 0),
    dailyPlayDate: today,
  };
}

export function savePartnerClock(state: PartnerClockState): void {
  gameStorage.set(SAVE_KEYS.partnerOnlineSec, String(Math.floor(state.onlineSec)));
  gameStorage.set(SAVE_KEYS.partnerDailyPlaySec, String(Math.floor(state.dailyPlaySec)));
  gameStorage.set(SAVE_KEYS.partnerDailyPlayDate, state.dailyPlayDate);
}

export function recordPartnerSettlement(input: {
  found: number;
  baseScore: number;
  bestCombo: number;
}): void {
  const totalFound = loadNumber(SAVE_KEYS.partnerTotalFound) + Math.max(0, Math.trunc(input.found));
  const bestBaseScore = Math.max(loadNumber(SAVE_KEYS.partnerBestBaseScore), input.baseScore);
  const bestCombo = Math.max(loadNumber(SAVE_KEYS.partnerBestCombo), Math.trunc(input.bestCombo));
  gameStorage.set(SAVE_KEYS.partnerTotalFound, String(totalFound));
  gameStorage.set(SAVE_KEYS.partnerBestBaseScore, String(bestBaseScore));
  gameStorage.set(SAVE_KEYS.partnerBestCombo, String(bestCombo));
}

function natureCollectionCount(collection: string[]): number {
  return collection.reduce((count, itemId) => {
    try {
      const item = getItem(itemId);
      const natureLike = item.tags.some((tag) => ['plant', 'animal', 'flying'].includes(tag))
        || item.objectTags?.some((tag) => ['flower', 'insect', 'fruit', 'vegetable'].includes(tag));
      return count + (natureLike ? 1 : 0);
    } catch {
      return count;
    }
  }, 0);
}

function validRecruited(): PartnerId[] {
  const validIds = new Set(PARTNERS.map((partner) => partner.id));
  const raw = loadJson<unknown>(SAVE_KEYS.partnerRecruited, []);
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is PartnerId => typeof id === 'string' && validIds.has(id as PartnerId)))];
}

function metricValues(collection: string[], levelStars: Record<number, number>) {
  const clock = loadPartnerClock();
  const historicalScores = loadJson<Record<string, number>>(SAVE_KEYS.levelScores, {});
  const historicalBestScore = Object.values(historicalScores).reduce(
    (best, score) => Math.max(best, Number.isFinite(Number(score)) ? Number(score) : 0),
    0,
  );
  return {
    online: clock.onlineSec,
    dailyPlay: clock.dailyPlaySec,
    natureCollection: natureCollectionCount(collection),
    threeStarLevels: Object.values(levelStars).filter((stars) => stars >= 3).length,
    totalFound: Math.max(loadNumber(SAVE_KEYS.partnerTotalFound), collection.length),
    bestBaseScore: Math.max(loadNumber(SAVE_KEYS.partnerBestBaseScore), historicalBestScore),
    bestCombo: loadNumber(SAVE_KEYS.partnerBestCombo),
  };
}

function buildProgress(
  collection: string[],
  levelStars: Record<number, number>,
  recruited: PartnerId[],
): PartnerProgress[] {
  const metrics = metricValues(collection, levelStars);
  const recruitedWithoutMeimei = recruited.filter((id) => id !== 'meimei').length;
  return PARTNERS.map((partner) => {
    const value = partner.metric === 'bond'
      ? recruitedWithoutMeimei
      : metrics[partner.metric];
    return {
      ...partner,
      value,
      progress: Math.min(1, value / partner.threshold),
      recruited: recruited.includes(partner.id),
    };
  });
}

export function checkPartnerRecruitments(
  collection: string[],
  levelStars: Record<number, number>,
): PartnerCheckResult {
  const recruited = validRecruited();
  const progress = buildProgress(collection, levelStars, recruited);
  const newlyRecruited: PartnerId[] = [];

  for (const partner of STANDARD_PARTNERS) {
    const current = progress.find((candidate) => candidate.id === partner.id);
    if (!recruited.includes(partner.id) && current && current.value >= partner.threshold) {
      recruited.push(partner.id);
      newlyRecruited.push(partner.id);
    }
  }

  const standardComplete = STANDARD_PARTNERS.every((partner) => recruited.includes(partner.id));
  if (standardComplete && !recruited.includes('meimei')) {
    recruited.push('meimei');
    newlyRecruited.push('meimei');
  }

  if (newlyRecruited.length) {
    gameStorage.set(SAVE_KEYS.partnerRecruited, JSON.stringify(recruited));
    const recruitedAt = loadJson<Record<string, number>>(SAVE_KEYS.partnerRecruitedAt, {});
    const now = Date.now();
    for (const id of newlyRecruited) recruitedAt[id] = recruitedAt[id] ?? now;
    gameStorage.set(SAVE_KEYS.partnerRecruitedAt, JSON.stringify(recruitedAt));
  }

  return {
    partners: buildProgress(collection, levelStars, recruited),
    recruited,
    newlyRecruited,
    bonusRate: recruited.length * 0.0125,
  };
}

export function collectibleCoverage(): number {
  return COLLECTIBLE_ITEMS.length;
}

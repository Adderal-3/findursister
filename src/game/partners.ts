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
  bonusRate: number;
  taskDriven?: boolean;
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
const hoursLabel = (value: number, maxHours: number, prefix: string) => {
  const current = Math.min(Math.max(0, value / 3600), maxHours);
  const display = current >= maxHours ? String(maxHours) : current.toFixed(1);
  return `${prefix} ${display}/${maxHours} 小时`;
};
const XINGXING_ONLINE_THRESHOLD_SECONDS = 10 * 60 * 60;

export const PARTNERS: PartnerDefinition[] = [
  {
    id: 'afu',
    name: '同行伙伴',
    image: imgAfu,
    metric: 'online',
    threshold: 1800,
    bonusRate: 0.0125,
    progressLabel: (value) => minutesLabel(value, 30, '累计在线'),
    lockedHint: '累计在线30分钟即可获得伙伴。',
    recruitMessage: '新伙伴已加入寻宝队。',
  },
  {
    id: 'xixi',
    name: '同行伙伴',
    image: imgXixi,
    metric: 'dailyPlay',
    threshold: 1200,
    bonusRate: 0.0125,
    progressLabel: (value) => minutesLabel(value, 20, '今日游玩'),
    lockedHint: '任意一天累计游玩20分钟即可获得伙伴。',
    recruitMessage: '新伙伴已加入寻宝队。',
  },
  {
    id: 'gugu',
    name: '同行伙伴',
    image: imgGugu,
    metric: 'natureCollection',
    threshold: 15,
    bonusRate: 0.0125,
    progressLabel: (value) => `自然发现 ${clampDisplay(value, 15)}/15`,
    lockedHint: '发现15种植物、动物或飞行生灵即可获得伙伴。',
    recruitMessage: '新伙伴已加入寻宝队。',
  },
  {
    id: 'yuanyuan',
    name: '同行伙伴',
    image: imgYuanyuan,
    metric: 'threeStarLevels',
    threshold: 10,
    bonusRate: 0.0125,
    progressLabel: (value) => `三星通关 ${clampDisplay(value, 10)}/10`,
    lockedHint: '拿下10关三星评价即可获得伙伴。',
    recruitMessage: '新伙伴已加入寻宝队。',
  },
  {
    id: 'paopao',
    name: '阿初',
    image: imgPaopao,
    metric: 'totalFound',
    threshold: 500,
    bonusRate: 0.0125,
    progressLabel: (value) => `累计寻物 ${clampDisplay(value, 500)}/500`,
    lockedHint: '累计找到500件物品，重复找到也会计入。',
    recruitMessage: '阿初已加入寻宝队。',
  },
  {
    id: 'xingxing',
    name: '同行伙伴',
    image: imgXingxing,
    metric: 'online',
    threshold: XINGXING_ONLINE_THRESHOLD_SECONDS,
    bonusRate: 0.0125,
    progressLabel: (value) => hoursLabel(value, 10, '累计在线'),
    lockedHint: '累计在线满10小时即可获得伙伴。',
    recruitMessage: '新伙伴已加入寻宝队。',
  },
  {
    id: 'mimi',
    name: '同行伙伴',
    image: imgMimi,
    metric: 'bestCombo',
    threshold: 1,
    bonusRate: 0.025,
    taskDriven: true,
    progressLabel: (value) => value >= 1 ? '大神任务已下发' : '等待大神任务下发',
    lockedHint: '更新大神 App 至最新版本，完成大神任务后即可获得伙伴。',
    recruitMessage: '大神任务伙伴已加入寻宝队。',
  },
  {
    id: 'meimei',
    name: '同行伙伴',
    image: imgMeimei,
    metric: 'bond',
    threshold: 7,
    bonusRate: 0.05,
    progressLabel: (value) => `伙伴集结 ${clampDisplay(value, 7)}/7`,
    lockedHint: '把其余7位伙伴都找齐即可获得最终伙伴。',
    recruitMessage: '最终伙伴已加入寻宝队。',
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
  metrics = metricValues(collection, levelStars),
): PartnerProgress[] {
  const recruitedWithoutMeimei = recruited.filter((id) => id !== 'meimei').length;
  return PARTNERS.map((partner) => {
    const value = partner.taskDriven
      ? Number(recruited.includes(partner.id))
      : partner.metric === 'bond'
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
  options: { taskPartnerGranted?: boolean | null } = {},
): PartnerCheckResult {
  const metrics = metricValues(collection, levelStars);
  const storedRecruited = validRecruited();
  let recruited = [...storedRecruited];
  let migratedTimedRecruitment = false;
  let migratedTaskRecruitment = false;
  const taskPartnerGranted = options.taskPartnerGranted ?? null;

  // 旧版本中 xingxing 由“单关基础分 1500”解锁。规则切换为累计在线 10 小时后，
  // 未达到新条件的旧解锁需要撤回；依赖全员集结的最终伙伴也同步恢复锁定。
  if (recruited.includes('xingxing') && metrics.online < XINGXING_ONLINE_THRESHOLD_SECONDS) {
    recruited = recruited.filter((id) => id !== 'xingxing' && id !== 'meimei');
    migratedTimedRecruitment = true;
  }

  // 任务伙伴只认大神后台字段。未知/失败状态也不进入 UI 和榜分（失败关闭）；
  // 服务端明确返回 0 时清理旧版“8 连击”产生的本地解锁记录。
  if (taskPartnerGranted !== true && recruited.includes('mimi')) {
    recruited = recruited.filter((id) => id !== 'mimi' && id !== 'meimei');
    if (taskPartnerGranted === false) migratedTaskRecruitment = true;
  }

  const progress = buildProgress(collection, levelStars, recruited, metrics);
  const newlyRecruited: PartnerId[] = [];

  for (const partner of STANDARD_PARTNERS) {
    const current = progress.find((candidate) => candidate.id === partner.id);
    const eligible = partner.taskDriven
      ? taskPartnerGranted === true
      : Boolean(current && current.value >= partner.threshold);
    if (!recruited.includes(partner.id) && eligible) {
      recruited.push(partner.id);
      newlyRecruited.push(partner.id);
    }
  }

  const standardComplete = STANDARD_PARTNERS.every((partner) => recruited.includes(partner.id));
  if (standardComplete && !recruited.includes('meimei')) {
    recruited.push('meimei');
    newlyRecruited.push('meimei');
  }

  if (migratedTimedRecruitment || migratedTaskRecruitment || newlyRecruited.length) {
    gameStorage.set(SAVE_KEYS.partnerRecruited, JSON.stringify(recruited));
    const recruitedAt = loadJson<Record<string, number>>(SAVE_KEYS.partnerRecruitedAt, {});
    if (migratedTimedRecruitment) {
      delete recruitedAt.xingxing;
      delete recruitedAt.meimei;
    }
    if (migratedTaskRecruitment) {
      delete recruitedAt.mimi;
      delete recruitedAt.meimei;
    }
    const now = Date.now();
    for (const id of newlyRecruited) recruitedAt[id] = recruitedAt[id] ?? now;
    gameStorage.set(SAVE_KEYS.partnerRecruitedAt, JSON.stringify(recruitedAt));
  }

  return {
    partners: buildProgress(collection, levelStars, recruited, metrics),
    recruited,
    newlyRecruited,
    bonusRate: recruited.reduce(
      (sum, id) => sum + (PARTNER_MAP.get(id)?.bonusRate ?? 0),
      0,
    ),
  };
}

export function collectibleCoverage(): number {
  return COLLECTIBLE_ITEMS.length;
}

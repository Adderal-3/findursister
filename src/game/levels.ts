// ============================================================
// 百物寻踪 —— 200 关属性挑战数值
// ============================================================

import levelsCsv from '../../数值表_src/levels_200.csv?raw';
import type { CategoryId } from './types';

export type LevelType = 'standard' | 'cluster' | 'mist' | 'night' | 'speed' | 'boss';

export interface LevelGoalConfig {
  taskId: string;
  targetCount: number;
}

export interface LevelConfig {
  level: number;
  chapter: number;
  category: CategoryId;
  /** 同一关可包含 1~3 个独立寻找目标，游玩时按顺序逐个揭晓。 */
  goals: LevelGoalConfig[];
  type: LevelType;
  /** 本关所有阶段寻找目标的合计件数。 */
  targetCount: number;
  distractors: number;
  timeLimit: number;
  hints: number;
  starBase: number;
  star2: number;
  star3: number;
  starUnlockReq: number | null;
}

export interface WaveConfig {
  targetCount: number;
  distractors: number;
}

const [headerLine, ...dataLines] = levelsCsv.trim().split(/\r?\n/);
const headers = headerLine.split(',');

function parseRow(line: string): LevelConfig {
  const values = line.split(',');
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  const taskIds = (row.taskIds || row.taskId || '').split('|').filter(Boolean);
  const targetCounts = (row.targetCounts || row.targetCount || '')
    .split('|')
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);
  const goals = taskIds.map((taskId, index) => ({
    taskId,
    targetCount: targetCounts[index] ?? targetCounts[0] ?? 1,
  }));
  return {
    level: Number(row.level),
    chapter: Number(row.chapter),
    category: row.category as CategoryId,
    goals,
    type: row.type as LevelType,
    targetCount: goals.reduce((sum, goal) => sum + goal.targetCount, 0),
    distractors: Number(row.distractors),
    timeLimit: Number(row.timeLimitSec),
    hints: 1,
    starBase: Number(row.starBase),
    star2: Number(row.star2),
    star3: Number(row.star3),
    starUnlockReq: row.starUnlockReq ? Number(row.starUnlockReq) : null,
  };
}

export const LEVELS = dataLines.filter(Boolean).map(parseRow);
export const LEVEL_COUNT = LEVELS.length;

export const CHAPTER_NAMES = [
  '京华初探', '汴河旧梦', '碧水行舟', '山寺夜火', '塞外风尘',
  '百工奇器', '花朝宴集', '云中异兽', '月下迷踪', '万象归藏',
] as const;

export function chapterTitle(chapter: number): string {
  return CHAPTER_NAMES[Math.min(Math.max(Math.trunc(chapter), 1), CHAPTER_NAMES.length) - 1]
    ?? CHAPTER_NAMES[0];
}

if (LEVEL_COUNT !== 200) {
  throw new Error(`关卡表应包含 200 关，实际读取到 ${LEVEL_COUNT} 关`);
}

/**
 * 临时：先把所有关卡砍成单一玩法（standard），看整体效果。
 * 后续要恢复迷踪/夜巡/章末等差异化机制时，改成 false 即可，数值表里的 type 原样保留。
 */
const UNIFY_LEVEL_TYPE = true;

export function levelConfig(n: number): LevelConfig {
  const index = Math.min(Math.max(Math.trunc(n), 1), LEVEL_COUNT) - 1;
  const config = LEVELS[index];
  if (!config) throw new Error(`找不到第 ${n} 关配置`);
  if (UNIFY_LEVEL_TYPE && config.type !== 'standard') {
    return { ...config, type: 'standard' };
  }
  return config;
}

export function starsForScore(score: number, config: LevelConfig): 1 | 2 | 3 {
  if (score >= config.star3) return 3;
  if (score >= config.star2) return 2;
  return 1;
}

export const LEVEL_TYPE_LABELS: Record<LevelType, string> = {
  standard: '寻常局',
  cluster: '百物集',
  mist: '迷踪局',
  night: '夜巡局',
  speed: '疾眼局',
  boss: '章末大考',
};

export const WRONG_PENALTY_SEC = 3;
export const ENDLESS_START_SEC = 75;
export const ENDLESS_FIND_BONUS_SEC = 2;
export const ENDLESS_TIME_CAP = 99;
export const ENDLESS_HINTS = 0;
export const COMBO_MAX = 10;

export function comboMultiplier(combo: number): number {
  const normalized = Math.min(Math.max(combo, 1), COMBO_MAX);
  return 1 + 0.1 * (normalized - 1);
}

export function scoreForFind(combo: number, timeLeft: number): number {
  return Math.max(1, Math.round(timeLeft * comboMultiplier(combo) * 10) / 10);
}

/** 每关在总榜中的权重一致，避免后期多目标关仅因目标更多就碾压前期关。 */
export function levelScoreToRankingPoints(score: number, config: LevelConfig): number {
  if (!Number.isFinite(score) || score <= 0 || config.starBase <= 0) return 0;
  const normalized = Math.min(1.2, score / config.starBase);
  return Math.round(normalized * 1000);
}

export function leaderboardBaseScore(levelScores: Record<number, number>): number {
  return Object.entries(levelScores).reduce((sum, [levelKey, score]) => {
    const level = Number(levelKey);
    if (!Number.isInteger(level) || level < 1 || level > LEVEL_COUNT) return sum;
    return sum + levelScoreToRankingPoints(score, levelConfig(level));
  }, 0);
}

export function waveConfig(wave: number): WaveConfig {
  return {
    targetCount: Math.min(4 + Math.floor((wave - 1) / 3), 9),
    distractors: Math.min(22 + wave * 3, 48),
  };
}

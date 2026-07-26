import { CHAPTER_NAMES, LEVELS } from './levels';

export function totalStars(levelStars: Record<number, number>): number {
  return Object.values(levelStars).reduce((sum, stars) => sum + Math.max(0, Math.min(3, stars)), 0);
}

export function accessibleMaxLevel(progressMaxLevel: number, stars: number): number {
  const normalizedProgress = Math.min(LEVELS.length, Math.max(1, Math.trunc(progressMaxLevel)));
  const blockedGate = LEVELS.find((level) => (
    level.level <= normalizedProgress
    && level.starUnlockReq != null
    && stars < level.starUnlockReq
  ));
  return blockedGate ? blockedGate.level - 1 : normalizedProgress;
}

const CHAPTER_GATES = [0, 15, 45, 80, 120, 165, 215, 270, 330, 395];
const CHAPTER_SUBTITLES = [
  '学会观察与连续命中',
  '双目标与复合条件',
  '三目标与迷雾夜色',
  '密集场景与特殊关',
  '混合规则与稳定节奏',
  '材质、外观与排除条件',
  '高密度多目标挑战',
  '异兽与器物交错迷局',
  '极速判断与路线规划',
  '终章综合寻踪大考',
];

export const STORY_CHAPTERS = CHAPTER_NAMES.map((name, index) => ({
  id: index + 1,
  name,
  subtitle: CHAPTER_SUBTITLES[index] ?? '综合寻踪挑战',
  start: index * 20 + 1,
  end: (index + 1) * 20,
  gate: CHAPTER_GATES[index] ?? 0,
}));

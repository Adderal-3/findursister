// ============================================================
// 百物寻踪 —— 游戏主状态机
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CategoryId, FloatText, GameMode, GamePhase, ParticleBurst, PlacedItem, TargetTask,
} from '../game/types';
import { generateScene } from '../game/scene';
import {
  categoryTaskRule, endlessTaskRule, getTaskRule, primaryCategoryForTask,
} from '../game/tasks';
import {
  ENDLESS_FIND_BONUS_SEC, ENDLESS_HINTS, ENDLESS_START_SEC, ENDLESS_TIME_CAP,
  leaderboardBaseScore, LEVEL_COUNT, levelConfig, levelScoreToRankingPoints,
  scoreForFind, starsForScore, waveConfig, WRONG_PENALTY_SEC,
} from '../game/levels';
import { COLLECTIBLE_ITEMS } from '../game/items';
import { haptics, setMuted as setSoundMuted, sfx } from '../game/sound';
import { gameStorage, SAVE_KEYS } from '../game/storage';
import { initDsPlatform, openTaskPanel, trackEvent } from '../platform/ds/runtime';
import { loadDsProgress, syncProgressToDs } from '../platform/ds/leaderboard';
import { dsPlatformEnabled } from '../platform/ds/config';
import { consumeSkill, getSkillPool, refreshSkillPool } from '../platform/ds/skills';
import { refreshLatestAppPartnerGrant } from '../platform/ds/partnerRewards';
import { prefetchVideoRewardSource } from '../game/videoRewards';
import {
  advancePartnerClock, checkPartnerRecruitments, loadPartnerClock,
  recordPartnerSettlement, savePartnerClock, type PartnerId,
} from '../game/partners';
import { accessibleMaxLevel, totalStars as countTotalStars } from '../game/progression';

function loadNum(key: string): number {
  const value = Number(gameStorage.get(key));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function loadLevelScores(): Record<number, number> {
  try {
    const value: unknown = JSON.parse(gameStorage.get(SAVE_KEYS.levelScores) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, score]) => [Number(key), Number(score)] as const)
        .filter(([level, score]) => Number.isInteger(level) && level >= 1
          && level <= LEVEL_COUNT && Number.isFinite(score) && score > 0),
    );
  } catch {
    return {};
  }
}

function loadCollection(): string[] {
  try {
    const value: unknown = JSON.parse(gameStorage.get(SAVE_KEYS.collection) ?? '[]');
    if (!Array.isArray(value)) return [];
    const validIds = new Set(COLLECTIBLE_ITEMS.map((item) => item.id));
    return [...new Set(value.filter((id): id is string => typeof id === 'string' && validIds.has(id)))];
  } catch {
    return [];
  }
}

function loadLevelStars(scores: Record<number, number>): Record<number, number> {
  let stored: Record<number, number> = {};
  try {
    const value: unknown = JSON.parse(gameStorage.get(SAVE_KEYS.levelStars) ?? '{}');
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      stored = Object.fromEntries(
        Object.entries(value)
          .map(([key, stars]) => [Number(key), Number(stars)] as const)
          .filter(([level, stars]) => Number.isInteger(level) && level >= 1
            && level <= LEVEL_COUNT && [1, 2, 3].includes(stars)),
      );
    }
  } catch {
    stored = {};
  }

  for (const [levelKey, score] of Object.entries(scores)) {
    const level = Number(levelKey);
    const derived = starsForScore(score, levelConfig(level));
    stored[level] = Math.max(stored[level] ?? 0, derived);
  }
  return stored;
}

let effectId = 1;
/** 加时统一 30 秒：每关首次免费 +30s；加时技能 / 任务视频看满 30s 同样 +30s。 */
export const TIME_BOOST_SECONDS = 30;
/** 单关加时上限：在限时时长基础上最多叠加 60 秒，防止技能堆叠破坏关卡节奏。 */
const TIME_BOOST_CAP_SECONDS = 60;

export function useGame() {
  const initialScores = useRef(loadLevelScores()).current;
  const initialStars = useRef(loadLevelStars(initialScores)).current;
  const initialCollection = useRef(loadCollection()).current;
  const initialPartnerCheck = useRef(checkPartnerRecruitments(initialCollection, initialStars)).current;
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [mode, setMode] = useState<GameMode>('levels');
  const [level, setLevel] = useState(1);
  const [category, setCategory] = useState<CategoryId>('instrument');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeLimit, setTimeLimit] = useState(1);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [targets, setTargets] = useState<TargetTask[]>([]);
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(0);
  const [paused, setPaused] = useState(false);
  const [quitConfirm, setQuitConfirm] = useState(false);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [bursts, setBursts] = useState<ParticleBurst[]>([]);
  const [hintUid, setHintUid] = useState<number | null>(null);
  const [shake, setShake] = useState(0);
  const [round, setRound] = useState(0);
  const [stats, setStats] = useState({ found: 0, wrong: 0 });
  const [lastGain, setLastGain] = useState({ find: 0, bonus: 0 });
  const [lastStars, setLastStars] = useState<1 | 2 | 3>(1);
  const [isNewLevelBest, setIsNewLevelBest] = useState(false);
  const [lastLevelPreviousBest, setLastLevelPreviousBest] = useState(0);
  const [lastLeaderboardBaseDelta, setLastLeaderboardBaseDelta] = useState(0);
  const [muted, setMutedState] = useState(() => gameStorage.get(SAVE_KEYS.muted) === '1');
  const [timeBoostFreeAvailable, setTimeBoostFreeAvailable] = useState(true);
  const [timeBoostTaskAvailable, setTimeBoostTaskAvailable] = useState(true);
  const [timeBoostToast, setTimeBoostToast] = useState<string | null>(null);
  const [timeBoostTaskPrompt, setTimeBoostTaskPrompt] = useState(false);
  /** 进行中的视频奖励会话：rewarded=true 表示 30s 已核验发奖，但视频流继续播放，等待玩家主动关闭。 */
  const [videoReward, setVideoReward] = useState<{
    kind: 'boost' | 'revive';
    id: number;
    rewarded: boolean;
  } | null>(null);
  /** 看视频复活每局限一次：关卡=每次挑战（含重试/下一关重置），无尽=整局（不随波次重置）。 */
  const [videoReviveAvailable, setVideoReviveAvailable] = useState(true);
  // 技能池镜像（function_addtime / function_tishi），真源在服务端（CMS / 任务面板发放）。
  const [skillBoosts, setSkillBoosts] = useState(0);
  const [skillHints, setSkillHints] = useState(0);
  const [goalNotice, setGoalNotice] = useState<{
    id: number;
    completedLabel: string;
    nextLabel: string;
  } | null>(null);
  const [levelScores, setLevelScores] = useState<Record<number, number>>(initialScores);
  const [levelStars, setLevelStars] = useState<Record<number, number>>(initialStars);
  const [, setCollection] = useState<string[]>(initialCollection);
  const [partners, setPartners] = useState(initialPartnerCheck.partners);
  const [partnerNoticeQueue, setPartnerNoticeQueue] = useState<PartnerId[]>(
    initialPartnerCheck.newlyRecruited,
  );
  const [best, setBest] = useState({
    levels: leaderboardBaseScore(initialScores),
    endless: loadNum(SAVE_KEYS.bestEndless),
    maxLevel: Math.min(LEVEL_COUNT, Math.max(1, loadNum(SAVE_KEYS.maxLevel))),
  });
  /** 大神环境必须先合并服务端历史最大值，完成前禁止把本地初始值回写。 */
  const [progressHydrated, setProgressHydrated] = useState(!dsPlatformEnabled);

  const scoreRef = useRef(0);
  const lastCategoryRef = useRef<CategoryId | null>(null);
  const lastTaskIdRef = useRef<string | null>(null);
  const scoreAtStartRef = useRef(0);
  const prevCeilRef = useRef(0);
  /** 精确到毫秒的倒计时，避免 state 每 100ms 更新一次导致全树重渲染。 */
  const timeLeftPreciseRef = useRef(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goalNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeBoostToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectionRef = useRef(initialCollection);
  const levelStarsRef = useRef(initialStars);
  const partnerClockRef = useRef(loadPartnerClock());
  const taskPartnerGrantedRef = useRef<boolean | null>(null);
  const roundFoundRef = useRef(0);
  const roundBestComboRef = useRef(0);
  const endlessFoundRef = useRef(0);
  const endlessBestComboRef = useRef(0);
  /** 无尽模式已结算进伙伴累计的发现数（复活续局后 finishGame 会再跑，按增量结算）。 */
  const endlessSettledFoundRef = useRef(0);
  /** 本局是否经历过看视频复活（用于判负/结算埋点标注）。 */
  const revivedRef = useRef(false);

  const refreshPartners = useCallback((
    nextCollection = collectionRef.current,
    nextStars = levelStarsRef.current,
  ) => {
    const result = checkPartnerRecruitments(nextCollection, nextStars, {
      taskPartnerGranted: taskPartnerGrantedRef.current,
    });
    setPartners(result.partners);
    if (result.newlyRecruited.length) {
      setPartnerNoticeQueue((current) => [
        ...current,
        ...result.newlyRecruited.filter((id) => !current.includes(id)),
      ]);
      for (const id of result.newlyRecruited) {
        trackEvent({ event: 'partner_recruit', partner: id });
      }
    }
    return result;
  }, []);
  const starTotal = countTotalStars(levelStars);
  const unlockedMaxLevel = accessibleMaxLevel(best.maxLevel, starTotal);
  const recruitedCount = partners.filter((partner) => partner.recruited).length;
  const partnerBonusRate = partners.reduce(
    (sum, partner) => sum + (partner.recruited ? partner.bonusRate : 0),
    0,
  );
  const rankingScore = Math.round(
    (best.levels + best.endless) * (1 + partnerBonusRate),
  );
  const roundScore = mode === 'levels'
    ? Math.max(0, score - scoreAtStartRef.current)
    : score;

  /** 拉取服务端技能余额（任务面板/CMS 发放结果），镜像到本地 state。 */
  const syncSkillPool = useCallback(async () => {
    const pool = await refreshSkillPool();
    setSkillBoosts(pool.addtime);
    setSkillHints(pool.tishi);
  }, []);

  /** 任务伙伴只读取大神后台下发字段；回到前台时再次拉取任务完成结果。 */
  const syncTaskPartnerGrant = useCallback(async () => {
    taskPartnerGrantedRef.current = await refreshLatestAppPartnerGrant();
    refreshPartners();
  }, [refreshPartners]);

  const toggleMuted = useCallback(() => {
    setMutedState((current) => {
      const next = !current;
      setSoundMuted(next);
      gameStorage.set(SAVE_KEYS.muted, next ? '1' : '0');
      return next;
    });
  }, []);

  const showTimeBoostToast = useCallback((message: string) => {
    setTimeBoostToast(message);
    if (timeBoostToastTimerRef.current) clearTimeout(timeBoostToastTimerRef.current);
    timeBoostToastTimerRef.current = setTimeout(() => setTimeBoostToast(null), 1700);
  }, []);

  const setScoreSync = useCallback((value: number) => {
    scoreRef.current = value;
    setScore(value);
  }, []);

  /**
   * 设置倒计时：精确值存在 ref 里，state 只保留整数秒。
   * 这样 100ms 心跳里 state 每秒最多变一次，全树重渲染从 10 次/秒降到 1 次/秒。
   */
  const setTimeSync = useCallback((value: number) => {
    const clamped = Math.max(0, value);
    timeLeftPreciseRef.current = clamped;
    const ceil = Math.ceil(clamped);
    prevCeilRef.current = ceil;
    setTimeLeft(clamped);
  }, []);

  /** 在当前精确剩余时间上做增减（加时 / 扣时），并按上限钳制。 */
  const adjustTime = useCallback((delta: number, cap = Infinity) => {
    setTimeSync(Math.min(cap, timeLeftPreciseRef.current + delta));
  }, [setTimeSync]);

  const addFloat = useCallback((x: number, y: number, text: string, kind: FloatText['kind']) => {
    const id = effectId++;
    setFloats((current) => [...current, { id, x, y, text, kind }]);
    setTimeout(() => setFloats((current) => current.filter((item) => item.id !== id)), 900);
  }, []);

  const addBurst = useCallback((x: number, y: number, emoji: string) => {
    const id = effectId++;
    setBursts((current) => [...current, { id, x, y, emoji }]);
    setTimeout(() => setBursts((current) => current.filter((item) => item.id !== id)), 700);
  }, []);

  const discoverItem = useCallback((itemId: string) => {
    setCollection((current) => {
      if (current.includes(itemId)) return current;
      const next = [...current, itemId];
      collectionRef.current = next;
      gameStorage.set(SAVE_KEYS.collection, JSON.stringify(next));
      refreshPartners(next, levelStarsRef.current);
      return next;
    });
  }, [refreshPartners]);

  const setupRound = useCallback((nextMode: GameMode, roundNumber: number, keepScore: number) => {
    // 上一关的点错震动不能带入新场景，否则 GameField 重新挂载时会再次播放。
    setShake(0);
    setGoalNotice(null);
    setTimeBoostToast(null);
    setTimeBoostTaskPrompt(false);
    roundFoundRef.current = 0;
    roundBestComboRef.current = 0;
    const preferredTargetIds = new Set(
      COLLECTIBLE_ITEMS
        .filter((item) => !collectionRef.current.includes(item.id))
        .map((item) => item.id),
    );
    if (nextMode === 'levels') {
      const config = levelConfig(roundNumber);
      const rules = config.goals.length
        ? config.goals.map((goal) => getTaskRule(goal.taskId, goal.targetCount))
        : [categoryTaskRule(config.category, config.targetCount)];
      const activeRule = rules[0];
      const nextCategory = primaryCategoryForTask(activeRule, config.category);
      setCategory(nextCategory);
      lastCategoryRef.current = nextCategory;
      lastTaskIdRef.current = activeRule.id;
      const scene = generateScene({
        rules,
        distractors: config.distractors,
        levelType: config.type,
        preferredTargetIds,
      });
      setActiveGoalIndex(0);
      setItems(scene.items);
      setTargets(scene.targets);
      setTimeSync(config.timeLimit);
      setTimeLimit(config.timeLimit);
      setHintsLeft(config.hints);
    } else {
      const config = waveConfig(roundNumber);
      const rule = endlessTaskRule(roundNumber, config.targetCount, lastTaskIdRef.current);
      const nextCategory = primaryCategoryForTask(
        rule,
        lastCategoryRef.current ?? 'instrument',
      );
      setCategory(nextCategory);
      lastCategoryRef.current = nextCategory;
      lastTaskIdRef.current = rule.id;
      const scene = generateScene({
        rules: [rule],
        distractors: config.distractors,
        preferredTargetIds,
      });
      setActiveGoalIndex(0);
      setItems(scene.items);
      setTargets(scene.targets);
    }
    scoreAtStartRef.current = keepScore;
    setHintUid(null);
    setRound((current) => current + 1);
  }, [setTimeSync]);

  const commitEndlessBest = useCallback((finalScore: number) => {
    const endless = Math.max(best.endless, finalScore);
    gameStorage.set(SAVE_KEYS.bestEndless, String(endless));
    setBest((current) => ({ ...current, endless }));
    void syncProgressToDs({ endlessBest: endless });
  }, [best.endless]);

  const commitLevelClear = useCallback((clearedLevel: number, levelScore: number) => {
    const config = levelConfig(clearedLevel);
    const earnedStars = starsForScore(levelScore, config);
    setLastStars(earnedStars);
    const previous = levelScores[clearedLevel] ?? 0;
    const nextScores = { ...levelScores, [clearedLevel]: Math.max(previous, levelScore) };
    const nextStars = {
      ...levelStarsRef.current,
      [clearedLevel]: Math.max(levelStarsRef.current[clearedLevel] ?? 0, earnedStars),
    };
    const total = leaderboardBaseScore(nextScores);
    const previousRankingPoints = levelScoreToRankingPoints(previous, config);
    const nextRankingPoints = levelScoreToRankingPoints(Math.max(previous, levelScore), config);
    setIsNewLevelBest(levelScore > previous);
    setLastLevelPreviousBest(previous);
    setLastLeaderboardBaseDelta(Math.max(0, nextRankingPoints - previousRankingPoints));
    setLevelScores(nextScores);
    levelStarsRef.current = nextStars;
    setLevelStars(nextStars);
    const maxLevel = Math.min(LEVEL_COUNT, Math.max(best.maxLevel, clearedLevel + 1));
    setBest((current) => ({ ...current, levels: total, maxLevel }));
    recordPartnerSettlement({
      found: roundFoundRef.current,
      baseScore: levelScore,
      bestCombo: roundBestComboRef.current,
    });
    refreshPartners(collectionRef.current, nextStars);
    gameStorage.set(SAVE_KEYS.maxLevel, String(maxLevel));
    gameStorage.set(SAVE_KEYS.levelScores, JSON.stringify(nextScores));
    gameStorage.set(SAVE_KEYS.levelStars, JSON.stringify(nextStars));
    gameStorage.set(SAVE_KEYS.bestLevels, String(total));
    // 每关历史最高原始分明细（level_detail），过关即同步，后台按用户维度留档。
    void syncProgressToDs({ levelDetail: nextScores });
  }, [best.maxLevel, levelScores, refreshPartners]);

  const startGame = useCallback((nextMode: GameMode, startLevel = 1) => {
    setMode(nextMode);
    const initialLevel = nextMode === 'levels'
      ? Math.min(Math.max(Math.trunc(startLevel), 1), unlockedMaxLevel)
      : 1;
    setLevel(initialLevel);
    setScoreSync(0);
    setCombo(0);
    setStats({ found: 0, wrong: 0 });
    setLastLevelPreviousBest(0);
    setLastLeaderboardBaseDelta(0);
    endlessFoundRef.current = 0;
    endlessBestComboRef.current = 0;
    endlessSettledFoundRef.current = 0;
    setLastGain({ find: 0, bonus: 0 });
    setTimeBoostFreeAvailable(true);
    setTimeBoostTaskAvailable(true);
    if (nextMode === 'endless') {
      setTimeSync(ENDLESS_START_SEC);
      setTimeLimit(ENDLESS_START_SEC);
      setHintsLeft(ENDLESS_HINTS);
    }
    setupRound(nextMode, initialLevel, 0);
    setPaused(false);
    setQuitConfirm(false);
    setVideoReward(null);
    setVideoReviveAvailable(true);
    revivedRef.current = false;
    setPhase('playing');
    // 进局时同步技能余额（加时/提示技能在局内消耗）
    void syncSkillPool();
    trackEvent({ event: nextMode === 'levels' ? 'level_start' : 'endless_start', mode: nextMode, level: initialLevel });
    sfx.click();
  }, [setScoreSync, setTimeSync, setupRound, unlockedMaxLevel, syncSkillPool]);

  const nextLevel = useCallback(() => {
    if (level >= LEVEL_COUNT) {
      setPhase('menu');
      return;
    }
    if (level + 1 > unlockedMaxLevel) {
      setPhase('menu');
      return;
    }
    const next = level + 1;
    setLevel(next);
    setCombo(0);
    setTimeBoostFreeAvailable(true);
    setTimeBoostTaskAvailable(true);
    setupRound(mode, next, scoreRef.current);
    setPaused(false);
    setQuitConfirm(false);
    setVideoReward(null);
    setVideoReviveAvailable(true);
    revivedRef.current = false;
    setPhase('playing');
    trackEvent({ event: 'level_next', mode, level: next, score: scoreRef.current });
    sfx.click();
  }, [level, mode, setupRound, unlockedMaxLevel]);

  const retry = useCallback(() => {
    setTimeBoostFreeAvailable(true);
    setTimeBoostTaskAvailable(true);
    if (mode === 'levels') {
      setScoreSync(scoreAtStartRef.current);
      setCombo(0);
      setupRound(mode, level, scoreAtStartRef.current);
    } else {
      setLevel(1);
      setScoreSync(0);
      setCombo(0);
      setStats({ found: 0, wrong: 0 });
      endlessFoundRef.current = 0;
      endlessBestComboRef.current = 0;
      endlessSettledFoundRef.current = 0;
      setTimeSync(ENDLESS_START_SEC);
      setTimeLimit(ENDLESS_START_SEC);
      setHintsLeft(ENDLESS_HINTS);
      setupRound(mode, 1, 0);
    }
    setPaused(false);
    setQuitConfirm(false);
    setVideoReward(null);
    setVideoReviveAvailable(true);
    revivedRef.current = false;
    setPhase('playing');
    trackEvent({
      event: mode === 'levels' ? 'level_retry' : 'endless_retry',
      mode,
      level: mode === 'levels' ? level : 1,
      score: scoreRef.current,
    });
    sfx.click();
  }, [level, mode, setScoreSync, setTimeSync, setupRound]);

  const quitToMenu = useCallback(() => {
    trackEvent({ event: 'game_quit', mode, level, phase });
    setPhase('menu');
    setPaused(false);
    setQuitConfirm(false);
    setVideoReward(null);
    sfx.click();
  }, [level, mode, phase]);

  const requestQuit = useCallback(() => {
    setPaused(true);
    setQuitConfirm(true);
  }, []);

  const cancelQuit = useCallback(() => {
    setQuitConfirm(false);
    setPaused(false);
  }, []);

  const finishGame = useCallback((currentMode: GameMode) => {
    if (currentMode === 'endless') {
      commitEndlessBest(scoreRef.current);
      // 复活续局会再次走到这里：只结算「上次结算以来」的新增发现，避免重复累计。
      recordPartnerSettlement({
        found: endlessFoundRef.current - endlessSettledFoundRef.current,
        baseScore: 0,
        bestCombo: endlessBestComboRef.current,
      });
      endlessSettledFoundRef.current = endlessFoundRef.current;
      refreshPartners();
    }
    trackEvent({
      event: currentMode === 'endless' ? 'endless_end' : 'level_fail',
      mode: currentMode,
      level,
      category,
      task_id: targets.map((target) => target.taskId).join('|'),
      score: scoreRef.current,
      revived: revivedRef.current,
    });
    setPhase('gameOver');
    sfx.gameOver();
  }, [category, commitEndlessBest, level, refreshPartners, targets]);

  const applyWrong = useCallback((x: number, y: number) => {
    adjustTime(-WRONG_PENALTY_SEC);
    setCombo(0);
    setStats((current) => ({ ...current, wrong: current.wrong + 1 }));
    addFloat(x, y, `-${WRONG_PENALTY_SEC}秒`, 'penalty');
    setShake((current) => current + 1);
    trackEvent({
      event: 'item_miss', mode, level, category,
      task_id: targets.map((target) => target.taskId).join('|'), penalty_sec: WRONG_PENALTY_SEC,
    });
    sfx.wrong();
    haptics.wrong();
  }, [addFloat, adjustTime, category, level, mode, targets]);

  const handleItemClick = useCallback((uid: number) => {
    if (phase !== 'playing' || paused) return;
    const item = items.find((candidate) => candidate.uid === uid);
    if (!item || item.found) return;

    const itemTaskIds = item.targetTaskIds?.length
      ? item.targetTaskIds
      : item.isTarget && targets[0]
        ? [targets[0].taskId]
        : [];
    const currentTargets = mode === 'levels'
      ? targets.slice(activeGoalIndex, activeGoalIndex + 1)
      : targets;
    const matchedTaskIds = itemTaskIds.filter((taskId) => (
      currentTargets.some((target) => target.taskId === taskId && target.remaining > 0)
    ));
    if (item.isTarget && matchedTaskIds.length > 0) {
      const isNewDiscovery = !collectionRef.current.includes(item.itemId);
      const nextCombo = combo + 1;
      const gain = scoreForFind(nextCombo, timeLeftPreciseRef.current);
      const totalAfter = scoreRef.current + gain;
      const nextTargets = targets.map((target) => ({
        ...target,
        remaining: matchedTaskIds.includes(target.taskId)
          ? Math.max(0, target.remaining - 1)
          : target.remaining,
      }));

      setCombo(nextCombo);
      roundFoundRef.current += 1;
      roundBestComboRef.current = Math.max(roundBestComboRef.current, nextCombo);
      if (mode === 'endless') {
        endlessFoundRef.current += 1;
        endlessBestComboRef.current = Math.max(endlessBestComboRef.current, nextCombo);
      }
      setScoreSync(totalAfter);
      setLastGain((current) => ({ ...current, find: current.find + gain }));
      setStats((current) => ({ ...current, found: current.found + 1 }));
      setItems((current) => current.map((candidate) => (
        candidate.uid === uid ? { ...candidate, found: true } : candidate
      )));
      setTargets(nextTargets);
      discoverItem(item.itemId);
      if (hintUid === uid) setHintUid(null);
      addFloat(item.x, item.y, `+${gain}`, 'score');
      if (isNewDiscovery) addFloat(item.x, item.y - 12, '首次发现', 'bonus');
      if (isNewDiscovery) {
        trackEvent({ event: 'first_discovery', mode, level, category, item_id: item.itemId });
      }
      if (nextCombo >= 2) addFloat(item.x, item.y - 7, `${nextCombo}连击!`, 'combo');
      addBurst(item.x, item.y, '✦');
      trackEvent({
        event: 'item_hit', mode, level, category, item_id: item.itemId,
        task_id: matchedTaskIds.join('|'), combo: nextCombo, gain,
        time_left: Math.ceil(timeLeftPreciseRef.current),
      });
      sfx.correct(nextCombo);
      haptics.correct(nextCombo);

      if (mode === 'endless') {
        adjustTime(ENDLESS_FIND_BONUS_SEC, ENDLESS_TIME_CAP);
      }

      const currentGoalDone = mode === 'levels'
        ? nextTargets[activeGoalIndex]?.remaining === 0
        : nextTargets.every((target) => target.remaining === 0);
      if (currentGoalDone) {
        if (mode === 'levels') {
          const config = levelConfig(level);
          const nextGoalIndex = activeGoalIndex + 1;
          const nextGoal = config.goals[nextGoalIndex];
          if (nextGoal) {
            const nextRule = getTaskRule(nextGoal.taskId, nextGoal.targetCount);
            const nextCategory = primaryCategoryForTask(nextRule, config.category);
            const completedLabel = nextTargets[activeGoalIndex]?.label ?? '本项目标';

            // 同一批物件内逐个揭晓目标；计时、分数、连击、镜头与场景都连续保留。
            setGoalNotice({
              id: effectId++,
              completedLabel,
              nextLabel: nextRule.label,
            });
            if (goalNoticeTimerRef.current) clearTimeout(goalNoticeTimerRef.current);
            goalNoticeTimerRef.current = setTimeout(() => setGoalNotice(null), 1700);
            setActiveGoalIndex(nextGoalIndex);
            setCategory(nextCategory);
            lastCategoryRef.current = nextCategory;
            lastTaskIdRef.current = nextRule.id;
            setHintUid(null);
            trackEvent({
              event: 'level_goal_start',
              mode,
              level,
              category: nextCategory,
              task_id: nextRule.id,
            });
          } else {
            const levelScore = totalAfter - scoreAtStartRef.current;
            setLastGain({ find: levelScore, bonus: 0 });
            commitLevelClear(level, levelScore);
            trackEvent({
              event: 'level_clear', mode, level, category, level_score: levelScore,
              stars: starsForScore(levelScore, config),
            });
            setPhase('levelClear');
            sfx.win();
            haptics.win();
          }
        } else {
          const nextWave = level + 1;
          setLevel(nextWave);
          addFloat(21, 26, `第 ${nextWave} 波!`, 'bonus');
          setupRound('endless', nextWave, totalAfter);
          trackEvent({ event: 'wave_advance', mode, level: nextWave, score: totalAfter });
        }
      }
    } else {
      applyWrong(item.x, item.y);
    }
  }, [activeGoalIndex, addBurst, addFloat, adjustTime, applyWrong, category, combo,
    commitLevelClear, discoverItem, hintUid, items, level, mode, paused, phase, setScoreSync,
    setupRound, targets]);

  const handleFieldMiss = useCallback((x: number, y: number) => {
    if (phase !== 'playing' || paused) return;
    applyWrong(x, y);
  }, [applyWrong, paused, phase]);

  const useHint = useCallback(() => {
    if (phase !== 'playing' || paused) return;
    // 每关免费提示用完后，可消耗提示技能（function_tishi，CMS 全端同步）。
    if (hintsLeft <= 0 && skillHints <= 0) return;
    const currentTaskIds = new Set(
      (mode === 'levels' ? targets.slice(activeGoalIndex, activeGoalIndex + 1) : targets)
        .filter((target) => target.remaining > 0)
        .map((target) => target.taskId),
    );
    const candidates = items.filter((item) => (
      item.isTarget
      && !item.found
      && (item.targetTaskIds?.some((taskId) => currentTaskIds.has(taskId))
        || (!item.targetTaskIds?.length && currentTaskIds.has(targets[0]?.taskId ?? '')))
    ));
    if (!candidates.length) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const pickTaskId = pick.targetTaskIds?.join('|') || targets[0]?.taskId;
    const applyHint = () => {
      setHintUid(pick.uid);
      sfx.hint();
      haptics.hint();
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setHintUid(null), 2600);
    };
    if (hintsLeft > 0) {
      setHintsLeft((current) => current - 1);
      applyHint();
      trackEvent({
        event: 'hint_use', mode, level, category, item_id: pick.itemId,
        task_id: pickTaskId, hints_left: hintsLeft - 1,
      });
      return;
    }
    void (async () => {
      const ok = await consumeSkill('tishi');
      setSkillHints(getSkillPool().tishi);
      if (!ok) return;
      applyHint();
      trackEvent({
        event: 'skill_hint_use', mode, level, category, item_id: pick.itemId,
        task_id: pickTaskId, skill_left: getSkillPool().tishi,
      });
    })();
  }, [activeGoalIndex, category, hintsLeft, items, level, mode, paused, phase, skillHints,
    targets]);

  const requestTimeBoost = useCallback(() => {
    if (phase !== 'playing' || paused) return;
    const boostCap = mode === 'endless'
      ? ENDLESS_TIME_CAP
      : timeLimit + TIME_BOOST_CAP_SECONDS;
    if (timeBoostFreeAvailable) {
      adjustTime(TIME_BOOST_SECONDS, boostCap);
      setTimeBoostFreeAvailable(false);
      showTimeBoostToast(`首次加时已到账 · +${TIME_BOOST_SECONDS} 秒`);
      trackEvent({ event: 'time_boost_free', mode, level, seconds: TIME_BOOST_SECONDS });
      sfx.hint();
      haptics.hint();
      return;
    }
    // 已达单关叠加上限时不再消耗技能。
    if (timeLeftPreciseRef.current >= boostCap - 1) {
      showTimeBoostToast(`${mode === 'endless' ? '本局' : '本关'}加时已达上限`);
      return;
    }
    // 加时技能（function_addtime）：大神任务 / 游戏内任务发放，CMS 全端同步。
    if (skillBoosts > 0) {
      void (async () => {
        const ok = await consumeSkill('addtime');
        setSkillBoosts(getSkillPool().addtime);
        if (!ok) return;
        adjustTime(TIME_BOOST_SECONDS, boostCap);
        showTimeBoostToast(`加时技能生效 · +${TIME_BOOST_SECONDS} 秒`);
        trackEvent({
          event: 'skill_boost_use', mode, level,
          seconds: TIME_BOOST_SECONDS, skill_left: getSkillPool().addtime,
        });
        sfx.hint();
        haptics.hint();
      })();
      return;
    }
    // 局内没有加时技能时，走任务视频获取（游戏内视频弹窗，不再依赖 ds 任务面板）。
    if (!timeBoostTaskAvailable) {
      showTimeBoostToast(`${mode === 'endless' ? '本局' : '本关'}加时机会已用完`);
      return;
    }

    setPaused(true);
    setTimeBoostTaskPrompt(true);
    trackEvent({ event: 'time_boost_task_request', mode, level });
  }, [adjustTime, level, mode, paused, phase, showTimeBoostToast, skillBoosts,
    timeBoostFreeAvailable, timeBoostTaskAvailable, timeLimit]);

  /** 视频任务看满 30s 后的发奖收口：计时、暂停与埋点统一在这里处理。 */
  const grantRewardedTimeBoost = useCallback(() => {
    if (!timeBoostTaskAvailable) return;
    const boostCap = mode === 'endless'
      ? ENDLESS_TIME_CAP
      : timeLimit + TIME_BOOST_CAP_SECONDS;
    adjustTime(TIME_BOOST_SECONDS, boostCap);
    setTimeBoostTaskAvailable(false);
    setTimeBoostTaskPrompt(false);
    showTimeBoostToast(`任务奖励已到账 · +${TIME_BOOST_SECONDS} 秒`);
    trackEvent({ event: 'time_boost_task_reward', mode, level, seconds: TIME_BOOST_SECONDS });
    sfx.hint();
    haptics.hint();
  }, [adjustTime, level, mode, showTimeBoostToast, timeBoostTaskAvailable, timeLimit]);

  const openInGameTaskPanel = useCallback(() => {
    if (phase !== 'playing') return;
    setPaused(true);
    const failReason = openTaskPanel();
    if (failReason) {
      setPaused(false);
      showTimeBoostToast(failReason);
    }
  }, [phase, showTimeBoostToast]);

  const dismissTimeBoostTaskPrompt = useCallback(() => {
    setTimeBoostTaskPrompt(false);
    setPaused(false);
  }, []);

  /** 打开任务视频弹窗：boost=对局中加时（从提示弹窗进入）；revive=失败复活（从结算页进入）。 */
  const openVideoReward = useCallback((kind: 'boost' | 'revive') => {
    if (kind === 'boost') {
      if (phase !== 'playing' || !timeBoostTaskAvailable) return;
    } else if (phase !== 'gameOver' || !videoReviveAvailable) {
      return;
    }
    setVideoReward({ kind, id: effectId++, rewarded: false });
    trackEvent({ event: 'video_open', mode, level, kind });
  }, [level, mode, phase, timeBoostTaskAvailable, videoReviveAvailable]);

  /** 关闭视频弹窗：abandon=未看满退出（不发奖）；complete=看满后的兜底关闭。 */
  const closeVideoReward = useCallback((reason: 'abandon' | 'complete', watchedMs = 0) => {
    if (!videoReward) return;
    if (reason === 'abandon') {
      trackEvent({
        event: 'video_abandon', mode, level,
        kind: videoReward.kind, watched_ms: Math.round(watchedMs),
      });
    }
    if (videoReward.kind === 'boost' || videoReward.rewarded) {
      // 看满后视频仍会继续连播；只有玩家主动关闭时才恢复局面计时。
      setTimeBoostTaskPrompt(false);
      setPaused(false);
    }
    setVideoReward(null);
  }, [level, mode, videoReward]);

  /** 视频弹窗采样校验满 30s 的回调：按会话类型分发奖励。 */
  const completeVideoReward = useCallback((watchedMs: number) => {
    if (!videoReward || videoReward.rewarded) return;
    const { kind, id } = videoReward;
    trackEvent({
      event: 'video_verified', mode, level, kind, watched_ms: Math.round(watchedMs),
    });
    setVideoReward((current) => (
      current?.id === id ? { ...current, rewarded: true } : current
    ));
    if (kind === 'boost') {
      grantRewardedTimeBoost();
      return;
    }
    if (phase !== 'gameOver' || !videoReviveAvailable) return;
    // 失败复活：+30 秒原地继续，视频层仍保持全屏，直到玩家主动关闭才恢复倒计时。
    setVideoReviveAvailable(false);
    revivedRef.current = true;
    setTimeSync(TIME_BOOST_SECONDS);
    setPaused(true);
    setPhase('playing');
    showTimeBoostToast(`复活成功 · +${TIME_BOOST_SECONDS} 秒`);
    trackEvent({ event: 'video_revive', mode, level, seconds: TIME_BOOST_SECONDS });
    sfx.hint();
    haptics.hint();
  }, [grantRewardedTimeBoost, level, mode, phase, setTimeSync, showTimeBoostToast,
    videoReward, videoReviveAvailable]);

  const reportVideoRewardError = useCallback(() => {
    trackEvent({ event: 'video_error', mode, level, kind: videoReward?.kind ?? 'boost' });
  }, [level, mode, videoReward]);

  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      const next = Math.max(0, timeLeftPreciseRef.current - delta);
      timeLeftPreciseRef.current = next;
      const ceil = Math.ceil(next);
      if (ceil !== prevCeilRef.current) {
        // 整秒变化时才更新 state，将全树重渲染从 10 次/秒降至最多 1 次/秒。
        prevCeilRef.current = ceil;
        setTimeLeft(next);
        if (ceil <= 10 && ceil > 0) sfx.tick();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [paused, phase]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft <= 0) finishGame(mode);
  }, [finishGame, mode, phase, timeLeft]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && phase === 'playing') setPaused(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [phase]);

  // 登录完成后先把服务端历史成绩合并进当前 uid 的本地桶，再开放榜分/时长回写。
  // 所有累计量只取最大值，换设备或清缓存不会让历史成绩倒退。
  useEffect(() => {
    if (!dsPlatformEnabled) return;
    let cancelled = false;
    void (async () => {
      await initDsPlatform();
      const remote = await loadDsProgress();
      if (cancelled) return;
      if (remote) {
        const localScores = loadLevelScores();
        const mergedScores = { ...localScores };
        for (const [levelKey, score] of Object.entries(remote.levelDetail)) {
          const levelNumber = Number(levelKey);
          mergedScores[levelNumber] = Math.max(mergedScores[levelNumber] ?? 0, score);
        }
        const mergedStars = loadLevelStars(mergedScores);
        const derivedLevelsBase = leaderboardBaseScore(mergedScores);
        const levels = Math.max(derivedLevelsBase, remote.levelsBaseScore);
        const endless = Math.max(loadNum(SAVE_KEYS.bestEndless), remote.endlessBest);
        const highestCompleted = Math.max(0, ...Object.keys(mergedScores).map(Number));
        const maxLevel = Math.min(
          LEVEL_COUNT,
          Math.max(1, loadNum(SAVE_KEYS.maxLevel), highestCompleted + 1),
        );

        gameStorage.set(SAVE_KEYS.levelScores, JSON.stringify(mergedScores));
        gameStorage.set(SAVE_KEYS.levelStars, JSON.stringify(mergedStars));
        gameStorage.set(SAVE_KEYS.bestLevels, String(levels));
        gameStorage.set(SAVE_KEYS.bestEndless, String(endless));
        gameStorage.set(SAVE_KEYS.maxLevel, String(maxLevel));
        setLevelScores(mergedScores);
        levelStarsRef.current = mergedStars;
        setLevelStars(mergedStars);
        setBest({ levels, endless, maxLevel });

        const clock = loadPartnerClock();
        partnerClockRef.current = {
          ...clock,
          onlineSec: Math.max(clock.onlineSec, remote.userTime),
          dailyPlaySec: Math.max(clock.dailyPlaySec, remote.userDailyTime),
        };
        savePartnerClock(partnerClockRef.current);
        const totalFound = Math.max(
          loadNum(SAVE_KEYS.partnerTotalFound),
          remote.totalItemsFound,
        );
        gameStorage.set(SAVE_KEYS.partnerTotalFound, String(totalFound));
        refreshPartners(collectionRef.current, mergedStars);
      }
      setProgressHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [refreshPartners]);

  useEffect(() => {
    if (!progressHydrated) return;
    let lastTick = Date.now();
    let syncCountdown = 0; // 每 60s（12 × 5s 心跳）上报一次 totalPlayTime

    const accrue = (countVisibleTime: boolean) => {
      const now = Date.now();
      const elapsedSec = countVisibleTime ? Math.max(0, (now - lastTick) / 1000) : 0;
      lastTick = now;
      if (elapsedSec <= 0) return;
      partnerClockRef.current = advancePartnerClock(
        partnerClockRef.current,
        elapsedSec,
        phase === 'playing' && !paused,
        now,
      );
      savePartnerClock(partnerClockRef.current);
      refreshPartners();
      // totalPlayTime 节流上报：每分钟或页面隐藏时推送一次，
      // 后台 minigame_common_task_max 取最大值，不存在竞争问题。
      syncCountdown -= 1;
      if (syncCountdown <= 0) {
        syncCountdown = 12;
        void syncProgressToDs({
          userTime: Math.round(partnerClockRef.current.onlineSec),
          userDailyTime: Math.round(partnerClockRef.current.dailyPlaySec),
        });
      }
    };

    const timer = window.setInterval(() => accrue(!document.hidden), 5000);
    const onVisibilityChange = () => {
      if (document.hidden) {
        accrue(true);
        // 页面隐藏时立即推送，避免切走后时长未及时上报
        void syncProgressToDs({
          userTime: Math.round(partnerClockRef.current.onlineSec),
          userDailyTime: Math.round(partnerClockRef.current.dailyPlaySec),
        });
      } else {
        lastTick = Date.now();
      }
    };
    const onPageHide = () => {
      accrue(true);
      void syncProgressToDs({
        userTime: Math.round(partnerClockRef.current.onlineSec),
        userDailyTime: Math.round(partnerClockRef.current.dailyPlaySec),
      });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      accrue(!document.hidden);
      void syncProgressToDs({
        userTime: Math.round(partnerClockRef.current.onlineSec),
        userDailyTime: Math.round(partnerClockRef.current.dailyPlaySec),
      });
    };
  }, [paused, phase, progressHydrated, refreshPartners]);

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (goalNoticeTimerRef.current) clearTimeout(goalNoticeTimerRef.current);
    if (timeBoostToastTimerRef.current) clearTimeout(timeBoostToastTimerRef.current);
  }, []);

  useEffect(() => {
    setSoundMuted(muted);
  }, [muted]);

  // 服务端权益同步：启动时拉一次，回到前台再拉一次（任务面板发放结果据此生效）。
  useEffect(() => {
    void syncSkillPool();
    void syncTaskPartnerGrant();
    // 大神任务面板是同页弹层，完成/关闭时不一定触发 visibilitychange；
    // 未领取期间每 15 秒轻量轮询一次，保证下发后无需刷新页面即可到账。
    const grantTimer = window.setInterval(() => {
      if (!document.hidden && taskPartnerGrantedRef.current !== true) {
        void syncTaskPartnerGrant();
      }
    }, 15_000);
    const onVisible = () => {
      if (!document.hidden) {
        void syncSkillPool();
        void syncTaskPartnerGrant();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(grantTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncSkillPool, syncTaskPartnerGrant]);

  // 任务视频预取：前台空闲时先拉一只进 HTTP 缓存，点开弹窗基本秒开。
  useEffect(() => {
    prefetchVideoRewardSource();
  }, []);

  useEffect(() => {
    if (!progressHydrated) return;
    void syncProgressToDs({
      rankingScore,
      levelsBaseScore: best.levels,
      partnerCount: recruitedCount,
      totalItemsFound: loadNum(SAVE_KEYS.partnerTotalFound),
    });
  }, [best.endless, best.levels, progressHydrated, rankingScore, recruitedCount]);

  const displayedTargets = mode === 'levels'
    ? targets.slice(activeGoalIndex, activeGoalIndex + 1)
    : targets;
  const partnerNotice = partnerNoticeQueue[0] ?? null;

  return {
    phase, mode, level, category, score, roundScore, timeLeft, timeLimit, items,
    targets: displayedTargets, allTargets: targets, activeGoalIndex, goalNotice,
    combo, hintsLeft, paused, quitConfirm, floats, bursts, hintUid, shake, round,
    stats, lastGain, lastStars, isNewLevelBest, lastLevelPreviousBest,
    lastLeaderboardBaseDelta, levelScores, levelStars, starTotal,
    unlockedMaxLevel, best, partners, partnerNotice, partnerBonusRate,
    rankingScore, progressHydrated, muted,
    timeBoostFreeAvailable, timeBoostToast, timeBoostTaskPrompt,
    // 任务视频为游戏内弹窗、自足可用，不再依赖 ds 任务面板配置。
    timeBoostTaskAvailable,
    videoReward, videoReviveAvailable,
    skillBoosts, skillHints,
    levelInfo: levelConfig(level), levelCount: LEVEL_COUNT,
    startGame, nextLevel, retry, quitToMenu, requestQuit, cancelQuit,
    handleItemClick, handleFieldMiss, useHint, requestTimeBoost, grantRewardedTimeBoost,
    dismissTimeBoostTaskPrompt, openVideoReward, closeVideoReward, completeVideoReward,
    reportVideoRewardError, openInGameTaskPanel, toggleMuted, setPaused,
    dismissPartnerNotice: () => setPartnerNoticeQueue((current) => current.slice(1)),
  };
}

export type Game = ReturnType<typeof useGame>;

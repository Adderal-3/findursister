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
  LEVEL_COUNT, levelConfig, scoreForFind, starsForScore, waveConfig, WRONG_PENALTY_SEC,
} from '../game/levels';
import { COLLECTIBLE_ITEMS } from '../game/items';
import { haptics, sfx } from '../game/sound';
import { gameStorage, SAVE_KEYS } from '../game/storage';
import {
  advanceOnlineStamina, loadStamina, saveStamina, secondsToNextStamina,
  settleOfflineStamina, spendStamina, STAMINA_ENDLESS_COST, STAMINA_LEVEL_COST,
  STAMINA_MAX,
} from '../game/stamina';
import { trackEvent } from '../platform/ds/runtime';
import { syncProgressToDs } from '../platform/ds/leaderboard';

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

let effectId = 1;

export function useGame() {
  const initialScores = useRef(loadLevelScores()).current;
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
  const [levelScores, setLevelScores] = useState<Record<number, number>>(initialScores);
  const [collection, setCollection] = useState<string[]>(loadCollection);
  const [staminaState, setStaminaState] = useState(loadStamina);
  const [staminaNotice, setStaminaNotice] = useState<{ cost: number; mode: GameMode } | null>(null);
  const [best, setBest] = useState({
    levels: Object.values(initialScores).reduce((sum, value) => sum + value, 0),
    endless: loadNum(SAVE_KEYS.bestEndless),
    maxLevel: Math.min(LEVEL_COUNT, Math.max(1, loadNum(SAVE_KEYS.maxLevel))),
  });

  const scoreRef = useRef(0);
  const lastCategoryRef = useRef<CategoryId | null>(null);
  const lastTaskIdRef = useRef<string | null>(null);
  const scoreAtStartRef = useRef(0);
  const prevCeilRef = useRef(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staminaRef = useRef(staminaState);

  const commitStamina = useCallback((next: typeof staminaState) => {
    staminaRef.current = next;
    setStaminaState(next);
    saveStamina(next);
  }, []);

  const trySpendStamina = useCallback((cost: number, nextMode: GameMode) => {
    const now = Date.now();
    const settled = advanceOnlineStamina(staminaRef.current, 0, now);
    if (settled.value < cost) {
      commitStamina(settled);
      setStaminaNotice({ cost, mode: nextMode });
      trackEvent({
        event: 'stamina_insufficient',
        mode: nextMode,
        stamina: settled.value,
        cost,
      });
      sfx.wrong();
      return false;
    }

    const next = spendStamina(settled, cost, now);
    commitStamina(next);
    setStaminaNotice(null);
    trackEvent({
      event: 'stamina_spend',
      mode: nextMode,
      stamina: next.value,
      cost,
    });
    return true;
  }, [commitStamina]);

  const setScoreSync = useCallback((value: number) => {
    scoreRef.current = value;
    setScore(value);
  }, []);

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
      gameStorage.set(SAVE_KEYS.collection, JSON.stringify(next));
      return next;
    });
  }, []);

  const setupRound = useCallback((nextMode: GameMode, roundNumber: number, keepScore: number) => {
    // 上一关的点错震动不能带入新场景，否则 GameField 重新挂载时会再次播放。
    setShake(0);
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
      });
      setActiveGoalIndex(0);
      setItems(scene.items);
      setTargets(scene.targets);
      setTimeLeft(config.timeLimit);
      setTimeLimit(config.timeLimit);
      setHintsLeft(config.hints);
      prevCeilRef.current = config.timeLimit;
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
      const scene = generateScene({ rules: [rule], distractors: config.distractors });
      setActiveGoalIndex(0);
      setItems(scene.items);
      setTargets(scene.targets);
      if (roundNumber === 1) {
        setTimeLeft(ENDLESS_START_SEC);
        setTimeLimit(ENDLESS_START_SEC);
        setHintsLeft(ENDLESS_HINTS);
        prevCeilRef.current = ENDLESS_START_SEC;
      }
    }
    scoreAtStartRef.current = keepScore;
    setHintUid(null);
    setRound((current) => current + 1);
  }, []);

  const commitEndlessBest = useCallback((finalScore: number) => {
    const endless = Math.max(best.endless, finalScore);
    gameStorage.set(SAVE_KEYS.bestEndless, String(endless));
    setBest((current) => ({ ...current, endless }));
    void syncProgressToDs({ endlessBest: endless });
  }, [best.endless]);

  const commitLevelClear = useCallback((clearedLevel: number, levelScore: number) => {
    const config = levelConfig(clearedLevel);
    setLastStars(starsForScore(levelScore, config));
    const previous = levelScores[clearedLevel] ?? 0;
    const nextScores = { ...levelScores, [clearedLevel]: Math.max(previous, levelScore) };
    const total = Object.values(nextScores).reduce((sum, value) => sum + value, 0);
    setIsNewLevelBest(levelScore > previous);
    setLevelScores(nextScores);
    const maxLevel = Math.min(LEVEL_COUNT, Math.max(best.maxLevel, clearedLevel + 1));
    setBest((current) => ({ ...current, levels: total, maxLevel }));
    gameStorage.set(SAVE_KEYS.maxLevel, String(maxLevel));
    void syncProgressToDs({ levelsTotalScore: total, maxLevel });
    gameStorage.set(SAVE_KEYS.levelScores, JSON.stringify(nextScores));
    gameStorage.set(SAVE_KEYS.bestLevels, String(total));
  }, [best.maxLevel, levelScores]);

  const startGame = useCallback((nextMode: GameMode, startLevel = 1) => {
    const cost = nextMode === 'levels' ? STAMINA_LEVEL_COST : STAMINA_ENDLESS_COST;
    if (!trySpendStamina(cost, nextMode)) return;
    setMode(nextMode);
    const initialLevel = nextMode === 'levels'
      ? Math.min(Math.max(Math.trunc(startLevel), 1), best.maxLevel)
      : 1;
    setLevel(initialLevel);
    setScoreSync(0);
    setCombo(0);
    setStats({ found: 0, wrong: 0 });
    setLastGain({ find: 0, bonus: 0 });
    setupRound(nextMode, initialLevel, 0);
    setPaused(false);
    setQuitConfirm(false);
    setPhase('playing');
    trackEvent({ event: nextMode === 'levels' ? 'level_start' : 'endless_start', mode: nextMode, level: initialLevel });
    sfx.click();
  }, [best.maxLevel, setScoreSync, setupRound, trySpendStamina]);

  const nextLevel = useCallback(() => {
    if (level >= LEVEL_COUNT) {
      setPhase('menu');
      return;
    }
    if (!trySpendStamina(STAMINA_LEVEL_COST, 'levels')) {
      setPhase('menu');
      return;
    }
    const next = level + 1;
    setLevel(next);
    setCombo(0);
    setupRound(mode, next, scoreRef.current);
    setPaused(false);
    setQuitConfirm(false);
    setPhase('playing');
    sfx.click();
  }, [level, mode, setupRound, trySpendStamina]);

  const retry = useCallback(() => {
    if (phase === 'gameOver') {
      const cost = mode === 'levels' ? STAMINA_LEVEL_COST : STAMINA_ENDLESS_COST;
      if (!trySpendStamina(cost, mode)) return;
    }
    if (mode === 'levels') {
      setScoreSync(scoreAtStartRef.current);
      setCombo(0);
      setupRound(mode, level, scoreAtStartRef.current);
    } else {
      setLevel(1);
      setScoreSync(0);
      setCombo(0);
      setStats({ found: 0, wrong: 0 });
      setupRound(mode, 1, 0);
    }
    setPaused(false);
    setQuitConfirm(false);
    setPhase('playing');
    sfx.click();
  }, [level, mode, phase, setScoreSync, setupRound, trySpendStamina]);

  const quitToMenu = useCallback(() => {
    setPhase('menu');
    setPaused(false);
    setQuitConfirm(false);
    sfx.click();
  }, []);

  const requestQuit = useCallback(() => {
    setPaused(true);
    setQuitConfirm(true);
  }, []);

  const cancelQuit = useCallback(() => {
    setQuitConfirm(false);
    setPaused(false);
  }, []);

  const finishGame = useCallback((currentMode: GameMode) => {
    if (currentMode === 'endless') commitEndlessBest(scoreRef.current);
    trackEvent({
      event: currentMode === 'endless' ? 'endless_end' : 'level_fail',
      mode: currentMode,
      level,
      category,
      task_id: targets.map((target) => target.taskId).join('|'),
      score: scoreRef.current,
    });
    setPhase('gameOver');
    sfx.gameOver();
  }, [category, commitEndlessBest, level, targets]);

  const applyWrong = useCallback((x: number, y: number) => {
    setTimeLeft((current) => Math.max(0, current - WRONG_PENALTY_SEC));
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
  }, [addFloat, category, level, mode, targets]);

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
      const isNewDiscovery = !collection.includes(item.itemId);
      const nextCombo = combo + 1;
      const gain = scoreForFind(nextCombo, timeLeft);
      const totalAfter = scoreRef.current + gain;
      const nextTargets = targets.map((target) => ({
        ...target,
        remaining: matchedTaskIds.includes(target.taskId)
          ? Math.max(0, target.remaining - 1)
          : target.remaining,
      }));

      setCombo(nextCombo);
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
      if (isNewDiscovery) addFloat(item.x, item.y - 12, '新图鉴 · 已点亮', 'bonus');
      if (nextCombo >= 2) addFloat(item.x, item.y - 7, `${nextCombo}连击!`, 'combo');
      addBurst(item.x, item.y, '✦');
      trackEvent({
        event: 'item_hit', mode, level, category, item_id: item.itemId,
        task_id: matchedTaskIds.join('|'), combo: nextCombo, gain, time_left: Math.ceil(timeLeft),
      });
      sfx.correct(nextCombo);
      haptics.correct(nextCombo);

      if (mode === 'endless') {
        setTimeLeft((current) => Math.min(ENDLESS_TIME_CAP, current + ENDLESS_FIND_BONUS_SEC));
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

            // 同一批物件内逐个揭晓目标；计时、分数、连击、镜头与场景都连续保留。
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
        }
      }
    } else {
      applyWrong(item.x, item.y);
    }
  }, [activeGoalIndex, addBurst, addFloat, applyWrong, category, collection, combo,
    commitLevelClear, discoverItem, hintUid, items, level, mode, paused, phase, setScoreSync,
    setupRound, targets, timeLeft]);

  const handleFieldMiss = useCallback((x: number, y: number) => {
    if (phase !== 'playing' || paused) return;
    applyWrong(x, y);
  }, [applyWrong, paused, phase]);

  const useHint = useCallback(() => {
    if (phase !== 'playing' || paused || hintsLeft <= 0) return;
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
    setHintsLeft((current) => current - 1);
    setHintUid(pick.uid);
    trackEvent({
      event: 'hint_use', mode, level, category, item_id: pick.itemId,
      task_id: pick.targetTaskIds?.join('|') || targets[0]?.taskId, hints_left: hintsLeft - 1,
    });
    sfx.hint();
    haptics.hint();
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintUid(null), 2600);
  }, [activeGoalIndex, category, hintsLeft, items, level, mode, paused, phase, targets]);

  useEffect(() => {
    if (phase !== 'playing' || paused) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      setTimeLeft((current) => {
        const next = Math.max(0, current - delta);
        const ceil = Math.ceil(next);
        if (ceil !== prevCeilRef.current) {
          prevCeilRef.current = ceil;
          if (ceil <= 10 && ceil > 0) sfx.tick();
        }
        return next;
      });
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

  useEffect(() => {
    let lastTick = Date.now();

    const persistHiddenAt = (now: number) => {
      const next = { ...staminaRef.current, lastSeenAt: now };
      staminaRef.current = next;
      saveStamina(next);
    };

    const tick = () => {
      const now = Date.now();
      if (document.hidden) {
        lastTick = now;
        return;
      }
      const next = advanceOnlineStamina(staminaRef.current, now - lastTick, now);
      lastTick = now;
      commitStamina(next);
    };

    const onStaminaVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        persistHiddenAt(now);
      } else {
        lastTick = now;
        commitStamina(settleOfflineStamina(staminaRef.current, now));
      }
    };

    const onPageHide = () => persistHiddenAt(Date.now());
    const timer = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', onStaminaVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onStaminaVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      persistHiddenAt(Date.now());
    };
  }, [commitStamina]);

  useEffect(() => () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
  }, []);

  const displayedTargets = mode === 'levels'
    ? targets.slice(activeGoalIndex, activeGoalIndex + 1)
    : targets;

  return {
    phase, mode, level, category, score, timeLeft, timeLimit, items, targets: displayedTargets,
    combo, hintsLeft, paused, quitConfirm, floats, bursts, hintUid, shake, round,
    stats, lastGain, lastStars, isNewLevelBest, levelScores, best, collection,
    stamina: {
      value: staminaState.value,
      max: STAMINA_MAX,
      levelCost: STAMINA_LEVEL_COST,
      endlessCost: STAMINA_ENDLESS_COST,
      nextRecoverySec: secondsToNextStamina(staminaState),
    },
    staminaNotice,
    collectionTotal: COLLECTIBLE_ITEMS.length, levelInfo: levelConfig(level), levelCount: LEVEL_COUNT,
    startGame, nextLevel, retry, quitToMenu, requestQuit, cancelQuit,
    handleItemClick, handleFieldMiss, useHint, setPaused,
    dismissStaminaNotice: () => setStaminaNotice(null),
  };
}

export type Game = ReturnType<typeof useGame>;

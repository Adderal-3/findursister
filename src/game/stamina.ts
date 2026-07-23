import { gameStorage, SAVE_KEYS } from './storage';

export const STAMINA_MAX = 20;
export const STAMINA_LEVEL_COST = 1;
export const STAMINA_ENDLESS_COST = 5;
export const STAMINA_ONLINE_RECOVERY_MS = 3 * 60 * 1000;
export const STAMINA_OFFLINE_GRACE_MS = 5 * 60 * 1000;
export const STAMINA_OFFLINE_RECOVERY_MS = 60 * 60 * 1000;

export interface StaminaState {
  value: number;
  onlineProgressMs: number;
  lastSeenAt: number;
  dailyRefillKey: string;
}

function chinaDayKey(now: number): string {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function clampState(raw: Partial<StaminaState>, now: number): StaminaState {
  const value = Number(raw.value);
  const progress = Number(raw.onlineProgressMs);
  const lastSeenAt = Number(raw.lastSeenAt);
  return {
    value: Number.isFinite(value)
      ? Math.min(STAMINA_MAX, Math.max(0, Math.trunc(value)))
      : STAMINA_MAX,
    onlineProgressMs: Number.isFinite(progress)
      ? Math.min(STAMINA_ONLINE_RECOVERY_MS - 1, Math.max(0, progress))
      : 0,
    lastSeenAt: Number.isFinite(lastSeenAt) && lastSeenAt > 0 ? lastSeenAt : now,
    dailyRefillKey: typeof raw.dailyRefillKey === 'string'
      ? raw.dailyRefillKey
      : chinaDayKey(now),
  };
}

export function saveStamina(state: StaminaState): void {
  gameStorage.set(SAVE_KEYS.stamina, JSON.stringify(state));
}

/**
 * 先结算离线恢复，再执行服务器自然日补满。静态 H5 暂以中国标准时间
 * 模拟服务器自然日；接入服务端后应以服务端返回的日界线为准。
 */
export function settleOfflineStamina(state: StaminaState, now = Date.now()): StaminaState {
  const current = clampState(state, now);
  const elapsed = Math.max(0, now - current.lastSeenAt);
  const offlineGain = elapsed > STAMINA_OFFLINE_GRACE_MS
    ? Math.floor((elapsed - STAMINA_OFFLINE_GRACE_MS) / STAMINA_OFFLINE_RECOVERY_MS)
    : 0;
  let value = Math.min(STAMINA_MAX, current.value + offlineGain);
  let onlineProgressMs = value >= STAMINA_MAX ? 0 : current.onlineProgressMs;
  const today = chinaDayKey(now);

  if (current.dailyRefillKey !== today) {
    value = STAMINA_MAX;
    onlineProgressMs = 0;
  }

  return {
    value,
    onlineProgressMs,
    lastSeenAt: now,
    dailyRefillKey: today,
  };
}

export function loadStamina(now = Date.now()): StaminaState {
  let stored: Partial<StaminaState> = {};
  try {
    const parsed: unknown = JSON.parse(gameStorage.get(SAVE_KEYS.stamina) ?? '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      stored = parsed as Partial<StaminaState>;
    }
  } catch {
    stored = {};
  }

  const next = settleOfflineStamina(clampState(stored, now), now);
  saveStamina(next);
  return next;
}

export function advanceOnlineStamina(
  state: StaminaState,
  elapsedMs: number,
  now = Date.now(),
): StaminaState {
  const today = chinaDayKey(now);
  if (state.dailyRefillKey !== today) {
    return {
      value: STAMINA_MAX,
      onlineProgressMs: 0,
      lastSeenAt: now,
      dailyRefillKey: today,
    };
  }

  if (state.value >= STAMINA_MAX) {
    return { ...state, onlineProgressMs: 0, lastSeenAt: now };
  }

  const progress = state.onlineProgressMs + Math.max(0, elapsedMs);
  const gain = Math.floor(progress / STAMINA_ONLINE_RECOVERY_MS);
  const value = Math.min(STAMINA_MAX, state.value + gain);
  return {
    ...state,
    value,
    onlineProgressMs: value >= STAMINA_MAX
      ? 0
      : progress % STAMINA_ONLINE_RECOVERY_MS,
    lastSeenAt: now,
  };
}

export function spendStamina(state: StaminaState, cost: number, now = Date.now()): StaminaState {
  return {
    ...state,
    value: Math.max(0, state.value - Math.max(0, Math.trunc(cost))),
    lastSeenAt: now,
  };
}

export function secondsToNextStamina(state: StaminaState): number | null {
  if (state.value >= STAMINA_MAX) return null;
  return Math.max(
    1,
    Math.ceil((STAMINA_ONLINE_RECOVERY_MS - state.onlineProgressMs) / 1000),
  );
}

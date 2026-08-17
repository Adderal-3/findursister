/**
 * 技能池：加时技能（function_addtime）与提示技能（function_tishi）。
 *
 * 全端同步模型：
 * - 数量由 CMS 后台 / 大神任务面板在服务端发放（任务完成即加）。
 * - 前端通过 batchReadData 读取当前余额，消耗时 obfuscatedBatchWriteData 写回 count-1。
 * - 本地缓存只是服务端余额的镜像；读取失败 / 未配置时余额为 0，技能不可用但不影响主流程。
 */
import { dsRequestManager } from './leaderboard';

export type SkillKind = 'addtime' | 'tishi';

const SKILL_KEYS: Record<SkillKind, string> = {
  addtime: 'function_addtime',
  tishi: 'function_tishi',
};

const pool: Record<SkillKind, number> = { addtime: 0, tishi: 0 };

function toCount(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : 0;
}

/** 从服务端拉取技能余额，返回最新镜像；未登录 / 未配置 / 读取失败时保持现状。 */
export async function refreshSkillPool(): Promise<Record<SkillKind, number>> {
  const manager = dsRequestManager();
  if (!manager) return { ...pool };
  try {
    const result = await manager.batchReadData({
      keys: [SKILL_KEYS.addtime, SKILL_KEYS.tishi],
    });
    for (const record of result.records) {
      if (record.recordKey === SKILL_KEYS.addtime) pool.addtime = toCount(record.value);
      if (record.recordKey === SKILL_KEYS.tishi) pool.tishi = toCount(record.value);
    }
  } catch (error) {
    console.error('[DS] skill pool load failed', error);
  }
  return { ...pool };
}

export function getSkillPool(): Record<SkillKind, number> {
  return { ...pool };
}

/**
 * 消耗 1 个技能：先本地扣减并写回服务端，成功返回 true。
 * 余额为 0 或写回失败返回 false（调用方不应发放技能效果）。
 * 先扣后用的顺序保证同会话内不会重复使用；多端并发写由服务端值兜底。
 */
export async function consumeSkill(kind: SkillKind): Promise<boolean> {
  if (pool[kind] <= 0) return false;
  const manager = dsRequestManager();
  if (!manager) return false;
  const next = pool[kind] - 1;
  try {
    const result = await manager.obfuscatedBatchWriteData({
      items: [{ recordKey: SKILL_KEYS[kind], value: next }],
    });
    if (!result.items.every((item) => item.success)) return false;
    pool[kind] = next;
    return true;
  } catch (error) {
    console.error('[DS] skill consume failed', error);
    return false;
  }
}

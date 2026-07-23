import { dsConfig, dsLeaderboardEnabled, dsPlatformEnabled } from './config';

export interface DsLeaderboardRecord {
  rank: number;
  uid: string;
  nick: string;
  icon: string;
  score: number;
}

export interface DsLeaderboardSnapshot {
  total: number;
  records: DsLeaderboardRecord[];
  self: DsLeaderboardRecord | null;
}

let requestManagerInitialized = false;

function requestManager() {
  if (!dsPlatformEnabled || !dsLeaderboardEnabled || !window.MiniGameDataSdk) return null;
  const manager = window.MiniGameDataSdk.RequestManager;
  if (!requestManagerInitialized) {
    manager.setGameId({
      devMiniGameId: dsConfig.data.devMiniGameId,
      proMiniGameId: dsConfig.data.proMiniGameId,
    });
    requestManagerInitialized = true;
  }
  return manager;
}

/** 读取大神榜单；未配置后台 ID 或请求失败时返回 null，由界面降级为本机记录。 */
export async function loadDsLeaderboard(pageSize = 10): Promise<DsLeaderboardSnapshot | null> {
  const manager = requestManager();
  if (!manager) return null;
  try {
    const ids = {
      devBillboardId: dsConfig.data.devBillboardId,
      proBillboardId: dsConfig.data.proBillboardId,
    };
    const [ranking, self] = await Promise.all([
      manager.getBillboardRank({ ...ids, page: 1, pageSize }),
      manager.getUserRank(ids),
    ]);
    return {
      total: ranking.total,
      records: ranking.records.map((record) => ({
        rank: record.rank,
        uid: record.uid,
        nick: record.nick || '寻宝客',
        icon: record.icon || '',
        score: Number(record.num) || 0,
      })),
      self: self.rank > 0 ? {
        rank: self.rank,
        uid: self.uid,
        nick: self.nick || '我',
        icon: self.icon || '',
        score: Number(self.num) || 0,
      } : null,
    };
  } catch (error) {
    console.error('[DS] leaderboard load failed', error);
    return null;
  }
}

interface ProgressPayload {
  levelsTotalScore?: number;
  maxLevel?: number;
  endlessBest?: number;
}

/** 关卡结算时批量同步，单次最多 4 个字段，满足 SDK ≤20 条限制。 */
export async function syncProgressToDs(payload: ProgressPayload): Promise<void> {
  const manager = requestManager();
  if (!manager) return;
  const items: Array<{ recordKey: string; value: number }> = [];
  if (payload.levelsTotalScore != null) {
    items.push({ recordKey: 'levels_total_score', value: Math.max(0, Math.round(payload.levelsTotalScore)) });
  }
  if (payload.maxLevel != null) {
    items.push({ recordKey: 'level_max', value: Math.max(1, Math.round(payload.maxLevel)) });
  }
  if (payload.endlessBest != null) {
    items.push({ recordKey: 'endless_best', value: Math.max(0, Math.round(payload.endlessBest)) });
  }
  items.push({ recordKey: 'last_save', value: Date.now() });
  try {
    const result = await manager.obfuscatedBatchWriteData({ items });
    const failures = result.items.filter((item) => !item.success);
    if (failures.length) console.warn('[DS] progress partial sync failure', failures);
  } catch (error) {
    console.error('[DS] progress sync failed', error);
  }
}

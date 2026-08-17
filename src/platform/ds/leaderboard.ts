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

export type LeaderboardScope = 'daily' | 'total';

let requestManagerInitialized = false;

/**
 * 东八区今日日期 YYYY-MM-DD。
 * 后台日榜"按东八区日期隔离"，玩家设备时区不一定是 +8，因此强制换算。
 */
function beijingDateKey(now = Date.now()): string {
  const beijing = new Date(now + 8 * 60 * 60 * 1000);
  const year = beijing.getUTCFullYear();
  const month = String(beijing.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijing.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

/** 供技能池等模块复用同一个 RequestManager（setGameId 只初始化一次）。 */
export function dsRequestManager() {
  return requestManager();
}

/** 榜单读取失败时抛出，带可展示给用户的原因，界面据此显示真实错误而非兜底。 */
export class DsLeaderboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DsLeaderboardError';
  }
}

/**
 * 读取大神榜单。失败时抛 DsLeaderboardError（不再静默兜底），
 * 由界面显示真实错误信息，便于确认线上接口是否真的通。
 */
export async function loadDsLeaderboard(
  scope: LeaderboardScope = 'total',
  pageSize = 10,
): Promise<DsLeaderboardSnapshot> {
  if (!dsPlatformEnabled) {
    throw new DsLeaderboardError('当前非大神环境，榜单仅在大神 App / 小程序内可用');
  }
  if (!dsLeaderboardEnabled) {
    throw new DsLeaderboardError('小游戏 ID（miniGameId）未配置');
  }
  if (!window.MiniGameDataSdk) {
    throw new DsLeaderboardError('数据 SDK 未加载（MiniGameDataSdk 不存在）');
  }
  const manager = requestManager();
  if (!manager) {
    throw new DsLeaderboardError('榜单请求管理器初始化失败');
  }
  const ids = {
    devBillboardId: dsConfig.data.devBillboardId,
    proBillboardId: dsConfig.data.proBillboardId,
  };
  if (!ids.devBillboardId || !ids.proBillboardId) {
    throw new DsLeaderboardError('榜单 ID（billboardId）未配置');
  }
  // 日榜与总榜是同一个榜单（yanli_rank）：后台"日榜=是"按东八区日期自动生成快照。
  // 总榜不传 date；日榜传当天日期，走后端日榜快照接口。
  const dailyParams = scope === 'daily' ? { date: beijingDateKey() } : {};
  try {
    const [ranking, self] = await Promise.all([
      manager.getBillboardRank({ ...ids, ...dailyParams, page: 1, pageSize }),
      manager.getUserRank({ ...ids, ...dailyParams }),
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
    const detail = error instanceof Error ? error.message : String(error);
    throw new DsLeaderboardError(`榜单请求失败：${detail}`);
  }
}

interface ProgressPayload {
  /** 排行榜最终分：各关历史最高标准榜分之和 ×（1 + 伙伴加成）。榜单 yanli_rank 按 user_score 排序，此值写入 user_score。 */
  levelsTotalScore?: number;
  /** 未套伙伴系数的各关历史最高标准榜分之和，用于后台对账。 */
  levelsBaseScore?: number;
  /** 无尽模式最高分。 */
  endlessBest?: number;
  /** 累计游玩总时长（秒），写入 user_time。 */
  userTime?: number;
  /** 当日游玩时长（秒，东八区日界重置），写入 user_daily_time（后台每日 0 点更新）。 */
  userDailyTime?: number;
  /** 每关历史最高原始分明细 { 关卡号: 分数 }，JSON 字符串写入 level_detail。 */
  levelDetail?: Record<number, number>;
  /** 当前拥有伙伴数。 */
  partnerCount?: number;
  /** 累计找到物品总数（含重复）。 */
  totalItemsFound?: number;
}

/**
 * 关卡结算 / 伙伴变化 / 时长累计时批量同步。
 * recordKey 必须与 CMS「Key 配置」里的字段名完全一致，否则写入失败、榜单空榜。
 * 只写后台已注册的字段，避免未注册 key 造成整批写入告警。
 */
export async function syncProgressToDs(payload: ProgressPayload): Promise<void> {
  const manager = requestManager();
  if (!manager) return;
  const items: Array<{ recordKey: string; value: number | string }> = [];
  if (payload.levelsTotalScore != null) {
    // 后台榜单 yanli_rank 绑定的排序字段是 user_score，必须与 CMS「Key 配置」一致。
    items.push({ recordKey: 'user_score', value: Math.max(0, Math.round(payload.levelsTotalScore)) });
  }
  if (payload.levelsBaseScore != null) {
    items.push({
      recordKey: 'levelsBaseScore',
      value: Math.max(0, Math.round(payload.levelsBaseScore * 10) / 10),
    });
  }
  if (payload.endlessBest != null) {
    items.push({ recordKey: 'endlessBest', value: Math.max(0, Math.round(payload.endlessBest)) });
  }
  if (payload.userTime != null) {
    items.push({ recordKey: 'user_time', value: Math.max(0, Math.round(payload.userTime)) });
  }
  if (payload.userDailyTime != null) {
    items.push({ recordKey: 'user_daily_time', value: Math.max(0, Math.round(payload.userDailyTime)) });
  }
  if (payload.levelDetail != null) {
    items.push({ recordKey: 'level_detail', value: JSON.stringify(payload.levelDetail) });
  }
  if (payload.partnerCount != null) {
    items.push({ recordKey: 'partnerCount', value: Math.max(0, Math.round(payload.partnerCount)) });
  }
  if (payload.totalItemsFound != null) {
    items.push({ recordKey: 'totalItemsFound', value: Math.max(0, Math.round(payload.totalItemsFound)) });
  }
  if (!items.length) return;
  try {
    const result = await manager.obfuscatedBatchWriteData({ items });
    const failures = result.items.filter((item) => !item.success);
    if (failures.length) console.warn('[DS] progress partial sync failure', failures);
  } catch (error) {
    console.error('[DS] progress sync failed', error);
  }
}

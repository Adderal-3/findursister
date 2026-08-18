import { dsRequestManager } from './leaderboard';

/**
 * CMS 任务奖励字段：完成“更新大神 App 到最新版本”任务后由大神后台下发 1。
 * 前端只读，不自行写入，避免本地篡改直接获得伙伴与榜分加成。
 */
export const DS_LATEST_APP_PARTNER_KEY = 'function_partner_latest';

let cachedGrant: boolean | null = null;

/**
 * null 表示当前无法确认服务端状态（非大神环境、未登录或请求失败）。
 * 调用方对 null 采用失败关闭：不解锁、不计入榜分，但也不破坏已有服务端存档。
 */
export async function refreshLatestAppPartnerGrant(): Promise<boolean | null> {
  const manager = dsRequestManager();
  if (!manager) return cachedGrant;
  try {
    const result = await manager.batchReadData({ keys: [DS_LATEST_APP_PARTNER_KEY] });
    const record = result.records.find((item) => item.recordKey === DS_LATEST_APP_PARTNER_KEY);
    cachedGrant = Number(record?.value ?? 0) > 0;
    return cachedGrant;
  } catch (error) {
    console.error('[DS] latest-app partner grant load failed', error);
    return cachedGrant;
  }
}

/* [DS:CONFIG:START] */
function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function navTheme(value: string | undefined): 'white' | 'black' {
  return value === 'black' ? 'black' : 'white';
}

export const dsConfig = {
  appKey: import.meta.env.VITE_DS_APP_KEY?.trim() || 'l36',
  squareId: import.meta.env.VITE_DS_SQUARE_ID?.trim() || '60a61f832a3be16207f9651c',
  actId: import.meta.env.VITE_DS_ACT_ID?.trim() ?? '',
  frontId: import.meta.env.VITE_DS_FRONT_ID?.trim() ?? '',
  eventAction: import.meta.env.VITE_DS_EVENT_ACTION?.trim() || 'fe_act_find_sister_h5',
  eventCategory: import.meta.env.VITE_DS_EVENT_CATEGORY?.trim() || 'act_find_sister_h5',
  h5LoginEnabled: envFlag(import.meta.env.VITE_DS_H5_LOGIN_ENABLED, true),
  share: {
    title: import.meta.env.VITE_DS_SHARE_TITLE?.trim() || '忙忙碌碌寻宝藏',
    description: import.meta.env.VITE_DS_SHARE_DESC?.trim() || '挑战寻宝关卡，寻找汴京珍宝',
    image: import.meta.env.VITE_DS_SHARE_ICON?.trim()
      || 'https://img.166.net/gameyw-misc/opd/squash/20260630/101947-goc2wybfsi.png',
  },
  navigation: {
    title: import.meta.env.VITE_DS_NAV_TITLE?.trim() || '忙忙碌碌寻宝藏',
    hideTitle: envFlag(import.meta.env.VITE_DS_NAV_HIDE_TITLE, false),
    theme: navTheme(import.meta.env.VITE_DS_NAV_THEME),
  },
  task: {
    showRole: envFlag(import.meta.env.VITE_DS_TASK_SHOW_ROLE, true),
  },
  data: {
    devMiniGameId: import.meta.env.VITE_DS_DEV_MINI_GAME_ID?.trim() ?? '',
    proMiniGameId: import.meta.env.VITE_DS_PRO_MINI_GAME_ID?.trim() ?? '',
    // 关卡分 + 无尽分共用一个总榜 yanli_rank。
    devBillboardId: import.meta.env.VITE_DS_DEV_BILLBOARD_ID?.trim() ?? '',
    proBillboardId: import.meta.env.VITE_DS_PRO_BILLBOARD_ID?.trim() ?? '',
  },
} as const;

const localPreview = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);

/** 本地预览不强制登录；发布地址自动启用大神平台能力。 */
export const dsPlatformEnabled = Boolean(dsConfig.appKey && dsConfig.squareId && !localPreview);

/**
 * 任务模块由 TaskModule.evoke 自带的 Provider 处理登录态与活动信息。
 * 只要配置完整即可挂载，因此本地也能预览入口和真实任务弹窗。
 */
export const dsTaskPanelEnabled = Boolean(dsConfig.appKey && dsConfig.actId);

/** 测试/正式小游戏 ID 均配置后启用服务端数据能力。 */
export const dsLeaderboardEnabled = Boolean(
  dsConfig.data.devMiniGameId
  && dsConfig.data.proMiniGameId
);
/* [DS:CONFIG:END] */

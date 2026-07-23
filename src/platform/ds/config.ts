function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function navTheme(value: string | undefined): 'white' | 'black' {
  return value === 'black' ? 'black' : 'white';
}

export const dsConfig = {
  appKey: import.meta.env.VITE_DS_APP_KEY?.trim() || 'L36',
  squareId: import.meta.env.VITE_DS_SQUARE_ID?.trim() || '60a61f832a3be16207f9651c',
  actId: import.meta.env.VITE_DS_ACT_ID?.trim() ?? '',
  frontId: import.meta.env.VITE_DS_FRONT_ID?.trim() ?? '',
  eventAction: import.meta.env.VITE_DS_EVENT_ACTION?.trim() || 'fe_act_find_sister_h5',
  eventCategory: import.meta.env.VITE_DS_EVENT_CATEGORY?.trim() || 'act_find_sister_h5',
  h5LoginEnabled: envFlag(import.meta.env.VITE_DS_H5_LOGIN_ENABLED, true),
  share: {
    title: import.meta.env.VITE_DS_SHARE_TITLE?.trim() || '忙忙碌碌寻宝藏',
    description: import.meta.env.VITE_DS_SHARE_DESC?.trim() || '挑战眼力值，寻找汴京珍宝',
    image: import.meta.env.VITE_DS_SHARE_ICON?.trim()
      || 'https://img.166.net/gameyw-misc/opd/squash/20260630/101947-goc2wybfsi.png',
  },
  navigation: {
    title: import.meta.env.VITE_DS_NAV_TITLE?.trim() || '百物寻踪',
    hideTitle: envFlag(import.meta.env.VITE_DS_NAV_HIDE_TITLE, false),
    theme: navTheme(import.meta.env.VITE_DS_NAV_THEME),
  },
  task: {
    showRole: envFlag(import.meta.env.VITE_DS_TASK_SHOW_ROLE, true),
  },
  data: {
    devMiniGameId: import.meta.env.VITE_DS_DEV_MINI_GAME_ID?.trim() ?? '',
    proMiniGameId: import.meta.env.VITE_DS_PRO_MINI_GAME_ID?.trim() ?? '',
    devBillboardId: import.meta.env.VITE_DS_DEV_BILLBOARD_ID?.trim() ?? '',
    proBillboardId: import.meta.env.VITE_DS_PRO_BILLBOARD_ID?.trim() ?? '',
  },
} as const;

const localPreview = typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);

/** 本地预览不强制登录；发布地址自动启用大神平台能力。 */
export const dsPlatformEnabled = Boolean(dsConfig.appKey && dsConfig.squareId && !localPreview);

/** 任务面板必须同时有 appKey 与活动 ID，避免占位参数误请求生产接口。 */
export const dsTaskPanelEnabled = Boolean(dsPlatformEnabled && dsConfig.actId);

/** 角色绑定与任务共用活动配置。 */
export const dsRoleBindingEnabled = dsTaskPanelEnabled;

/** 排行榜必须同时具备测试/正式小游戏与榜单 ID。 */
export const dsLeaderboardEnabled = Boolean(
  dsConfig.data.devMiniGameId
  && dsConfig.data.proMiniGameId
  && dsConfig.data.devBillboardId
  && dsConfig.data.proBillboardId,
);

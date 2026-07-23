function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function navTheme(value: string | undefined): 'white' | 'black' {
  return value === 'black' ? 'black' : 'white';
}

export const dsConfig = {
  appKey: import.meta.env.VITE_DS_APP_KEY?.trim() ?? '',
  squareId: import.meta.env.VITE_DS_SQUARE_ID?.trim() ?? '',
  actId: import.meta.env.VITE_DS_ACT_ID?.trim() ?? '',
  frontId: import.meta.env.VITE_DS_FRONT_ID?.trim() ?? '',
  eventAction: import.meta.env.VITE_DS_EVENT_ACTION?.trim() || 'fe_act_find_sister_h5',
  eventCategory: import.meta.env.VITE_DS_EVENT_CATEGORY?.trim() || 'act_find_sister_h5',
  h5LoginEnabled: envFlag(import.meta.env.VITE_DS_H5_LOGIN_ENABLED, true),
  share: {
    title: import.meta.env.VITE_DS_SHARE_TITLE?.trim() || '百物寻踪',
    description: import.meta.env.VITE_DS_SHARE_DESC?.trim() || '十类古风百物，拖动探索大场景，找出符合属性的物件！',
    image: import.meta.env.VITE_DS_SHARE_ICON?.trim() || 'https://g.166.net/product/a19/logo.png',
  },
  navigation: {
    title: import.meta.env.VITE_DS_NAV_TITLE?.trim() || '百物寻踪',
    hideTitle: envFlag(import.meta.env.VITE_DS_NAV_HIDE_TITLE, false),
    theme: navTheme(import.meta.env.VITE_DS_NAV_THEME),
  },
  task: {
    showRole: envFlag(import.meta.env.VITE_DS_TASK_SHOW_ROLE, false),
  },
} as const;

/** 未填平台参数时，游戏保持普通静态 H5 模式。 */
export const dsPlatformEnabled = Boolean(dsConfig.appKey && dsConfig.squareId);

/** 任务面板必须同时有 appKey 与活动 ID，避免占位参数误请求生产接口。 */
export const dsTaskPanelEnabled = Boolean(dsConfig.appKey && dsConfig.actId);

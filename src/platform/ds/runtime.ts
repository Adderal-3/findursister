import { dsConfig, dsPlatformEnabled, dsTaskPanelEnabled } from './config';

/* [DS:JSSDK:START] */
export const userInfo: Record<string, unknown> = {};
export const godlikeInfo: Record<string, unknown> = {};

export function isWechatMiniProgram(): boolean {
  return navigator.userAgent.toLowerCase().includes('miniprogram');
}

async function dsInit(): Promise<void> {
  if (!window.ds?.isGodlike) return;
  await window.ds.ready();
  try {
    const info = await window.ds.callHandler('getGodlikeInfo');
    if (info.code === 200 && info.result) Object.assign(godlikeInfo, info.result);
  } catch (error) {
    console.error('[DS] getGodlikeInfo failed', error);
  }
  try {
    const me = await window.ds.callHandler('getMyInfo');
    if (me.code === 200 && me.result) Object.assign(userInfo, me.result);
  } catch (error) {
    console.error('[DS] getMyInfo failed', error);
  }
}

export async function initLogin(): Promise<void> {
  if (!dsPlatformEnabled) return;
  if (window.ds?.isGodlike) {
    await dsInit();
    return;
  }
  if (!dsConfig.h5LoginEnabled || !window.Ulogin?.default) return;
  window.dsLogin ??= new window.Ulogin.default({
    env: 'production',
    loginSuccess: () => undefined,
    loginFail: () => undefined,
  });
  const loginResult = await window.dsLogin.hasLoggedIn();
  if (loginResult?.user) Object.assign(userInfo, loginResult.user);
  if (isWechatMiniProgram() && !userInfo.uid) {
    window.wx?.miniProgram.navigateTo({ url: '/pages/login/index' });
  }
}
/* [DS:JSSDK:END] */

/* [DS:NS-LOG:START] */
function getDeviceId(): string {
  const godlikeDeviceId = godlikeInfo['GL-DeviceId'];
  if (typeof godlikeDeviceId === 'string' && godlikeDeviceId) return godlikeDeviceId;
  const key = 'znm.analytics.deviceId';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

function localTime(): string {
  const now = new Date();
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((value, index) => index === 0 ? String(value) : String(value).padStart(2, '0'))
    .join('-');
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
  return `${date} ${time}`;
}

export function trackEvent(extra: Record<string, unknown>): void {
  if (!dsPlatformEnabled || typeof window.ns !== 'function') return;
  const query = new URLSearchParams(window.location.search);
  window.ns('send', {
    hitType: 'event',
    eventCategory: dsConfig.eventCategory,
    eventAction: dsConfig.eventAction,
    eventLabel: JSON.stringify({
      open_from: query.get('open_from') || '',
      game: dsConfig.appKey,
      scene: window.ds?.isGodlike ? 1 : 2,
      deviceid: getDeviceId(),
      uid: userInfo.uid ?? -9999,
      bnet_id: userInfo.roleId ?? '',
      time: localTime(),
      utm_source: query.get('utm_source') || '',
      ...extra,
    }),
  });
}
/* [DS:NS-LOG:END] */

/* [DS:ULINK:START] */
export function initUlink(): void {
  if (!dsPlatformEnabled || window.ds?.isGodlike || typeof window.onDsUlinkReady !== 'function') return;
  window.onDsUlinkReady((error) => {
    if (error || !window.DsUlink) {
      if (error) console.error('[DS] Ulink load failed', error);
      return;
    }
    window.dsUlink ??= new window.DsUlink('production');
    window.dsUlink.initTraceInstall();
  });
}

export function openSquareUrl(squareId = dsConfig.squareId): void {
  if (!squareId || !window.dsUlink) return;
  const url = window.location.href;
  window.dsUlink.open({
    params: { action: 'circle', squareId, url },
    traceData: {
      event: {
        eventAction: 'gotoUlink',
        eventValue: `https://app.16163.com/ds/ulinks/?action=circle&squareId=${encodeURIComponent(squareId)}&url=${encodeURIComponent(url)}`,
      },
    },
  });
}

export function withPrecheck<T extends unknown[]>(
  callback: (...args: T) => void,
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    if (!dsPlatformEnabled) {
      callback(...args);
      return;
    }
    if (window.ds?.isGodlike) {
      await window.ds.ready();
      const result = await window.ds.callHandler('checkLogined');
      if (!result.result?.isLogined) {
        await window.ds.callHandler('openLoginPage');
        return;
      }
      callback(...args);
      return;
    }
    if (isWechatMiniProgram() && window.wx) {
      if (!userInfo.uid) {
        window.wx.miniProgram.navigateTo({ url: '/pages/login/index' });
        return;
      }
      callback(...args);
      return;
    }
    if (dsConfig.h5LoginEnabled && window.dsLogin) {
      const loggedIn = await window.dsLogin.hasLoggedIn();
      if (loggedIn) {
        Object.assign(userInfo, loggedIn.user);
        callback(...args);
      } else {
        window.dsLogin.show();
      }
      return;
    }
    if (!dsConfig.h5LoginEnabled) {
      openSquareUrl();
      return;
    }
    callback(...args);
  };
}
/* [DS:ULINK:END] */

/* [DS:SHARE:START] */
export function initShare(): void {
  if (!dsPlatformEnabled) return;
  const link = window.location.href;
  const shareData = {
    title: dsConfig.share.title,
    desc: dsConfig.share.description,
    link,
    imgUrl: dsConfig.share.image,
    squareId: dsConfig.squareId,
    refer: link,
  };
  if (isWechatMiniProgram() && window.wx) {
    window.wx.miniProgram.postMessage({ data: { type: 'share', ...shareData } });
    return;
  }
  if (window.ds?.isGodlike) {
    void window.ds.ready().then(() => window.ds?.callHandler('onUpdateShareMenu', shareData));
    return;
  }
  const setup = () => {
    if (!window.MobileShare) return;
    new window.MobileShare({
      imgUrl: dsConfig.share.image,
      title: dsConfig.share.title,
      desc: dsConfig.share.description,
    });
  };
  if (window.MobileShare) setup();
  else window.onMobileShareReady?.((error) => { if (!error) setup(); });
}
/* [DS:SHARE:END] */

/* [DS:NAV-BAR:START] */
let navInstance: DsNavigationInstance | null = null;
let NavigationBarTheme: 'white' | 'black' = dsConfig.navigation.theme;

function navigationConstructor(): DsNavigationConstructor | null {
  if (window.DsNavigationMiniProgramBar && 'default' in window.DsNavigationMiniProgramBar) {
    window.DsNavigationMiniProgramBar = window.DsNavigationMiniProgramBar.default;
  }
  return window.DsNavigationMiniProgramBar ?? null;
}

export function initNavBar(): void {
  if (!dsPlatformEnabled || !window.ds?.isGodlike || navInstance) return;
  const NavigationBar = navigationConstructor();
  if (!NavigationBar) return;
  void window.ds.callHandler('setWebviewFullScreen', { isFullScreen: true });
  navInstance = new NavigationBar({
    title: dsConfig.navigation.title,
    hideTitle: dsConfig.navigation.hideTitle,
    statusBarStyle: NavigationBarTheme === 'black' ? 'black' : 'white',
    closeClick: () => { void window.ds?.callHandler('closeWindow'); },
    menuClick: () => { void window.ds?.callHandler('showShareMenu'); },
    changeVisable: () => { void window.ds?.callHandler('setStatusBar', { color: NavigationBarTheme }); },
  });
  void navInstance.ready().then(() => undefined);
}

export function applyNavTheme(theme: 'white' | 'black'): void {
  NavigationBarTheme = theme;
  if (window.ds?.isGodlike) {
    void window.ds.ready().then(() => window.ds?.callHandler('setStatusBar', { color: NavigationBarTheme }));
  }
  if (navInstance && typeof navInstance.setTheme === 'function') navInstance.setTheme(NavigationBarTheme);
}
/* [DS:NAV-BAR:END] */

/* ========== DS:ACT-SDK BEGIN ========== */
let taskModuleMounted = false;

export function initTaskModule(): void {
  if (!dsTaskPanelEnabled || !window.DsActSdk || taskModuleMounted) return;
  const production: { actId: string; appKey: string; frontId?: string } = {
    actId: dsConfig.actId,
    appKey: dsConfig.appKey,
  };
  if (dsConfig.frontId) production.frontId = dsConfig.frontId;
  window.DsActSdk.configure({ production });
  window.DsActSdk.TaskModule.evoke({
    container: '#ds-task-root',
    title: '全部任务',
    showRole: dsConfig.task.showRole,
  });
  taskModuleMounted = true;
}

export function openTaskPanel(): void {
  if (!dsTaskPanelEnabled || !window.DsActSdk) return;
  window.DsActSdk.dsActStore.set(window.DsActSdk.taskListPopupState, true);
  trackEvent({ event: 'task_panel_open' });
}
/* ========== DS:ACT-SDK END ========== */

/* [DS:EXPORTS:START] */
let initPromise: Promise<void> | null = null;

async function initApp(): Promise<void> {
  initUlink();
  await initLogin();
  initShare();
  initNavBar();
  initTaskModule();
  trackEvent({ event: 'page_ready' });
}

export function initDsPlatform(): Promise<void> {
  initPromise ??= initApp().catch((error) => {
    initPromise = null;
    console.error('[DS] platform initialization failed', error);
  });
  return initPromise;
}
/* [DS:EXPORTS:END] */

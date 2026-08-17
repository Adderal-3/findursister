import {
  dsConfig, dsPlatformEnabled, dsRoleBindingEnabled, dsTaskPanelEnabled,
} from './config';
import { setStorageIdentity } from '../../game/storage';

/* [DS:MINIAPP-DETECT:START] */
export function isWechatMiniProgram(): boolean {
  if (navigator.userAgent.toLowerCase().includes('miniprogram')) return true;
  // 本地预览开关：?mp=1 强制按小程序布局渲染，方便在浏览器里核对适配效果。
  try {
    return new URLSearchParams(window.location.search).get('mp') === '1';
  } catch {
    return false;
  }
}
/* [DS:MINIAPP-DETECT:END] */

/* [DS:JSSDK:START] */
export const userInfo: Record<string, unknown> = {};
export const godlikeInfo: Record<string, unknown> = {};

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
    else await window.ds.callHandler('openLoginPage');
  } catch (error) {
    console.error('[DS] getMyInfo failed', error);
  }
  setStorageIdentity(userInfo.uid);
}

/** 小程序传角：从 URL 读取 appletSelectRole（AppletSelectRoleObj JSON），合并角色信息进 userInfo。 */
function applyAppletSelectRole(): void {
  try {
    const raw = new URLSearchParams(window.location.search).get('appletSelectRole');
    if (!raw) return;
    const role = JSON.parse(raw) as Partial<AppletSelectRole>;
    if (!role || typeof role !== 'object'
      || typeof role.roleId !== 'string' || !role.roleId) return;
    Object.assign(userInfo, role);
  } catch (error) {
    console.error('[DS] parse appletSelectRole failed', error);
  }
}

export async function initLogin(): Promise<void> {
  if (!dsPlatformEnabled) return;
  applyAppletSelectRole();
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
  setStorageIdentity(userInfo.uid);
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
/* [DS:ULINK:END] */

/* [DS:CLICK-PRECHECK:START] */
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
        setStorageIdentity(userInfo.uid);
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
/* [DS:CLICK-PRECHECK:END] */

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
let actSdkConfigured = false;
let taskModuleMounted = false;
let roleModuleUnmount: (() => void) | null = null;

function configureActSdk(): boolean {
  if (!window.DsActSdk || !dsConfig.actId) return false;
  if (actSdkConfigured) return true;
  const production: { actId: string; appKey: string; frontId?: string } = {
    actId: dsConfig.actId,
    appKey: dsConfig.appKey,
  };
  if (dsConfig.frontId) production.frontId = dsConfig.frontId;
  window.DsActSdk.configure({ production });
  actSdkConfigured = true;
  return true;
}

/** 挂载任务弹窗；成功返回 true。SDK / 容器未就绪时返回 false，由调用方决定是否重试。 */
export function initTaskModule(): boolean {
  if (!dsTaskPanelEnabled) return false;
  if (taskModuleMounted) return true;
  if (!configureActSdk() || !window.DsActSdk) return false;
  // 容器由 React 渲染，evoke 前必须已在 DOM 中，否则 SDK 找不到挂载点静默失败。
  if (!document.querySelector('#ds-task-root')) return false;
  window.DsActSdk.TaskModule.evoke({
    container: '#ds-task-root',
    title: '全部任务',
    showRole: dsConfig.task.showRole,
  });
  taskModuleMounted = true;
  return true;
}

/** 菜单挂载后接入角色选择；离开菜单时卸载，返回菜单可重新挂载。 */
export function mountRoleModule(): () => void {
  if (!dsRoleBindingEnabled || roleModuleUnmount || !configureActSdk() || !window.DsActSdk) {
    return () => undefined;
  }
  const handle = window.DsActSdk.Role.evoke({
    container: '#ds-role-root',
    placeholder: '请选择角色',
    onClick: () => trackEvent({ event: 'role_binding_open' }),
  });
  roleModuleUnmount = () => {
    handle.unmount();
    roleModuleUnmount = null;
  };
  return roleModuleUnmount;
}

/** 打开任务面板。返回 null 表示成功，否则返回可展示给用户的失败原因。 */
export function openTaskPanel(): string | null {
  if (!dsTaskPanelEnabled) {
    if (!dsConfig.appKey) return '任务活动未配置（appKey 缺失）';
    return '任务活动未配置（actId 缺失）';
  }
  if (!window.DsActSdk) {
    return '任务 SDK 未加载（DsActSdk 不存在），当前环境可能不支持';
  }
  // 点击时兜底：初始化时 SDK 可能还没加载完导致 evoke 没跑成，这里再尝试挂载一次。
  if (!initTaskModule()) {
    return '任务面板挂载失败（容器缺失或 SDK 未就绪）';
  }
  window.DsActSdk.dsActStore.set(window.DsActSdk.taskListPopupState, true);
  trackEvent({ event: 'task_panel_open' });
  return null;
}
/* ========== DS:ACT-SDK END ========== */

/* [DS:EXPORTS:START] */
let initPromise: Promise<void> | null = null;

async function initApp(): Promise<void> {
  // 小程序布局类已在 DsPlatformBridge 里应用（含 ?mp=1 本地预览开关）。
  initUlink();
  await initLogin();
  initShare();
  initNavBar();
  // ds-act-sdk 是 CDN 异步加载，首次可能还没就绪；轮询重试直到挂载成功（上限 ~10s）。
  if (dsTaskPanelEnabled && !initTaskModule()) {
    let tries = 0;
    const retry = window.setInterval(() => {
      tries += 1;
      if (initTaskModule() || tries >= 20) window.clearInterval(retry);
    }, 500);
  }
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

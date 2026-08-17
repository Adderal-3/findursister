// ============================================================
// React hooks 模板 — 仅供理解结构，所有占位符必须替换
// ============================================================
// 此文件演示 React 项目 4 个 hooks 文件 + 1 个类型声明文件的完整结构。
// 占位符：{EVENT_ACTION} {EVENT_CATEGORY} {APP_KEY} {SHARE_TITLE} {SHARE_DESC}
//         {SHARE_ICON} {SQUARE_ID} {IS_COCOS} {H5_LOGIN_ENABLED}
// Vue 项目结构相同，差异见 contracts/framework-diffs.md：
//   - 目录 src/hooks/ → src/composables/
//   - 共享状态用 reactive({}) 包裹（见 framework-diffs.md "共享状态响应式"行）
//
// 文件清单（React 路径）：
//   src/ds.d.ts                  — 类型声明（Window 接口扩展）
//   src/hooks/useDsInit.ts       — JSSDK 初始化 + 登录态
//   src/hooks/useNsLog.ts        — NS 日志 + trackEvent
//   src/hooks/useDsShare.ts      — 分享
//   src/hooks/useDsUlink.ts      — Ulink 跳转 + withPrecheck
// ============================================================


// ─── src/ds.d.ts ───────────────────────────────────────────
// 新建 src/ds.d.ts（若已存在则检查是否包含以下声明，缺失则追加）：

declare global {
  interface Window {
    ds?: {
      isGodlike: boolean;
      ready(): Promise<void>;
      callHandler(
        name: string,
        params?: Record<string, unknown>,
        callback?: (error: unknown) => void
      ): Promise<{ code: number; result?: Record<string, unknown> }>;
    };
    ns?: (...args: unknown[]) => void;
    dsUlink?: {
      open(options: {
        params: { action: string; squareId: string; url: string };
        traceData: { event: { eventAction: string; eventValue: string } };
      }): void;
    };
    DsUlink?: new (env: string) => {
      initTraceInstall(): void;
      open(options: unknown): void;
    };
    MobileShare?: new (options: {
      imgUrl: string;
      title: string;
      desc: string;
    }) => void;
    onDsUlinkReady?: (callback: (error: unknown) => void) => void;
    onMobileShareReady?: (callback: (error: unknown) => void) => void;
    Ulogin?: { default: new (opts: { env: string; loginSuccess: () => void; loginFail: () => void }) => { hasLoggedIn(): Promise<{ user: Record<string, unknown> } | null>; show(): void } };
    dsLogin?: { hasLoggedIn(): Promise<{ user: Record<string, unknown> } | null>; show(): void };
  }
}


// ─── src/hooks/useDsInit.ts ────────────────────────────────
// （将 {EVENT_ACTION}, {EVENT_CATEGORY}, {APP_KEY} 替换为用户输入值）

/* [DS:JSSDK:START] */
/**
 * JSSDK 常用调用示例（需在大神 App 内）：
 * window.ds.callHandler('getGodlikeInfo')     // 获取 App 环境信息
 * window.ds.callHandler('getMyInfo')          // 获取用户信息
 * window.ds.callHandler('openLoginPage')      // 打开登录页
 * window.ds.callHandler('onUpdateShareMenu', { title, desc, link, imgUrl }) // 更新分享菜单
 * 如需配置 screenMode、返回按钮等，请调用 /dsjssdk 技能查询具体参数
 */
const userInfo: Record<string, unknown> = {};
const godlikeInfo: Record<string, unknown> = {};

async function dsInit(): Promise<void> {
  if (!window.ds) return;
  if (window.ds.isGodlike) {
    await window.ds.ready();
    try {
      const res = await window.ds.callHandler('getGodlikeInfo');
      if (res.code === 200 && res.result) Object.assign(godlikeInfo, res.result);
    } catch (e) { console.error('getGodlikeInfo failed', e); }
    try {
      const myRes = await window.ds.callHandler('getMyInfo');
      if (myRes.code === 200 && myRes.result) Object.assign(userInfo, myRes.result);
      else await window.ds.callHandler('openLoginPage');
    } catch (e) { console.error('getMyInfo failed', e); }
  }
}

function isWechatMiniProgram(): boolean {
  return navigator.userAgent.toLowerCase().includes('miniprogram');
}

async function initLogin(): Promise<void> {
  if (window.ds && window.ds.isGodlike) {
    await dsInit();
    return;
  }
  window.dsLogin = new Ulogin.default({
    env: 'production',
    loginSuccess: function() {},
    loginFail: function() {},
  });
  const loginResult = await window.dsLogin.hasLoggedIn();
  if (loginResult) { Object.assign(userInfo, loginResult.user); }
  // 小程序未登录 → 跳转登录页
  if (isWechatMiniProgram() && typeof window.wx !== 'undefined' && !userInfo['uid']) {
    wx.miniProgram.navigateTo({ url: '/pages/login/index' });
  }
}

export function useDsInit() {
  return { userInfo, godlikeInfo, dsInit, initLogin };
}
/* [DS:JSSDK:END] */

// 应用入口调用 initLogin：在 App.tsx 的 useEffect 中调用 initLogin()，确保页面加载时完成登录态检测：
//   const { initLogin } = useDsInit();
//   useEffect(() => { initLogin(); }, []);


// ─── src/hooks/useNsLog.ts ─────────────────────────────────
// （将 {EVENT_ACTION}, {EVENT_CATEGORY}, {APP_KEY} 替换为用户输入值）

/* [DS:NS-LOG:START] */
/**
 * trackEvent 使用示例：
 * trackEvent({ event: 'click_start' });        // 点击开始按钮
 * trackEvent({ event: 'complete_level' });     // 完成关卡
 * trackEvent({ event: 'use_hint' });           // 使用提示
 * 提示：extra 参数可添加自定义字段，如：
 * trackEvent({ event: 'level_complete', level_id: 1, time_cost: 30 });
 */
import { userInfo, godlikeInfo } from './useDsInit';

const EVENT_ACTION = '{EVENT_ACTION}';
const EVENT_CATEGORY = '{EVENT_CATEGORY}';
const APP_KEY = '{APP_KEY}';

function getUUID(): string {
  const s4 = (): string =>
    Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

function trackEvent(extra?: Record<string, unknown>): void {
  if (typeof window.ns !== 'function') return;
  const sp = new URLSearchParams(window.location.search);
  const deviceId =
    window.ds && window.ds.isGodlike
      ? (godlikeInfo['GL-DeviceId'] as string) || ''
      : getUUID();
  const now = new Date();
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  window.ns('send', {
    hitType: 'event',
    eventCategory: EVENT_CATEGORY,
    eventAction: EVENT_ACTION,
    eventLabel: JSON.stringify(
      Object.assign(
        {
          open_from: sp.get('open_from') || '',
          game: APP_KEY || '',
          scene: window.ds && window.ds.isGodlike ? 1 : 2,
          deviceid: deviceId,
          uid: (userInfo['uid'] as number) || -9999,
          bnet_id: (userInfo['roleId'] as string) || '',
          time,
          utm_source: sp.get('utm_source') || '',
        },
        extra || {}
      )
    ),
  });
}

export function useNsLog() {
  return { trackEvent };
}
/* [DS:NS-LOG:END] */


// ─── src/hooks/useDsShare.ts ───────────────────────────────
// （将 {SHARE_TITLE}, {SHARE_DESC}, {SHARE_ICON}, {SQUARE_ID} 替换为用户输入值）

/* [DS:SHARE:START] */
// IS_COCOS = true 时浏览器分享降级为 no-op（React + Cocos 组合罕见，仍按一致约定处理）
const IS_COCOS = {IS_COCOS};
const SHARE_TITLE = '{SHARE_TITLE}';
const SHARE_DESC = '{SHARE_DESC}';
const SHARE_ICON = '{SHARE_ICON}';
const SQUARE_ID = '{SQUARE_ID}';

function initShare(): void {
  const link = window.location.href;
  if (window.ds && window.ds.isGodlike) {
    window.ds.ready().then(() => {
      window.ds!.callHandler('onUpdateShareMenu', {
        title: SHARE_TITLE,
        desc: SHARE_DESC,
        link,
        imgUrl: SHARE_ICON,
        squareId: SQUARE_ID,
        refer: link,
      });
    });
  } else if (!IS_COCOS) {
    const setupMobileShare = (): void => {
      try {
        new window.MobileShare!({ imgUrl: SHARE_ICON, title: SHARE_TITLE, desc: SHARE_DESC });
      } catch (e) { console.error('MobileShare 初始化失败', e); }
    };
    if (typeof window.MobileShare !== 'undefined') {
      setupMobileShare();
    } else if (typeof window.onMobileShareReady === 'function') {
      window.onMobileShareReady((error) => { if (!error) setupMobileShare(); });
    }
  }
}

export function useDsShare() {
  return { initShare };
}
/* [DS:SHARE:END] */


// ─── src/hooks/useDsUlink.ts ───────────────────────────────
// （将 {SQUARE_ID} 替换为用户输入值）

/* [DS:ULINK:START] */
import { userInfo, isWechatMiniProgram } from './useDsInit';

const SQUARE_ID = '{SQUARE_ID}';
const H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};

function initUlink(): void {
  if (window.ds && window.ds.isGodlike) return;
  if (typeof window.onDsUlinkReady === 'function') {
    window.onDsUlinkReady((error) => {
      if (error) { console.error('DsUlink 加载失败', error); return; }
      window.dsUlink = new window.DsUlink!('production');
      window.dsUlink.initTraceInstall();
    });
  }
}

function openSquareUrl(squareId?: string): void {
  const targetId = squareId || SQUARE_ID;
  if (!targetId) { console.warn('未配置圈子 ID'); return; }
  if (window.dsUlink) {
    window.dsUlink.open({
      params: { action: 'circle', squareId: targetId, url: window.location.href },
      traceData: {
        event: {
          eventAction: 'gotoUlink',
          eventValue:
            'https://app.16163.com/ds/ulinks/?action=circle&squareId=' +
            targetId +
            '&url=' +
            encodeURIComponent(window.location.href),
        },
      },
    });
  }
}
/* [DS:ULINK:END] */

/* [DS:CLICK-PRECHECK:START] */
/**
 * withPrecheck(callback) — thunk 模式
 *
 * ⚠️ BREAKING：返回 async 包装函数，必须作为事件处理器直接绑定。
 * 旧调用模式 `() => withPrecheck(() => fn())`、`function() { withPrecheck(...) }`、内联 `onclick="withPrecheck(...)"` 在新签名下静默失效。
 *
 * 用作事件处理器时自动透传事件参数给 callback。
 *
 * 三条分支：
 *   1. 大神 App 内 → checkLogined 查询登录状态，未登录弹登录页，已登录执行 callback
 *   2. 微信小程序 → 检查 URS 联登状态，未登录跳转小程序登录页，已登录执行 callback
 *   3. 普通浏览器 → H5_LOGIN_ENABLED=true 时未登录弹 dsLogin.show()，已登录执行 callback；
 *      H5_LOGIN_ENABLED=false 时 openSquareUrl() 引导进入 App
 */
function withPrecheck<T extends unknown[]>(
  callback: (...args: T) => void,
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    // 分支1：大神App内
    if (window.ds && window.ds.isGodlike) {
      await window.ds.ready();
      const res = await window.ds.callHandler('checkLogined');
      if (!res.result['isLogined']) {
        window.ds.callHandler('openLoginPage');
        return;
      }
      if (typeof callback === 'function') callback(...args);
      return;
    }
    // 分支2：微信小程序
    if (isWechatMiniProgram() && typeof window.wx !== 'undefined') {
      if (!userInfo['uid']) {
        wx.miniProgram.navigateTo({ url: '/pages/login/index' });
        return;
      }
      if (typeof callback === 'function') callback(...args);
      return;
    }
    // 分支3：普通浏览器
    if (H5_LOGIN_ENABLED) {
      const loggedIn = await window.dsLogin.hasLoggedIn();
      if (loggedIn) {
        if (typeof callback === 'function') callback(...args);
        return;
      }
      window.dsLogin.show();
      return;
    }
    openSquareUrl();
  };
}
/* [DS:CLICK-PRECHECK:END] */

export function useDsUlink() {
  return { initUlink, openSquareUrl, withPrecheck };
}

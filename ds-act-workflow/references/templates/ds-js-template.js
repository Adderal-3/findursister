/* [DS:CONFIG:START] */
var EVENT_ACTION   = '{EVENT_ACTION}';
var EVENT_CATEGORY = '{EVENT_CATEGORY}';
var APP_KEY        = '{APP_KEY}';
var SHARE_TITLE    = '{SHARE_TITLE}';
var SHARE_DESC     = '{SHARE_DESC}';
var SHARE_ICON     = '{SHARE_ICON}';
var SQUARE_ID      = '{SQUARE_ID}';
var IS_COCOS       = {IS_COCOS};
var H5_LOGIN_ENABLED = {H5_LOGIN_ENABLED};  // H5 环境登录支持：true=未登录弹URS登录 / false=引导回大神App（默认）
/* [DS:CONFIG:END] */

/* [DS:MINIAPP-DETECT:START] */
function isWechatMiniProgram() {
  return navigator.userAgent.toLowerCase().includes('miniprogram');
}
/* [DS:MINIAPP-DETECT:END] */

/* [DS:JSSDK:START] */
/**
 * JSSDK 常用调用示例（需在大神 App 内）：
 * window.ds.callHandler('getGodlikeInfo')     // 获取 App 环境信息
 * window.ds.callHandler('getMyInfo')          // 获取用户信息
 * window.ds.callHandler('openLoginPage')      // 打开登录页
 * window.ds.callHandler('onUpdateShareMenu', { title, desc, link, imgUrl }) // 更新分享菜单
 * 如需配置 screenMode、返回按钮等，请调用 /dsjssdk 技能查询具体参数
 */
var userInfo = {}, godlikeInfo = {};

async function dsInit() {
  if (!window.ds) return;
  if (window.ds.isGodlike) {
    await window.ds.ready();
    try {
      var res = await window.ds.callHandler('getGodlikeInfo');
      if (res.code === 200 && res.result) Object.assign(godlikeInfo, res.result);
    } catch(e) { console.error('getGodlikeInfo failed', e); }
    try {
      var myRes = await window.ds.callHandler('getMyInfo');
      if (myRes.code === 200 && myRes.result) Object.assign(userInfo, myRes.result);
      else await window.ds.callHandler('openLoginPage');
    } catch(e) { console.error('getMyInfo failed', e); }
  }
}

async function initLogin() {
  if (window.ds && window.ds.isGodlike) {
    await dsInit();
    return;
  }
  window.dsLogin = new Ulogin.default({
    env: 'production',
    loginSuccess: function() {},
    loginFail: function() {},
  });
  var loginResult = await window.dsLogin.hasLoggedIn();
  if (loginResult) { userInfo = loginResult.user; window.userInfo = userInfo; }
  // 小程序未登录 → 跳转登录页（页面离开，后续 JS 不再有意义）
  // isWechatMiniProgram() = 环境判断 / typeof window.wx !== 'undefined' = SDK 可用性
  if (isWechatMiniProgram() && typeof window.wx !== 'undefined' && (!userInfo || !userInfo.uid)) {
    wx.miniProgram.navigateTo({ url: '/pages/login/index' });
  }
}
/* [DS:JSSDK:END] */

/* [DS:NS-LOG:START] */
/**
 * trackEvent 使用示例：
 * trackEvent({ event: 'click_start' });        // 点击开始按钮
 * trackEvent({ event: 'complete_level' });     // 完成关卡
 * trackEvent({ event: 'use_hint' });           // 使用提示
 * 提示：extra 参数可添加自定义字段，如：
 * trackEvent({ event: 'level_complete', level_id: 1, time_cost: 30 });
 */
function getUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return s4()+s4()+'-'+s4()+'-'+s4()+'-'+s4()+'-'+s4()+s4()+s4();
}

function trackEvent(extra) {
  if (typeof window.ns !== 'function') return;
  var sp = new URLSearchParams(window.location.search);
  var deviceId = (window.ds && window.ds.isGodlike)
    ? (godlikeInfo['GL-DeviceId'] || '')
    : getUUID();
  var now = new Date();
  var time = now.getFullYear()+'-'
    +String(now.getMonth()+1).padStart(2,'0')+'-'
    +String(now.getDate()).padStart(2,'0')+' '
    +String(now.getHours()).padStart(2,'0')+':'
    +String(now.getMinutes()).padStart(2,'0')+':'
    +String(now.getSeconds()).padStart(2,'0');
  window.ns('send', {
    hitType: 'event',
    eventCategory: EVENT_CATEGORY,
    eventAction: EVENT_ACTION,
    eventLabel: JSON.stringify(Object.assign({
      open_from: sp.get('open_from') || '',
      game: APP_KEY || '',
      scene: (window.ds && window.ds.isGodlike) ? 1 : 2,
      deviceid: deviceId,
      uid: userInfo.uid || -9999,
      bnet_id: (userInfo.roleId || ''),
      time: time,
      utm_source: sp.get('utm_source') || '',
    }, extra || {}))
  });
}
/* [DS:NS-LOG:END] */

/* [DS:SHARE:START] */
// IS_COCOS = true 时浏览器分享降级为 no-op：MobileShare 会间接加载微信 JSSDK，
// Cocos 引擎检测到 window.wx 后将误判为微信小游戏环境并进入错误代码分支。
function initShare() {
  // isWechatMiniProgram() = 环境判断（是否在微信 WebView 中）
  // typeof window.wx !== 'undefined' = SDK 可用性判断（wx 对象是否加载）
  if (isWechatMiniProgram() && typeof window.wx !== 'undefined') {
    wx.miniProgram.postMessage({
      data: {
        pageId: window.location.pathname,
        shareConfig: {
          title: SHARE_TITLE,
          imageUrl: SHARE_ICON,
          url: window.location.href,
        },
      },
    });
    return;
  }
  var link = window.location.href;
  if (window.ds && window.ds.isGodlike) {
    window.ds.ready().then(function() {
      window.ds.callHandler('onUpdateShareMenu', {
        title: SHARE_TITLE, desc: SHARE_DESC,
        link: link, imgUrl: SHARE_ICON,
        squareId: SQUARE_ID, refer: link,
      }, function(error) {
        if (error) console.error('分享配置失败', error);
      });
    });
  } else if (!IS_COCOS) {
    function setupMobileShare() {
      try { new MobileShare({ imgUrl: SHARE_ICON, title: SHARE_TITLE, desc: SHARE_DESC }); }
      catch(e) { console.error('MobileShare 初始化失败', e); }
    }
    if (typeof MobileShare !== 'undefined') {
      setupMobileShare();
    } else if (typeof window.onMobileShareReady === 'function') {
      window.onMobileShareReady(function(error) { if (!error) setupMobileShare(); });
    }
  }
}
/* [DS:SHARE:END] */

/* [DS:ULINK:START] */
function initUlink() {
  if (window.ds && window.ds.isGodlike) return;
  if (isWechatMiniProgram()) return;
  if (typeof window.onDsUlinkReady === 'function') {
    window.onDsUlinkReady(function(error) {
      if (error) { console.error('DsUlink 加载失败', error); return; }
      window.dsUlink = new DsUlink('production');
      window.dsUlink.initTraceInstall();
    });
  }
}

function openSquareUrl(squareId) {
  var targetId = squareId || SQUARE_ID;
  if (!targetId) { console.warn('未配置圈子 ID'); return; }
  if (window.dsUlink) {
    window.dsUlink.open({
      params: { action: 'circle', squareId: targetId, url: window.location.href },
      traceData: { event: { eventAction: 'gotoUlink',
        eventValue: 'https://app.16163.com/ds/ulinks/?action=circle&squareId='+targetId
          +'&url='+encodeURIComponent(window.location.href) }},
    });
  }
}
/* [DS:ULINK:END] */

/* [DS:WX-LAUNCH-MASK:START] */
// 安卓微信全屏遮罩引导：仅在"不支持 App 站外体验"(H5_LOGIN_ENABLED=false) 时启用。
// WxLaunchMask UMD 自动识别安卓微信环境，展示全屏遮罩并嵌入微信 open-tag，点击唤起大神 App。
// 支持站外体验时（H5_LOGIN_ENABLED=true）用户可直接在微信内玩，不加载遮罩，避免打断体验。
var WX_LAUNCH_APP_ID = 'wxb6fd8206b57aec5b';  // 大神 App 关联的微信开放平台 AppID（固定值，无需修改）
var WX_LAUNCH_MASK_SDK = 'https://ds.res.netease.com/online/pkg/android-wx-ulink-sdk/0.0.4/wx-launch-mask.umd.js';

function initWxLaunchMask() {
  if (H5_LOGIN_ENABLED) return;                    // 支持站外体验 → 无需引导回 App
  if (window.ds && window.ds.isGodlike) return;    // 已在大神 App 内
  if (isWechatMiniProgram()) return;               // 小程序内走 wx.miniProgram，无需遮罩

  function mountMask() {
    if (!window.WxLaunchMask || typeof window.WxLaunchMask.mount !== 'function') return;
    var extInfo = JSON.stringify({
      type: 'goToLink',
      value: 'https://app.16163.com/ds/ulinks/?action=circle&tab=game&squareId=' + SQUARE_ID
        + '&url=' + encodeURIComponent(window.location.href),
    });
    window.WxLaunchMask.mount({
      launchAppId: WX_LAUNCH_APP_ID,
      extInfo: extInfo,
      debug: false,
      // ?forceMount=1 强制展示遮罩，方便非微信环境调试
      forceMount: new URLSearchParams(window.location.search).get('forceMount') === '1',
      onLaunch: function() { trackEvent({ event: 'click_open', source: 'wx_tag' }); },
    });
  }

  if (window.WxLaunchMask) { mountMask(); return; }
  var script = document.createElement('script');
  script.src = WX_LAUNCH_MASK_SDK;
  script.crossorigin = 'anonymous';
  script.onload = mountMask;
  script.onerror = function() { console.error('WxLaunchMask 加载失败'); };
  document.head.appendChild(script);
}
/* [DS:WX-LAUNCH-MASK:END] */

/* [DS:CLICK-PRECHECK:START] */
/**
 * withPrecheck(callback) — thunk 模式
 *
 * ⚠️ BREAKING：旧签名 `async function withPrecheck(callback)` 直接执行预检。
 * 新签名返回 async 包装函数，必须作为事件处理器直接绑定。
 * 旧调用模式 `function() { withPrecheck(() => fn()) }` 和 `onclick="withPrecheck(fn)"`
 * 在新签名下会静默失效（thunk 返回后从未被调用）。
 *
 * 迁移：
 *   ❌ 旧：element.addEventListener('click', function() { withPrecheck(() => fn()); });
 *   ❌ 旧：onclick="withPrecheck(fn)"
 *   ✅ 新：element.addEventListener('click', withPrecheck(fn));
 *
 * 用作事件处理器时自动透传事件参数给 callback：
 *   element.addEventListener('click', withPrecheck(handleClick));
 *   按钮点击后，先检查登录状态，已登录则调用 handleClick(event)。
 *
 * 三条分支：
 *   1. 大神 App 内 → checkLogined 查询登录状态，未登录弹登录页，已登录执行 callback
 *   2. 微信小程序 → 检查 URS 联登状态，未登录跳转小程序登录页，已登录执行 callback
 *   3. 普通浏览器 → H5_LOGIN_ENABLED=true 时未登录弹 dsLogin.show()，已登录执行 callback；
 *      H5_LOGIN_ENABLED=false 时 openSquareUrl() via ulink，引导进入 App
 */
function withPrecheck(callback) {
  return async function(...args) {
    // 分支1：大神App内 → checkLogined 直接查询 SDK，避免时序依赖
    if (window.ds && window.ds.isGodlike) {
      await window.ds.ready();
      var res = await window.ds.callHandler('checkLogined');
      if (!res.result['isLogined']) {
        window.ds.callHandler('openLoginPage');
        return;
      }
      if (typeof callback === 'function') callback(...args);
      return;
    }
    // 分支2：小程序环境 → 检查联登状态（isWechatMiniProgram = 环境，window.wx = SDK 可用性）
    if (isWechatMiniProgram() && typeof window.wx !== 'undefined') {
      if (!userInfo || !userInfo.uid) {
        wx.miniProgram.navigateTo({ url: '/pages/login/index' });
        return;
      }
      if (typeof callback === 'function') callback(...args);
      return;
    }
    // 分支3：普通浏览器
    if (H5_LOGIN_ENABLED) {
      // 支持模式：实时查询登录状态，未登录弹 URS 登录框
      var loggedIn = await window.dsLogin.hasLoggedIn();
      if (loggedIn) {
        if (typeof callback === 'function') callback(...args);
        return;
      }
      window.dsLogin.show();  // 弹 URS 登录框，登录成功后页面 reload
      return;
    }
    // 不支持模式：引导回大神 App
    openSquareUrl();
  };
}
/* [DS:CLICK-PRECHECK:END] */

async function initApp() {
  initShare();        // 自己判断环境
  initUlink();        // 自己判断环境（小程序内跳过）
  initWxLaunchMask(); // 自己判断环境（仅安卓微信 + 不支持站外时展示遮罩）
  await initLogin();  // 自己判断环境，小程序未登录则跳转
  // 业务逻辑从此处开始
}
initApp();

/* [DS:EXPORTS:START] */
/**
 *   userInfo      — 当前登录用户信息（{ uid, roleId, ... }），未登录时为 {}
 *   godlikeInfo   — 大神 App 设备/环境信息（{ 'GL-DeviceId', ... }），非 App 内为 {}
 *   withPrecheck  — 统一点击前置检查函数（thunk 模式，返回 async 包装函数，必须作为事件处理器直接绑定）
 *   openSquareUrl — ulink 跳转函数
 *   trackEvent    — NS 日志打点函数
 */

// 挂载到 window：type="module" 下函数不在全局作用域，非模块脚本/HTML 内联需通过 window 访问。
// 注意：withPrecheck 是 thunk，禁止内联 onclick="withPrecheck(fn)"（静默失效），必须用 addEventListener 绑定。
window.userInfo = userInfo;
window.godlikeInfo = godlikeInfo;
window.withPrecheck = withPrecheck;
window.openSquareUrl = openSquareUrl;
window.trackEvent = trackEvent;

export { userInfo, godlikeInfo, withPrecheck, openSquareUrl, trackEvent };
/* [DS:EXPORTS:END] */

/* [DS:NAV-BAR:START] */
// ─── 导航栏组件（DsNavigationMiniProgramBar） ───────────────────────────
// 主题色：'white'（深色背景用白字）| 'black'（浅色背景用黑字）
var NavigationBarTheme = '{NAV_THEME}';
var navInstance = null;

function initNavBar() {
  // UMD export default 兼容处理
  if (window.DsNavigationMiniProgramBar && window.DsNavigationMiniProgramBar.default) {
    window.DsNavigationMiniProgramBar = window.DsNavigationMiniProgramBar.default;
  }
  // 全屏 Webview（导航栏接管系统导航区域）
  window.ds.callHandler('setWebviewFullScreen', { isFullScreen: true });
  navInstance = new DsNavigationMiniProgramBar({
    title: '{NAV_TITLE}',
    hideTitle: {NAV_HIDE_TITLE},
    statusBarStyle: NavigationBarTheme === 'black' ? 'black' : 'white',
    closeClick: () => {
      window.ds.callHandler('closeWindow');
    },
    menuClick: () => {
      window.ds.callHandler('showShareMenu');
    },
    changeVisable: () => {
      window.ds.callHandler('setStatusBar', { color: NavigationBarTheme });
    },
  });
  navInstance.ready().then(() => console.log('[DS NavBar] 导航栏初始化完成，theme=' + NavigationBarTheme));
}

// 切换导航栏主题（供业务层调用，如进入不同场景时切换深/浅色）
function applyNavTheme(theme) {
  NavigationBarTheme = theme;
  window.ds.ready().then(() => {
    window.ds.callHandler('setStatusBar', { color: NavigationBarTheme });
  });
  if (navInstance && typeof navInstance.setTheme === 'function') {
    navInstance.setTheme(theme === 'black' ? 'black' : 'white');
  }
}
/* [DS:NAV-BAR:END] */

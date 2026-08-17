## 1. 环境检测工具函数

- [x] 1.1 在 `ds.js` 顶部新增 `isWechatMiniProgram()` 工具函数：
      ```js
      function isWechatMiniProgram() {
        return navigator.userAgent.toLowerCase().includes('miniprogram');
      }
      ```
- [x] 1.2 手动验证：浏览器控制台覆盖 `navigator.userAgent`，分别用小程序 UA / 普通微信 UA / App UA 确认返回值

## 2. precheck 预检改造

- [x] 2.1 在 `ds.js` 的 `withPrecheck` 函数开头加小程序环境判断：
      ```js
      function withPrecheck(callback) {
        if (isWechatMiniProgram()) {
          if (typeof callback === 'function') callback();
          return;
        }
        // 原有逻辑不变...
      }
      ```
- [x] 2.2 手动回归验证：非小程序环境（普通浏览器）触发 `withPrecheck`，确认 ulink 跳转正常

## 3. 微信 JSSDK 接入

- [x] 3.1 在 `index.html` 的 `<head>` 中注入（须在 `ds.js` 之前）：
      `<script src="https://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>`
- [x] 3.2 微信开发者工具中确认 `wx.miniProgram` API 可用

## 4. URS Cookie 联登接入（按需）

- [x] 4.1 在 `index.html` 注入 universal-login（须在 `ds.js` 之前）：
      CSS: `<link rel="stylesheet" href="https://g.166.net/pkg/universal-login/latest/index.css">`
      JS:  `<script src="https://g.166.net/pkg/universal-login/latest/index.umd.min.js"></script>`
- [x] 4.2 在 `ds.js` 的 `initApp` 中，小程序环境替换原有 `dsInit()` 分支（确认 `initApp` 已声明为 `async`）：
      ```js
      async function initApp() {
        if (isWechatMiniProgram()) {
          // 小程序环境：联登替代 dsInit，跳过 initUlink
          window.dsLogin = new Ulogin({
            env: 'production',
            loginSuccess: () => {},
            loginFail: () => {},
            loginTypeTips: '暂不支持微信、QQ等第三方登录方式',
          });
          const loginResult = await window.dsLogin.hasLoggedIn();
          if (loginResult) {
            userInfo = loginResult;
            window.userInfo = userInfo;
          } else {
            wx.miniProgram.navigateTo({ url: '/pages/login/index' });
            return; // 终止，不继续渲染
          }
          initShare(); // 若接入了分享则调用
          // ↓ 小程序环境业务逻辑从此处开始
        } else {
          await dsInit(); // 原有 App 内初始化
          initShare();
          initUlink();
          // ↓ 非小程序环境业务逻辑从此处开始
        }
      }
      ```
## 5. 小程序分享（按需）

- [x] 5.1 在 `ds.js` 的 `initShare` 中新增小程序环境分支，调用 `wx.miniProgram.postMessage` 设置分享配置：
      ```js
      function initShare() {
        if (isWechatMiniProgram()) {
          wx.miniProgram.postMessage({
            data: {
              pageId: window.location.pathname,  // 去掉 query/hash，用 pathname 作页面唯一标识
              shareConfig: {
                title: SHARE_TITLE,
                imageUrl: SHARE_ICON,  // 宽高比 5:4，可传空字符串使用小程序默认截图
                url: window.location.href,
              }
            }
          });
          return;
        }
        // 原有 Godlike / MobileShare 逻辑不变...
      }
      ```
- [x] 5.2 验证：微信开发者工具中触发分享，确认标题和图片正确

## 6. 集成验证

- [x] 6.1 微信开发者工具 webview 模式：验证 precheck 不触发 ulink 跳转
- [x] 6.2 （接入联登时）验证联登成功：小程序已登录后打开 H5，确认 H5 处于已登录态，`userInfo.uid` 有值
- [x] 6.3 （接入联登时）验证联登失败：小程序未登录打开 H5，确认跳转到小程序登录页
- [x] 6.4 （接入分享时）验证分享：小程序内触发分享，标题/图片与配置一致
- [x] 6.5 验证非小程序环境（普通浏览器、App WebView）行为不变

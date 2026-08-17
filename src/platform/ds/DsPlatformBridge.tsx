import { useEffect } from 'react';
import { dsPlatformEnabled } from './config';
import { initDsPlatform, isWechatMiniProgram } from './runtime';

export function DsPlatformBridge() {
  useEffect(() => {
    // 小程序布局类独立应用（不受 dsPlatformEnabled 限制），
    // 这样本地 ?mp=1 预览也能看到小程序顶部安全区适配。
    if (isWechatMiniProgram()) {
      document.documentElement.classList.add('is-wx-miniprogram');
    }
    // 大神 App 内挂载 ds 导航栏，顶部安全区需叠加导航栏高度（见 index.css is-godlike 规则）。
    // isGodlike 由原生 WebView 在页面加载前注入，可同步读取。
    if (dsPlatformEnabled && window.ds?.isGodlike) {
      document.documentElement.classList.add('is-godlike');
    }
    void initDsPlatform();
  }, []);

  return <div id="ds-task-root" />;
}

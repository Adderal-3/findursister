import { useEffect } from 'react';
import { initDsPlatform, isWechatMiniProgram } from './runtime';

export function DsPlatformBridge() {
  useEffect(() => {
    // 小程序布局类独立应用（不受 dsPlatformEnabled 限制），
    // 这样本地 ?mp=1 预览也能看到小程序顶部安全区适配。
    if (isWechatMiniProgram()) {
      document.documentElement.classList.add('is-wx-miniprogram');
    }
    void initDsPlatform();
  }, []);

  return <div id="ds-task-root" />;
}

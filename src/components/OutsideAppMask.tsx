import { dsConfig, dsPlatformEnabled } from '../platform/ds/config';
import { isWechatMiniProgram, openSquareUrl } from '../platform/ds/runtime';

/**
 * 站外拦截遮罩：检测到不在大神 App 内且不是小程序时覆盖全屏，点击任意处唤起大神 App。
 * 大神 App 内（isGodlike）或微信小程序内不渲染，游戏正常运行。
 *
 * dsUlink 异步加载，点击时若 SDK 还未就绪则用直连 URL 兜底。
 */
export function OutsideAppMask() {
  // isGodlike 由大神 App 原生 WebView 注入，页面加载前已存在，可同步读取。
  // 微信小程序也正常游玩，不拦截。
  const show = dsPlatformEnabled && !window.ds?.isGodlike && !isWechatMiniProgram();

  if (!show) return null;

  const handleClick = () => {
    if (window.dsUlink) {
      // SDK 已就绪：走正常唤端（含来源追踪）
      openSquareUrl();
    } else {
      // SDK 尚未初始化（用户点得很快）：直连 Ulink 落地 URL 兜底
      const squareId = dsConfig.squareId;
      const url = encodeURIComponent(window.location.href);
      window.location.href =
        `https://app.16163.com/ds/ulinks/?action=circle&squareId=${encodeURIComponent(squareId)}&url=${url}`;
    }
  };

  return (
    /* 覆盖所有内容，吞掉一切点击 */
    <div
      role="button"
      tabIndex={0}
      aria-label="点击在大神 App 内游玩"
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className="fixed inset-0 z-[9999] flex cursor-pointer select-none flex-col items-center justify-center"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* 模糊遮罩 */}
      <div className="absolute inset-0 bg-[#2a1a0e]/72 backdrop-blur-sm" />

      {/* 内容卡片 */}
      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <div className="rounded-3xl bg-[#fff8e8]/96 px-8 py-7 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
          <p className="font-display text-2xl font-black tracking-wide text-[#5d3b2a]">
            忙忙碌碌寻宝藏
          </p>
          <p className="mt-1.5 text-sm font-bold text-[#9a7558]">
            挑战眼力值，寻找汴京珍宝
          </p>

          <div className="mt-5 rounded-2xl bg-[#c86c3a] px-7 py-3.5 shadow-md active:scale-95">
            <span className="font-display text-sm font-black tracking-wider text-white">
              点击任意处 · 在大神 App 内游玩
            </span>
          </div>

          <p className="mt-3 text-[11px] text-[#b09070]">
            请在大神 App 中获得完整游戏体验
          </p>
        </div>
      </div>
    </div>
  );
}

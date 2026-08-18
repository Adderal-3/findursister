import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Film, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { TIME_BOOST_SECONDS, type Game } from '../hooks/useGame';
import {
  VIDEO_REWARD_WATCH_MS,
  nextVideoRewardSource,
  randomVideoRewardSource,
} from '../game/videoRewards';

/** 有效观看采样间隔。 */
const SAMPLE_MS = 200;
/** 两次采样墙钟间隔超过 1s 视为被系统节流挂起，这段时间不计入（防白嫖）。 */
const MAX_WALL_GAP_MS = 1000;
const TOTAL_SEC = VIDEO_REWARD_WATCH_MS / 1000;

type VideoRewardKind = 'boost' | 'revive';

/**
 * 任务视频弹窗：从 VOD 源随机选片，前端采样校验
 * 「前台 + 正常 1× 播放满 30 秒」后回调 useGame 的收口入口统一发奖。
 * - 对局中加时（boost）：满 30s → +30 秒；
 * - 失败复活（revive）：满 30s → +30 秒原地继续。
 */
export function VideoRewardDialog({ game }: { game: Game }) {
  const session = game.videoReward;
  if (!session) return null;
  // 每个会话（含同一种 kind 重开）用 key 重挂载，进度与选片全部从新会话初始值开始。
  return <VideoRewardSession key={session.id} game={game} kind={session.kind} />;
}

function VideoRewardSession({ game, kind }: { game: Game; kind: VideoRewardKind }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** 已累计的有效观看时长（毫秒），只有采样校验全过才会增加。 */
  const watchedRef = useRef(0);
  const lastTickRef = useRef(0);
  const verifiedRef = useRef(false);
  const [source, setSource] = useState<string>(randomVideoRewardSource);
  const [watchedSec, setWatchedSec] = useState(0);
  const [error, setError] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [muted, setMuted] = useState(false);
  const [verified, setVerified] = useState(false);

  const completeRewardRef = useRef(game.completeVideoReward);
  const reportErrorRef = useRef(game.reportVideoRewardError);
  useEffect(() => {
    completeRewardRef.current = game.completeVideoReward;
    reportErrorRef.current = game.reportVideoRewardError;
  });

  // 自动播放：优先带声音，被自动播放策略拒绝时静音重播，并给出「开启声音」入口。
  useEffect(() => {
    if (error) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    const attempt = video.play();
    if (attempt) {
      attempt.catch(() => {
        if (video.muted) return;
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
    }
  }, [source, error, muted]);

  // 有效观看判定：每 200ms 采样一次，播放中 + 前台 + 已缓冲 + 未拖动 + 1× 倍速才累计。
  useEffect(() => {
    if (error) return;
    lastTickRef.current = Date.now();
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || verifiedRef.current) return;
      const now = Date.now();
      const wall = now - lastTickRef.current;
      lastTickRef.current = now;
      if (wall > MAX_WALL_GAP_MS) return;
      if (document.visibilityState !== 'visible') return;
      if (video.paused || video.ended || video.seeking) return;
      if (video.readyState < 2) return;
      if (video.playbackRate !== 1) return;
      watchedRef.current = Math.min(VIDEO_REWARD_WATCH_MS, watchedRef.current + wall);
      const sec = Math.floor(watchedRef.current / 1000);
      setWatchedSec((current) => (current === sec ? current : sec));
      if (watchedRef.current >= VIDEO_REWARD_WATCH_MS) {
        verifiedRef.current = true;
        setVerified(true);
        completeRewardRef.current(watchedRef.current);
      }
    }, SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [error]);

  // 切后台始终暂停；回前台且未确认退出时继续播。30s 发奖后也遵循该规则，避免后台持续播放声音。
  useEffect(() => {
    const onVisibilityChange = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
      } else if (!exitConfirm && !error) {
        video.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [error, exitConfirm]);

  // 组件卸载（会话被外部关闭）时确保视频停下来。
  useEffect(() => () => {
    videoRef.current?.pause();
  }, []);

  const remainingSec = Math.max(0, TOTAL_SEC - watchedSec);
  const progress = Math.min(1, watchedSec / TOTAL_SEC);
  const title = kind === 'revive' ? '视频连播 · 原地复活' : '视频连播 · 任务加时';

  const switchSource = () => {
    setError(false);
    setSource((current) => nextVideoRewardSource(current));
  };

  const requestClose = () => {
    if (verifiedRef.current) {
      game.closeVideoReward('complete', watchedRef.current);
      return;
    }
    videoRef.current?.pause();
    setExitConfirm(true);
  };

  const resumeWatching = () => {
    setExitConfirm(false);
    videoRef.current?.play().catch(() => {});
  };

  const abandon = () => {
    game.closeVideoReward('abandon', watchedRef.current);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[2000] overflow-hidden bg-black"
      role="dialog"
      aria-label={title}
    >
      <video
        ref={videoRef}
        src={source}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
        onContextMenu={(event) => event.preventDefault()}
        onEnded={switchSource}
        onError={() => {
          setError(true);
          reportErrorRef.current();
        }}
        onRateChange={() => {
          const video = videoRef.current;
          if (video && video.playbackRate !== 1) video.playbackRate = 1;
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/82 via-black/36 to-transparent" />
      <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="flex min-w-0 items-center gap-2 text-white drop-shadow-lg">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/18 bg-black/38 backdrop-blur-md">
            <Film className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-black tracking-wide">{title}</p>
            <p className="text-[10px] font-bold text-white/72">播完自动切换下一条</p>
          </div>
        </div>
        <button
          type="button"
          onClick={requestClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/18 bg-black/42 text-white shadow-lg backdrop-blur-md transition active:scale-95"
          aria-label="关闭视频"
        >
          <X className="h-5 w-5" strokeWidth={2.6} />
        </button>
      </header>

      {muted && !error && (
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = false;
            setMuted(false);
          }}
          className="absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] flex h-11 items-center gap-2 rounded-full border border-white/18 bg-black/48 px-4 text-xs font-black text-white shadow-lg backdrop-blur-md transition active:scale-95"
          aria-label="开启声音"
        >
          <VolumeX className="h-4 w-4" strokeWidth={2.4} /> 开启声音
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/92 via-black/62 to-transparent" />
      <div className="absolute inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+18px)] rounded-2xl border border-white/14 bg-black/46 px-4 py-3 text-white shadow-2xl backdrop-blur-md">
        <div className="h-2 overflow-hidden rounded-full bg-white/18">
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${verified ? 'bg-[#8ed9a7]' : 'bg-[#f0b36b]'}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          {verified ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#9de4b2]" />
          ) : (
            <Volume2 className="h-5 w-5 shrink-0 text-[#f5c384]" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-black">
              {error
                ? '网络不给力，可换一个视频，观看进度会保留'
                : verified
                  ? `奖励已到账 · +${TIME_BOOST_SECONDS} 秒${kind === 'revive' ? '复活' : '加时'}`
                  : `再有效观看 ${remainingSec} 秒，即可获得 +${TIME_BOOST_SECONDS} 秒${kind === 'revive' ? '复活' : '加时'}`}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-white/62">
              {verified
                ? '视频将继续连播，你可以随时关闭返回游戏'
                : '切出页面、暂停或拖动进度都不计时'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/82 p-8 text-center backdrop-blur-sm">
          <div className="text-base font-black text-[#ffd9a8]">视频加载失败</div>
          <button
            type="button"
            onClick={switchSource}
            className="qingya-crisp-action flex min-h-11 items-center justify-center gap-2 px-6 py-2 font-display text-sm font-black text-[#fff9dc]"
          >
            <RotateCcw className="h-4 w-4" /> 换一个视频重试
          </button>
        </div>
      )}

      {exitConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/82 p-5 backdrop-blur-md">
          <div className="qingya-menu-panel qingya-menu-panel--solid w-full max-w-sm p-5 text-center shadow-2xl">
            <div className="font-display text-xl font-black text-[#6e402d]">现在退出拿不到奖励</div>
            <div className="mt-2 text-sm leading-6 text-[#806f60]">
              已有效观看 {watchedSec} 秒，再看 {remainingSec} 秒即可领奖。
            </div>
            <button
              type="button"
              onClick={resumeWatching}
              className="qingya-crisp-action mt-4 flex min-h-11 w-full items-center justify-center px-5 py-2 font-display text-sm font-black text-[#fff9dc]"
            >
              继续观看
            </button>
            <button
              type="button"
              onClick={abandon}
              className="mt-2 min-h-10 px-4 py-2 text-xs font-bold text-[#9a7f67] transition active:scale-95"
            >
              放弃奖励并退出
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

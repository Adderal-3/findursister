import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Film, RotateCcw, VolumeX, X } from 'lucide-react';
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
        completeRewardRef.current(watchedRef.current);
      }
    }, SAMPLE_MS);
    return () => window.clearInterval(timer);
  }, [error]);

  // 切后台不计时并暂停播放；回前台且未看满、未确认退出时继续播。
  useEffect(() => {
    const onVisibilityChange = () => {
      const video = videoRef.current;
      if (!video || verifiedRef.current) return;
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
  const title = kind === 'revive' ? '看视频 · 原地复活' : '看视频 · 任务加时';

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
      className="absolute inset-0 z-[1600] flex items-center justify-center bg-[#2b1b13]/78 p-4 backdrop-blur-md"
      role="dialog"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.9, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="qingya-menu-panel relative w-full max-w-sm overflow-hidden p-4 text-center shadow-2xl"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-display text-lg font-black text-[#5d3b2a]">
            <Film className="h-5 w-5 text-[#a86b42]" /> {title}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="qingya-round-button flex h-8 w-8 items-center justify-center text-[#744b31] transition active:scale-95"
            aria-label="关闭视频"
          >
            <X className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-black shadow-inner">
          <video
            ref={videoRef}
            src={source}
            className="aspect-video w-full"
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
          {muted && !error && (
            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                video.muted = false;
                setMuted(false);
              }}
              className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white transition active:scale-95"
              aria-label="开启声音"
            >
              <VolumeX className="h-4 w-4" strokeWidth={2.4} />
            </button>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#2b1b13]/85 p-4">
              <div className="text-sm font-bold text-[#ffd9a8]">视频加载失败</div>
              <button
                type="button"
                onClick={switchSource}
                className="qingya-crisp-action flex min-h-10 items-center justify-center gap-1.5 px-5 py-2 font-display text-sm font-black text-[#fff9dc]"
              >
                <RotateCcw className="h-4 w-4" /> 换一个视频重试
              </button>
            </div>
          )}
          {exitConfirm && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#2b1b13]/88 p-4">
              <div className="text-sm font-black text-[#ffd9a8]">现在退出拿不到奖励</div>
              <div className="mb-1 text-xs leading-5 text-[#e8d5bd]">
                已有效观看 {watchedSec} 秒，再看 {remainingSec} 秒即可领奖。
              </div>
              <button
                type="button"
                onClick={resumeWatching}
                className="qingya-crisp-action flex min-h-10 w-full items-center justify-center gap-1.5 px-5 py-2 font-display text-sm font-black text-[#fff9dc]"
              >
                继续观看
              </button>
              <button
                type="button"
                onClick={abandon}
                className="min-h-9 px-4 py-1.5 text-xs font-bold text-[#d8c0a8] transition active:scale-95"
              >
                放弃奖励并退出
              </button>
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-[#e3d3ba]">
            <div
              className="h-full rounded-full bg-[#c27a49] transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs font-black text-[#8b7562]">
            {error
              ? '网络不给力，可换一只视频，进度保留'
              : `再有效观看 ${remainingSec} 秒，即可获得 +${TIME_BOOST_SECONDS} 秒${kind === 'revive' ? ' 复活' : ' 加时'}`}
          </div>
          <div className="mt-0.5 text-[10px] leading-4 text-[#a5907a]">
            切出页面、暂停或拖动进度都不计时
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

import {
  ArrowLeft, Clock3, Gift, Lightbulb, Pause, TimerReset, Volume2, VolumeX,
} from 'lucide-react';
import type { Game } from '../hooks/useGame';

export function Hud({ game }: { game: Game }) {
  const urgent = game.timeLeft <= 10;
  const seconds = Math.max(0, Math.ceil(game.timeLeft));
  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const levelLabel = game.mode === 'levels'
    ? `第${game.level}关`
    : `第${game.level}波`;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-1/2 top-[var(--safe-top)] grid h-12 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 sm:w-[calc(100%-2.5rem)]">
        <button
          type="button"
          onClick={game.requestQuit}
          className="qingya-round-button pointer-events-auto flex h-11 w-11 items-center justify-center text-[#744b31] transition active:scale-95 sm:h-12 sm:w-12"
          title="返回主菜单"
          aria-label="返回主菜单"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
        </button>

        <div className="qingya-level-plaque relative mx-auto flex h-12 w-full max-w-[18rem] min-w-0 flex-col items-center justify-center px-4 text-center">
          <span className="font-display truncate text-sm font-black leading-none tracking-[0.06em] text-[#fff9dc] drop-shadow-sm sm:text-base">
            {levelLabel}
          </span>
          <span className={`mt-1 flex max-w-full items-center justify-center gap-1.5 truncate text-[10px] font-black leading-none tabular-nums sm:text-[11px] ${
            urgent ? 'animate-pulse text-[#ffcaad]' : 'text-[#ffe5a8]'
          }`}>
            <Clock3 className="h-3 w-3 shrink-0" strokeWidth={2.4} />
            {timeLabel}
            <span className="opacity-60">·</span>
            {game.mode === 'levels' ? '本关' : '本局'} {Math.round(game.roundScore).toLocaleString('zh-CN')} 分
          </span>
        </div>

        <button
          type="button"
          onClick={() => game.setPaused(true)}
          className="qingya-round-button pointer-events-auto flex h-11 w-11 items-center justify-center justify-self-end text-[#744b31] transition active:scale-95 sm:h-12 sm:w-12"
          title="暂停"
          aria-label="暂停游戏"
        >
          <Pause className="h-5 w-5 fill-current" strokeWidth={2.4} />
        </button>
      </div>

      <div className="pointer-events-auto absolute bottom-[calc(var(--safe-bottom)+0.4rem)] left-3 flex items-end gap-2 sm:left-5">
        <button
          type="button"
          onClick={game.requestTimeBoost}
          className="group flex flex-col items-center text-[#744b31] transition active:scale-95"
          title={game.timeBoostFreeAvailable
            ? '本关首次免费加时 30 秒'
            : game.skillBoosts > 0
              ? `消耗加时技能（剩余 ${game.skillBoosts} 个），加时 30 秒`
              : '前往任务视频流获取加时'}
          aria-label={game.timeBoostFreeAvailable
            ? '免费加时30秒'
            : game.skillBoosts > 0
              ? `加时技能，剩余${game.skillBoosts}个`
              : '任务视频加时30秒'}
        >
          <span className="qingya-round-button relative flex h-16 w-16 items-center justify-center">
            {game.timeBoostFreeAvailable ? (
              <Gift className="h-6 w-6" strokeWidth={2.2} />
            ) : (
              <TimerReset className="h-6 w-6" strokeWidth={2.2} />
            )}
            <span className="absolute top-0 right-0 flex h-5 min-w-8 items-center justify-center rounded-full border border-[#fff7d9] bg-[#c56f43] px-1 text-[9px] font-black text-white shadow-sm">
              {game.timeBoostFreeAvailable || game.skillBoosts <= 0 ? '+30s' : `×${game.skillBoosts}`}
            </span>
          </span>
          <span className="qingya-action-label">
            {game.timeBoostFreeAvailable
              ? '首次赠送'
              : game.skillBoosts > 0
                ? '加时技能'
                : '任务加时'}
          </span>
        </button>

        <button
          type="button"
          onClick={game.toggleMuted}
          className="group flex flex-col items-center text-[#744b31] transition active:scale-95"
          title={game.muted ? '开启声音' : '静音'}
          aria-label={game.muted ? '开启声音' : '静音'}
          aria-pressed={game.muted}
        >
          <span className="qingya-round-button relative flex h-16 w-16 items-center justify-center">
            {game.muted
              ? <VolumeX className="h-6 w-6" strokeWidth={2.4} />
              : <Volume2 className="h-6 w-6" strokeWidth={2.4} />}
          </span>
          <span className="qingya-action-label">
            {game.muted ? '已静音' : '声音'}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={game.useHint}
        disabled={game.hintsLeft <= 0 && game.skillHints <= 0}
        className={`pointer-events-auto absolute right-3 bottom-[calc(var(--safe-bottom)+0.4rem)] transition active:scale-95 sm:right-5 ${game.hintsLeft > 0 || game.skillHints > 0 ? 'text-[#744b31]' : 'cursor-not-allowed grayscale opacity-55'}`}
        title="提示道具"
        aria-label={`提示道具，免费剩余 ${game.hintsLeft} 次，技能剩余 ${game.skillHints} 个`}
      >
        <span className="qingya-round-button relative flex h-16 w-16 items-center justify-center">
          <Lightbulb
            className={`h-7 w-7 ${game.hintsLeft > 0 || game.skillHints > 0 ? 'animate-pulse' : ''}`}
            strokeWidth={2.1}
          />
          <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#fff7d9] bg-[#9a673d] px-1 text-[11px] font-black text-white shadow-sm">
            {game.hintsLeft + game.skillHints}
          </span>
        </span>
      </button>
    </div>
  );
}

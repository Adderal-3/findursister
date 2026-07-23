import { ArrowLeft, Clock3, Lightbulb, Pause } from 'lucide-react';
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
      <div className="absolute left-1/2 top-[var(--safe-top)] grid h-12 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 grid-cols-[2.75rem_4.9rem_minmax(0,1fr)_2.75rem] items-center gap-1.5 sm:w-[calc(100%-2.5rem)] sm:grid-cols-[3rem_6.2rem_minmax(12rem,1fr)_3rem] sm:gap-2">
        <button
          type="button"
          onClick={game.requestQuit}
          className="qingya-round-button pointer-events-auto flex h-11 w-11 items-center justify-center text-[#744b31] transition active:scale-95 sm:h-12 sm:w-12"
          title="返回主菜单"
          aria-label="返回主菜单"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
        </button>

        <div className={`qingya-pill flex h-9 min-w-0 items-center justify-center gap-1.5 px-2 text-[13px] font-black tabular-nums sm:text-base ${urgent ? 'animate-pulse text-[#b94b3d]' : 'text-[#6d4a34]'}`}>
          <Clock3 className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          <span>{timeLabel}</span>
        </div>

        <div className="qingya-level-plaque relative flex h-12 min-w-0 items-center justify-center px-3 text-center">
          <span className="font-display truncate text-[12px] font-black tracking-[0.03em] text-[#fff9dc] drop-shadow-sm sm:text-lg">
            {levelLabel}
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

      <button
        type="button"
        onClick={game.useHint}
        disabled={game.hintsLeft <= 0}
        className={`pointer-events-auto absolute right-3 bottom-[calc(var(--safe-bottom)+0.4rem)] transition active:scale-95 sm:right-5 ${game.hintsLeft > 0 ? 'text-[#744b31]' : 'cursor-not-allowed grayscale opacity-55'}`}
        title="提示道具"
        aria-label={`提示道具，剩余 ${game.hintsLeft} 次`}
      >
        <span className="qingya-round-button relative flex h-16 w-16 items-center justify-center">
          <Lightbulb className={`h-7 w-7 ${game.hintsLeft > 0 ? 'animate-pulse' : ''}`} strokeWidth={2.1} />
          <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#fff7d9] bg-[#9a673d] px-1 text-[11px] font-black text-white shadow-sm">
            {game.hintsLeft}
          </span>
        </span>
      </button>
    </div>
  );
}

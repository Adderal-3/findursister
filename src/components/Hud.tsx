import {
  ArrowLeft, Clock3, Gift, Lightbulb, Pause, TimerReset, Volume2, VolumeX,
} from 'lucide-react';
import imgHomeTaskIcon from '../assets/ui/home/home-task-icon-v2.png';
import type { Game } from '../hooks/useGame';
import { dsTaskPanelEnabled } from '../platform/ds/config';
import { TargetBar } from './TargetBar';

const compactNumberFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function Hud({ game }: { game: Game }) {
  const urgent = game.timeLeft <= 10;
  const seconds = Math.max(0, Math.ceil(game.timeLeft));
  const timeLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const levelLabel = game.mode === 'levels'
    ? `第${game.level}关`
    : `第${game.level}波`;
  const scoreLabel = compactNumberFormatter.format(Math.round(game.roundScore));

  return (
    <>
      {/*
        顶部 HUD 区：占据正常文档流（flex 子项），棋盘从它下方才开始，
        任务相框与棋盘物理分离，不再压叠任何场景素材。
      */}
      <header className="relative z-30 w-full shrink-0 bg-[#efe5cf] px-3 pt-[calc(var(--safe-top)+0.3rem)] pb-2 shadow-[0_14px_26px_-16px_rgba(96,66,38,0.4)] sm:px-5">
        <div className="mx-auto grid h-12 w-full max-w-3xl grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
          <button
            type="button"
            onClick={game.requestQuit}
            className="qingya-round-button pointer-events-auto flex h-11 w-11 items-center justify-center text-[#744b31] transition active:scale-95 sm:h-12 sm:w-12"
            title="返回主菜单"
            aria-label="返回主菜单"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>

          <div className="qingya-level-plaque relative mx-auto flex h-12 w-full max-w-[18rem] min-w-0 flex-col items-center justify-center px-12 text-center">
            <div className="flex w-full min-w-0 items-center justify-center gap-1.5 text-[9px] font-black leading-none text-[#f0d49d] sm:text-[10px]">
              <span className="max-w-[45%] truncate font-display tracking-[0.06em] text-[#fff1c5] drop-shadow-sm">
                {levelLabel}
              </span>
              <span className="shrink-0 opacity-50">·</span>
              <span className="max-w-[55%] truncate tabular-nums">
                {game.mode === 'levels' ? '本关' : '本局'} {scoreLabel} 分
              </span>
            </div>

            <time
              dateTime={`PT${seconds}S`}
              aria-label={`剩余时间 ${timeLabel}`}
              className={`mt-0.5 flex min-w-[6.5rem] items-center justify-center gap-1.5 rounded-full border px-3 py-0.5 shadow-[0_2px_8px_rgba(42,22,10,0.28)] ${
                urgent
                  ? 'animate-pulse border-[#ffe0a4] bg-[#a94432] text-[#fff8dc]'
                  : 'border-[#fff4c8] bg-[#fff0bd]/95 text-[#673822]'
              }`}
            >
              <Clock3 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.7} />
              <span className="font-display text-lg font-black leading-none tracking-[0.06em] tabular-nums sm:text-xl">
                {timeLabel}
              </span>
            </time>
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

        {/* 任务相框整体不响应指针：完成提示 toast 会溢出到棋盘顶部，不能吞掉点按 */}
        <div className="pointer-events-none mx-auto mt-1.5 w-full max-w-3xl">
          <TargetBar
            targets={game.allTargets}
            activeIndex={game.activeGoalIndex}
            notice={game.goalNotice}
            timeBoostToast={game.timeBoostToast}
          />
        </div>
      </header>

      {dsTaskPanelEnabled && game.phase === 'playing' && (
        <button
          type="button"
          onClick={game.openInGameTaskPanel}
          className="pointer-events-auto absolute right-1 z-40 flex w-[3.6rem] flex-col items-center transition active:scale-95 [top:calc(var(--safe-top)+7.65rem)]"
          aria-label="暂停并打开大神任务面板"
          title="大神任务"
        >
          <img
            src={imgHomeTaskIcon}
            alt=""
            aria-hidden="true"
            className="h-[3.35rem] w-[3.35rem] object-contain drop-shadow-[0_7px_9px_rgba(87,49,28,.24)]"
          />
          <span className="-mt-1 rounded-full border border-[#f6d7a7] bg-[#fff7dc]/95 px-1.5 py-0.5 font-display text-[8px] font-black tracking-wide text-[#8c3f28] shadow">
            大神任务
          </span>
        </button>
      )}

      {/* 底部操作区：加时 + 提示 居左成组，静音单独钉在最右（悬浮于棋盘底部）。
          三个按钮共用同一容器与同一 label 样式，圆钮与文字基线天然对齐。 */}
      <div className="pointer-events-none absolute inset-x-3 bottom-[calc(var(--safe-bottom)+0.4rem)] z-20 flex items-end justify-between sm:inset-x-5">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={game.requestTimeBoost}
            className="group pointer-events-auto flex flex-col items-center text-[#744b31] transition active:scale-95"
            title={game.timeBoostFreeAvailable
              ? `${game.mode === 'endless' ? '本局' : '本关'}首次免费加时 30 秒`
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
            onClick={game.useHint}
            disabled={game.hintsLeft <= 0 && game.skillHints <= 0}
            className={`group pointer-events-auto flex flex-col items-center transition active:scale-95 ${game.hintsLeft > 0 || game.skillHints > 0 ? 'text-[#744b31]' : 'cursor-not-allowed grayscale opacity-55'}`}
            title="提示道具"
            aria-label={`提示道具，免费剩余 ${game.hintsLeft} 次，技能剩余 ${game.skillHints} 个`}
          >
            <span className="qingya-round-button relative flex h-16 w-16 items-center justify-center">
              <Lightbulb
                className={`h-6 w-6 ${game.hintsLeft > 0 || game.skillHints > 0 ? 'animate-pulse' : ''}`}
                strokeWidth={2.2}
              />
              <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full border border-[#fff7d9] bg-[#9a673d] px-1 text-[11px] font-black text-white shadow-sm">
                {game.hintsLeft + game.skillHints}
              </span>
            </span>
            <span className="qingya-action-label">提示</span>
          </button>
        </div>

        <button
          type="button"
          onClick={game.toggleMuted}
          className="group pointer-events-auto flex flex-col items-center text-[#744b31] transition active:scale-95"
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
    </>
  );
}

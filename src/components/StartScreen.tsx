import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import bgHomeSpring from '../assets/backgrounds/home-courtyard-spring-v1.webp';
import imgHomeRoundButton from '../assets/ui/home/home-round-button-v1.png';
import imgHomeLogo from '../assets/ui/home/home-logo-v1.png';
import imgHomeTaskTag from '../assets/ui/home/home-task-tag-v1.png';
import {
  CircleUserRound, ClipboardList, Compass, Eye, Infinity as InfinityIcon,
  ListOrdered, LoaderCircle, Trophy, UsersRound, X,
} from 'lucide-react';
import { unlockAudio } from '../game/sound';
import type { Game } from '../hooks/useGame';
import { dsRoleBindingEnabled, dsTaskPanelEnabled } from '../platform/ds/config';
import {
  loadDsLeaderboard, type DsLeaderboardSnapshot, type LeaderboardScope,
} from '../platform/ds/leaderboard';
import { mountRoleModule, openTaskPanel, withPrecheck } from '../platform/ds/runtime';
import { HomePanelRouter } from './HomePanels';

type HomePanel = 'partners' | 'levels' | null;

type RankingState =
  | { status: 'loading' }
  | { status: 'ok'; data: DsLeaderboardSnapshot }
  | { status: 'error'; message: string };

function RankingPanel({ onClose }: { onClose: () => void }) {
  const [scope, setScope] = useState<LeaderboardScope>('daily');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [state, setState] = useState<RankingState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadDsLeaderboard(scope)
      .then((data) => { if (!cancelled) setState({ status: 'ok', data }); })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setState({ status: 'error', message });
      });
    return () => { cancelled = true; };
  }, [scope, reloadNonce]);

  const changeScope = (nextScope: LeaderboardScope) => {
    if (nextScope === scope) return;
    setState({ status: 'loading' });
    setScope(nextScope);
  };

  const reload = () => {
    setState({ status: 'loading' });
    setReloadNonce((nonce) => nonce + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1600] flex items-center justify-center bg-[#403028]/55 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ranking-title"
        initial={{ y: 22, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 22, scale: 0.96 }}
        className="qingya-menu-panel max-h-[86dvh] w-full max-w-sm overflow-hidden p-5 shadow-[0_24px_70px_rgba(76,50,35,.3)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="home-icon-disc flex h-11 w-11 items-center justify-center text-[#39766c]">
              <ListOrdered className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-black tracking-[0.25em] text-[#d07a47]">
                {scope === 'daily' ? '今日眼力争锋' : '长期成长记录'}
              </p>
              <h2 id="ranking-title" className="font-display text-2xl font-black text-[#5d3b2a]">
                寻踪榜
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="home-icon-disc flex h-10 w-10 items-center justify-center text-[#795035] transition active:scale-95"
            aria-label="关闭排行榜"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#eadcc5]/55 p-1.5">
          {([
            ['daily', '日榜'],
            ['total', '总榜'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeScope(value)}
              className={`min-h-10 rounded-xl font-display text-sm font-black transition ${
                scope === value
                  ? 'bg-[#fffaf0] text-[#4d746c] shadow-sm'
                  : 'text-[#8f745f]'
              }`}
              aria-pressed={scope === value}
            >
              {label}
            </button>
          ))}
        </div>

        {state.status === 'loading' ? (
          <div className="flex h-44 items-center justify-center text-[#8b755f]">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : state.status === 'error' ? (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-[#d98b6a]/45 bg-[#fdeee6]/90 px-5 py-8 text-center">
            <p className="text-sm font-black text-[#b0472e]">榜单加载失败</p>
            <p className="text-[11px] font-bold leading-5 text-[#9a6b52]">{state.message}</p>
            <button
              type="button"
              onClick={reload}
              className="mt-1 rounded-full bg-[#c86c3a] px-5 py-2 text-xs font-black text-white active:scale-95"
            >
              重新加载
            </button>
          </div>
        ) : (
          <div className="mt-5 max-h-[52dvh] space-y-2 overflow-y-auto pr-1">
            {state.data.records.map((record) => (
              <div
                key={`${record.rank}-${record.uid}`}
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/58 px-3 py-2.5 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e28b50] text-xs font-black text-white">
                  {record.rank}
                </span>
                {record.icon ? (
                  <img src={record.icon} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <CircleUserRound className="h-8 w-8 text-[#9b795b]" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-black text-[#315f5a]">{record.nick}</span>
                <span className="font-display text-base font-black tabular-nums text-[#b86d3f]">
                  {record.score.toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
            {!state.data.records.length && (
              <p className="py-12 text-center text-sm font-bold text-[#8b755f]">暂时还没有上榜玩家</p>
            )}
            {state.data.self && (
              <div className="sticky bottom-0 mt-3 flex items-center gap-3 rounded-2xl border border-[#b9895f]/35 bg-[#fff7dc]/95 px-4 py-3 shadow-lg">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#9a673d] text-xs font-black text-white">
                  {state.data.self.rank}
                </span>
                {state.data.self.icon ? (
                  <img src={state.data.self.icon} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <CircleUserRound className="h-8 w-8 text-[#9b795b]" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-black text-[#694832]">
                  {state.data.self.nick}（我）
                </span>
                <span className="font-display font-black text-[#b86d3f]">
                  {state.data.self.score.toLocaleString('zh-CN')}
                </span>
              </div>
            )}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

function HomeRoundAction({
  label,
  icon: Icon,
  onClick,
  badge,
}: {
  label: string;
  icon: typeof Trophy;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2, scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative flex h-[4.45rem] w-[4.45rem] shrink-0 flex-col items-center justify-center text-[#584033]"
      aria-label={label}
    >
      <img
        src={imgHomeRoundButton}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(88,55,36,.18)]"
      />
      <Icon className="relative z-10 h-4.5 w-4.5" strokeWidth={2.3} />
      <span className="relative z-10 mt-0.5 font-display text-[11px] font-black">{label}</span>
      {badge && (
        <span className="absolute top-0 right-0 z-20 min-w-5 rounded-full border border-white bg-[#ee8050] px-1 py-0.5 text-[8px] font-black text-white shadow">
          {badge}
        </span>
      )}
    </motion.button>
  );
}

export function StartScreen({ game }: { game: Game }) {
  const [showRanking, setShowRanking] = useState(false);
  const [panel, setPanel] = useState<HomePanel>(null);
  const [taskToast, setTaskToast] = useState<string | null>(null);
  const recoveryLabel = game.stamina.nextRecoverySec == null
    ? '已满'
    : `${String(Math.floor(game.stamina.nextRecoverySec / 60)).padStart(2, '0')}:${String(game.stamina.nextRecoverySec % 60).padStart(2, '0')}`;

  useEffect(() => mountRoleModule(), []);

  useEffect(() => {
    if (!taskToast) return;
    const timer = setTimeout(() => setTaskToast(null), 3200);
    return () => clearTimeout(timer);
  }, [taskToast]);

  const handleOpenTask = () => {
    const failReason = openTaskPanel();
    if (failReason) setTaskToast(failReason);
  };

  const start = (mode: 'levels' | 'endless', level?: number) => {
    unlockAudio();
    setPanel(null);
    game.startGame(mode, mode === 'levels' ? level ?? game.unlockedMaxLevel : undefined);
  };

  return (
    <div
      className="qingya-shell relative min-h-dvh overflow-hidden bg-[#eef6e9]"
      style={{
        backgroundImage: `url(${bgHomeSpring})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,250,232,.1)_50%,rgba(250,238,208,.48))]" />

      {dsRoleBindingEnabled && (
        <div className="absolute left-1/2 z-20 min-w-36 -translate-x-1/2 [top:calc(var(--safe-top)+3.9rem)]">
          <div id="ds-role-root" className="home-player-badge px-3 py-2 text-center text-xs font-black text-[#67442f]" />
        </div>
      )}

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 mx-auto min-h-dvh w-full max-w-md"
      >
        {/* 定位放在外层，避免 Framer Motion 的 transform 覆盖 translateX(-50%)，导致移动端 Logo 从屏幕中线开始并被裁掉。 */}
        <div className="pointer-events-none absolute inset-x-4 top-[calc(10.5%+25px)] flex flex-col items-center">
          <motion.img
            initial={{ y: -10, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, type: 'spring', stiffness: 180, damping: 18 }}
            src={imgHomeLogo}
            alt="忙忙碌碌寻宝藏"
            className="h-auto w-full max-w-[25rem] object-contain drop-shadow-[0_8px_10px_rgba(255,255,255,.85)]"
          />
          <motion.div
            initial={{ y: -6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.14 }}
            className="home-stamina-card pointer-events-auto mt-1 flex min-h-12 min-w-[7.2rem] items-center gap-2 px-3 py-2"
            aria-label={`眼力值 ${game.stamina.value} / ${game.stamina.max}`}
          >
            <span className="home-icon-disc flex h-8 w-8 items-center justify-center text-[#3f776e]">
              <Eye className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span>
              <span className="block text-sm font-black tabular-nums text-[#5b3f32]">
                {game.stamina.value}<span className="text-[9px] text-[#8f725e]"> / {game.stamina.max}</span>
              </span>
              <span className="block text-[8px] font-black text-[#9b765c]">
                {recoveryLabel === '已满' ? '眼力已满' : `${recoveryLabel} +1`}
              </span>
            </span>
          </motion.div>
        </div>

        <motion.button
          type="button"
          whileHover={{ y: -2, scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={withPrecheck(() => start('levels'))}
          className="home-primary-action absolute inset-x-8 bottom-[calc(max(15px,var(--safe-bottom))+4.45rem+20px)] mx-auto flex min-h-[4.1rem] max-w-[15rem] items-center justify-center px-8 text-center"
          aria-label={`继续第${game.unlockedMaxLevel}关，消耗${game.stamina.levelCost}点体力`}
        >
          <span className="relative z-10">
            <span className="block font-display text-xl font-black tracking-[0.12em] text-[#59372b]">继续寻踪</span>
            <span className="mt-0.5 block text-[9px] font-black tracking-wider text-[#a2603e]">
              第 {game.unlockedMaxLevel} 关 · 消耗 {game.stamina.levelCost} 点眼力
            </span>
          </span>
        </motion.button>

        <nav className="absolute inset-x-[15px] bottom-[max(15px,var(--safe-bottom))] flex items-end justify-evenly gap-2">
          <HomeRoundAction label="长卷" icon={Compass} onClick={() => setPanel('levels')} />
          <HomeRoundAction
            label="伙伴"
            icon={UsersRound}
            badge={`${game.partners.filter((partner) => partner.recruited).length}/8`}
            onClick={() => setPanel('partners')}
          />
          <HomeRoundAction label="榜单" icon={Trophy} onClick={() => setShowRanking(true)} />
          <HomeRoundAction
            label="无尽"
            icon={InfinityIcon}
            onClick={withPrecheck(() => start('endless'))}
          />
        </nav>

        {dsTaskPanelEnabled && (
          <button
            type="button"
            onClick={handleOpenTask}
            className="absolute right-0 top-[31%] flex h-28 w-12 items-center justify-center"
            aria-label="打开大神任务面板"
          >
            <img
              src={imgHomeTaskTag}
              alt=""
              className="absolute inset-0 h-full w-full object-fill drop-shadow-lg"
            />
            <span className="relative z-10 flex flex-col items-center gap-1 font-display text-xs font-black text-[#704633]">
              <ClipboardList className="h-4 w-4" />
              任<br />务
            </span>
          </button>
        )}
      </motion.main>

      <AnimatePresence>
        {taskToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-x-0 bottom-[28%] z-[2000] flex justify-center px-8"
          >
            <div className="max-w-xs rounded-2xl bg-[#3a2416]/92 px-5 py-3 text-center text-xs font-bold leading-5 text-[#ffe9cf] shadow-xl">
              {taskToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRanking && <RankingPanel onClose={() => setShowRanking(false)} />}
      </AnimatePresence>
      <HomePanelRouter
        panel={panel}
        game={game}
        onClose={() => setPanel(null)}
        onStartLevel={(level) => start('levels', level)}
      />
    </div>
  );
}

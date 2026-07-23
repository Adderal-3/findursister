import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CircleUserRound, ClipboardList, Eye, Infinity as InfinityIcon, ListOrdered,
  LoaderCircle, Trophy, X,
} from 'lucide-react';
import { unlockAudio } from '../game/sound';
import type { Game } from '../hooks/useGame';
import { dsRoleBindingEnabled, dsTaskPanelEnabled } from '../platform/ds/config';
import { loadDsLeaderboard, type DsLeaderboardSnapshot } from '../platform/ds/leaderboard';
import { mountRoleModule, openTaskPanel, withPrecheck } from '../platform/ds/runtime';

function RankingPanel({ game, onClose }: { game: Game; onClose: () => void }) {
  const [remote, setRemote] = useState<DsLeaderboardSnapshot | null | 'loading'>('loading');

  useEffect(() => {
    let cancelled = false;
    void loadDsLeaderboard().then((snapshot) => {
      if (!cancelled) setRemote(snapshot);
    });
    return () => { cancelled = true; };
  }, []);

  const localRecords = [
    { label: '百关总分', value: Math.round(game.best.levels).toLocaleString('zh-CN') },
    { label: '无尽最高分', value: Math.round(game.best.endless).toLocaleString('zh-CN') },
    { label: '关卡进度', value: `${game.best.maxLevel} / ${game.levelCount}` },
  ];
  const isRemote = remote !== 'loading' && remote !== null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#4b3328]/52 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ranking-title"
        initial={{ y: 22, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 22, scale: 0.96 }}
        className="qingya-menu-panel max-h-[82dvh] w-full max-w-sm overflow-hidden p-5 shadow-[0_24px_70px_rgba(76,50,35,.3)] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="qingya-round-button flex h-11 w-11 items-center justify-center text-[#795035]">
              <ListOrdered className="h-5 w-5" />
            </span>
            <div>
              <h2 id="ranking-title" className="font-display text-2xl font-black tracking-[0.15em] text-[#5d3b2a]">
                寻踪榜
              </h2>
              <p className="mt-0.5 text-[11px] font-bold tracking-widest text-[#8b7562]">
                {remote === 'loading'
                  ? '正在读取榜单'
                  : isRemote
                    ? `大神总榜 · 共 ${remote.total} 人`
                    : '当前设备记录'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="qingya-round-button flex h-10 w-10 items-center justify-center text-[#795035] transition active:scale-95"
            aria-label="关闭排行榜"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {remote === 'loading' ? (
          <div className="flex h-44 items-center justify-center text-[#8b755f]">
            <LoaderCircle className="h-6 w-6 animate-spin" />
          </div>
        ) : isRemote ? (
          <div className="mt-5 max-h-[52dvh] space-y-2 overflow-y-auto pr-1">
            {remote.records.map((record) => (
              <div
                key={`${record.rank}-${record.uid}`}
                className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/58 px-3 py-2.5 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#a76542] text-xs font-black text-[#fff9dc]">
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
            {!remote.records.length && (
              <p className="py-12 text-center text-sm font-bold text-[#8b755f]">暂时还没有上榜玩家</p>
            )}
            {remote.self && (
              <div className="sticky bottom-0 mt-3 flex items-center justify-between rounded-2xl border border-[#b9895f]/35 bg-[#fff7dc]/95 px-4 py-3 shadow-lg">
                <span className="text-sm font-black text-[#694832]">我的排名 · 第 {remote.self.rank} 名</span>
                <span className="font-display font-black text-[#b86d3f]">
                  {remote.self.score.toLocaleString('zh-CN')}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-2.5">
            {localRecords.map((record, index) => (
              <div
                key={record.label}
                className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/58 px-4 py-3 shadow-sm"
              >
                <span className="flex items-center gap-3 text-sm font-black text-[#315f5a]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#a76542] text-xs text-[#fff9dc]">
                    {index + 1}
                  </span>
                  {record.label}
                </span>
                <span className="font-display text-lg font-black tabular-nums text-[#b86d3f]">{record.value}</span>
              </div>
            ))}
            <p className="pt-2 text-center text-[10px] font-bold tracking-wider text-[#9b856f]">
              后台榜单 ID 回填后自动切换为大神总榜
            </p>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

interface RoundButtonProps {
  label: string;
  ariaLabel: string;
  icon: typeof Trophy;
  size: 'primary' | 'secondary';
  detail?: string;
  disabled?: boolean;
  delay: number;
  tone?: 'plain' | 'blue' | 'rose' | 'gold';
  onClick: () => void;
}

function RoundButton({
  label, ariaLabel, icon: Icon, size, detail, disabled, delay, tone = 'plain', onClick,
}: RoundButtonProps) {
  const primary = size === 'primary';
  const toneFilter = {
    plain: '',
    blue: 'hue-rotate(145deg) saturate(.78) brightness(1.08)',
    rose: 'hue-rotate(325deg) saturate(.82) brightness(1.08)',
    gold: 'sepia(.2) saturate(1.25) brightness(1.05)',
  }[tone];

  return (
    <motion.button
      type="button"
      initial={false}
      animate={{ opacity: disabled ? 0.62 : 1 }}
      transition={{ delay, duration: 0.18 }}
      whileHover={disabled ? undefined : { y: -3, scale: 1.03 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`relative flex shrink-0 items-center justify-center text-[#67442f] ${
        primary ? 'h-36 w-36 sm:h-40 sm:w-40' : 'h-[5.2rem] w-[5.2rem] sm:h-[5.7rem] sm:w-[5.7rem]'
      }`}
    >
      <img
        src="/ui/qingya/round-button-warm-v1.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain drop-shadow-[0_10px_14px_rgba(91,58,37,.24)]"
        style={{ filter: toneFilter || undefined }}
      />
      <span className={`relative z-10 flex flex-col items-center ${primary ? 'gap-1' : 'gap-0.5'}`}>
        <Icon className={primary ? 'h-7 w-7' : 'h-5 w-5'} strokeWidth={2.3} />
        <span className={`font-display font-black ${primary ? 'text-xl tracking-[0.12em]' : 'text-sm tracking-wider'}`}>
          {label}
        </span>
        {detail && (
          <span className={`${primary ? 'text-[10px]' : 'text-[9px]'} font-bold text-[#89674f]`}>
            {detail}
          </span>
        )}
      </span>
    </motion.button>
  );
}

export function StartScreen({ game }: { game: Game }) {
  const [showRanking, setShowRanking] = useState(false);
  const recoveryLabel = game.stamina.nextRecoverySec == null
    ? '体力已达上限'
    : `${String(Math.floor(game.stamina.nextRecoverySec / 60)).padStart(2, '0')}:${String(game.stamina.nextRecoverySec % 60).padStart(2, '0')} 后 +1`;

  useEffect(() => mountRoleModule(), []);

  const start = (mode: 'levels' | 'endless') => {
    unlockAudio();
    game.startGame(mode, mode === 'levels' ? game.best.maxLevel : undefined);
  };

  return (
    <div
      className="qingya-shell relative min-h-dvh overflow-hidden bg-[#eee5ce]"
      style={{
        backgroundImage: 'url(/backgrounds/qingya-courtyard-warm-v3.webp)',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,235,.08),rgba(244,235,211,.28))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#eee2c6]/80 via-[#f2e8d0]/38 to-transparent" />

      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        className="qingya-menu-panel absolute left-3 z-20 flex min-h-14 items-center gap-2.5 rounded-2xl px-3 py-2 [top:calc(var(--safe-top)+.35rem)] sm:left-5"
        aria-label={`眼力值 ${game.stamina.value} / ${game.stamina.max}，${recoveryLabel}`}
      >
        <span className="qingya-round-button flex h-9 w-9 items-center justify-center text-[#8a5b38]">
          <Eye className="h-4.5 w-4.5" strokeWidth={2.5} />
        </span>
        <span>
          <span className="block text-sm font-black tabular-nums text-[#65442f]">
            {game.stamina.value} <span className="text-[10px] text-[#8e7968]">体力</span>
          </span>
          <span className="block max-w-24 truncate text-[9px] font-bold text-[#99826d]">{recoveryLabel}</span>
        </span>
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
        className="absolute left-1/2 z-20 flex min-h-11 -translate-x-1/2 items-center justify-center [top:calc(var(--safe-top)+4.55rem)]"
      >
        {dsRoleBindingEnabled ? (
          <div id="ds-role-root" className="qingya-pill min-w-36 px-3 py-2 text-center text-sm font-black text-[#67442f]" />
        ) : (
          <div
            className="qingya-pill flex min-w-36 items-center justify-center gap-2 px-3 py-2 text-sm font-black text-[#67442f]"
            title="回填 VITE_DS_ACT_ID 后启用大神角色绑定"
          >
            <CircleUserRound className="h-5 w-5 text-[#9a6444]" />
            请选择角色
          </div>
        )}
      </motion.div>

      <motion.main
        initial={false}
        animate={{ opacity: 1 }}
        className="relative z-10 mx-auto min-h-dvh w-full max-w-md"
      >
        <div className="absolute inset-x-4 top-[22%] flex justify-center sm:top-[20%]">
          <div className="qingya-level-plaque flex h-[4.7rem] w-full max-w-sm items-center justify-center px-9">
            <h1 className="font-display text-3xl font-black tracking-[0.18em] text-[#fff9dc] drop-shadow-sm sm:text-4xl">
              忙忙碌碌寻宝藏
            </h1>
          </div>
        </div>

        <div className="absolute inset-x-3 bottom-[max(1.2rem,env(safe-area-inset-bottom))] mx-auto max-w-sm">
          <div className="relative flex items-end justify-center gap-1 sm:gap-3">
            <div className="mb-3">
              <RoundButton
                label="排行榜"
                ariaLabel="打开排行榜"
                icon={Trophy}
                size="secondary"
                tone="blue"
                delay={0.16}
                onClick={() => setShowRanking(true)}
              />
            </div>

            <RoundButton
              label="开始寻踪"
              ariaLabel={`开始百关寻踪，消耗 ${game.stamina.levelCost} 点体力`}
              icon={Eye}
              size="primary"
              tone="gold"
              detail={`继续第 ${game.best.maxLevel} 关 · 体力 ${game.stamina.levelCost}`}
              delay={0.1}
              onClick={withPrecheck(() => start('levels'))}
            />

            <div className="mb-3">
              <RoundButton
                label="无尽"
                ariaLabel={`开始无尽寻踪，消耗 ${game.stamina.endlessCost} 点体力`}
                icon={InfinityIcon}
                size="secondary"
                tone="rose"
                detail={`体力 ${game.stamina.endlessCost}`}
                delay={0.2}
                onClick={withPrecheck(() => start('endless'))}
              />
            </div>

            <div className="absolute -top-20 right-1 sm:right-0">
              <RoundButton
                label="任务"
                ariaLabel={dsTaskPanelEnabled ? '打开大神任务面板' : '大神任务待配置活动 ID'}
                icon={ClipboardList}
                size="secondary"
                tone="gold"
                disabled={!dsTaskPanelEnabled}
                delay={0.24}
                onClick={openTaskPanel}
              />
            </div>
          </div>
        </div>
      </motion.main>

      <AnimatePresence>
        {showRanking && <RankingPanel game={game} onClose={() => setShowRanking(false)} />}
      </AnimatePresence>
    </div>
  );
}

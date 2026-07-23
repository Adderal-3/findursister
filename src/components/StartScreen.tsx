import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Infinity as InfinityIcon, ListOrdered, Map, Trophy, X } from 'lucide-react';
import { unlockAudio } from '../game/sound';
import type { Game } from '../hooks/useGame';
import { withPrecheck } from '../platform/ds/runtime';

const MENU_ITEMS = [
  {
    id: 'levels',
    label: '百关寻踪',
    icon: Map,
  },
  {
    id: 'endless',
    label: '无尽寻踪',
    icon: InfinityIcon,
  },
  {
    id: 'ranking',
    label: '排行榜',
    icon: Trophy,
  },
] as const;

function RankingPanel({ game, onClose }: { game: Game; onClose: () => void }) {
  const records = [
    { label: '百关总分', value: Math.round(game.best.levels).toLocaleString('zh-CN') },
    { label: '无尽最高分', value: Math.round(game.best.endless).toLocaleString('zh-CN') },
    { label: '关卡进度', value: `${game.best.maxLevel} / ${game.levelCount}` },
  ];

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
        className="qingya-menu-panel w-full max-w-sm overflow-hidden p-5 shadow-[0_24px_70px_rgba(76,50,35,.3)] sm:p-6"
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
              <p className="mt-0.5 text-[11px] font-bold tracking-widest text-[#8b7562]">当前设备记录</p>
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

        <div className="mt-5 space-y-2.5">
          {records.map((record, index) => (
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
        </div>
      </motion.section>
    </motion.div>
  );
}

export function StartScreen({ game }: { game: Game }) {
  const [showRanking, setShowRanking] = useState(false);
  const recoveryLabel = game.stamina.nextRecoverySec == null
    ? '已满'
    : `${String(Math.floor(game.stamina.nextRecoverySec / 60)).padStart(2, '0')}:${String(game.stamina.nextRecoverySec % 60).padStart(2, '0')} 后 +1`;

  const openMenuItem = (id: (typeof MENU_ITEMS)[number]['id']) => {
    if (id === 'ranking') {
      setShowRanking(true);
      return;
    }
    unlockAudio();
    game.startGame(id, id === 'levels' ? game.best.maxLevel : undefined);
  };

  return (
    <div
      className="qingya-shell relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#eee5ce] px-5 [padding-top:max(1.5rem,env(safe-area-inset-top))] [padding-bottom:max(1.5rem,env(safe-area-inset-bottom))]"
      style={{
        backgroundImage: 'url(/backgrounds/qingya-courtyard-warm-v3.webp)',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,250,235,.12),rgba(244,235,211,.34))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#f2e8d0]/65 to-transparent" />

      <motion.main
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 19 }}
        className="relative z-10 flex w-full max-w-sm flex-col items-center"
      >
        <div
          className="qingya-pill mb-3 flex min-h-10 items-center gap-2 self-end px-3.5 text-[#744f2e]"
          aria-label={`眼力值 ${game.stamina.value} / ${game.stamina.max}，${recoveryLabel}`}
        >
          <Eye className="h-4 w-4" strokeWidth={2.3} />
          <span className="text-sm font-black tabular-nums">
            眼力 {game.stamina.value} / {game.stamina.max}
          </span>
          <span className="border-l border-[#b29a75]/35 pl-2 text-[10px] font-bold text-[#8b7556]">
            {recoveryLabel}
          </span>
        </div>

        <div className="qingya-level-plaque flex h-[4.5rem] w-full items-center justify-center px-9">
          <h1 className="font-display text-3xl font-black tracking-[0.18em] text-[#fff9dc] drop-shadow-sm sm:text-4xl">
            百物寻踪
          </h1>
        </div>

        <div className="mt-8 flex w-full flex-col gap-3.5">
          {MENU_ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                type="button"
                initial={{ x: index % 2 ? 14 : -14, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.08 + index * 0.07 }}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.97 }}
                onClick={item.id === 'ranking'
                  ? () => openMenuItem(item.id)
                  : withPrecheck(() => openMenuItem(item.id))}
                className="qingya-menu-panel group flex min-h-16 w-full items-center gap-4 px-5 py-3 text-left shadow-[0_12px_30px_rgba(91,61,41,.16)]"
              >
                <span className="qingya-round-button flex h-11 w-11 shrink-0 items-center justify-center text-[#795035] transition group-hover:text-[#a85f39]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 font-display text-xl font-black tracking-[0.16em] text-[#5d3b2a]">
                  {item.label}
                </span>
                {item.id === 'ranking' ? (
                  <span className="font-display text-xl text-[#b28765] transition group-hover:translate-x-1">›</span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full border border-[#b9a27a]/35 bg-[#fffaf0]/70 px-2 py-1 text-xs font-black text-[#84613d]">
                    <Eye className="h-3.5 w-3.5" />
                    {item.id === 'levels' ? game.stamina.levelCost : game.stamina.endlessCost}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.main>

      <AnimatePresence>
        {showRanking && <RankingPanel game={game} onClose={() => setShowRanking(false)} />}
      </AnimatePresence>
    </div>
  );
}

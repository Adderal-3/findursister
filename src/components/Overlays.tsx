import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, PartyPopper, Pause, Play, RotateCcw, Sparkles, Star } from 'lucide-react';
import type { Game } from '../hooks/useGame';

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#4a3329]/52 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.8, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="qingya-menu-panel w-full max-w-sm p-6 text-center shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Btn({
  onClick, className, children,
}: {
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`qingya-level-plaque flex min-h-11 items-center justify-center gap-1.5 px-6 py-2.5 font-display text-sm font-black tracking-wide text-[#fff9dc] ${className}`}
    >
      {children}
    </motion.button>
  );
}

function StarRating({ value }: { value: 1 | 2 | 3 }) {
  return (
    <div className="my-2 flex justify-center gap-1" aria-label={`${value} 星评价`}>
      {Array.from({ length: 3 }, (_, index) => (
        <Star
          key={index}
          className={`h-6 w-6 ${index < value ? 'fill-[#e2a85e] text-[#b77b38]' : 'fill-[#dfd1bd] text-[#ad9578]'}`}
        />
      ))}
    </div>
  );
}

export function Overlays({ game }: { game: Game }) {
  const accuracy =
    game.stats.found + game.stats.wrong > 0
      ? Math.round((game.stats.found / (game.stats.found + game.stats.wrong)) * 100)
      : 100;

  // 百关模式不再每关停在结算弹窗，短暂展示成绩后自动衔接下一张场景。
  useEffect(() => {
    if (game.phase !== 'levelClear' || game.level >= game.levelCount) return;
    const timer = window.setTimeout(game.nextLevel, 1750);
    return () => window.clearTimeout(timer);
  }, [game.level, game.levelCount, game.nextLevel, game.phase]);

  if (game.phase === 'playing' && game.quitConfirm) {
    return (
      <Panel>
        <Home className="mx-auto mb-2 h-10 w-10 text-[#8a6244]" />
        <div className="mb-1 font-display text-2xl font-black text-[#5d3b2a]">返回主菜单？</div>
        <p className="mb-4 text-sm text-[#806f60]">本关尚未结算，离开后不会记录本关得分。</p>
        <div className="flex justify-center gap-2">
          <Btn onClick={game.cancelQuit} className="">
            <Play className="h-4 w-4 fill-current" /> 继续游戏
          </Btn>
          <Btn onClick={game.quitToMenu} className="opacity-80">
            <Home className="h-4 w-4" /> 确认离开
          </Btn>
        </div>
      </Panel>
    );
  }

  if (game.phase === 'levelClear') {
    if (game.level < game.levelCount) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-[#664331]/18 p-4 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ y: 24, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            className="qingya-menu-panel w-full max-w-xs overflow-hidden px-6 py-5 text-center shadow-2xl"
          >
            <PartyPopper className="mx-auto mb-1 h-8 w-8 text-[#d38a4b]" />
            <div className="font-display text-xl font-black tracking-widest text-[#5d3b2a]">
              第 {game.level} 关完成
            </div>
            <StarRating value={game.lastStars} />
            <div className="text-sm font-bold text-[#a5633f]">+{game.lastGain.find.toFixed(1)} 分</div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#dfd1bd]">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.55, ease: 'linear' }}
                className="h-full rounded-full bg-[#c27a49]"
              />
            </div>
            <div className="mt-1.5 text-[10px] font-bold tracking-[0.22em] text-[#8b7562]">下一委托即将展开</div>
          </motion.div>
        </motion.div>
      );
    }
    return (
      <Panel>
        <PartyPopper className="mx-auto mb-2 h-10 w-10 text-[#d38a4b]" />
        <div className="mb-1 font-display text-2xl font-black text-[#5d3b2a]">
          {game.level >= game.levelCount ? '百关寻踪圆满完成！' : `第 ${game.level} 关通过！`}
        </div>
        <StarRating value={game.lastStars} />
        {game.isNewLevelBest && (
          <div className="mb-2 flex items-center justify-center gap-1 text-sm font-bold text-[#c97d43]"><Sparkles className="h-4 w-4" /> 本关新纪录</div>
        )}
        <div className="mb-4 space-y-1 rounded-2xl bg-white/55 p-3 text-sm text-[#76685b]">
          <div className="flex justify-between">
            <span>本关得分</span>
            <span className="font-bold text-[#a5633f]">{game.lastGain.find.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span>二星 / 三星线</span>
            <span className="font-bold text-[#9b7045]">{game.levelInfo.star2.toFixed(1)} / {game.levelInfo.star3.toFixed(1)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-1 text-base">
            <span className="font-bold">本次累计</span>
            <span className="font-black text-slate-800">{game.score.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-xs text-[#8d7d69]">
            <span>百物图鉴</span>
            <span className="font-bold">{game.collection.length} / {game.collectionTotal}</span>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Btn onClick={game.quitToMenu} className="">
            <Home className="h-4 w-4" /> 主菜单
          </Btn>
        </div>
      </Panel>
    );
  }

  if (game.phase === 'gameOver') {
    const isBest = game.mode === 'endless' && game.score >= game.best.endless && game.score > 0;
    return (
      <Panel>
        <div className="mb-4 font-display text-2xl font-black text-[#5d3b2a]">时间到！</div>
        {isBest && (
          <div className="mb-1 flex items-center justify-center gap-1 text-sm font-bold text-[#c97d43]"><Sparkles className="h-4 w-4" /> 新纪录</div>
        )}
        <div className="mb-4 space-y-1 rounded-2xl bg-white/60 p-3 text-sm text-[#76685b]">
          <div className="flex justify-between">
            <span>最终得分</span>
            <span className="text-lg font-black text-slate-800">{game.score.toFixed(1)}</span>
          </div>
          <div className="flex justify-between">
            <span>{game.mode === 'levels' ? '到达关卡' : '坚持波数'}</span>
            <span className="font-bold">
              {game.mode === 'levels' ? `第 ${game.level} 关` : `第 ${game.level} 波`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>寻得物件</span>
            <span className="font-bold text-[#a5633f]">{game.stats.found} 个</span>
          </div>
          <div className="flex justify-between">
            <span>命中率</span>
            <span className="font-bold">{accuracy}%</span>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          <Btn onClick={game.retry} className="min-w-[7.25rem]">
            <RotateCcw className="h-4 w-4" /> 再来一次
          </Btn>
          <Btn onClick={game.quitToMenu} className="min-w-[7.25rem]">
            <Home className="h-4 w-4" /> 主菜单
          </Btn>
        </div>
      </Panel>
    );
  }

  if (game.phase === 'playing' && game.paused) {
    return (
      <Panel>
        <Pause className="mx-auto mb-2 h-10 w-10 fill-current text-[#8a6244]" />
        <div className="mb-4 font-display text-2xl font-black text-[#5d3b2a]">已暂停</div>
        <div className="space-y-2">
          <Btn onClick={() => game.setPaused(false)} className="w-full">
            <Play className="h-4 w-4 fill-current" /> 继续游戏
          </Btn>
          <div className="grid grid-cols-2 gap-2">
            <Btn onClick={game.retry} className="w-full opacity-85">
              <RotateCcw className="h-4 w-4" /> 重开本局
            </Btn>
            <Btn onClick={game.quitToMenu} className="w-full opacity-80">
              <Home className="h-4 w-4" /> 主菜单
            </Btn>
          </div>
        </div>
      </Panel>
    );
  }

  return null;
}

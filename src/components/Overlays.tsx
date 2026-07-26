import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Film, Home, PartyPopper, Pause, Play, RotateCcw, Sparkles, Star, TimerReset,
} from 'lucide-react';
import type { Game } from '../hooks/useGame';
import { levelConfig } from '../game/levels';

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
      className={`qingya-crisp-action flex min-h-11 items-center justify-center gap-1.5 px-6 py-2.5 font-display text-sm font-black tracking-wide text-[#fff9dc] ${className}`}
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
  const isCheckpoint = game.mode === 'levels'
    && (game.level % 5 === 0 || game.levelInfo.type === 'boss' || game.level + 1 > game.unlockedMaxLevel);

  // 主线模式不再每关停在结算弹窗，短暂展示成绩后自动衔接下一张场景。
  useEffect(() => {
    if (
      game.phase !== 'levelClear'
      || game.level >= game.levelCount
      || game.partnerNotice
      || isCheckpoint
    ) return;
    const timer = window.setTimeout(game.nextLevel, 1750);
    return () => window.clearTimeout(timer);
  }, [game.level, game.levelCount, game.nextLevel, game.partnerNotice, game.phase, isCheckpoint]);

  if (game.phase === 'playing' && game.timeBoostTaskPrompt) {
    return (
      <Panel>
        <TimerReset className="mx-auto mb-2 h-10 w-10 text-[#a86b42]" />
        <div className="mb-1 font-display text-2xl font-black text-[#5d3b2a]">任务加时 · +15 秒</div>
        <p className="mb-4 text-sm leading-6 text-[#806f60]">
          本关首次赠送已经使用。再次加时需要完成任务视频，领取成功后会从任务回调统一发放。
        </p>
        {!game.timeBoostTaskConfigured && (
          <div className="mb-4 rounded-2xl border border-[#d8b786]/55 bg-[#fff3d8] px-3 py-2 text-xs font-black leading-5 text-[#a15f3c]">
            任务系统尚未配置；接口位置已预留，明日接入后按钮会直接打开视频流。
          </div>
        )}
        <div className="flex justify-center gap-2">
          {game.timeBoostTaskConfigured && game.timeBoostTaskAvailable && (
            <Btn onClick={game.reopenTimeBoostTask} className="">
              <Film className="h-4 w-4" /> 打开任务视频
            </Btn>
          )}
          <Btn onClick={game.dismissTimeBoostTaskPrompt} className="opacity-85">
            <Play className="h-4 w-4 fill-current" /> 暂不加时
          </Btn>
        </div>
      </Panel>
    );
  }

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
    if (game.level < game.levelCount && !isCheckpoint) {
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
            <div className="text-sm font-bold text-[#a5633f]">
              本局 {game.lastGain.find.toFixed(1)} 分
            </div>
            <div className="mt-0.5 text-[11px] font-black text-[#47776f]">
              标准榜分 +{game.lastLeaderboardBaseDelta.toLocaleString('zh-CN')}
            </div>
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
    const nextGate = game.level < game.levelCount
      ? levelConfig(game.level + 1).starUnlockReq
      : null;
    const canAdvance = game.level < game.levelCount && game.level + 1 <= game.unlockedMaxLevel;
    return (
      <Panel>
        <PartyPopper className="mx-auto mb-2 h-10 w-10 text-[#d38a4b]" />
        <div className="mb-1 font-display text-2xl font-black text-[#5d3b2a]">
          {game.level >= game.levelCount
            ? '二百关寻踪圆满完成！'
            : game.levelInfo.type === 'boss'
              ? `第 ${game.level} 关大考完成！`
              : `第 ${game.level} 关阶段完成！`}
        </div>
        <StarRating value={game.lastStars} />
        {game.isNewLevelBest && (
          <div className="mb-2 flex items-center justify-center gap-1 text-sm font-bold text-[#c97d43]"><Sparkles className="h-4 w-4" /> 本关新纪录</div>
        )}
        <div className="mb-4 space-y-1 rounded-2xl bg-white/55 p-3 text-sm text-[#76685b]">
          <div className="flex justify-between">
            <span>本局得分</span>
            <span className="font-bold text-[#a5633f]">{game.lastGain.find.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>本关原历史最高</span>
            <span className="font-bold text-[#8d7d69]">{game.lastLevelPreviousBest.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>本关标准榜分</span>
            <span className="font-black text-[#47776f]">+{game.lastLeaderboardBaseDelta.toLocaleString('zh-CN')}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-[#d8c8b2] pt-2">
            <span>标准榜分合计</span>
            <span className="font-bold text-[#6d5140]">{game.best.levels.toLocaleString('zh-CN')}</span>
          </div>
          <div className="flex justify-between text-xs text-[#8d7d69]">
            <span>伙伴加成</span>
            <span className="font-bold">+{Math.round(game.partnerBonusRate * 10_000) / 100}%</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-[#d8c8b2] pt-2 text-base">
            <span className="font-black">排行榜分数</span>
            <span className="font-black text-slate-800">{game.rankingScore.toLocaleString('zh-CN')}</span>
          </div>
          <div className="flex justify-between text-[10px] text-[#9a8875]">
            <span>本关二星 / 三星</span>
            <span>{game.levelInfo.star2.toFixed(1)} / {game.levelInfo.star3.toFixed(1)}</span>
          </div>
          {!canAdvance && nextGate != null && game.starTotal < nextGate && (
            <div className="mt-2 rounded-xl bg-[#fff0d4] px-3 py-2 text-xs font-black text-[#a9653e]">
              下一篇需要累计 {nextGate} 星；回到长卷重玩旧关补星
            </div>
          )}
        </div>
        <div className="flex justify-center gap-2">
          {canAdvance && (
            <Btn onClick={game.nextLevel} className="">
              <Play className="h-4 w-4 fill-current" /> 继续下一关
            </Btn>
          )}
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
            <span className="text-lg font-black text-slate-800">
              {(game.mode === 'levels' ? game.roundScore : game.score).toFixed(1)}
            </span>
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

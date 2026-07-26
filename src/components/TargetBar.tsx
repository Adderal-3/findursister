import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Circle, ScanSearch } from 'lucide-react';
import type { TargetTask } from '../game/types';
import imgMissionFrameWarm from '../assets/ui/qingya/mission-frame-warm-v1.png';

function compactTaskLabel(label: string): string {
  return label
    .replace(/^找出所有/, '')
    .replace(/^找出/, '')
    .replace(/的物品$/, '')
    .replace(/物品$/, '');
}

interface GoalNotice {
  id: number;
  completedLabel: string;
  nextLabel: string;
}

export function TargetBar({
  targets,
  activeIndex,
  notice,
  timeBoostToast,
}: {
  targets: TargetTask[];
  activeIndex: number;
  notice: GoalNotice | null;
  timeBoostToast: string | null;
}) {
  if (!targets.length) return null;
  const done = targets.every((target) => target.remaining === 0);

  return (
    <div className="relative mx-auto w-full max-w-[46rem]">
      <div className="qingya-mission-frame pointer-events-none relative h-[4.15rem] w-full sm:h-[4.55rem]">
        <img
          src={imgMissionFrameWarm}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-fill"
        />
        <div className="absolute inset-[9%_4%_11%] flex items-center gap-2 sm:gap-3">
          <div className="qingya-round-button flex h-10 w-10 shrink-0 items-center justify-center text-[#795035] sm:h-11 sm:w-11">
            {done
              ? <Check className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              : <ScanSearch className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-1">
            {targets.map((target, index) => {
              const found = target.total - target.remaining;
              const progress = target.total > 0 ? found / target.total : 0;
              const targetDone = target.remaining === 0;
              const active = index === activeIndex && !targetDone;
              const upcoming = index > activeIndex;
              return (
                <div key={`${target.taskId}-${index}`} className="contents">
                  {index > 0 && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-[#a98964]/70" strokeWidth={2.5} />
                  )}
                  <div
                    className={`relative min-w-0 flex-1 overflow-hidden rounded-lg border px-1.5 py-1 ${
                      active
                        ? 'border-[#ba7b49]/55 bg-[#fff6e1]'
                        : targetDone
                          ? 'border-[#6fa695]/38 bg-[#edf7ef]'
                          : 'border-[#bca786]/25 bg-[#f5eee2]/70'
                    }`}
                    title={target.label}
                    aria-current={active ? 'step' : undefined}
                  >
                    <motion.div
                      className={`absolute inset-y-0 left-0 ${
                        targetDone ? 'bg-[#8bc0aa]/24' : 'bg-[#dcb989]/28'
                      }`}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                    />
                    <div className="relative flex min-w-0 items-center gap-1">
                      {targetDone ? (
                        <Check className="h-3 w-3 shrink-0 text-[#4f8978]" strokeWidth={2.8} />
                      ) : active ? (
                        <ScanSearch className="h-3 w-3 shrink-0 text-[#a45e36]" strokeWidth={2.5} />
                      ) : (
                        <Circle className="h-2.5 w-2.5 shrink-0 text-[#aa9a86]" strokeWidth={2.2} />
                      )}
                      <span className={`min-w-0 flex-1 truncate font-display text-[10px] font-black sm:text-xs ${
                        targetDone ? 'text-[#5f8378]' : upcoming ? 'text-[#9a8a76]' : 'text-[#5d3b2a]'
                      }`}>
                        {compactTaskLabel(target.label)}
                      </span>
                      <span className={`shrink-0 font-display text-[9px] font-black tabular-nums sm:text-[11px] ${
                        active ? 'text-[#8f5435]' : 'text-[#8a7b67]'
                      }`}>
                        {found}/{target.total}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {notice && (
          <motion.div
            key={`goal-${notice.id}`}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute inset-x-6 top-[calc(100%+.2rem)] flex justify-center"
          >
            <div className="rounded-full border border-[#7aa694]/45 bg-[#f4fbf1]/96 px-4 py-1.5 text-center text-[11px] font-black text-[#456f66] shadow-lg">
              <Check className="mr-1 inline h-3.5 w-3.5" />
              {compactTaskLabel(notice.completedLabel)}完成
              <span className="mx-1.5 text-[#ba7b49]">下一项</span>
              {compactTaskLabel(notice.nextLabel)}
            </div>
          </motion.div>
        )}
        {!notice && timeBoostToast && (
          <motion.div
            key={timeBoostToast}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute inset-x-6 top-[calc(100%+.2rem)] flex justify-center"
          >
            <div className="rounded-full border border-[#d6a66f]/55 bg-[#fff6dc]/96 px-4 py-1.5 text-center text-[11px] font-black text-[#8a5a36] shadow-lg">
              {timeBoostToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

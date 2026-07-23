import { motion } from 'framer-motion';
import { Check, ScanSearch } from 'lucide-react';
import type { TargetTask } from '../game/types';

function compactTaskLabel(label: string): string {
  return label
    .replace(/^找出所有/, '')
    .replace(/^找出/, '')
    .replace(/的物品$/, '')
    .replace(/物品$/, '');
}

export function TargetBar({ targets }: { targets: TargetTask[] }) {
  if (!targets.length) return null;
  const done = targets.every((target) => target.remaining === 0);

  return (
      <div className="qingya-mission-frame pointer-events-none relative mx-auto h-14 w-full max-w-[46rem] sm:h-16">
        <img
          src="/ui/qingya/mission-frame-warm-v1.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-fill"
        />
        <div className="absolute inset-[9%_4%_11%] flex items-center gap-2 sm:gap-3">
          <div className="qingya-round-button flex h-9 w-9 shrink-0 items-center justify-center text-[#795035] sm:h-11 sm:w-11">
            {done ? <Check className="h-4.5 w-4.5 sm:h-5 sm:w-5" /> : <ScanSearch className="h-4.5 w-4.5 sm:h-5 sm:w-5" strokeWidth={2.2} />}
          </div>
          <div className={`grid min-w-0 flex-1 gap-1 ${targets.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {targets.map((target) => {
              const found = target.total - target.remaining;
              const progress = target.total > 0 ? found / target.total : 0;
              const targetDone = target.remaining === 0;
              return (
                <div
                  key={target.taskId}
                  className="relative min-w-0 overflow-hidden rounded-md border border-[#bca786]/40 bg-[#fffaf0]/60 px-1.5 py-0.5"
                  title={target.label}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-[#dcb989]/30"
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                  />
                  <div className="relative flex min-w-0 items-center justify-between gap-1">
                    <span className={`min-w-0 truncate font-display text-[10px] font-black sm:text-xs ${targetDone ? 'text-[#8a785f]' : 'text-[#5d3b2a]'}`}>
                      {compactTaskLabel(target.label)}
                    </span>
                    <span className="shrink-0 font-display text-[10px] font-black tabular-nums text-[#744b31] sm:text-xs">
                      {found}/{target.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
  );
}

import { Clock3, Eye } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Game } from '../hooks/useGame';

export function StaminaDialog({ game }: { game: Game }) {
  const notice = game.staminaNotice;
  const seconds = game.stamina.nextRecoverySec;
  const recoveryLabel = seconds == null
    ? '眼力已经恢复'
    : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} 后恢复 1 点`;

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-[#382f27]/48 p-4 backdrop-blur-md"
          onClick={game.dismissStaminaNotice}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="stamina-dialog-title"
            initial={{ y: 20, scale: 0.94 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.94 }}
            className="qingya-menu-panel w-full max-w-xs p-6 text-center shadow-[0_24px_70px_rgba(43,35,27,.3)]"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="qingya-round-button mx-auto flex h-16 w-16 items-center justify-center text-[#8a5e37]">
              <Eye className="h-7 w-7" strokeWidth={2.2} />
            </span>
            <h2
              id="stamina-dialog-title"
              className="mt-2 font-display text-2xl font-black tracking-[0.12em] text-[#4e493b]"
            >
              眼力不足
            </h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[#786d5d]">
              {notice.mode === 'levels' ? '百关寻踪' : '无尽寻踪'}需要 {notice.cost} 点眼力，
              当前只有 {game.stamina.value} 点。
            </p>
            <div className="qingya-pill mt-4 flex h-10 items-center justify-center gap-2 text-xs font-black text-[#765a3e]">
              <Clock3 className="h-4 w-4" />
              {recoveryLabel}
            </div>
            <button
              type="button"
              onClick={game.dismissStaminaNotice}
              className="qingya-level-plaque mt-5 flex min-h-12 w-full items-center justify-center px-6 font-display text-base font-black tracking-[0.16em] text-[#fff9dc] transition active:scale-[0.98]"
            >
              知道了
            </button>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

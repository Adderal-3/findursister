import { motion } from 'framer-motion';
import { Sparkles, UsersRound } from 'lucide-react';
import { PARTNER_MAP } from '../game/partners';
import type { Game } from '../hooks/useGame';

export function PartnerRecruitDialog({ game }: { game: Game }) {
  if (!game.partnerNotice) return null;
  const partner = PARTNER_MAP.get(game.partnerNotice);
  if (!partner) return null;
  const fullTeam = partner.id === 'meimei';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-[#3f2e27]/68 p-4"
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-recruit-title"
        initial={{ y: 30, scale: 0.82, rotate: -2 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 20 }}
        className="qingya-menu-panel qingya-menu-panel--solid relative w-full max-w-xs overflow-hidden px-6 pt-7 pb-6 text-center shadow-2xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#ffcf91]/34 to-transparent" />
        <Sparkles className="absolute top-5 left-6 h-5 w-5 animate-pulse text-[#e58d4e]" />
        <Sparkles className="absolute top-12 right-6 h-4 w-4 animate-pulse text-[#5fa99a]" />
        <div className="relative mx-auto flex h-28 w-28 items-end justify-center rounded-full border-4 border-white/80 bg-gradient-to-b from-[#bfe7d9] to-[#fff0cc] shadow-[0_12px_30px_rgba(94,64,40,.25)]">
          <img
            src={partner.image}
            alt={partner.name}
            className="h-24 w-24 object-contain [image-rendering:auto]"
          />
        </div>
        <div className="relative mt-3 text-[11px] font-black tracking-[0.3em] text-[#d47d45]">
          新伙伴加入
        </div>
        <h2 id="partner-recruit-title" className="relative mt-1 font-display text-3xl font-black text-[#593729]">
          {partner.name}
        </h2>
        <p className="relative mt-2 text-sm font-bold leading-6 text-[#7c6858]">
          {partner.recruitMessage}
        </p>
        <div className="qingya-pill relative mt-4 flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-black text-[#34736c]">
          <UsersRound className="h-4 w-4" />
          总榜加成 +1.25%
          {fullTeam && <span className="text-[#cf7043]">· 满员 +10%</span>}
        </div>
        <button
          type="button"
          onClick={game.dismissPartnerNotice}
          className="qingya-crisp-action mt-5 min-h-12 w-full px-8 font-display text-base font-black tracking-[0.14em] text-[#fff9dc] transition active:scale-[0.98]"
        >
          欢迎入队
        </button>
      </motion.section>
    </motion.div>
  );
}

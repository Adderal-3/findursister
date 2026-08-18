import { motion } from 'framer-motion';
import { CalendarDays, ShieldAlert, Trophy, X } from 'lucide-react';
import rewardIcon from '../assets/rewards/reward-campaign-icon-v2.png';
import bajiShowcase from '../assets/rewards/baji-showcase.webp';

export function RewardCampaignDialog({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1800] flex items-center justify-center bg-[#35231b]/66 p-3 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reward-campaign-title"
        initial={{ y: 24, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 24, scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 250, damping: 23 }}
        className="qingya-menu-panel qingya-menu-panel--solid relative flex max-h-[90dvh] w-full max-w-sm flex-col overflow-hidden shadow-[0_28px_80px_rgba(46,26,16,.38)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-[#d9b486]/35 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,.7),transparent_42%),linear-gradient(135deg,#fff4d8,#f9dcc2_58%,#d9eadb)] px-5 pt-4 pb-3">
          <div className="pointer-events-none absolute -top-12 -right-8 h-36 w-36 rounded-full bg-[#e98762]/18 blur-2xl" />
          <button
            type="button"
            onClick={onClose}
            className="home-icon-disc absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center text-[#70472f] active:scale-95"
            aria-label="关闭活动说明"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-3 pr-9">
            <img
              src={rewardIcon}
              alt=""
              className="h-[5.2rem] w-[5.2rem] shrink-0 object-contain drop-shadow-[0_9px_10px_rgba(110,55,29,.25)]"
            />
            <div>
              <div className="mb-1 flex w-fit items-center gap-1 rounded-full bg-[#a84f34] px-2.5 py-1 text-[9px] font-black tracking-wider text-[#fff8e4]">
                <CalendarDays className="h-3 w-3" /> 即日起-8月31日
              </div>
              <h2 id="reward-campaign-title" className="font-display text-2xl font-black tracking-[0.08em] text-[#713a2a]">
                寻宝藏有礼
              </h2>
              <p className="mt-1 text-[10px] font-bold text-[#9a6649]">参与冲榜活动，有机会获得逆水寒游戏周边</p>
            </div>
          </div>
        </header>

        <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[#684b39]">
          <p className="text-xs font-bold leading-5">
            即日起-8月31日，参与【忙忙碌碌寻宝藏】冲榜活动即有机会获得逆水寒游戏周边，奖励设定如下：
          </p>

          <section className="overflow-hidden rounded-2xl border border-[#e5b37d]/55 bg-[linear-gradient(145deg,#fff9e9,#fce6d3)] shadow-[inset_0_0_0_1px_rgba(255,255,255,.78),0_8px_18px_rgba(112,66,36,.1)]">
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#b65c3d] text-[#fff5d8] shadow-inner">
                <Trophy className="h-5 w-5" strokeWidth={2.3} />
              </span>
              <div>
                <p className="font-display text-lg font-black text-[#8c402c]">总榜 TOP20</p>
                <p className="text-[11px] font-black text-[#80523b]">每人可获得【逆水寒吧唧周边（随机款）*1】</p>
              </div>
            </div>
            <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-white/80 bg-white shadow-sm">
              <img
                src={bajiShowcase}
                alt="逆水寒吧唧周边随机款展示"
                className="aspect-[1.89/1] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </section>

          <section className="space-y-2 rounded-2xl border border-[#c9d9c5] bg-[#f3f7e9] px-4 py-3 text-[11px] font-bold leading-[1.65] text-[#5f6650]">
            <p>
              <strong className="text-[#466557]">排名统计截至8月31日23点59分。</strong>
              绑定《逆水寒》手游角色并完成对应任务可得额外道具，助力冲刺高分~
            </p>
            <p>
              周边实物奖励将在活动结束后统一通过大神站内信向获奖玩家收集地址，填写地址后的30个工作日内将会安排寄出，请玩家留意系统信息，逾期未提供地址视为放弃奖励。
            </p>
          </section>

          <section className="flex gap-2 rounded-2xl border border-[#e9c3ae] bg-[#fff1e9] px-4 py-3 text-[10px] font-bold leading-5 text-[#89533e]">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b9583d]" />
            <p>
              如使用外挂、作弊器以及其他不正当的方式参与本活动，官方有权取消用户获奖资格。
            </p>
          </section>
        </div>
      </motion.section>
    </motion.div>
  );
}

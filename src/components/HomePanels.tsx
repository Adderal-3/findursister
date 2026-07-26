import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, Compass, Eye, LockKeyhole, Star, UsersRound, X,
} from 'lucide-react';
import { LEVEL_TYPE_LABELS, levelConfig } from '../game/levels';
import { STORY_CHAPTERS } from '../game/progression';
import type { Game } from '../hooks/useGame';

function PanelShell({
  title,
  eyebrow,
  icon: Icon,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  icon: typeof Eye;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1500] flex items-center justify-center bg-[#3f3028]/68 p-3 sm:p-5"
      onClick={onClose}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-panel-title"
        initial={{ y: 24, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 24, scale: 0.96 }}
        className="qingya-menu-panel qingya-menu-panel--solid flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden shadow-[0_24px_70px_rgba(63,43,31,.3)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[#b99267]/18 px-4 py-3.5">
          <span className="home-icon-disc flex h-11 w-11 shrink-0 items-center justify-center text-[#3f776e]">
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black tracking-[0.26em] text-[#d07847]">{eyebrow}</p>
            <h2 id="home-panel-title" className="font-display truncate text-2xl font-black text-[#58382b]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`关闭${title}`}
            className="home-icon-disc flex h-10 w-10 shrink-0 items-center justify-center text-[#7b5a45] transition active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        {children}
      </motion.section>
    </motion.div>
  );
}

export function PartnersPanel({ game, onClose }: { game: Game; onClose: () => void }) {
  const recruited = game.partners.filter((partner) => partner.recruited).length;

  return (
    <PanelShell title="伙伴小院" eyebrow="相遇条件与同行加成" icon={UsersRound} onClose={onClose}>
      <div className="shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between rounded-2xl border border-[#d6bb93]/45 bg-[#fffdf6] px-4 py-3 shadow-sm">
          <div>
            <div className="text-xs font-black text-[#8b735f]">已集结伙伴</div>
            <div className="font-display text-2xl font-black text-[#3e756d]">{recruited} / 8</div>
          </div>
          <div className="rounded-full bg-[#ffe2c0] px-3 py-2 text-xs font-black text-[#b5653b]">
            总榜 +{Math.round(game.partnerBonusRate * 10_000) / 100}%
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2.5">
          {game.partners.map((partner) => (
            <article
              key={partner.id}
              className={`relative overflow-hidden rounded-2xl border p-3 shadow-[0_4px_12px_rgba(94,65,41,.08)] ${
                partner.recruited
                  ? 'border-[#74b3a5]/55 bg-[#eefaf4]'
                  : 'border-[#d8c5a8]/45 bg-[#fffdf6]'
              }`}
              title={partner.recruited ? `${partner.name}已加入` : partner.lockedHint}
            >
              {partner.recruited ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex h-16 w-16 shrink-0 items-end justify-center rounded-full bg-[#bce7da]">
                      <img
                        src={partner.image}
                        alt={partner.name}
                        className="h-[3.75rem] w-[3.75rem] object-contain"
                      />
                      <span className="absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#56a78e] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black tracking-[0.18em] text-[#a36745]">已加入</div>
                      <div className="font-display text-xl font-black text-[#4f3429]">{partner.name}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] font-black text-[#735e4e]">已加入 · 总榜 +1.25%</div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8ded0] text-[#887665]">
                      <LockKeyhole className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[9px] font-black tracking-[0.18em] text-[#a36745]">尚未相遇</div>
                      <div className="text-xs font-black text-[#5f493c]">获得方式</div>
                    </div>
                  </div>
                  <div className="mt-2 min-h-10 text-[11px] font-black leading-5 text-[#735e4e]">
                    {partner.lockedHint}
                  </div>
                  <div className="mt-1 text-[10px] font-bold text-[#9a806b]">
                    当前进度：{partner.progressLabel(partner.value)}
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#ded0bc]">
                    <motion.div
                      animate={{ width: `${partner.progress * 100}%` }}
                      className="h-full rounded-full bg-[#e3955e]"
                    />
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

export function LevelSelectPanel({
  game,
  onClose,
  onStart,
}: {
  game: Game;
  onClose: () => void;
  onStart: (level: number) => void;
}) {
  const currentChapter = Math.min(
    STORY_CHAPTERS.length,
    Math.max(1, Math.ceil(game.unlockedMaxLevel / 20)),
  );
  const [chapterId, setChapterId] = useState(currentChapter);
  const chapter = STORY_CHAPTERS[chapterId - 1] ?? STORY_CHAPTERS[0];
  const chapterLevels = Array.from(
    { length: chapter.end - chapter.start + 1 },
    (_, index) => chapter.start + index,
  );
  const chapterStars = chapterLevels.reduce((sum, level) => sum + (game.levelStars[level] ?? 0), 0);

  return (
    <PanelShell title="寻物长卷" eyebrow="重玩旧关补星解锁新篇" icon={Compass} onClose={onClose}>
      <div className="shrink-0 px-4 pt-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {STORY_CHAPTERS.map((item) => {
            const locked = game.starTotal < item.gate || game.best.maxLevel < item.start;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setChapterId(item.id)}
                className={`relative shrink-0 rounded-2xl px-3 py-2 text-left ${
                  chapterId === item.id
                    ? 'bg-[#3f7e74] text-white shadow-md'
                    : 'border border-white/75 bg-white/58 text-[#6d5242]'
                }`}
              >
                <span className="block text-[9px] font-black tracking-wider">第{item.id}篇</span>
                <span className="block text-xs font-black">{item.name}</span>
                {locked && <LockKeyhole className="absolute top-1.5 right-1.5 h-3 w-3 opacity-65" />}
              </button>
            );
          })}
        </div>
        <div className="mt-1 rounded-2xl border border-white/75 bg-white/58 px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-xl font-black text-[#5d3e30]">{chapter.name}</div>
              <div className="text-[10px] font-bold text-[#8f7764]">{chapter.subtitle}</div>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-[#ffe4ad] px-2.5 py-1 text-xs font-black text-[#a66734]">
              <Star className="h-3.5 w-3.5 fill-current" />
              {chapterStars} / 60
            </div>
          </div>
          {chapter.gate > 0 && game.starTotal < chapter.gate && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-[#b26443]">
              <LockKeyhole className="h-3 w-3" />
              全局累计 {chapter.gate} 星解锁 · 当前 {game.starTotal} 星
            </div>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
          {chapterLevels.map((level) => {
            const locked = level > game.unlockedMaxLevel;
            const stars = game.levelStars[level] ?? 0;
            const config = levelConfig(level);
            return (
              <button
                key={level}
                type="button"
                disabled={locked}
                onClick={() => onStart(level)}
                aria-label={locked ? `第${level}关未解锁` : `开始第${level}关`}
                className={`relative aspect-square rounded-2xl border p-1.5 text-center transition active:scale-95 ${
                  locked
                    ? 'cursor-not-allowed border-[#9b8b7b]/12 bg-[#897e73]/12 text-[#a99d91]'
                    : level === game.unlockedMaxLevel
                      ? 'border-[#e28b51]/55 bg-[#fff0d1] shadow-md'
                      : 'border-white/75 bg-white/62 text-[#5c4335]'
                }`}
              >
                {locked ? (
                  <LockKeyhole className="mx-auto h-4 w-4" />
                ) : (
                  <>
                    <span className="block font-display text-lg font-black">{level}</span>
                    <span className="mt-0.5 flex justify-center gap-px">
                      {Array.from({ length: 3 }, (_, index) => (
                        <Star
                          key={index}
                          className={`h-2.5 w-2.5 ${
                            index < stars ? 'fill-[#e3a553] text-[#c47c38]' : 'fill-[#ddd0bd] text-[#aa967c]'
                          }`}
                        />
                      ))}
                    </span>
                    {config.type !== 'standard' && (
                      <span className="mt-0.5 block truncate text-[8px] font-black text-[#b16e46]">
                        {LEVEL_TYPE_LABELS[config.type]}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </PanelShell>
  );
}

export function HomePanelRouter({
  panel,
  game,
  onClose,
  onStartLevel,
}: {
  panel: 'partners' | 'levels' | null;
  game: Game;
  onClose: () => void;
  onStartLevel: (level: number) => void;
}) {
  return (
    <AnimatePresence>
      {panel === 'partners' && <PartnersPanel game={game} onClose={onClose} />}
      {panel === 'levels' && (
        <LevelSelectPanel game={game} onClose={onClose} onStart={onStartLevel} />
      )}
    </AnimatePresence>
  );
}

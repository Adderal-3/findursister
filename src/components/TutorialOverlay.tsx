import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock3, Eye, Lightbulb, Zap } from 'lucide-react';
import { gameStorage, SAVE_KEYS } from '../game/storage';
import type { Game } from '../hooks/useGame';

type TutorialLevel = 1 | 2 | 3;

const LESSONS = [
  {
    title: '先看目标，再点物件',
    description: '顶部会一次列出本关目标。轻点符合当前条件的完整物件，完成后会明确提示下一项。',
    icon: Eye,
  },
  {
    title: '连续找对，分数更高',
    description: '连续命中会提高连击倍率；点错物件或空白会扣 3 秒，并清空连击。',
    icon: Zap,
  },
  {
    title: '越早找到，得分越高',
    description: '每次命中按当前剩余时间计分。左下可加时和静音，右下提示会指出一个正确物件。',
    icon: Clock3,
  },
] as const;

function loadSeenTutorials(): Set<TutorialLevel> {
  try {
    const value: unknown = JSON.parse(gameStorage.get(SAVE_KEYS.tutorial) ?? '[]');
    if (!Array.isArray(value)) return new Set();
    return new Set(
      value.filter((level): level is TutorialLevel => level === 1 || level === 2 || level === 3),
    );
  } catch {
    return new Set();
  }
}

export function TutorialOverlay({ game }: { game: Game }) {
  const seenRef = useRef(loadSeenTutorials());
  const [open, setOpen] = useState(false);
  const { level, mode, phase, setPaused } = game;

  useEffect(() => {
    const isGuideLevel = level >= 1 && level <= 3;
    const tutorialComplete = ([1, 2, 3] as TutorialLevel[])
      .every((tutorialLevel) => seenRef.current.has(tutorialLevel));
    const shouldOpen = phase === 'playing'
      && mode === 'levels'
      && isGuideLevel
      && !tutorialComplete;

    let timer: number | null = null;
    if (shouldOpen && !open) {
      timer = window.setTimeout(() => {
        setOpen(true);
        setPaused(true);
      }, 0);
    } else if (phase !== 'playing' && open) {
      timer = window.setTimeout(() => setOpen(false), 0);
    }
    return () => {
      if (timer != null) window.clearTimeout(timer);
    };
  }, [level, mode, open, phase, setPaused]);

  const finishTutorial = () => {
    const completed: TutorialLevel[] = [1, 2, 3];
    seenRef.current = new Set(completed);
    gameStorage.set(SAVE_KEYS.tutorial, JSON.stringify(completed));
    setOpen(false);
    game.setPaused(false);
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[1600] flex items-center justify-center bg-[#3f2d25]/58 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <motion.section
        initial={{ y: 24, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 22 }}
        className="qingya-menu-panel w-full max-w-sm px-5 py-5 shadow-2xl"
      >
        <div className="text-center">
          <div className="text-[10px] font-black tracking-[0.24em] text-[#a26a45]">
            新手引导 · 一次看完
          </div>
          <h2 id="tutorial-title" className="mt-1 font-display text-2xl font-black text-[#5d3b2a]">
            三件事，马上开始寻宝
          </h2>
          <p className="mt-1 text-xs font-bold text-[#8b755f]">后续关卡不会再重复弹出教学</p>
        </div>

        <div className="mt-4 space-y-2.5">
          {LESSONS.map(({ title, description, icon: Icon }, index) => (
            <div
              key={title}
              className="flex items-start gap-3 rounded-2xl border border-[#d8c3a1]/55 bg-[#fffdf6]/92 px-3 py-3"
            >
              <span className="qingya-round-button flex h-11 w-11 shrink-0 items-center justify-center text-[#7a5034]">
                <Icon className="h-5 w-5" strokeWidth={2.3} />
              </span>
              <div className="min-w-0">
                <div className="font-display text-sm font-black text-[#5d3b2a]">
                  {index + 1}. {title}
                </div>
                <p className="mt-0.5 text-[11px] font-bold leading-5 text-[#76685b]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-black text-[#9b765c]">
          <Lightbulb className="h-3.5 w-3.5" />
          找齐顶部全部目标即可过关
        </div>

        <button
          type="button"
          onClick={finishTutorial}
          className="qingya-crisp-action mt-4 flex min-h-12 w-full items-center justify-center px-6 font-display text-base font-black tracking-[0.14em] text-[#fff9dc] transition active:scale-[0.98]"
        >
          我知道了 · 开始本关
        </button>
      </motion.section>
    </motion.div>
  );
}

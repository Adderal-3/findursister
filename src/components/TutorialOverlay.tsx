import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock3, FastForward, MoveHorizontal, Zap } from 'lucide-react';
import { gameStorage, SAVE_KEYS } from '../game/storage';
import type { Game } from '../hooks/useGame';

type TutorialLevel = 1 | 2 | 3;

const LESSONS = {
  1: {
    eyebrow: '第一关 · 浏览画卷',
    title: '按住画面，左右拖动',
    description: '场景比屏幕更宽。按住空白或物件附近左右拖动，就能探索整幅画卷。',
    detail: '拖动不会判为点错；只有轻点松开时才会进行寻物判定。',
    icon: MoveHorizontal,
  },
  2: {
    eyebrow: '第二关 · 连续命中',
    title: '找得越准，连击越高',
    description: '连续点中正确物件会提高连击倍率，间隔多久都不会中断。',
    detail: '点错物件或空白会扣 3 秒，并把当前连击清零。',
    icon: Zap,
  },
  3: {
    eyebrow: '第三关 · 抢分规则',
    title: '剩余时间就是分数',
    description: '每次命中的得分由“当前剩余时间 × 连击倍率”决定，越早找到越划算。',
    detail: '完成顶部全部目标即可过关；高分会获得更高星级。',
    icon: Clock3,
  },
} satisfies Record<TutorialLevel, {
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  icon: typeof MoveHorizontal;
}>;

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
  const [activeLevel, setActiveLevel] = useState<TutorialLevel | null>(null);
  const { level, mode, phase, setPaused } = game;

  useEffect(() => {
    const tutorialLevel = level as TutorialLevel;
    const shouldOpen = phase === 'playing'
      && mode === 'levels'
      && (tutorialLevel === 1 || tutorialLevel === 2 || tutorialLevel === 3)
      && !seenRef.current.has(tutorialLevel);

    let timer: number | null = null;
    if (shouldOpen && activeLevel !== tutorialLevel) {
      timer = window.setTimeout(() => {
        setActiveLevel(tutorialLevel);
        setPaused(true);
      }, 0);
    } else if (phase !== 'playing' && activeLevel != null) {
      timer = window.setTimeout(() => setActiveLevel(null), 0);
    }
    return () => {
      if (timer != null) window.clearTimeout(timer);
    };
  }, [activeLevel, level, mode, phase, setPaused]);

  const persistSeen = (levels: TutorialLevel[]) => {
    for (const level of levels) seenRef.current.add(level);
    gameStorage.set(SAVE_KEYS.tutorial, JSON.stringify([...seenRef.current].sort()));
  };

  const closeCurrent = () => {
    if (activeLevel == null) return;
    persistSeen([activeLevel]);
    setActiveLevel(null);
    game.setPaused(false);
  };

  const skipAll = () => {
    persistSeen([1, 2, 3]);
    setActiveLevel(null);
    game.setPaused(false);
  };

  if (activeLevel == null) return null;

  const lesson = LESSONS[activeLevel];
  const Icon = lesson.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-[1600] flex items-center justify-center bg-[#3f2d25]/58 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
    >
      <motion.section
        initial={{ y: 24, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 22 }}
        className="qingya-menu-panel w-full max-w-sm px-6 py-6 text-center shadow-2xl"
      >
        <div className="mb-4 flex justify-center gap-1.5" aria-label={`教学 ${activeLevel} / 3`}>
          {([1, 2, 3] as TutorialLevel[]).map((level) => (
            <span
              key={level}
              className={`h-1.5 rounded-full transition-all ${
                level === activeLevel ? 'w-7 bg-[#a9653e]' : 'w-3 bg-[#d7c7ad]'
              }`}
            />
          ))}
        </div>

        <motion.div
          animate={
            activeLevel === 1
              ? { x: [-22, 22, -22] }
              : activeLevel === 2
                ? { scale: [1, 1.12, 1] }
                : { rotate: [0, -7, 7, 0] }
          }
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="qingya-round-button mx-auto mb-3 flex h-16 w-16 items-center justify-center text-[#7a5034]"
        >
          <Icon className="h-7 w-7" strokeWidth={2.2} />
        </motion.div>

        <div className="text-[11px] font-black tracking-[0.22em] text-[#a26a45]">
          {lesson.eyebrow}
        </div>
        <h2 id="tutorial-title" className="mt-1 font-display text-2xl font-black text-[#5d3b2a]">
          {lesson.title}
        </h2>
        <p className="mt-3 text-sm font-bold leading-6 text-[#76685b]">
          {lesson.description}
        </p>
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/55 px-4 py-3 text-left text-xs font-bold leading-5 text-[#8b755f]">
          {lesson.detail}
        </div>

        <button
          type="button"
          onClick={closeCurrent}
          className="qingya-level-plaque mt-5 flex min-h-12 w-full items-center justify-center px-6 font-display text-base font-black tracking-[0.16em] text-[#fff9dc] transition active:scale-[0.98]"
        >
          开始本关
        </button>
        <button
          type="button"
          onClick={skipAll}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-[#8b755f] transition hover:text-[#684832]"
        >
          <FastForward className="h-3.5 w-3.5" />
          跳过全部教学
        </button>
      </motion.section>
    </motion.div>
  );
}

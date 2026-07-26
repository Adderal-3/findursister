import { useGame } from './hooks/useGame';
import { StartScreen } from './components/StartScreen';
import { Hud } from './components/Hud';
import { TargetBar } from './components/TargetBar';
import { GameField } from './components/GameField';
import { Overlays } from './components/Overlays';
import { StaminaDialog } from './components/StaminaDialog';
import { TutorialOverlay } from './components/TutorialOverlay';
import { PartnerRecruitDialog } from './components/PartnerRecruitDialog';
import { OutsideAppMask } from './components/OutsideAppMask';

export default function App() {
  const game = useGame();

  return (
    <>
      {game.phase === 'menu' ? (
        <StartScreen game={game} />
      ) : (
        <div className="qingya-shell relative h-dvh overflow-hidden bg-[#efe5cf]">
          <GameField key={game.round} game={game} />
          <Hud game={game} />
          <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+3.85rem)] z-30 mx-auto w-full max-w-3xl px-3 sm:px-5">
            <TargetBar
              targets={game.allTargets}
              activeIndex={game.activeGoalIndex}
              notice={game.goalNotice}
              timeBoostToast={game.timeBoostToast}
            />
          </div>
          <Overlays game={game} />
          <TutorialOverlay game={game} />
        </div>
      )}
      <StaminaDialog game={game} />
      <PartnerRecruitDialog game={game} />
      {/* 站外拦截：不在大神 App 内时全屏遮罩，点任意处唤端。必须最后渲染以覆盖一切。 */}
      <OutsideAppMask />
    </>
  );
}

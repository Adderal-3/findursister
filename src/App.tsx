import { useGame } from './hooks/useGame';
import { StartScreen } from './components/StartScreen';
import { Hud } from './components/Hud';
import { TargetBar } from './components/TargetBar';
import { GameField } from './components/GameField';
import { Overlays } from './components/Overlays';
import { StaminaDialog } from './components/StaminaDialog';
import { TutorialOverlay } from './components/TutorialOverlay';

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
          <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+3.7rem)] z-30 mx-auto w-full max-w-3xl px-3 sm:px-5">
            <TargetBar targets={game.targets} />
          </div>
          <Overlays game={game} />
          <TutorialOverlay game={game} />
        </div>
      )}
      <StaminaDialog game={game} />
    </>
  );
}

import { useGame } from './hooks/useGame';
import { StartScreen } from './components/StartScreen';
import { Hud } from './components/Hud';
import { GameField } from './components/GameField';
import { Overlays } from './components/Overlays';
import { VideoRewardDialog } from './components/VideoRewardDialog';
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
        <div className="qingya-shell relative flex h-dvh flex-col overflow-hidden bg-[#efe5cf]">
          {/* 顶部 HUD（关卡牌 + 任务相框）在正常文档流中占位，见 Hud.tsx */}
          <Hud game={game} />
          {/* 棋盘：占据页眉之下的全部剩余空间，与任务相框物理分离、互不遮挡 */}
          <div className="relative min-h-0 flex-1">
            <GameField key={game.round} game={game} />
          </div>
          <Overlays game={game} />
          {/* 任务视频弹窗：对局中加时 / 失败复活共用，覆盖在结算与提示弹窗之上 */}
          <VideoRewardDialog game={game} />
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

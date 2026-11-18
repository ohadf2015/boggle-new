'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { GameShell } from '@/components/game/shell';
import type { PyramidState } from '@/lib/connections/pyramid/gameLogic';
import type { ConnectionPuzzle, GameState } from '@/lib/connections/types';
import type { BridgeProgressApi } from '../useBridgeProgress';
import PuzzleCard from '../PuzzleCard';
import RankBadge from '../RankBadge';
import FinaleCard from './FinaleCard';
import PyramidHeader from './PyramidHeader';
import { PyramidLeftRail, PyramidRightRail } from './PyramidShellRails';

interface PyramidPlayProps {
  inShell: boolean;
  daily: boolean;
  state: PyramidState;
  input: string;
  isAdmin: boolean;
  progressApi: BridgeProgressApi;
  currentPuzzle: ConnectionPuzzle | null;
  puzzleState: GameState;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onGiveUp: () => void;
  onRevealHint: () => void;
  onAdvance: () => void;
}

/** The pyramid's play screen: the pyramid is the progress, the riddle card is the action. */
export default function PyramidPlay({
  inShell,
  daily,
  state,
  input,
  isAdmin,
  progressApi,
  currentPuzzle,
  puzzleState,
  onInputChange,
  onSubmit,
  onGiveUp,
  onRevealHint,
  onAdvance,
}: PyramidPlayProps) {
  const { t } = useLanguage();
  const { pyramid } = state;
  return (
    <GameShell
      mode="word-chain"
      accent="purple"
      left={inShell ? <PyramidLeftRail t={t} state={state} metaAnswer={pyramid.metaAnswer} /> : null}
      right={<PyramidRightRail t={t} state={state} />}
    >
      {/* A size container on phones: the header and stage read its height (in rem, so
          an enlarged system font counts) and shed parts on short screens instead of
          pushing the keyboard below the fold. The shell (desktop) layout opts out. */}
      <div
        className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2.5 px-4 py-2 [container-type:size] shell:max-w-none shell:px-0 shell:py-0 shell:[container-type:normal]"
        data-testid="pyramid-root"
      >
        {!inShell && (
          <PyramidHeader
            testId="pyramid-header"
            daily={daily}
            state={state}
            metaAnswer={pyramid.metaAnswer}
            rankSlot={<RankBadge compact standing={progressApi.standing} rankUpId={progressApi.rankUpId} onRankUpShown={progressApi.dismissRankUp} />}
          />
        )}

        {state.stage < 3 && currentPuzzle ? (
          <PuzzleCard
            puzzle={currentPuzzle}
            state={puzzleState}
            isAdmin={isAdmin}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onGiveUp={onGiveUp}
            onRevealHint={onRevealHint}
            onRate={() => {}}
            onNext={onAdvance}
            showRating={false}
            showMascot={false}
          />
        ) : (
          <FinaleCard
            bridges={state.solvedBridges}
            pyramid={pyramid}
            input={input}
            wrongAttempts={state.wrongAttempts}
            hintRevealed={state.hintRevealed}
            status={state.status}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            onGiveUp={onGiveUp}
            onRevealHint={onRevealHint}
            onNext={onAdvance}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </GameShell>
  );
}

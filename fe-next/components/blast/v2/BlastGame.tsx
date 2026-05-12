'use client';
import { useState } from 'react';
import type { BlastLevel } from '@/lib/blast/v2/types';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { useBlastProgress } from '@/lib/blast/v2/useBlastProgress';
import { starRating } from '@/lib/blast/v2/anti-cheat';
import { BlastBoard } from './BlastBoard';
import { BlastHud } from './BlastHud';
import { BlastLevelIntroCard } from './BlastLevelIntroCard';
import { BlastLevelCompleteCard } from './BlastLevelCompleteCard';
import { BlastChestOpenModal } from './BlastChestOpenModal';

type Props = { level: BlastLevel; onAdvance: () => void };

export function BlastGame({ level, onAdvance }: Props) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const { state, handlers } = useBlastV2(level);
  const { state: progressState, clearLevel, openChest, openMutation } = useBlastProgress();
  const [showChestModal, setShowChestModal] = useState(false);

  // On level complete, submit to API
  if (state.status === 'levelComplete' && !introDismissed) {
    const submission = {
      levelNumber: level.levelNumber,
      locale: level.locale,
      wordsFound: Array.from(state.foundWords),
      timeSeconds: 0, // TODO: Plan 3 placeholder - track actual time
      hintsUsed: state.hintsUsed,
      wrongAttempts: 0, // TODO: Plan 3 placeholder - track wrong attempts
      cascadesTriggered: state.cascadeCount,
    };
    const earnedCoins = state.coins;
    const earnedGems = state.cascadeCount; // Stub: Plan 3 placeholder
    clearLevel(submission, earnedCoins, earnedGems);

    // If chest is now complete, show modal
    if (progressState.chestProgress >= 1.0 && !showChestModal) {
      setShowChestModal(true);
    }
  }

  if (!introDismissed) {
    return <BlastLevelIntroCard level={level} onDismiss={() => setIntroDismissed(true)} />;
  }

  // Show chest open ceremony if chest is full
  if (showChestModal && progressState.chestContents) {
    return (
      <BlastChestOpenModal
        contents={progressState.chestContents}
        isOpen={true}
        onClose={() => {
          setShowChestModal(false);
          setIntroDismissed(false); // Reset for next level
          onAdvance();
        }}
      />
    );
  }

  if (state.status === 'levelComplete') {
    return (
      <BlastLevelCompleteCard
        coins={state.coins}
        cascadeCount={state.cascadeCount}
        onNext={onAdvance}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1530] text-white">
      <BlastHud
        levelNumber={state.level.levelNumber}
        coins={progressState.coins}
        chestNumber={progressState.chestNumber}
        chestProgress={progressState.chestProgress}
        chestContents={progressState.chestContents}
        onShuffle={handlers.onShuffle}
        onHint={() => {
          /* Plan 5 wires hints */
        }}
      />
      <BlastBoard
        level={state.level}
        selection={state.selection}
        invalidShakeKey={state.invalidShakeKey}
        onPointerDown={handlers.onPointerDown}
        onPointerEnter={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
      />
    </div>
  );
}

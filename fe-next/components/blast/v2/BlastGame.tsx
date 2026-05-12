'use client';
import { useState } from 'react';
import type { BlastLevel } from '@/lib/blast/v2/types';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { BlastBoard } from './BlastBoard';
import { BlastHud } from './BlastHud';
import { BlastLevelIntroCard } from './BlastLevelIntroCard';
import { BlastLevelCompleteCard } from './BlastLevelCompleteCard';

type Props = { level: BlastLevel; onAdvance: () => void };

export function BlastGame({ level, onAdvance }: Props) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const { state, handlers } = useBlastV2(level);

  if (!introDismissed) {
    return <BlastLevelIntroCard level={level} onDismiss={() => setIntroDismissed(true)} />;
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
        coins={state.coins}
        chestProgress={state.chestProgress}
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

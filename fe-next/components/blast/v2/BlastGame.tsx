'use client';
import { useState } from 'react';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen, MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';
import {
  markUnlockSeen,
  completeFtue,
  setSkipAll,
} from '@/lib/blast/v2/tutorial/unlocks-seen';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { useBlastProgress } from '@/lib/blast/v2/useBlastProgress';
import { useBlastTutorial } from '@/hooks/useBlastTutorial';
import { starRating } from '@/lib/blast/v2/anti-cheat';
import { BlastBoard } from './BlastBoard';
import { BlastHud } from './BlastHud';
import { BlastLevelIntroCard } from './BlastLevelIntroCard';
import { BlastLevelCompleteCard } from './BlastLevelCompleteCard';
import { BlastChestOpenModal } from './BlastChestOpenModal';
import { BlastFxOverlay } from './BlastFxOverlay';
import { BlastAtmosphereOverlay } from './BlastAtmosphereOverlay';
import { BlastFtueOverlay } from './BlastFtueOverlay';
import { BlastUnlockCard } from './BlastUnlockCard';

type Props = {
  level: BlastLevel;
  unlocksSeen?: UnlocksSeen;
  isVeteranPlayer?: boolean;
  onAdvance: () => void;
  onUpdateUnlocks?: (unlocks: UnlocksSeen) => void;
};

// Mode color map
const MODE_COLORS: Record<string, string> = {
  fruits: '#BFFF00', // lime
  animals: '#00FFFF', // cyan
  food: '#FF1493', // pink
  ocean: '#00FFFF', // cyan
  space: '#8B5CF6', // purple
  nature: '#BFFF00', // lime
  sports: '#FF1493', // pink
  colors: '#BFFF00', // lime
  transport: '#00FFFF', // cyan
  body: '#FF1493', // pink
  home: '#BFFF00', // lime
  school: '#00FFFF', // cyan
  tools: '#FF1493', // pink
  weather: '#00FFFF', // cyan
  music: '#BFFF00', // lime
  jobs: '#FF1493', // pink
  family: '#BFFF00', // lime
  numbers: '#00FFFF', // cyan
  feelings: '#FF1493', // pink
  mythology: '#8B5CF6', // purple
  science: '#BFFF00', // lime
  travel: '#00FFFF', // cyan
  art: '#FF1493', // pink
  time: '#BFFF00', // lime
  onboarding: '#BFFF00', // lime
};

export function BlastGame({
  level,
  unlocksSeen = {},
  isVeteranPlayer = false,
  onAdvance,
  onUpdateUnlocks,
}: Props) {
  const [introDismissed, setIntroDismissed] = useState(false);
  const { state, handlers } = useBlastV2(level);
  const { state: progressState, clearLevel, openChest, openMutation } = useBlastProgress();
  const [showChestModal, setShowChestModal] = useState(false);
  const tutorial = useBlastTutorial(level, unlocksSeen, isVeteranPlayer, onUpdateUnlocks ?? (() => {}));

  const handleFtueComplete = () => {
    const updated = completeFtue(unlocksSeen);
    onUpdateUnlocks?.(updated);
  };

  const handleUnlockCardDismiss = () => {
    if (tutorial.showUnlockCard) {
      const updated = markUnlockSeen(unlocksSeen, tutorial.showUnlockCard);
      onUpdateUnlocks?.(updated);
    }
  };

  const handleUnlockCardSkipAll = () => {
    const updated = setSkipAll(unlocksSeen, true);
    onUpdateUnlocks?.(updated);
  };

  const modeColor = MODE_COLORS[level.theme] || '#BFFF00';
  // FX integration point: BlastFxOverlay mounts useBlastFx internally
  // Board ref is obtained internally by BlastBoard via useRef

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
    return (
      <>
        <BlastLevelIntroCard level={level} onDismiss={() => setIntroDismissed(true)} />
        {tutorial.showFtueOverlay && (
          <BlastFtueOverlay
            onComplete={handleFtueComplete}
            isVeteran={isVeteranPlayer}
          />
        )}
      </>
    );
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
      {tutorial.showUnlockCard && (
        <BlastUnlockCard
          mechanic={tutorial.showUnlockCard}
          cardIndex={tutorial.unlockCardIndex}
          onDismiss={handleUnlockCardDismiss}
          onSkipAll={handleUnlockCardSkipAll}
        />
      )}
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
      <div className="relative">
        <BlastAtmosphereOverlay modeColor={modeColor} />
        <BlastFxOverlay />
        <BlastBoard
          level={state.level}
          selection={state.selection}
          invalidShakeKey={state.invalidShakeKey}
          onPointerDown={handlers.onPointerDown}
          onPointerEnter={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          modeColor={modeColor}
        />
      </div>
    </div>
  );
}

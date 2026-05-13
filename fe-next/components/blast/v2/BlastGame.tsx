'use client';
import { useState, useEffect } from 'react';
import type { BlastLevel } from '@/lib/blast/v2/types';
import { markUnlockSeen, completeFtue, setSkipAll, type UnlocksSeen, type MechanicKey } from '@/lib/blast/v2/tutorial/unlocks-seen';
import { useBlastV2 } from '@/lib/blast/v2/useBlastV2';
import { useBlastProgress } from '@/lib/blast/v2/useBlastProgress';
import { useBlastTutorial } from '@/hooks/useBlastTutorial';
import { starRating } from '@/lib/blast/v2/anti-cheat';
import { mechanicsForLevel } from '@/lib/blast/v2/mechanic-flags';
import { trackBlastLevelStarted, trackBlastLevelCompleted, trackBlastLevelAbandoned } from '@/lib/blast/v2/telemetry';
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
  const [levelStartTime] = useState(() => Date.now());
  const { state, handlers } = useBlastV2(level);
  const { state: progressState, clearLevel, openChest, openMutation } = useBlastProgress();
  const [showChestModal, setShowChestModal] = useState(false);
  const tutorial = useBlastTutorial(level, unlocksSeen, isVeteranPlayer, onUpdateUnlocks ?? (() => {}));

  // Track level start on intro dismissal
  useEffect(() => {
    if (introDismissed) {
      const mechanics = mechanicsForLevel(level.levelNumber);
      const mechanicKeys = Object.keys(mechanics).filter((k) => mechanics[k as keyof typeof mechanics]);
      trackBlastLevelStarted({
        level: level.levelNumber,
        locale: level.locale,
        theme: level.theme,
        mechanics: mechanicKeys,
      });
    }
  }, [introDismissed, level]);

  // Track abandonment on unmount or when level complete
  useEffect(() => {
    return () => {
      if (!introDismissed || state.status === 'levelComplete') return; // Only track if playing
      trackBlastLevelAbandoned({
        level: level.levelNumber,
        locale: level.locale,
        time_in_level_seconds: Math.round((Date.now() - levelStartTime) / 1000),
        words_found_count: state.foundWords.size,
      });
    };
  }, [introDismissed, state.status, state.foundWords, level, levelStartTime]);

  // Track level completed and submit
  useEffect(() => {
    if (state.status === 'levelComplete' && introDismissed) {
      const timeSeconds = Math.round((Date.now() - levelStartTime) / 1000);
      const gemsCollected = Math.round(state.chestProgress * 10);

      // Build submission for star rating
      const submission = {
        levelNumber: level.levelNumber,
        locale: level.locale,
        wordsFound: Array.from(state.foundWords),
        timeSeconds,
        hintsUsed: state.hintsUsed,
        wrongAttempts: 0,
        cascadesTriggered: state.cascadeCount,
      };

      const stars = starRating(submission, level);

      trackBlastLevelCompleted({
        level: level.levelNumber,
        locale: level.locale,
        theme: level.theme,
        time_seconds: timeSeconds,
        hints_used: state.hintsUsed,
        cascades: state.cascadeCount,
        stars,
        coins_earned: state.coins,
        gems_collected: gemsCollected,
      });

      // Submit to API
      clearLevel(submission, state.coins, gemsCollected);
    }
  }, [state.status, introDismissed, state.cascadeCount, state.hintsUsed, level, state.coins, state.chestProgress, levelStartTime, state.foundWords, clearLevel]);

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

  // Show chest modal when complete
  useEffect(() => {
    if (state.status === 'levelComplete' && progressState.chestProgress >= 1.0 && !showChestModal) {
      setShowChestModal(true);
    }
  }, [state.status, progressState.chestProgress, showChestModal]);

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
      {tutorial.showFtueOverlay && (
        <BlastFtueOverlay onComplete={handleFtueComplete} isVeteran={isVeteranPlayer} />
      )}
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
      <div className="relative flex items-center justify-center px-4 py-6 sm:py-10">
        <BlastAtmosphereOverlay modeColor={modeColor} />
        <BlastFxOverlay />
        <div className="w-full max-w-[560px]" style={{ containerType: 'inline-size' }}>
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
    </div>
  );
}

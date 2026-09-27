'use client';

import React from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { EarthquakeWarning, FireRoundIndicator, FireBottomEffect } from '@/components/earthquake';
import { AchievementProgressTracker } from '@/components/achievements/AchievementProgressTracker';
import { Loader } from '@/components/ui/Loader';
import KeyboardHintTooltip from '@/components/game/KeyboardHintTooltip';
import { TrainingHints, SkillUnlockToast } from '@/components/training';
import type { TrainingHintType } from '@/hooks/useTrainingAnalysis';
import type { EarthquakeState } from '@/shared/types/earthquake';

interface GameOverlaysProps {
  /** Earthquake state */
  earthquakeState: EarthquakeState;
  /** Fire round state */
  fireRoundActive: boolean;
  fireRoundRemaining: number;
  /** Word validation loading state */
  isValidatingWords: boolean;
  /** Achievement tracker props */
  validWordCount: number;
  comboLevel: number;
  maxCombo: number;
  wordLengths: number[];
  timeSinceStart: number;
  gameDuration: number;
  isGameOver: boolean;
  /** Training mode state (optional) */
  isPracticeMode?: boolean;
  trainingCurrentHint?: TrainingHintType | null;
  onDismissTrainingHint?: () => void;
  trainingComplete?: boolean;
  trainingJustUnlocked?: string | null;
  onClearTrainingUnlock?: () => void;
  /** Keyboard hint */
  showKeyboardHint: boolean;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * Shared overlay components for the single player game
 * Includes earthquake warning, fire round indicator, validation loading, etc.
 */
export function GameOverlays({
  earthquakeState,
  fireRoundActive,
  fireRoundRemaining,
  isValidatingWords,
  validWordCount,
  comboLevel,
  maxCombo,
  wordLengths,
  timeSinceStart,
  gameDuration,
  isGameOver,
  isPracticeMode = false,
  trainingCurrentHint,
  onDismissTrainingHint,
  trainingComplete,
  trainingJustUnlocked,
  onClearTrainingUnlock,
  showKeyboardHint,
  t,
}: GameOverlaysProps): React.ReactElement {
  return (
    <>
      {/* Earthquake Warning Overlay */}
      <EarthquakeWarning isVisible={earthquakeState === 'warning'} />

      {/* Fire Round Indicator */}
      <FireRoundIndicator
        isActive={fireRoundActive}
        remainingSeconds={fireRoundRemaining}
      />

      {/* Pixelated fire effect at bottom of screen */}
      <FireBottomEffect isActive={fireRoundActive} />

      {/* Word Validation Loading Overlay */}
      <AdaptiveAnimatePresence>
        {isValidatingWords && (
          <AdaptiveMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-neo-navy/90 backdrop-blur-xs"
          >
            <div className="flex flex-col items-center gap-4 p-6 bg-neo-cream border-4 border-neo-black rounded-neo shadow-hard-lg text-neo-black">
              <Loader
                size="md"
                className='text-neo-black'
                text={t('singlePlayer.verifyingWords')}
              />
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>

      {/* Achievement Progress Tracker */}
      <AchievementProgressTracker
        validWordCount={validWordCount}
        comboLevel={comboLevel}
        maxCombo={maxCombo}
        wordLengths={wordLengths}
        timeSinceStart={timeSinceStart}
        gameDuration={gameDuration}
        earnedAchievements={[]}
        isGameOver={isGameOver}
      />

      {/* Keyboard Input Hint - Desktop only */}
      {showKeyboardHint && (
        <KeyboardHintTooltip delaySeconds={10} desktopOnly={true} t={t} />
      )}


      {/* Training Hints - practice mode only */}
      {isPracticeMode && onDismissTrainingHint && (
        <TrainingHints
          currentHint={trainingCurrentHint ?? null}
          onDismiss={onDismissTrainingHint}
          trainingComplete={trainingComplete ?? false}
          otherTooltipVisible={false}
        />
      )}

      {/* Skill Unlock Toast */}
      {isPracticeMode && onClearTrainingUnlock && (
        <SkillUnlockToast
          skillId={trainingJustUnlocked ?? null}
          onDismiss={onClearTrainingUnlock}
        />
      )}
    </>
  );
}

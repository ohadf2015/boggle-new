/** AdventureTailOverlays — tail overlay block: mode vignettes, toasts, tutorial, retry assist, rune bar. */
'use client';

import React from 'react';
import { LowHPOverlay } from '@/components/wordhunt/LowHPOverlay';
import { AdventureToast } from './AdventureToast';
import MechanicBonusToast from './MechanicBonusToast';
import RetryAssistModal from './RetryAssistModal';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { RuneBar } from './RuneBar';
import { getNearMissMessages } from '@/lib/adventure/nearMiss';
import { trackModalDismissed } from '@/utils/posthogEngagement';

type RuneBarRunes = React.ComponentProps<typeof RuneBar>['runes'];
type MechanicBonus = React.ComponentProps<typeof MechanicBonusToast>['bonus'];
type UpgradeTriggered = React.ComponentProps<typeof AdventureToast>['upgradeTriggered'];

interface BestAttempt {
  bestWords: number;
  bestScore: number;
  attemptCount: number;
}

interface AdventureTailOverlaysProps {
  archetype: string;
  currentHP: number | null | undefined;
  movesRemaining: number | undefined;
  isPlaying: boolean;
  upgradeTriggered: UpgradeTriggered;
  lastWordWasThemed: boolean;
  themedBonusMultiplier?: number;
  mechanicBonus: MechanicBonus;
  dismissMechanicBonus: () => void;
  bossActive: boolean;
  showRetryAssist: boolean;
  consecutiveFailures: number;
  wordsFoundCount: number;
  score: number;
  bestAttempt: BestAttempt | null;
  objectives: Parameters<typeof getNearMissMessages>[0];
  onRetryFromAssist: () => void;
  onRetryWithBonus: () => void;
  onRetryWithHint: () => void;
  onExit: () => void;
  forgeEquippedRunes: RuneBarRunes;
  maxRuneSlots: number;
}

export default function AdventureTailOverlays({
  archetype,
  currentHP,
  movesRemaining,
  isPlaying,
  upgradeTriggered,
  lastWordWasThemed,
  themedBonusMultiplier,
  mechanicBonus,
  dismissMechanicBonus,
  bossActive,
  showRetryAssist,
  consecutiveFailures,
  wordsFoundCount,
  score,
  bestAttempt,
  objectives,
  onRetryFromAssist,
  onRetryWithBonus,
  onRetryWithHint,
  onExit,
  forgeEquippedRunes,
  maxRuneSlots,
}: AdventureTailOverlaysProps) {
  return (
    <>
      {archetype === 'hunt' && currentHP != null && <LowHPOverlay hp={currentHP} />}
      {archetype === 'blast' && movesRemaining === 1 && isPlaying && (
        <div
          className="fixed inset-0 z-40 pointer-events-none animate-pulse"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(255,20,147,0.15) 100%)',
          }}
        />
      )}
      <AdventureToast
        upgradeTriggered={upgradeTriggered}
        lastWordWasThemed={lastWordWasThemed}
        themedBonusMultiplier={themedBonusMultiplier}
      />
      <MechanicBonusToast
        bonus={mechanicBonus}
        onDismiss={dismissMechanicBonus}
        bossActive={bossActive}
      />
      {showRetryAssist && (
        <RetryAssistModal
          isOpen={showRetryAssist}
          consecutiveFailures={consecutiveFailures}
          bestWords={Math.max(wordsFoundCount, bestAttempt?.bestWords ?? 0)}
          bestScore={Math.max(score, bestAttempt?.bestScore ?? 0)}
          attemptCount={(bestAttempt?.attemptCount ?? 0) + 1}
          nearMissMessages={getNearMissMessages(objectives)}
          objectives={objectives}
          onRetry={onRetryFromAssist}
          onRetryWithBonus={onRetryWithBonus}
          onRetryWithHint={onRetryWithHint}
          onExit={() => {
            trackModalDismissed({ modalId: 'retry_assist', method: 'cta' });
            onExit();
          }}
        />
      )}
      <ModeCoach mode="adventure" />
      {archetype === 'forge' && forgeEquippedRunes.length > 0 && (
        <div className="fixed bottom-[var(--admob-banner-height,0px)] inset-x-0 z-30">
          <RuneBar runes={forgeEquippedRunes} maxSlots={maxRuneSlots} />
        </div>
      )}
    </>
  );
}

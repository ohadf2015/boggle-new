/**
 * BossOverlay Orchestrator Component (Simplified)
 *
 * Boss battle overlay that renders:
 * - Intro cinematic (BossEntranceCinematic)
 * - Active battle UI (simplified BossActiveBattleUI)
 * - Victory cinematic (BossDefeatCinematic)
 * - Defeat screen (BossVictory with isVictory=false)
 *
 * Phase display derived from useAdventureBossNew hook state.
 * Arena effects rendered by BossArena.
 */

'use client';

import React, { memo, useCallback } from 'react';
import BossVictory from '../BossVictory';
import BossActiveBattleUI from './BossActiveBattleUI';
import BossArena from './BossArena';
import {
  CinematicPlayer,
  BossEntranceCinematic,
  BossDefeatCinematic,
  ENTRANCE_DURATION_SECONDS,
  DEFEAT_DURATION_SECONDS,
} from './cinematics';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { BossConfig } from '@/types/boss';
import type { AdventureGameState } from '@/types/adventure';
import type { BossPhaseNew } from '@/hooks/useAdventureBossNew';

// ==============================================
// TYPES
// ==============================================

interface BossOverlayProps {
  /** Boss configuration (null if not a boss level) */
  boss: BossConfig | null;
  /** When true, active battle UI is rendered in Phaser canvas (default: true).
   *  Intro/victory/defeat cinematics always render as React/Remotion. */
  usePhaserBossUI?: boolean;
  /** Current HP */
  currentHP: number;
  /** Maximum HP */
  maxHP: number;
  /** Current phase from new boss system */
  phase: BossPhaseNew;
  /** Current taunt text (translation key) */
  currentTaunt: string | null;
  /** Whether to show boss intro */
  showIntro?: boolean;
  /** Callback when intro cinematic finishes */
  onStartBattle?: () => void;
  /** Whether to show victory screen */
  showVictory?: boolean;
  /** Whether to show defeat screen */
  showDefeat?: boolean;
  /** Whether boss battle is actively running */
  isActive?: boolean;
  /** Stars earned (0-3) */
  stars: 0 | 1 | 2 | 3;
  /** Final score */
  score: number;
  /** Words found */
  wordsFound: string[];
  /** Game state (for BossVictory) */
  gameState: AdventureGameState;
  /** Callback to continue to next level */
  onContinue: () => void;
  /** Callback to retry boss level */
  onRetry: () => void;
  /** World number */
  worldNumber: number;
}

/**
 * Ref handle exposed to parent for damage dealing
 */
export interface BossOverlayRef {
  dealDamage: (amount: number) => void;
  timerExpired: () => void;
  startBattle: () => void;
  reset: () => void;
}

// ==============================================
// COMPONENT
// ==============================================

const BossOverlay = memo<BossOverlayProps>(
  ({
    boss,
    usePhaserBossUI = true,
    currentHP,
    maxHP,
    phase,
    currentTaunt,
    showIntro: showingIntro,
    onStartBattle: legacyOnStartBattle,
    showVictory: showingVictory,
    showDefeat: showingDefeat,
    isActive: effectiveIsActive = false,
    stars,
    score,
    wordsFound,
    gameState,
    onContinue,
    onRetry,
    worldNumber,
  }) => {
    const { t } = useLanguage();

    // ==============================================
    // CINEMATIC HANDLERS
    // ==============================================

    const handleEntranceComplete = useCallback(() => {
      legacyOnStartBattle?.();
    }, [legacyOnStartBattle]);

    const handleVictoryComplete = useCallback(() => {
      onContinue();
    }, [onContinue]);

    const handleDefeatComplete = useCallback(() => {
      onRetry();
    }, [onRetry]);

    // ==============================================
    // EARLY RETURN
    // ==============================================

    if (!boss) {
      return null;
    }

    // ==============================================
    // DISPLAY STATE
    // ==============================================

    const showingActivePhase = effectiveIsActive && !showingIntro;

    // ==============================================
    // RENDER
    // ==============================================

    return (
      <>
        {/* Arena Background Effect */}
        {showingActivePhase && !showingVictory && !showingDefeat && (
          <BossArena worldId={worldNumber} />
        )}

        {/* Intro Cinematic */}
        {showingIntro && (
          <CinematicPlayer
            composition={BossEntranceCinematic as unknown as React.ComponentType<Record<string, unknown>>}
            compositionProps={{
              bossName: t(boss.displayName),
              bossTitle: `Guardian of World ${worldNumber}`,
              bossImagePath: boss.imagePath,
              primaryColor: '#FFE135',
              worldNumber,
            }}
            durationSeconds={ENTRANCE_DURATION_SECONDS}
            onComplete={handleEntranceComplete}
            testId="boss-entrance-cinematic"
          />
        )}

        {/* Active Battle UI */}
        {showingActivePhase && !showingVictory && !showingDefeat && !usePhaserBossUI && (
          <BossActiveBattleUI
            boss={boss}
            currentHP={currentHP}
            maxHP={maxHP}
            phase={phase}
            currentTaunt={currentTaunt}
          />
        )}

        {/* Victory Cinematic */}
        {showingVictory && (
          <CinematicPlayer
            composition={BossDefeatCinematic as unknown as React.ComponentType<Record<string, unknown>>}
            compositionProps={{
              bossName: t(boss.displayName),
              bossImagePath: boss.imagePath,
              primaryColor: '#FFE135',
              secondaryColor: '#00FFFF',
              goldEarned: score > 500 ? 150 : 100,
              xpEarned: score > 300 ? 75 : 50,
              perfectVictory: stars === 3,
            }}
            durationSeconds={DEFEAT_DURATION_SECONDS}
            onComplete={handleVictoryComplete}
            testId="boss-victory-cinematic"
          />
        )}

        {/* Defeat Screen */}
        {showingDefeat && (
          <BossVictory
            boss={boss}
            isVictory={false}
            stars={stars}
            score={score}
            wordsFound={wordsFound}
            gameState={gameState}
            onContinue={handleDefeatComplete}
            onRetry={onRetry}
          />
        )}
      </>
    );
  }
);

BossOverlay.displayName = 'BossOverlay';

export default BossOverlay;

/**
 * BossOverlay Compound Component
 *
 * Encapsulates all boss battle rendering logic (intro, HP bar, dialogue, victory/defeat).
 * Reduces complexity in AdventureGame.tsx by providing a single component interface
 * for all boss-related UI elements.
 *
 * Usage:
 * <BossOverlay
 *   boss={bossConfig}
 *   healthState={healthState}
 *   currentTaunt={bossTaunt}
 *   showTaunt={showBossTaunt}
 *   showIntro={showBossIntro}
 *   onStartBattle={handleStartBattle}
 *   onSkipIntro={handleSkipIntro}
 *   showVictory={phase === 'victory'}
 *   showDefeat={phase === 'defeat'}
 *   stars={gameState.stars}
 *   score={gameState.score}
 *   wordsFound={gameState.wordsFound}
 *   onContinue={handleContinue}
 *   onRetry={handleRetry}
 *   worldNumber={levelConfig.world}
 * />
 */

'use client';

import React, { memo } from 'react';
import BossIntro from '../BossIntro';
import BossHPBar from '../BossHPBar';
import BossDialogue from '../BossDialogue';
import BossVictory from '../BossVictory';
import type { BossConfig, BossHealthState } from '@/types/boss';
import type { AdventureGameState } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface BossOverlayProps {
  /** Boss configuration (null if not a boss level) */
  boss: BossConfig | null;
  /** Boss health state */
  healthState: BossHealthState;
  /** Current taunt text (translation key) */
  currentTaunt: string | null;
  /** Whether taunt is visible */
  showTaunt: boolean;
  /** Whether to show boss intro */
  showIntro: boolean;
  /** Callback when player starts battle */
  onStartBattle: () => void;
  /** Callback when player skips intro */
  onSkipIntro: () => void;
  /** Whether to show victory screen */
  showVictory: boolean;
  /** Whether to show defeat screen */
  showDefeat: boolean;
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

// ==============================================
// COMPONENT
// ==============================================

/**
 * BossOverlay - Renders all boss battle UI elements
 *
 * Conditionally renders based on boss phase:
 * - Intro: BossIntro modal
 * - Active/Enraged: BossHPBar + BossDialogue
 * - Victory/Defeat: BossVictory modal
 */
const BossOverlay = memo<BossOverlayProps>(
  ({
    boss,
    healthState,
    currentTaunt,
    showTaunt,
    showIntro,
    onStartBattle,
    onSkipIntro,
    showVictory,
    showDefeat,
    stars,
    score,
    wordsFound,
    gameState,
    onContinue,
    onRetry,
    worldNumber,
  }) => {
    // Not a boss level - render nothing
    if (!boss) {
      return null;
    }

    const { phase } = healthState;

    return (
      <>
        {/* Boss Intro (before battle starts) */}
        {showIntro && (
          <BossIntro
            boss={boss}
            worldNumber={worldNumber}
            onStart={onStartBattle}
            onSkip={onSkipIntro}
          />
        )}

        {/* HP Bar (during active/enraged phases) */}
        {!showIntro && healthState.isActive && (
          <BossHPBar healthState={healthState} bossName={boss.displayName} />
        )}

        {/* Boss Dialogue/Taunts (during gameplay) */}
        {!showIntro &&
          healthState.isActive &&
          showTaunt &&
          currentTaunt && (
            <BossDialogue
              boss={boss}
              currentTaunt={currentTaunt}
              isVisible={showTaunt}
              position="top"
            />
          )}

        {/* Victory Screen */}
        {showVictory && (
          <BossVictory
            boss={boss}
            isVictory={true}
            stars={stars}
            score={score}
            wordsFound={wordsFound}
            gameState={gameState}
            onContinue={onContinue}
            onRetry={onRetry}
          />
        )}

        {/* Defeat Screen */}
        {showDefeat && (
          <BossVictory
            boss={boss}
            isVictory={false}
            stars={stars}
            score={score}
            wordsFound={wordsFound}
            gameState={gameState}
            onContinue={onContinue}
            onRetry={onRetry}
          />
        )}
      </>
    );
  }
);

BossOverlay.displayName = 'BossOverlay';

export default BossOverlay;

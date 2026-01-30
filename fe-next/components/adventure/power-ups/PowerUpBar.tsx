/**
 * PowerUpBar Component
 *
 * Container for all power-up buttons in horizontal layout.
 * Manages activation, cascade blocking, and effect triggering.
 */

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import toast from 'react-hot-toast';
import { PowerUpButton } from './PowerUpButton';
import { PowerUpActivationEffect } from './PowerUpActivationEffect';
import { usePowerUpState } from '@/hooks/usePowerUpState';
import { usePowerUpInventory } from '@/hooks/usePowerUpInventory';
import { usePowerUpEffects, type HintResult } from '@/hooks/usePowerUpEffects';
import type { TileState, PowerUpType } from '@/types/adventure';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PowerUpBarProps {
  /** Current game state for effect application */
  timeRemaining: number;
  totalTime: number;
  tiles: TileState[][];
  wordsFound: string[];
  cascadeActive: boolean;
  /** Callbacks for effect application */
  onFreezeTime: (newTime: number) => void;
  onHint: (hint: HintResult) => void;
  onScoreMultiplier: (expiresAt: number) => void;
  /** Optional dictionary for hint validation */
  dictionary?: Set<string>;
  className?: string;
}

/**
 * Power-up icon mapping
 */
const POWER_UP_ICONS: Record<PowerUpType, string> = {
  freezeTime: '❄️',
  hint: '💡',
  scoreMultiplier: '⭐',
};

/**
 * Power-up label translation keys
 */
const POWER_UP_LABELS: Record<PowerUpType, string> = {
  freezeTime: 'adventure.powerUps.freezeTime',
  hint: 'adventure.powerUps.hint',
  scoreMultiplier: 'adventure.powerUps.scoreMultiplier',
};

// ============================================
// COMPONENT
// ============================================

/**
 * PowerUpBar Component
 *
 * Displays 3 power-up buttons (Freeze Time, Hint, Score Multiplier).
 * Handles activation with cascade blocking and effect triggering.
 */
export function PowerUpBar({
  timeRemaining,
  totalTime,
  tiles,
  wordsFound,
  cascadeActive,
  onFreezeTime,
  onHint,
  onScoreMultiplier,
  dictionary = new Set(),
  className,
}: PowerUpBarProps) {
  const { t } = useLanguage();

  // Inventory for persistence
  const inventory = usePowerUpInventory();

  // State machines for each power-up with initial cooldown from inventory
  const freezeTimeState = usePowerUpState('freezeTime', {
    initialCooldownTimestamp: inventory.inventory.cooldownStartedAt.freezeTime,
  });
  const hintState = usePowerUpState('hint', {
    initialCooldownTimestamp: inventory.inventory.cooldownStartedAt.hint,
  });
  const scoreMultiplierState = usePowerUpState('scoreMultiplier', {
    initialCooldownTimestamp: inventory.inventory.cooldownStartedAt.scoreMultiplier,
  });

  // Effect activation functions
  const { activateFreezeTime, activateHint, activateScoreMultiplier } =
    usePowerUpEffects(
      {
        tiles,
        wordsFound,
        cascadeActive,
        timeRemaining,
        totalTime,
      },
      dictionary
    );

  // Active effect tracking (for visual effect display)
  const [activeEffect, setActiveEffect] = useState<{
    type: PowerUpType;
    origin: { x: number; y: number };
  } | null>(null);

  /**
   * Handle Freeze Time activation
   */
  const handleFreezeTime = useCallback(() => {
    // Check cascade blocking
    if (cascadeActive) {
      toast(t('adventure.powerUps.cascadeBlocked'));
      return;
    }

    // Activate power-up state machine
    const success = freezeTimeState.activate();
    if (!success) {
      return;
    }

    // Persist cooldown to inventory
    inventory.startCooldown('freezeTime');

    // Apply effect
    const result = activateFreezeTime();
    if (result === false) {
      return;
    }

    // Trigger visual effect
    setActiveEffect({
      type: 'freezeTime',
      origin: { x: 0.2, y: 0.9 }, // Bottom-left position
    });

    // Call parent callback with result
    onFreezeTime(result.timeRemaining);
  }, [
    cascadeActive,
    freezeTimeState,
    inventory,
    activateFreezeTime,
    onFreezeTime,
    t,
  ]);

  /**
   * Handle Hint activation
   */
  const handleHint = useCallback(() => {
    // Check cascade blocking
    if (cascadeActive) {
      toast(t('adventure.powerUps.cascadeBlocked'));
      return;
    }

    // Activate power-up state machine
    const success = hintState.activate();
    if (!success) {
      return;
    }

    // Persist cooldown to inventory
    inventory.startCooldown('hint');

    // Apply effect
    const result = activateHint();
    if (result === false) {
      return;
    }

    // Trigger visual effect
    setActiveEffect({
      type: 'hint',
      origin: { x: 0.5, y: 0.9 }, // Bottom-center position
    });

    // Call parent callback with result
    onHint(result as HintResult);
  }, [cascadeActive, hintState, inventory, activateHint, onHint, t]);

  /**
   * Handle Score Multiplier activation
   */
  const handleScoreMultiplier = useCallback(() => {
    // Check cascade blocking
    if (cascadeActive) {
      toast(t('adventure.powerUps.cascadeBlocked'));
      return;
    }

    // Activate power-up state machine
    const success = scoreMultiplierState.activate();
    if (!success) {
      return;
    }

    // Persist cooldown to inventory
    inventory.startCooldown('scoreMultiplier');

    // Apply effect
    const result = activateScoreMultiplier();
    if (result === false) {
      return;
    }

    // Trigger visual effect
    setActiveEffect({
      type: 'scoreMultiplier',
      origin: { x: 0.8, y: 0.9 }, // Bottom-right position
    });

    // Call parent callback with result
    onScoreMultiplier(result.expiresAt);
  }, [
    cascadeActive,
    scoreMultiplierState,
    inventory,
    activateScoreMultiplier,
    onScoreMultiplier,
    t,
  ]);

  /**
   * Clear active effect after animation completes
   */
  const handleEffectComplete = useCallback(() => {
    setActiveEffect(null);
  }, []);

  return (
    <>
      {/* Power-Up Bar Container */}
      <div
        className={cn(
          // Fixed positioning at bottom center
          'fixed bottom-20 left-1/2 -translate-x-1/2',
          'z-40', // Above game board, below HUD overlays

          // Layout - horizontal flex
          'flex items-center gap-2',

          // Styling - neo-brutalist
          'px-4 py-3 rounded-neo',
          'bg-neo-navy/70 backdrop-blur-sm',
          'border-t-2 border-neo-black/20',

          // Allow pointer events (within pointer-events-none HUD)
          'pointer-events-auto',

          className
        )}
      >
        {/* Freeze Time Button */}
        <PowerUpButton
          type="freezeTime"
          icon={POWER_UP_ICONS.freezeTime}
          label={POWER_UP_LABELS.freezeTime}
          state={freezeTimeState.powerUp.state}
          remainingCooldown={freezeTimeState.powerUp.remainingCooldown}
          totalCooldown={freezeTimeState.powerUp.totalCooldown}
          disabled={cascadeActive}
          onActivate={handleFreezeTime}
        />

        {/* Hint Button */}
        <PowerUpButton
          type="hint"
          icon={POWER_UP_ICONS.hint}
          label={POWER_UP_LABELS.hint}
          state={hintState.powerUp.state}
          remainingCooldown={hintState.powerUp.remainingCooldown}
          totalCooldown={hintState.powerUp.totalCooldown}
          disabled={cascadeActive}
          onActivate={handleHint}
        />

        {/* Score Multiplier Button */}
        <PowerUpButton
          type="scoreMultiplier"
          icon={POWER_UP_ICONS.scoreMultiplier}
          label={POWER_UP_LABELS.scoreMultiplier}
          state={scoreMultiplierState.powerUp.state}
          remainingCooldown={scoreMultiplierState.powerUp.remainingCooldown}
          totalCooldown={scoreMultiplierState.powerUp.totalCooldown}
          disabled={cascadeActive}
          onActivate={handleScoreMultiplier}
        />
      </div>

      {/* Active Effect Display */}
      {activeEffect && (
        <PowerUpActivationEffect
          type={activeEffect.type}
          origin={activeEffect.origin}
          onComplete={handleEffectComplete}
        />
      )}
    </>
  );
}

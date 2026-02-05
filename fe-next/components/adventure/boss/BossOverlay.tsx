/**
 * BossOverlay Compound Component
 *
 * Integrated boss battle overlay using XState 5-phase state machine.
 * Encapsulates all boss battle rendering logic:
 * - Intro cinematics (entrance)
 * - HP bar with 3 phase segments
 * - Attack telegraphs with 2s warning
 * - Ability activation tied to state machine
 * - Victory/Defeat cinematics
 *
 * State Machine Phases:
 * - intro: Entrance cinematic playing
 * - phase1: HP > 66%
 * - phase2: HP 33-66%
 * - enraged: HP < 33%
 * - victory: Boss defeated
 * - defeat: Player lost (timer expired)
 *
 * Usage:
 * <BossOverlay
 *   boss={bossConfig}
 *   maxHP={100}
 *   onDamageDealt={(damage) => { ... }}
 *   onBattleStart={() => { ... }}
 *   onVictory={() => { ... }}
 *   onDefeat={() => { ... }}
 *   currentTaunt={bossTaunt}
 *   showTaunt={showBossTaunt}
 *   score={gameState.score}
 *   worldNumber={levelConfig.world}
 * />
 */

'use client';

import React, { memo, useCallback, useEffect, useRef } from 'react';
import BossDialogue from '../BossDialogue';
import BossVictory from '../BossVictory';
import SegmentedHPBar from './SegmentedHPBar';
import { AttackTelegraph } from './AttackTelegraph';
import {
  CinematicPlayer,
  BossEntranceCinematic,
  BossDefeatCinematic,
  ENTRANCE_DURATION_SECONDS,
  DEFEAT_DURATION_SECONDS,
} from './cinematics';
import { useBossStateMachine } from '../../../hooks/useBossStateMachine';
import { useBossAbilities } from '../../../hooks/useBossAbilities';
import { useAttackTelegraph } from '../../../hooks/useAttackTelegraph';
import { useBossEffectExecutor, type EffectCallbacks } from '../../../hooks/useBossEffectExecutor';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { BossConfig } from '@/types/boss';
import type { AdventureGameState } from '@/types/adventure';
import type { BossStateMachineState } from '@/types/bossStateMachine';

// ==============================================
// TYPES
// ==============================================

interface BossOverlayProps {
  /** Boss configuration (null if not a boss level) */
  boss: BossConfig | null;
  /** Maximum HP for boss */
  maxHP?: number;
  /** Current taunt text (translation key) */
  currentTaunt: string | null;
  /** Whether taunt is visible */
  showTaunt: boolean;
  /** Whether to show boss intro (for legacy compatibility) */
  showIntro?: boolean;
  /** Callback when player starts battle (for legacy) */
  onStartBattle?: () => void;
  /** Callback when player skips intro (for legacy) */
  onSkipIntro?: () => void;
  /** Whether to show victory screen (for legacy) */
  showVictory?: boolean;
  /** Whether to show defeat screen (for legacy) */
  showDefeat?: boolean;
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
  /** Legacy health state (for backwards compat) */
  healthState?: {
    currentHP: number;
    maxHP: number;
    phase: string;
    totalDamageDealt: number;
    isActive: boolean;
  };
  /** Effect callbacks for boss abilities */
  effectCallbacks?: EffectCallbacks;
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
// HELPER: Convert state to phase type for SegmentedHPBar
// ==============================================

function stateToHPBarPhase(state: BossStateMachineState): 'phase1' | 'phase2' | 'enraged' {
  switch (state) {
    case 'phase2':
      return 'phase2';
    case 'enraged':
      return 'enraged';
    default:
      return 'phase1';
  }
}

// ==============================================
// COMPONENT
// ==============================================

/**
 * BossOverlay - Renders all boss battle UI elements with XState integration
 *
 * Uses the 5-phase state machine for:
 * - Phase transitions at HP thresholds
 * - Ability activation tied to boss state
 * - Cinematic playback at intro/victory
 * - Attack telegraphs with 2s warnings
 */
const BossOverlay = memo<BossOverlayProps>(
  ({
    boss,
    maxHP = 100,
    currentTaunt,
    showTaunt,
    showIntro: legacyShowIntro,
    onStartBattle: legacyOnStartBattle,
    onSkipIntro: legacyOnSkipIntro,
    showVictory: legacyShowVictory,
    showDefeat: legacyShowDefeat,
    stars,
    score,
    wordsFound,
    gameState,
    onContinue,
    onRetry,
    worldNumber,
    healthState: legacyHealthState,
    effectCallbacks,
  }) => {
    const { t } = useLanguage();

    // ==============================================
    // STATE MACHINE (always call hooks unconditionally)
    // ==============================================

    // Use a placeholder bossId when boss is null to satisfy hook rules
    const effectiveBossId = boss?.id ?? 'placeholder';

    const {
      state,
      context,
      startBattle,
      dealDamage,
      timerExpired,
      reset,
      hpPercentage,
      isActive,
      isEnraged,
      isVictory,
      isDefeat,
    } = useBossStateMachine({
      maxHP,
      bossId: effectiveBossId,
    });

    // ==============================================
    // ABILITIES (always call hooks unconditionally)
    // ==============================================

    const {
      abilities,
      telegraphingAbility,
      checkActivation,
      startAbility,
      executeAbility,
      tickCooldowns,
      resetAbilities,
    } = useBossAbilities(effectiveBossId);

    // ==============================================
    // EFFECT EXECUTOR
    // ==============================================

    const { applyEffects, clearEffects } = useBossEffectExecutor(effectCallbacks ?? {});

    // ==============================================
    // ATTACK TELEGRAPH
    // ==============================================

    /**
     * Handle telegraph completion - execute the ability and apply effects
     */
    const handleTelegraphComplete = useCallback((abilityId: string, targetTiles: number[]) => {
      const effects = executeAbility(abilityId);
      // Apply effects to game state via callbacks
      applyEffects(effects);
    }, [executeAbility, applyEffects]);

    const {
      state: telegraphState,
      startTelegraph,
      cancelTelegraph,
      isActive: isTelegraphing,
    } = useAttackTelegraph({
      duration: 2000, // 2 second telegraph
      onComplete: handleTelegraphComplete,
    });

    // ==============================================
    // ABILITY CHECK LOOP
    // ==============================================

    const lastCheckRef = useRef<number>(0);
    const abilityCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
      // Only check abilities during active battle phases (and only when boss exists)
      if (!boss || !isActive) {
        if (abilityCheckIntervalRef.current) {
          clearInterval(abilityCheckIntervalRef.current);
          abilityCheckIntervalRef.current = null;
        }
        return;
      }

      // Check every 500ms for ability activation
      abilityCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastCheckRef.current;
        lastCheckRef.current = now;

        // Tick cooldowns
        tickCooldowns(delta);

        // Check for ability activation (only if not already telegraphing)
        if (!telegraphingAbility) {
          const abilityToActivate = checkActivation(context, state);
          if (abilityToActivate) {
            // Start telegraph for this ability
            // Target tiles would be calculated based on ability type
            // For now, use empty array (full-screen abilities)
            startAbility(abilityToActivate.id);
            startTelegraph(abilityToActivate.id, []);
          }
        }
      }, 500);

      return () => {
        if (abilityCheckIntervalRef.current) {
          clearInterval(abilityCheckIntervalRef.current);
        }
      };
    }, [boss, isActive, state, context, telegraphingAbility, checkActivation, startAbility, startTelegraph, tickCooldowns]);

    // ==============================================
    // CINEMATIC HANDLERS
    // ==============================================

    /**
     * Handle entrance cinematic completion
     */
    const handleEntranceComplete = useCallback(() => {
      startBattle();
      legacyOnStartBattle?.();
    }, [startBattle, legacyOnStartBattle]);

    /**
     * Handle victory cinematic completion
     */
    const handleVictoryComplete = useCallback(() => {
      onContinue();
    }, [onContinue]);

    /**
     * Handle defeat - just retry for now
     */
    const handleDefeatComplete = useCallback(() => {
      onRetry();
    }, [onRetry]);

    // ==============================================
    // EARLY RETURN (after all hooks are called)
    // ==============================================

    // Not a boss level - render nothing
    if (!boss) {
      return null;
    }

    // ==============================================
    // LEGACY COMPATIBILITY
    // ==============================================

    // Determine what to show based on state or legacy props
    const showingIntro = state === 'intro' || legacyShowIntro;
    const showingVictory = isVictory || legacyShowVictory;
    const showingDefeat = isDefeat || legacyShowDefeat;
    const showingActivePhase = isActive || (legacyHealthState?.isActive && !showingIntro);

    // Get current HP from state machine or legacy
    const currentHP = legacyHealthState?.currentHP ?? context.hp;
    const effectiveMaxHP = legacyHealthState?.maxHP ?? context.maxHP;

    // ==============================================
    // RENDER
    // ==============================================

    return (
      <>
        {/* ========================================
            INTRO CINEMATIC
            ======================================== */}
        {showingIntro && (
          <CinematicPlayer
            composition={BossEntranceCinematic as unknown as React.ComponentType<Record<string, unknown>>}
            compositionProps={{
              bossName: t(boss.displayName),
              bossTitle: `Guardian of World ${worldNumber}`,
              bossImagePath: boss.imagePath,
              primaryColor: '#FFE135', // Neo-yellow for bosses
              worldNumber,
            }}
            durationSeconds={ENTRANCE_DURATION_SECONDS}
            onComplete={handleEntranceComplete}
            testId="boss-entrance-cinematic"
          />
        )}

        {/* ========================================
            ACTIVE BATTLE UI
            ======================================== */}
        {showingActivePhase && !showingIntro && !showingVictory && !showingDefeat && (
          <>
            {/* Segmented HP Bar - Fixed at top of screen below header */}
            <div className="fixed top-12 sm:top-14 left-0 right-0 z-30 pointer-events-none">
              <SegmentedHPBar
                currentHP={currentHP}
                maxHP={effectiveMaxHP}
                phase={stateToHPBarPhase(state)}
                bossName={boss.displayName}
              />
            </div>

            {/* Boss Dialogue/Taunts */}
            {showTaunt && currentTaunt && (
              <BossDialogue
                boss={boss}
                currentTaunt={currentTaunt}
                isVisible={showTaunt}
                position="top"
              />
            )}

            {/* Attack Telegraph (2s warning before ability) */}
            <AttackTelegraph
              isActive={isTelegraphing}
              progress={telegraphState.progress}
              targetTiles={telegraphState.targetTiles}
              abilityId={telegraphState.abilityId}
              timeRemaining={telegraphState.timeRemaining}
              abilityName={telegraphingAbility?.name}
            />
          </>
        )}

        {/* ========================================
            VICTORY CINEMATIC
            ======================================== */}
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

        {/* ========================================
            DEFEAT SCREEN (No cinematic, just result)
            ======================================== */}
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

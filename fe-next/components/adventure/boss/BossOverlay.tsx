/**
 * BossOverlay Orchestrator Component
 *
 * Boss battle overlay that derives phase from actual HP values.
 * Orchestrates all boss battle UI phases: intro cinematic,
 * active battle, victory cinematic, and defeat screen.
 *
 * Active battle rendering delegated to BossActiveBattleUI.
 * Arena effects rendered by BossArena.
 *
 * Phase derivation from HP:
 * - phase1: HP > 66%
 * - phase2: HP 33-66%
 * - enraged: HP < 33%
 */

'use client';

import React, { memo, useCallback, useEffect, useRef, useState, useMemo } from 'react';
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
import { useBossStateMachine } from '../../../hooks/useBossStateMachine';
import { useBossAbilities } from '../../../hooks/useBossAbilities';
import { useAttackTelegraph } from '../../../hooks/useAttackTelegraph';
import { useBossEffectExecutor, type EffectCallbacks } from '../../../hooks/useBossEffectExecutor';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { BossConfig } from '@/types/boss';
import type { AdventureGameState } from '@/types/adventure';
import { BOSS_PHASE_THRESHOLDS, type BossStateMachineState, type BossStateMachineContext } from '@/types/bossStateMachine';

// ==============================================
// TYPES
// ==============================================

interface BossOverlayProps {
  /** Boss configuration (null if not a boss level) */
  boss: BossConfig | null;
  /** When true, active battle UI is rendered in Phaser canvas (default: true).
   *  Intro/victory/defeat cinematics always render as React/Remotion. */
  usePhaserBossUI?: boolean;
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
// HELPERS
// ==============================================

function derivePhaseFromHP(hpPercentage: number): 'phase1' | 'phase2' | 'enraged' {
  if (hpPercentage < BOSS_PHASE_THRESHOLDS.ENRAGED_THRESHOLD) return 'enraged';
  if (hpPercentage < BOSS_PHASE_THRESHOLDS.PHASE2_THRESHOLD) return 'phase2';
  return 'phase1';
}

function deriveBossState(
  legacyPhase: string,
  hpPercentage: number
): BossStateMachineState {
  if (legacyPhase === 'intro') return 'intro';
  if (legacyPhase === 'victory') return 'victory';
  if (legacyPhase === 'defeat') return 'defeat';
  return derivePhaseFromHP(hpPercentage);
}

// ==============================================
// COMPONENT
// ==============================================

const BossOverlay = memo<BossOverlayProps>(
  ({
    boss,
    usePhaserBossUI = true,
    maxHP = 100,
    currentTaunt,
    showTaunt,
    showIntro: legacyShowIntro,
    onStartBattle: legacyOnStartBattle,
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
    // STATE MACHINE
    // ==============================================

    const effectiveBossId = boss?.id ?? 'placeholder';

    const {
      state: smState,
      context: smContext,
      startBattle,
    } = useBossStateMachine({
      maxHP,
      bossId: effectiveBossId,
    });

    // ==============================================
    // DERIVED STATE FROM LEGACY HP
    // ==============================================

    const currentHP = legacyHealthState?.currentHP ?? smContext.hp;
    const effectiveMaxHP = legacyHealthState?.maxHP ?? smContext.maxHP;
    const hpPct = effectiveMaxHP > 0
      ? Math.round((currentHP / effectiveMaxHP) * 100)
      : 0;

    const derivedPhase = derivePhaseFromHP(hpPct);
    const derivedState: BossStateMachineState = legacyHealthState
      ? deriveBossState(legacyHealthState.phase, hpPct)
      : smState;

    const derivedContext: BossStateMachineContext = useMemo(() => ({
      hp: currentHP,
      maxHP: effectiveMaxHP,
      totalDamageDealt: legacyHealthState?.totalDamageDealt ?? smContext.totalDamageDealt,
      bossId: effectiveBossId,
    }), [currentHP, effectiveMaxHP, legacyHealthState?.totalDamageDealt, smContext.totalDamageDealt, effectiveBossId]);

    const effectiveIsActive = legacyHealthState?.isActive ?? (
      smState === 'phase1' || smState === 'phase2' || smState === 'enraged'
    );

    // ==============================================
    // ATTACK EFFECT STATE
    // ==============================================

    const [attackEffect, setAttackEffect] = useState<{
      abilityName: string | null;
      damage: number;
    } | null>(null);
    const attackEffectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ==============================================
    // BOSS AVATAR REACTION STATE
    // ==============================================

    const [bossReaction, setBossReaction] = useState<'idle' | 'attacking' | 'hit'>('idle');
    const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const prevHPRef = useRef(currentHP);
    useEffect(() => {
      if (currentHP < prevHPRef.current && effectiveIsActive) {
        setBossReaction('hit');
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(() => setBossReaction('idle'), 400);
      }
      prevHPRef.current = currentHP;
    }, [currentHP, effectiveIsActive]);

    useEffect(() => {
      return () => {
        if (attackEffectTimeoutRef.current) clearTimeout(attackEffectTimeoutRef.current);
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      };
    }, []);

    // ==============================================
    // ABILITIES
    // ==============================================

    const {
      telegraphingAbility,
      checkActivation,
      startAbility,
      executeAbility,
      tickCooldowns,
    } = useBossAbilities(effectiveBossId);

    const { applyEffects } = useBossEffectExecutor(effectCallbacks ?? {});

    // ==============================================
    // ATTACK TELEGRAPH
    // ==============================================

    const handleTelegraphComplete = useCallback((abilityId: string, _targetTiles: number[]) => {
      const effects = executeAbility(abilityId);
      applyEffects(effects);

      const damageEffect = effects.find(e => e.type === 'player_damage');
      const damage = (damageEffect?.params?.amount as number) ?? 0;

      setAttackEffect({
        abilityName: telegraphingAbility?.name ?? null,
        damage,
      });
      setBossReaction('attacking');

      if (attackEffectTimeoutRef.current) clearTimeout(attackEffectTimeoutRef.current);
      attackEffectTimeoutRef.current = setTimeout(() => {
        setAttackEffect(null);
        setBossReaction('idle');
      }, 800);
    }, [executeAbility, applyEffects, telegraphingAbility]);

    const {
      state: telegraphState,
      startTelegraph,
      isActive: isTelegraphing,
    } = useAttackTelegraph({
      duration: 2000,
      onComplete: handleTelegraphComplete,
    });

    // ==============================================
    // ABILITY CHECK LOOP
    // ==============================================

    const lastCheckRef = useRef<number>(0);
    const abilityCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const derivedStateRef = useRef(derivedState);
    const derivedContextRef = useRef(derivedContext);
    useEffect(() => {
      derivedStateRef.current = derivedState;
      derivedContextRef.current = derivedContext;
    }, [derivedState, derivedContext]);

    useEffect(() => {
      if (!boss || !effectiveIsActive) {
        if (abilityCheckIntervalRef.current) {
          clearInterval(abilityCheckIntervalRef.current);
          abilityCheckIntervalRef.current = null;
        }
        return;
      }

      if (lastCheckRef.current === 0) {
        lastCheckRef.current = Date.now();
      }

      abilityCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastCheckRef.current;
        lastCheckRef.current = now;

        tickCooldowns(delta);

        if (!telegraphingAbility) {
          const abilityToActivate = checkActivation(
            derivedContextRef.current,
            derivedStateRef.current
          );
          if (abilityToActivate) {
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
    }, [boss, effectiveIsActive, telegraphingAbility, checkActivation, startAbility, startTelegraph, tickCooldowns]);

    // ==============================================
    // CINEMATIC HANDLERS
    // ==============================================

    const handleEntranceComplete = useCallback(() => {
      startBattle();
      legacyOnStartBattle?.();
    }, [startBattle, legacyOnStartBattle]);

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

    const showingIntro = legacyShowIntro;
    const showingVictory = legacyShowVictory;
    const showingDefeat = legacyShowDefeat;
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
            maxHP={effectiveMaxHP}
            phase={derivedPhase}
            bossReaction={bossReaction}
            showTaunt={showTaunt}
            currentTaunt={currentTaunt}
            isTelegraphing={isTelegraphing}
            telegraphState={telegraphState}
            telegraphingAbility={telegraphingAbility}
            attackEffect={attackEffect}
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

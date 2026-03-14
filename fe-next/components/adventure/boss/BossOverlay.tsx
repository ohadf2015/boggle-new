/**
 * BossOverlay Compound Component
 *
 * Boss battle overlay that derives phase from actual HP values.
 * Renders all boss battle UI: HP bar, attack telegraphs, boss avatar,
 * attack effects, intro/victory/defeat screens.
 *
 * Phase derivation from HP:
 * - phase1: HP > 66%
 * - phase2: HP 33-66%
 * - enraged: HP < 33%
 */

'use client';

import React, { memo, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';
import { BossDialogue as BossDialogueInline } from '../BossDialogue';
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
import { BOSS_PHASE_THRESHOLDS, type BossStateMachineState, type BossStateMachineContext } from '@/types/bossStateMachine';

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
// HELPERS
// ==============================================

/**
 * Derive the active boss phase from HP percentage.
 * Uses the same thresholds as SegmentedHPBar (33%, 66%).
 */
function derivePhaseFromHP(hpPercentage: number): 'phase1' | 'phase2' | 'enraged' {
  if (hpPercentage < BOSS_PHASE_THRESHOLDS.ENRAGED_THRESHOLD) return 'enraged';
  if (hpPercentage < BOSS_PHASE_THRESHOLDS.PHASE2_THRESHOLD) return 'phase2';
  return 'phase1';
}

/**
 * Map legacy BossPhase + HP to BossStateMachineState for ability checks.
 */
function deriveBossState(
  legacyPhase: string,
  hpPercentage: number
): BossStateMachineState {
  if (legacyPhase === 'intro') return 'intro';
  if (legacyPhase === 'victory') return 'victory';
  if (legacyPhase === 'defeat') return 'defeat';
  // Active/enraged phases - derive sub-phase from HP
  return derivePhaseFromHP(hpPercentage);
}

// ==============================================
// COMPONENT
// ==============================================

const BossOverlay = memo<BossOverlayProps>(
  ({
    boss,
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
    // STATE MACHINE (kept for hook ordering, but we
    // derive display/ability state from legacy HP)
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

    // React to HP changes — boss flinches when taking damage
    const prevHPRef = useRef(currentHP);
    useEffect(() => {
      if (currentHP < prevHPRef.current && effectiveIsActive) {
        setBossReaction('hit');
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(() => setBossReaction('idle'), 400);
      }
      prevHPRef.current = currentHP;
    }, [currentHP, effectiveIsActive]);

    // Cleanup timers
    useEffect(() => {
      return () => {
        if (attackEffectTimeoutRef.current) clearTimeout(attackEffectTimeoutRef.current);
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      };
    }, []);

    // ==============================================
    // ABILITIES (always call hooks unconditionally)
    // ==============================================

    const {
      telegraphingAbility,
      checkActivation,
      startAbility,
      executeAbility,
      tickCooldowns,
    } = useBossAbilities(effectiveBossId);

    // ==============================================
    // EFFECT EXECUTOR
    // ==============================================

    const { applyEffects } = useBossEffectExecutor(effectCallbacks ?? {});

    // ==============================================
    // ATTACK TELEGRAPH
    // ==============================================

    const handleTelegraphComplete = useCallback((abilityId: string, _targetTiles: number[]) => {
      const effects = executeAbility(abilityId);
      applyEffects(effects);

      // Determine damage dealt for attack effect display
      const damageEffect = effects.find(e => e.type === 'player_damage');
      const damage = (damageEffect?.params?.amount as number) ?? 0;

      // Show attack effect overlay
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
    // ABILITY CHECK LOOP (uses derived state from legacy HP)
    // ==============================================

    const lastCheckRef = useRef<number>(0);
    const abilityCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Store derived values in refs to avoid stale closures in interval
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

      // Initialize lastCheckRef on first activation
      if (lastCheckRef.current === 0) {
        lastCheckRef.current = Date.now();
      }

      abilityCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastCheckRef.current;
        lastCheckRef.current = now;

        tickCooldowns(delta);

        if (!telegraphingAbility) {
          // Use refs for fresh values in the interval callback
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
    // EARLY RETURN (after all hooks are called)
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
        {/* ========================================
            INTRO CINEMATIC
            ======================================== */}
        {showingIntro && (
          <CinematicPlayer
            composition={BossEntranceCinematic as unknown as React.ComponentType<Record<string, unknown>>}
            compositionProps={{
              bossName: t(boss.displayName),
              bossTitle: t('adventure.bosses.cinematics.guardianOfWorld', { worldNumber }),
              bossImagePath: boss.imagePath,
              primaryColor: '#FFE135',
              worldNumber,
            }}
            durationSeconds={ENTRANCE_DURATION_SECONDS}
            onComplete={handleEntranceComplete}
            testId="boss-entrance-cinematic"
            fallbackType="bossEntrance"
          />
        )}

        {/* ========================================
            ACTIVE BATTLE UI
            ======================================== */}
        {showingActivePhase && !showingVictory && !showingDefeat && (
          <>
            {/* Boss HP Bar + Avatar Row */}
            <div className="fixed top-12 sm:top-14 left-0 right-0 z-30 pointer-events-none">
              <div className="w-full max-w-2xl mx-auto px-4 pt-3">
                {/* Boss Avatar + Name Row */}
                <div className="flex items-center gap-3 mb-2">
                  {/* Boss Avatar */}
                  <motion.div
                    className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-neo border-3 border-neo-black shadow-hard-sm overflow-hidden bg-neo-navy-light flex-shrink-0"
                    animate={
                      bossReaction === 'attacking'
                        ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                        : bossReaction === 'hit'
                          ? { x: [0, -3, 3, -2, 2, 0], scale: [1, 0.95, 1] }
                          : { scale: 1, rotate: 0, x: 0 }
                    }
                    transition={{ duration: 0.3 }}
                    data-testid="boss-avatar"
                  >
                    {boss.imagePath ? (
                      <Image
                        src={boss.imagePath}
                        alt={t(boss.displayName)}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        <Swords className="w-6 h-6 text-neo-yellow" />
                      </div>
                    )}

                    {/* Enraged glow */}
                    {derivedPhase === 'enraged' && (
                      <motion.div
                        className="absolute inset-0 border-2 border-neo-red rounded-neo"
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                      />
                    )}
                  </motion.div>

                  {/* HP Bar */}
                  <div className="flex-1 min-w-0">
                    <SegmentedHPBar
                      currentHP={currentHP}
                      maxHP={effectiveMaxHP}
                      phase={derivedPhase}
                      bossName={boss.displayName}
                    />
                    {/* Boss Dialogue inline below HP bar */}
                    {showTaunt && currentTaunt && (
                      <BossDialogueInline
                        dialogue={t(currentTaunt)}
                        bossAvatarUrl={boss.imagePath}
                        bossName={t(boss.displayName)}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Boss Rage Vignette (< 20% HP) */}
            {hpPct < 20 && (
              <motion.div
                className="fixed inset-0 pointer-events-none z-20"
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                style={{
                  boxShadow: 'inset 0 0 100px rgba(255, 0, 0, 0.3)',
                }}
                data-testid="boss-rage-vignette"
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

            {/* Boss Attack Effect (flash + impact when attack lands) */}
            <AnimatePresence>
              {attackEffect && (
                <motion.div
                  className="fixed inset-0 z-50 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  data-testid="boss-attack-effect"
                >
                  {/* Red damage flash */}
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.4, 0] }}
                    transition={{ duration: 0.5 }}
                    style={{ backgroundColor: 'rgba(255, 0, 0, 0.3)' }}
                  />

                  {/* Slash marks */}
                  <motion.div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: [0, 1.5, 1.2], rotate: [-45, -45, -45] }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="relative w-32 h-32">
                      {/* Slash line 1 */}
                      <motion.div
                        className="absolute top-1/2 left-0 w-full h-1 bg-neo-red rounded-full"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 1, 0.8] }}
                        transition={{ duration: 0.2, delay: 0.05 }}
                        style={{ boxShadow: '0 0 12px rgba(255, 51, 102, 0.8)' }}
                      />
                      {/* Slash line 2 */}
                      <motion.div
                        className="absolute top-1/2 left-0 w-full h-1 bg-neo-red rounded-full rotate-45"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: [0, 1, 0.8] }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                        style={{ boxShadow: '0 0 12px rgba(255, 51, 102, 0.8)' }}
                      />
                    </div>
                  </motion.div>

                  {/* Damage number */}
                  {attackEffect.damage > 0 && (
                    <motion.div
                      className="absolute top-1/3 left-1/2 -translate-x-1/2"
                      initial={{ y: 0, opacity: 0, scale: 0.5 }}
                      animate={{ y: -40, opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1] }}
                      transition={{ duration: 0.7 }}
                    >
                      <span className="font-neo-display text-3xl font-bold text-neo-red drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        -{attackEffect.damage}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
            fallbackType="bossDefeat"
          />
        )}

        {/* ========================================
            DEFEAT SCREEN
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

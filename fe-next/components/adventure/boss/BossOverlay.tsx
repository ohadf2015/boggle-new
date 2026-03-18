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
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Swords } from 'lucide-react';
import { BossDialogue as BossDialogueInline } from '../BossDialogue';
import BossVictory from '../BossVictory';
import SegmentedHPBar from './SegmentedHPBar';
import { AttackTelegraph } from './AttackTelegraph';
import BossAttackEffect from './BossAttackEffect';
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
  boss: BossConfig | null;
  maxHP?: number;
  currentTaunt: string | null;
  showTaunt: boolean;
  showIntro?: boolean;
  onStartBattle?: () => void;
  onSkipIntro?: () => void;
  showVictory?: boolean;
  showDefeat?: boolean;
  stars: 0 | 1 | 2 | 3;
  score: number;
  wordsFound: string[];
  gameState: AdventureGameState;
  onContinue: () => void;
  onRetry: () => void;
  worldNumber: number;
  healthState?: {
    currentHP: number;
    maxHP: number;
    phase: string;
    totalDamageDealt: number;
    isActive: boolean;
  };
  effectCallbacks?: EffectCallbacks;
}

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

function deriveBossState(legacyPhase: string, hpPercentage: number): BossStateMachineState {
  if (legacyPhase === 'intro') return 'intro';
  if (legacyPhase === 'victory') return 'victory';
  if (legacyPhase === 'defeat') return 'defeat';
  return derivePhaseFromHP(hpPercentage);
}

/** Avatar border class per phase */
function avatarBorderClass(phase: 'phase1' | 'phase2' | 'enraged'): string {
  if (phase === 'enraged') return 'border-neo-red';
  if (phase === 'phase2') return 'border-neo-lime';
  return 'border-neo-cyan';
}

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

    const effectiveBossId = boss?.id ?? 'placeholder';

    const {
      state: smState,
      context: smContext,
      startBattle,
    } = useBossStateMachine({ maxHP, bossId: effectiveBossId });

    // Derived state from legacy HP
    const currentHP = legacyHealthState?.currentHP ?? smContext.hp;
    const effectiveMaxHP = legacyHealthState?.maxHP ?? smContext.maxHP;
    const hpPct = effectiveMaxHP > 0 ? Math.round((currentHP / effectiveMaxHP) * 100) : 0;

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

    // --- Boss avatar reaction ---
    const [bossReaction, setBossReaction] = useState<'idle' | 'attacking' | 'hit'>('idle');
    const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [playerDmgFloat, setPlayerDmgFloat] = useState<{ id: number; amount: number } | null>(null);
    const playerDmgIdRef = useRef(0);
    const prevHPRef = useRef(currentHP);
    useEffect(() => {
      if (currentHP < prevHPRef.current && effectiveIsActive) {
        const delta = prevHPRef.current - currentHP;
        setBossReaction('hit');
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        reactionTimeoutRef.current = setTimeout(() => setBossReaction('idle'), 400);
        const id = ++playerDmgIdRef.current;
        setPlayerDmgFloat({ id, amount: delta });
        setTimeout(() => setPlayerDmgFloat(prev => (prev?.id === id ? null : prev)), 900);
      }
      prevHPRef.current = currentHP;
    }, [currentHP, effectiveIsActive]);

    // --- Phase transition banner ---
    const [phaseBanner, setPhaseBanner] = useState<string | null>(null);
    const prevPhaseRef = useRef(derivedPhase);
    const phaseBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      const prev = prevPhaseRef.current;
      prevPhaseRef.current = derivedPhase;
      if (prev !== derivedPhase && effectiveIsActive) {
        if (derivedPhase === 'phase2') setPhaseBanner(t('adventure.bosses.phases.phase2Banner') || 'PHASE 2!');
        else if (derivedPhase === 'enraged') setPhaseBanner(t('adventure.bosses.enragedBanner') || 'ENRAGED!');
        if (phaseBannerTimerRef.current) clearTimeout(phaseBannerTimerRef.current);
        phaseBannerTimerRef.current = setTimeout(() => setPhaseBanner(null), 1500);
      }
      return () => { if (phaseBannerTimerRef.current) clearTimeout(phaseBannerTimerRef.current); };
    }, [derivedPhase, effectiveIsActive, t]);

    // --- Attack effect ---
    const [attackEffect, setAttackEffect] = useState<{ abilityName: string | null; damage: number } | null>(null);
    const attackEffectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      return () => {
        if (attackEffectTimeoutRef.current) clearTimeout(attackEffectTimeoutRef.current);
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      };
    }, []);

    // --- Abilities ---

    const {
      telegraphingAbility,
      checkActivation,
      startAbility,
      executeAbility,
      tickCooldowns,
    } = useBossAbilities(effectiveBossId);

    const { applyEffects } = useBossEffectExecutor(effectCallbacks ?? {});

    const handleTelegraphComplete = useCallback((abilityId: string, _targetTiles: number[]) => {
      const effects = executeAbility(abilityId);
      applyEffects(effects);
      const damageEffect = effects.find(e => e.type === 'player_damage');
      const damage = (damageEffect?.params?.amount as number) ?? 0;
      setAttackEffect({ abilityName: telegraphingAbility?.name ?? null, damage });
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
    } = useAttackTelegraph({ duration: 2000, onComplete: handleTelegraphComplete });

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
      if (lastCheckRef.current === 0) lastCheckRef.current = Date.now();
      abilityCheckIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastCheckRef.current;
        lastCheckRef.current = now;
        tickCooldowns(delta);
        if (!telegraphingAbility) {
          const abilityToActivate = checkActivation(derivedContextRef.current, derivedStateRef.current);
          if (abilityToActivate) {
            startAbility(abilityToActivate.id);
            startTelegraph(abilityToActivate.id, []);
          }
        }
      }, 500);
      return () => {
        if (abilityCheckIntervalRef.current) clearInterval(abilityCheckIntervalRef.current);
      };
    }, [boss, effectiveIsActive, telegraphingAbility, checkActivation, startAbility, startTelegraph, tickCooldowns]);

    // ==============================================
    // CINEMATIC HANDLERS
    // ==============================================

    const handleEntranceComplete = useCallback(() => {
      startBattle();
      legacyOnStartBattle?.();
    }, [startBattle, legacyOnStartBattle]);

    const handleVictoryComplete = useCallback(() => { onContinue(); }, [onContinue]);
    const handleDefeatComplete = useCallback(() => { onRetry(); }, [onRetry]);

    // ==============================================
    // EARLY RETURN (after all hooks)
    // ==============================================

    if (!boss) return null;

    const showingIntro = legacyShowIntro;
    const showingVictory = legacyShowVictory;
    const showingDefeat = legacyShowDefeat;
    const showingActivePhase = effectiveIsActive && !showingIntro;
    const borderClass = avatarBorderClass(derivedPhase);

    // ==============================================
    // RENDER
    // ==============================================

    return (
      <>
        {/* INTRO CINEMATIC */}
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

        {/* ACTIVE BATTLE UI */}
        {showingActivePhase && !showingVictory && !showingDefeat && (
          <>
            {/* Compact Combat HUD Strip — sits just below the GameHeader */}
            <div className="fixed top-[3.25rem] sm:top-[3.75rem] left-0 right-0 z-30 pointer-events-none">
              <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 pt-1.5">
                {/* Boss Avatar + HP Bar row */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Boss Avatar — compact */}
                  <div className="relative flex-shrink-0">
                    <AdaptiveMotion.div
                      className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-neo border-3 ${borderClass} shadow-hard-sm overflow-hidden bg-neo-navy-light`}
                      animate={
                        bossReaction === 'attacking'
                          ? { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] }
                          : bossReaction === 'hit'
                            ? { x: [0, -2, 2, -1, 1, 0], scale: [1, 0.95, 1] }
                            : { scale: [1, 1.02, 1], rotate: 0, x: 0 }
                      }
                      transition={
                        bossReaction === 'idle'
                          ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                          : { duration: 0.25 }
                      }
                      data-testid="boss-avatar"
                    >
                      {boss.imagePath ? (
                        <Image
                          src={boss.imagePath}
                          alt={t(boss.displayName)}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Swords className="w-5 h-5 text-neo-yellow" />
                        </div>
                      )}
                      {derivedPhase === 'enraged' && (
                        <AdaptiveMotion.div
                          className="absolute inset-0 border-2 border-neo-red rounded-neo"
                          animate={{ opacity: [0.4, 0.8, 0.4] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                        />
                      )}
                    </AdaptiveMotion.div>

                    {/* Floating damage text */}
                    <AdaptiveAnimatePresence>
                      {playerDmgFloat && (
                        <AdaptiveMotion.div
                          key={playerDmgFloat.id}
                          className="absolute -top-1 -end-1 pointer-events-none z-10"
                          initial={{ y: 0, opacity: 1, scale: 0.8 }}
                          animate={{ y: -20, opacity: 0, scale: 1.1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                          aria-hidden="true"
                        >
                          <span className="font-neo-display text-[10px] font-black text-neo-lime drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            +{playerDmgFloat.amount}
                          </span>
                        </AdaptiveMotion.div>
                      )}
                    </AdaptiveAnimatePresence>
                  </div>

                  {/* HP Bar — no taunt inline, keeps it tight */}
                  <div className="flex-1 min-w-0">
                    <SegmentedHPBar
                      currentHP={currentHP}
                      maxHP={effectiveMaxHP}
                      phase={derivedPhase}
                      bossName={boss.displayName}
                    />
                  </div>

                  {/* Inline attack countdown — replaces separate telegraph banner */}
                  <AdaptiveAnimatePresence>
                    {isTelegraphing && (
                      <AdaptiveMotion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="flex-shrink-0 pointer-events-none"
                      >
                        <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
                          <svg
                            width="44" height="44" viewBox="0 0 44 44"
                            className="-rotate-90"
                            aria-hidden="true"
                          >
                            <circle cx="22" cy="22" r="18" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.3)" strokeWidth="3" />
                            <circle
                              cx="22" cy="22" r="18"
                              fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={2 * Math.PI * 18}
                              strokeDashoffset={2 * Math.PI * 18 * telegraphState.progress}
                              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center font-neo-display font-bold text-sm text-neo-red">
                            {Math.ceil(telegraphState.timeRemaining / 1000)}
                          </span>
                        </div>
                      </AdaptiveMotion.div>
                    )}
                  </AdaptiveAnimatePresence>
                </div>

                {/* Boss taunt — below the HUD strip, fades in/out */}
                <AdaptiveAnimatePresence>
                  {showTaunt && currentTaunt && (
                    <AdaptiveMotion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-1.5 ms-12 sm:ms-14"
                    >
                      <BossDialogueInline
                        dialogue={t(currentTaunt)}
                        bossAvatarUrl={boss.imagePath}
                        bossName={t(boss.displayName)}
                      />
                    </AdaptiveMotion.div>
                  )}
                </AdaptiveAnimatePresence>
              </div>
            </div>

            {/* Phase Transition Banner — centered, brief */}
            <AdaptiveAnimatePresence>
              {phaseBanner && (
                <AdaptiveMotion.div
                  className="fixed inset-x-0 top-1/3 z-50 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  aria-live="assertive"
                  role="status"
                >
                  <div className="px-6 py-3 bg-neo-red border-3 border-neo-black rounded-neo shadow-hard-lg">
                    <span
                      className="font-neo-display text-3xl sm:text-4xl font-black text-neo-white tracking-widest uppercase"
                      style={{ textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}
                    >
                      {phaseBanner}
                    </span>
                  </div>
                </AdaptiveMotion.div>
              )}
            </AdaptiveAnimatePresence>

            {/* Subtle rage vignette — only when NOT telegraphing (avoid double overlay) */}
            {hpPct < 20 && !isTelegraphing && (
              <AdaptiveMotion.div
                className="fixed inset-0 pointer-events-none z-20"
                animate={{ opacity: [0.15, 0.3, 0.15] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                style={{ boxShadow: 'inset 0 0 80px rgba(255, 0, 0, 0.25)' }}
                data-testid="boss-rage-vignette"
              />
            )}

            {/* Simplified Attack Telegraph — edge glow only, no banner */}
            <AttackTelegraph
              isActive={isTelegraphing}
              progress={telegraphState.progress}
              targetTiles={telegraphState.targetTiles}
              abilityId={telegraphState.abilityId}
              timeRemaining={telegraphState.timeRemaining}
              abilityName={telegraphingAbility?.name}
            />

            {/* Boss Attack Effect */}
            <BossAttackEffect attackEffect={attackEffect} />
          </>
        )}

        {/* VICTORY CINEMATIC */}
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

        {/* DEFEAT SCREEN */}
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

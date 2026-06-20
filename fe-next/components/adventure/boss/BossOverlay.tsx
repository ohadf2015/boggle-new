/**
 * BossOverlay Compound Component
 *
 * Renders all boss battle UI: HP bar, attack telegraphs, boss avatar,
 * attack effects, intro/victory/defeat screens.
 * Health state is provided by useAdventureBossOrchestration.
 * Visual phase (avatar styling) derived from HP thresholds (66%/33%).
 */

'use client';

import React, { memo, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSafeInterval } from '@/hooks/useSafeTimeout';
import Image from 'next/image';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Swords } from 'lucide-react';
import { BossDialogue as BossDialogueInline } from '../BossDialogue';
import BossVictory from '../BossVictory';
import SegmentedHPBar from './SegmentedHPBar';
import { AttackTelegraph } from './AttackTelegraph';
import BossAttackEffect from './BossAttackEffect';
import PlayerAbilityBar from './PlayerAbilityBar';
import ParryPrompt, { type ParryOutcome } from './ParryPrompt';
import WeaknessBadge, { type WeaknessCrit } from './WeaknessBadge';
import {
  CinematicPlayer,
  BossEntranceCinematic,
  BossDefeatCinematic,
  ENTRANCE_DURATION_SECONDS,
  DEFEAT_DURATION_SECONDS,
} from './cinematics';
import { useEffectCap, type EffectEntry } from '../../../hooks/useEffectCap';
import { useBossAbilities } from '../../../hooks/useBossAbilities';
import { useAttackTelegraph } from '../../../hooks/useAttackTelegraph';
import { useBossEffectExecutor, type EffectCallbacks } from '../../../hooks/useBossEffectExecutor';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { BossConfig } from '@/types/boss';
import { getBossAnimations } from '@/lib/adventure/bossAnimations';
import type { AdventureGameState } from '@/types/adventure';
import { BOSS_PHASE_THRESHOLDS } from '@/types/bossStateMachine';
import { useBossCombat } from '@/hooks/useBossCombat';
import { getParryRequirement } from '@/lib/adventure/combat/parry';
import { evaluateWeakness, getBossWeakness } from '@/lib/adventure/combat/weakness';
import { BOSS_RPG_COMBAT_ENABLED } from '@/lib/adventure/combat/config';

// ==============================================
// TYPES
// ==============================================

interface BossOverlayProps {
  boss: BossConfig | null;
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
  healthState: {
    currentHP: number;
    maxHP: number;
    phase: string;
    totalDamageDealt: number;
    isActive: boolean;
  };
  effectCallbacks?: EffectCallbacks;
  /** Current combo — charges the player ability kit. */
  comboCount?: number;
  /** Deal counter/burst damage to the boss (smite, parry counter, focus burst). */
  onCombatDamage?: (damage: number, mechanicMultiplier: number) => number;
}

// ==============================================
// HELPERS
// ==============================================

function derivePhaseFromHP(hpPercentage: number): 'phase1' | 'phase2' | 'enraged' {
  if (hpPercentage < BOSS_PHASE_THRESHOLDS.ENRAGED_THRESHOLD) return 'enraged';
  if (hpPercentage < BOSS_PHASE_THRESHOLDS.PHASE2_THRESHOLD) return 'phase2';
  return 'phase1';
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
    healthState,
    effectCallbacks,
    comboCount = 0,
    onCombatDamage,
  }) => {
    const { t } = useLanguage();

    const effectiveBossId = boss?.id ?? 'placeholder';

    // Health state from orchestration hook (always provided)
    const { currentHP, maxHP: effectiveMaxHP, isActive: effectiveIsActive, totalDamageDealt } = healthState;
    const hpPct = effectiveMaxHP > 0 ? Math.round((currentHP / effectiveMaxHP) * 100) : 0;

    // Visual phase for avatar styling/animations (separate from game-logic phases)
    const derivedPhase = derivePhaseFromHP(hpPct);

    const derivedContext = useMemo(() => ({
      hp: currentHP,
      maxHP: effectiveMaxHP,
      totalDamageDealt,
      bossId: effectiveBossId,
    }), [currentHP, effectiveMaxHP, totalDamageDealt, effectiveBossId]);

    // --- Boss visual state for image switching ---
    type BossReaction = 'idle' | 'attacking' | 'hit';
    const [bossReaction, setBossReaction] = useState<BossReaction>('idle');
    const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dmgFloatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        if (dmgFloatTimeoutRef.current) clearTimeout(dmgFloatTimeoutRef.current);
        dmgFloatTimeoutRef.current = setTimeout(() => setPlayerDmgFloat(prev => (prev?.id === id ? null : prev)), 900);
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
        if (derivedPhase === 'phase2') setPhaseBanner(t('adventure.bosses.phases.phase2Banner'));
        else if (derivedPhase === 'enraged') setPhaseBanner(t('adventure.bosses.enragedBanner'));
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
        if (dmgFloatTimeoutRef.current) clearTimeout(dmgFloatTimeoutRef.current);
      };
    }, []);

    // --- Abilities ---

    // Parry/defend result banner (auto-cleared by an effect below — no ref timers).
    const [parryResult, setParryResult] = useState<ParryOutcome>(null);

    const {
      telegraphingAbility,
      checkActivation,
      startAbility,
      executeAbility,
      tickCooldowns,
    } = useBossAbilities(effectiveBossId);

    const { applyEffects } = useBossEffectExecutor(effectCallbacks ?? {});

    // Holds the live combat API so callbacks defined before the hook can reach it.
    const combatRef = useRef<ReturnType<typeof useBossCombat> | null>(null);

    const handleTelegraphComplete = useCallback((abilityId: string, _targetTiles: number[]) => {
      const effects = executeAbility(abilityId);
      // WARD: auto-block the attack — consume the ward and skip its effects.
      if (combatRef.current?.consumeWardForAttack()) {
        setParryResult('parried');
        return;
      }
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
      cancelTelegraph,
    } = useAttackTelegraph({ duration: 2000, onComplete: handleTelegraphComplete });

    // ============================================================
    // RPG COMBAT LAYER — parry, player abilities, weakness crit
    // ============================================================
    const [weakCrit, setWeakCrit] = useState<WeaknessCrit | null>(null);
    const weakCritTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const weakCritIdRef = useRef(0);
    useEffect(() => () => {
      if (weakCritTimerRef.current) clearTimeout(weakCritTimerRef.current);
    }, []);

    // Auto-clear the parry/ward banner after a beat (no manual ref timer).
    useEffect(() => {
      if (!parryResult) return;
      const id = setTimeout(() => setParryResult(null), 900);
      return () => clearTimeout(id);
    }, [parryResult]);

    const combatEnabled = BOSS_RPG_COMBAT_ENABLED && effectiveIsActive && !showIntro && !showVictory && !showDefeat;
    const newestWord = wordsFound.length > 0 ? wordsFound[wordsFound.length - 1] : null;

    const weaknessRule = useMemo(
      () => getBossWeakness(boss?.twistMechanic.type ?? 'popQuiz'),
      [boss]
    );
    const parryReq = useMemo(
      () => (isTelegraphing && combatEnabled ? getParryRequirement(weaknessRule, derivedPhase) : null),
      [isTelegraphing, combatEnabled, weaknessRule, derivedPhase]
    );

    const handleCounterDamage = useCallback((dmg: number) => {
      onCombatDamage?.(dmg, 1);
    }, [onCombatDamage]);

    const handleParrySuccess = useCallback(() => {
      cancelTelegraph();
      setParryResult('parried');
    }, [cancelTelegraph]);

    const combat = useBossCombat({
      twist: boss?.twistMechanic.type,
      world: worldNumber,
      phase: derivedPhase,
      comboCount,
      newestWord,
      parryReq,
      enabled: combatEnabled,
      onCounterDamage: handleCounterDamage,
      onParrySuccess: handleParrySuccess,
    });
    combatRef.current = combat;

    // WEAKNESS crit popup — independent of word-submit (same deterministic rule).
    const handledWeakWordRef = useRef<string | null>(null);
    useEffect(() => {
      if (!combatEnabled || !newestWord || newestWord === handledWeakWordRef.current) return;
      handledWeakWordRef.current = newestWord;
      if (evaluateWeakness(newestWord, weaknessRule).isWeakHit) {
        const id = ++weakCritIdRef.current;
        setWeakCrit({ id, label: weaknessRule.labelKey });
        if (weakCritTimerRef.current) clearTimeout(weakCritTimerRef.current);
        weakCritTimerRef.current = setTimeout(() => setWeakCrit(prev => (prev?.id === id ? null : prev)), 900);
      }
    }, [newestWord, combatEnabled, weaknessRule]);

    // --- Effect cap: prevent "effect soup" by limiting simultaneous visual effects ---
    const effectEntries: EffectEntry[] = useMemo(() => [
      { id: 'attackTelegraph', active: isTelegraphing, priority: 10 },
      { id: 'phaseBanner', active: !!phaseBanner, priority: 9 },

      { id: 'attackEffect', active: !!attackEffect, priority: 7 },
      { id: 'damageFloat', active: !!playerDmgFloat, priority: 5 },
      { id: 'rageVignette', active: hpPct < 20 && !isTelegraphing, priority: 3 },
      { id: 'enragedGlow', active: derivedPhase === 'enraged', priority: 1 },
    ], [isTelegraphing, phaseBanner, attackEffect, playerDmgFloat, hpPct, derivedPhase]);
    const fx = useEffectCap(effectEntries);

    const lastCheckRef = useRef<number>(0);
    const abilityCheckInterval = useSafeInterval();
    // State for ability system: map healthState.phase to BossStateMachineState
    const abilityState = healthState.phase === 'victory' ? 'victory' as const
      : healthState.phase === 'defeat' ? 'defeat' as const
      : healthState.phase === 'intro' ? 'intro' as const
      : derivedPhase;
    const abilityStateRef = useRef(abilityState);
    const derivedContextRef = useRef(derivedContext);
    useEffect(() => {
      abilityStateRef.current = abilityState;
      derivedContextRef.current = derivedContext;
    }, [abilityState, derivedContext]);

    useEffect(() => {
      if (!boss || !effectiveIsActive) {
        abilityCheckInterval.stop();
        return;
      }
      if (lastCheckRef.current === 0) lastCheckRef.current = Date.now();
      abilityCheckInterval.start(() => {
        const now = Date.now();
        const delta = now - lastCheckRef.current;
        lastCheckRef.current = now;
        tickCooldowns(delta);
        if (!telegraphingAbility && !combatRef.current?.isBossStunned()) {
          const abilityToActivate = checkActivation(derivedContextRef.current, abilityStateRef.current);
          if (abilityToActivate) {
            startAbility(abilityToActivate.id);
            startTelegraph(abilityToActivate.id, []);
          }
        }
      }, 500);
      return () => {
        abilityCheckInterval.stop();
      };
    }, [boss, effectiveIsActive, telegraphingAbility, checkActivation, startAbility, startTelegraph, tickCooldowns, abilityCheckInterval]);

    // ==============================================
    // CINEMATIC HANDLERS
    // ==============================================

    const handleEntranceComplete = useCallback(() => {
      onStartBattle?.();
    }, [onStartBattle]);

    const handleVictoryComplete = useCallback(() => { onContinue(); }, [onContinue]);
    const handleDefeatComplete = useCallback(() => { onRetry(); }, [onRetry]);

    // ==============================================
    // EARLY RETURN (after all hooks)
    // ==============================================

    if (!boss) return null;

    const showingActivePhase = effectiveIsActive && !showIntro;
    const borderClass = avatarBorderClass(derivedPhase);

    // Per-boss unique animations
    const bossAnims = getBossAnimations(boss.id);

    // Derive boss image based on reaction + phase
    const bossImageSrc = (() => {
      if (!boss.images) return boss.imagePath;
      if (bossReaction === 'attacking') return boss.images.attack;
      if (bossReaction === 'hit') return boss.images.hurt;
      if (derivedPhase === 'enraged') return boss.images.enraged;
      return boss.images.idle;
    })();

    // ==============================================
    // RENDER
    // ==============================================

    return (
      <>
        {/* INTRO CINEMATIC */}
        {showIntro && (
          <div className="relative">
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
            {onSkipIntro && (
              <button
                onClick={onSkipIntro}
                className="absolute bottom-6 inset-e-6 z-50 px-4 py-2 bg-neo-black/60 text-neo-white font-bold text-sm rounded-neo border border-neo-white/20 hover:bg-neo-black/80 transition-colors"
                aria-label={t('common.skip')}
              >
                {t('common.skip')} →
              </button>
            )}
          </div>
        )}

        {/* ACTIVE BATTLE UI */}
        {showingActivePhase && !showVictory && !showDefeat && (
          <>
            {/* Compact Combat HUD Strip — sits just below the GameHeader */}
            <div className="fixed top-12 sm:top-15 left-0 right-0 z-30 pointer-events-none">
              <div className="w-full max-w-2xl mx-auto px-2 sm:px-4 pt-1">
                {/* Boss Avatar + HP Bar row */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Boss Avatar — larger with rich state animations */}
                  <div className="relative shrink-0">
                    {/* Enraged outer glow ring — per-boss color (capped) */}
                    {fx.enragedGlow && (
                      <AdaptiveMotion.div
                        className="absolute -inset-1.5 rounded-neo blur-xs z-0"
                        style={{ backgroundColor: bossAnims.enragedGlowColor }}
                        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'easeInOut' }}
                        aria-hidden="true"
                      />
                    )}
                    <AdaptiveMotion.div
                      className={`relative w-14 h-14 sm:w-20 sm:h-20 rounded-neo border-3 ${borderClass} shadow-hard overflow-hidden bg-neo-navy-light z-10`}
                      animate={
                        bossReaction === 'attacking'
                          ? bossAnims.attack.animate
                          : bossReaction === 'hit'
                            ? bossAnims.hit.animate
                            : derivedPhase === 'enraged'
                              ? bossAnims.enraged.animate
                              : bossAnims.idle.animate
                      }
                      transition={
                        bossReaction === 'attacking'
                          ? bossAnims.attack.transition
                          : bossReaction === 'hit'
                            ? bossAnims.hit.transition
                            : derivedPhase === 'enraged'
                              ? bossAnims.enraged.transition
                              : bossAnims.idle.transition
                      }
                      style={derivedPhase === 'enraged' && bossAnims.enragedFilter ? { filter: bossAnims.enragedFilter } : undefined}
                      data-testid="boss-avatar"
                    >
                      {bossImageSrc ? (
                        <Image
                          src={bossImageSrc}
                          alt={t(boss.displayName)}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Swords className="w-7 h-7 text-neo-yellow" />
                        </div>
                      )}
                      {/* Hit flash overlay */}
                      <AdaptiveAnimatePresence>
                        {bossReaction === 'hit' && (
                          <AdaptiveMotion.div
                            className="absolute inset-0 bg-neo-lime/40 rounded-neo"
                            initial={{ opacity: 0.8 }}
                            animate={{ opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                      </AdaptiveAnimatePresence>
                      {/* Enraged border pulse (shares enragedGlow cap) */}
                      {fx.enragedGlow && (
                        <AdaptiveMotion.div
                          className="absolute inset-0 border-2 border-neo-red rounded-neo"
                          style={{ boxShadow: 'inset 0 0 16px rgba(255,51,102,0.5)' }}
                          animate={{ opacity: [0.3, 0.9, 0.3] }}
                          transition={{ repeat: Infinity, duration: 0.6 }}
                        />
                      )}
                    </AdaptiveMotion.div>

                    {/* Floating damage text — spring physics pop (capped) */}
                    <AdaptiveAnimatePresence>
                      {fx.damageFloat && playerDmgFloat && (
                        <AdaptiveMotion.div
                          key={playerDmgFloat.id}
                          className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none z-20"
                          initial={{ y: 0, opacity: 1, scale: 0.4 }}
                          animate={{ y: -32, opacity: 0, scale: 1.4 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                          aria-hidden="true"
                        >
                          <span className="font-neo-display text-base sm:text-lg font-black text-neo-lime drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] whitespace-nowrap">
                            -{playerDmgFloat.amount}
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
                        className="shrink-0 pointer-events-none"
                      >
                        <div className="relative w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center">
                          <svg
                            className="w-full h-full -rotate-90" viewBox="0 0 44 44"
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

                {/* Boss taunt — hidden on small screens to reduce clutter */}
                <AdaptiveAnimatePresence>
                  {showTaunt && currentTaunt && (
                    <AdaptiveMotion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="hidden sm:block mt-1.5 ms-14"
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

            {/* Phase Transition Banner — dramatic with boss portrait (capped) */}
            <AdaptiveAnimatePresence>
              {fx.phaseBanner && phaseBanner && (
                <AdaptiveMotion.div
                  className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  aria-live="assertive"
                  role="status"
                >
                  {/* Red flash overlay */}
                  <AdaptiveMotion.div
                    className="absolute inset-0 bg-neo-red/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.4, 0] }}
                    transition={{ duration: 0.6 }}
                  />
                  {/* Banner with boss enraged portrait */}
                  <AdaptiveMotion.div
                    className="flex items-center gap-4 px-6 py-4 bg-neo-navy border-3 border-neo-red rounded-neo shadow-hard-lg"
                    initial={{ scale: 0.5, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 1.1, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  >
                    {/* Mini enraged boss portrait */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-neo border-3 border-neo-red overflow-hidden shrink-0 shadow-hard-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={boss.images?.enraged ?? boss.imagePath}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-start">
                      <span
                        className="font-neo-display text-2xl sm:text-3xl font-black text-neo-red tracking-widest uppercase block"
                        style={{ textShadow: '0 2px 6px rgba(0,0,0,0.7)' }}
                      >
                        {phaseBanner}
                      </span>
                      <span className="text-neo-white text-xs font-bold">
                        {t(boss.displayName)}
                      </span>
                    </div>
                  </AdaptiveMotion.div>
                </AdaptiveMotion.div>
              )}
            </AdaptiveAnimatePresence>

            {/* Subtle rage vignette (capped) */}
            {fx.rageVignette && (
              <AdaptiveMotion.div
                className="fixed inset-0 pointer-events-none z-20"
                animate={{ opacity: [0.15, 0.3, 0.15] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                style={{ boxShadow: 'inset 0 0 80px rgba(255, 0, 0, 0.25)' }}
                data-testid="boss-rage-vignette"
              />
            )}

            {/* Simplified Attack Telegraph — edge glow only, no banner (capped) */}
            <AttackTelegraph
              isActive={!!fx.attackTelegraph}
              progress={telegraphState.progress}
              targetTiles={telegraphState.targetTiles}
              abilityId={telegraphState.abilityId}
              timeRemaining={telegraphState.timeRemaining}
              abilityName={telegraphingAbility?.name}
            />

            {/* RPG combat HUD — flag-dark; mounts only when the layer is enabled */}
            {BOSS_RPG_COMBAT_ENABLED && (
              <>
                {/* PARRY prompt — turns the telegraph into an active defend window */}
                <ParryPrompt
                  active={isTelegraphing}
                  hintKey={parryReq?.hintKey ?? 'adventure.boss.combat.parry.hint'}
                  secondsLeft={telegraphState.timeRemaining / 1000}
                  result={parryResult}
                  t={t}
                />

                {/* Player ability kit + weakness — the RPG moveset & strategy HUD.
                    Docked as a SOLID panel just above the player HP bar so it reads as
                    controls (legible + tappable) even where it meets the board edge on
                    tall, narrow phones, rather than transparent buttons over the tiles. */}
                <div className="fixed bottom-[calc(8rem+var(--admob-banner-height,0px))] sm:bottom-[calc(9.5rem+var(--admob-banner-height,0px))] lg:bottom-[calc(4.5rem+var(--admob-banner-height,0px))] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 px-2 py-1.5 rounded-neo bg-neo-navy/92 border-2 border-neo-black shadow-hard backdrop-blur-sm">
                  <WeaknessBadge labelKey={weaknessRule.labelKey} crit={weakCrit} t={t} />
                  <PlayerAbilityBar
                    abilities={combat.abilities}
                    charge={combat.charge}
                    maxCharge={combat.maxCharge}
                    onCast={combat.cast}
                    t={t}
                  />
                </div>
              </>
            )}

            {/* Boss Attack Effect (capped) */}
            {fx.attackEffect && <BossAttackEffect attackEffect={attackEffect} bossId={boss.id} />}

            {/* Screen shake on boss attack — CSS animation on the game viewport (shares attackEffect cap) */}
            {fx.attackEffect && attackEffect && (
              <style jsx global>{`
                @keyframes bossScreenShake {
                  0%, 100% { transform: translate(0, 0); }
                  10% { transform: translate(-4px, 2px); }
                  20% { transform: translate(3px, -3px); }
                  30% { transform: translate(-2px, 4px); }
                  40% { transform: translate(4px, -1px); }
                  50% { transform: translate(-3px, 3px); }
                  60% { transform: translate(2px, -4px); }
                  70% { transform: translate(-4px, 1px); }
                  80% { transform: translate(3px, -2px); }
                  90% { transform: translate(-1px, 3px); }
                }
                [data-adventure-game] {
                  animation: bossScreenShake 0.4s ease-out;
                }
                @media (prefers-reduced-motion: reduce) {
                  [data-adventure-game] { animation: none !important; }
                }
              `}</style>
            )}

            {/* Attack portrait flyout removed — boss avatar already shows attack state,
                and the large portrait was cluttering mobile layouts */}
          </>
        )}

        {/* VICTORY CINEMATIC */}
        {showVictory && (
          <CinematicPlayer
            composition={BossDefeatCinematic as unknown as React.ComponentType<Record<string, unknown>>}
            compositionProps={{
              bossName: t(boss.displayName),
              bossImagePath: boss.images?.defeated ?? boss.imagePath,
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
        {showDefeat && (
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

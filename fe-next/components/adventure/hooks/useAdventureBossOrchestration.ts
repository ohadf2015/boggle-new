/**
 * useAdventureBossOrchestration Hook (Simplified)
 *
 * Orchestrates boss-specific concerns using the new simplified boss system:
 * - Boss config/state from useAdventureBossNew
 * - Player health management
 * - Boss attack callbacks (lockTiles, scramble, timePenalty)
 * Extracted from AdventureGame.tsx to reduce orchestrator size.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePreviousValue } from '@/hooks/usePreviousValue';
import { useAdventureBossNew, type BossAttack } from '@/hooks/useAdventureBossNew';
import { usePlayerHealth } from '@/hooks/usePlayerHealth';
import { useBossMechanics } from '@/hooks/useBossMechanics';
import { useHaptics } from '@/hooks/useHaptics';
import type { BossTauntEvent, BossMechanicResult } from '@/types/boss';
import { type BossTier } from '@/components/celebration/BossDefeatFireworks';

export interface UseAdventureBossOrchestrationProps {
  isBossLevel: boolean;
  worldId: number | null;
  levelNumber: number;
  showBossIntroConfig: boolean;
  timeRemaining: number;
  isPlaying: boolean;
  startGame: () => void;
  startAIDirector: () => void;
  addTime: (seconds: number) => void;
  shake: (intensity: number) => void;
  bossDamageMultiplier?: number;
  blockFirstAttack?: boolean;
  scrambleImmunity?: boolean;
  scrambleTiles?: () => void;
}

export function useAdventureBossOrchestration(props: UseAdventureBossOrchestrationProps) {
  const {
    isBossLevel, worldId, levelNumber: _levelNumber, showBossIntroConfig,
    timeRemaining: _timeRemaining, isPlaying, startGame, startAIDirector,
    addTime, shake,
    bossDamageMultiplier = 1, blockFirstAttack = false, scrambleImmunity = false,
    scrambleTiles,
  } = props;

  // Boss intro state
  const [showBossIntro, setShowBossIntro] = useState(
    isBossLevel && showBossIntroConfig === true
  );

  // Battle result + fireworks (consolidated — always change together)
  const [battleState, setBattleState] = useState<{
    result: 'none' | 'victory' | 'defeat';
    showFireworks: boolean;
    defeatedTier: BossTier;
  }>({ result: 'none', showFireworks: false, defeatedTier: 'standard' });

  // Player health (for boss levels with player damage) — must be before handleAttack
  const playerHealth = usePlayerHealth(isBossLevel ? 100 : 0);

  // Ability-system locked tiles (from onLockTiles callback)
  const [abilityLockedTiles, setAbilityLockedTiles] = useState<number[]>([]);
  const abilityLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track first attack for blockFirstAttack upgrade
  const firstAttackBlockedRef = useRef(false);

  // Edge vignette flash on boss attacks
  const [showEdgeVignette, setShowEdgeVignette] = useState(false);
  const vignetteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fireworksTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (vignetteTimeoutRef.current) clearTimeout(vignetteTimeoutRef.current);
      if (fireworksTimeoutRef.current) clearTimeout(fireworksTimeoutRef.current);
      if (abilityLockTimerRef.current) clearTimeout(abilityLockTimerRef.current);
    };
  }, []);

  // Boss grid effect state (triggered on phase transitions)
  const [gridEffectTrigger, setGridEffectTrigger] = useState<{ name: string; id: number } | null>(null);
  const gridEffectIdRef = useRef(0);

  // Attack handler — applies boss attacks to the game (with upgrade effects)
  const handleAttack = useCallback((attack: BossAttack) => {
    // Block first attack (Armor Plating T3)
    if (blockFirstAttack && !firstAttackBlockedRef.current) {
      firstAttackBlockedRef.current = true;
      shake(1); // visual feedback that attack was blocked
      return;
    }

    // Flash edge vignette on all boss attacks
    if (vignetteTimeoutRef.current) clearTimeout(vignetteTimeoutRef.current);
    setShowEdgeVignette(true);
    vignetteTimeoutRef.current = setTimeout(() => setShowEdgeVignette(false), 400);

    if (attack.type === 'scramble') {
      if (scrambleImmunity) return; // Blast Shield T3
      shake(3);
      scrambleTiles?.();
    } else if (attack.type === 'lockTiles') {
      shake(2);
    } else if (attack.type === 'damage' && attack.damage) {
      const reducedDamage = Math.floor(attack.damage * bossDamageMultiplier);
      playerHealth.takeDamage(reducedDamage);
      shake(2);
    } else if (attack.type === 'gridEffect' && attack.gridEffect) {
      gridEffectIdRef.current += 1;
      setGridEffectTrigger({ name: attack.gridEffect, id: gridEffectIdRef.current });
      shake(3);
    }
  }, [shake, playerHealth, bossDamageMultiplier, blockFirstAttack, scrambleImmunity, scrambleTiles]);

  // Victory handler
  const handleVictory = useCallback(() => {
    let tier: BossTier = 'mini';
    if (worldId && worldId >= 7) tier = 'elite';
    else if (worldId && worldId >= 4) tier = 'standard';

    setBattleState({ result: 'victory', showFireworks: true, defeatedTier: tier });

    const durations: Record<BossTier, number> = { mini: 3500, standard: 5500, elite: 8500 };
    if (fireworksTimeoutRef.current) clearTimeout(fireworksTimeoutRef.current);
    fireworksTimeoutRef.current = setTimeout(() => setBattleState(prev => ({ ...prev, showFireworks: false })), durations[tier]);
  }, [worldId]);

  // Defeat handler
  const handleDefeat = useCallback(() => {
    setBattleState(prev => ({ ...prev, result: 'defeat' }));
  }, []);

  // Boss twist mechanics (palindrome, anagram, etymology, etc.)
  const bossMechanics = useBossMechanics({ worldId: isBossLevel ? worldId : null });

  // New simplified boss hook
  const {
    isActive: bossIsActive,
    hp: bossHP,
    maxHP: bossMaxHP,
    hpPercentage: bossHPPercentage,
    phase: bossPhaseValue,
    boss: bossConfig,
    currentTaunt: bossTaunt,
    lockedTiles: bossLockedTiles,
    startBattle: bossStartBattle,
    endBattle: bossEndBattle,
    dealDamage: bossDealDamage,
    triggerTaunt: bossTriggerTaunt,
    reset: bossReset,
  } = useAdventureBossNew({
    worldId: isBossLevel ? worldId : null,
    onVictory: handleVictory,
    onDefeat: handleDefeat,
    onAttack: handleAttack,
  });

  // Haptic feedback
  const { bossHit } = useHaptics();

  // Phase change drama: freeze timer, screen shake, taunt
  const prevBossPhase = usePreviousValue(bossPhaseValue);
  const lastPhaseAdvanceRef = useRef(0);
  useEffect(() => {
    if (prevBossPhase !== undefined && prevBossPhase !== bossPhaseValue && bossIsActive) {
      shake(4);
      bossTriggerTaunt('onMechanic');
      addTime(1.5);
      // Advance twist mechanic phase for multi-phase bosses (World 10 finalWord)
      // Guard: debounce so timed rotation and HP-triggered advance don't double-fire
      lastPhaseAdvanceRef.current = Date.now();
      bossMechanics.advancePhase();
    }
  }, [bossPhaseValue, prevBossPhase, bossIsActive, shake, bossTriggerTaunt, addTime, bossMechanics]);

  // Timed phase rotation for W10 finalWord boss (cycles 9 mechanics every phaseDuration seconds)
  useEffect(() => {
    const boss = bossMechanics.boss;
    if (!isPlaying || !bossIsActive || !boss || boss.twistMechanic.type !== 'finalWord') return;

    const phaseDuration = (boss.twistMechanic.params.phaseDuration as number) || 15;
    const interval = setInterval(() => {
      // Skip if HP-triggered advance happened within last 2 seconds
      if (Date.now() - lastPhaseAdvanceRef.current < 2000) return;
      bossMechanics.advancePhase();
    }, phaseDuration * 1000);

    return () => clearInterval(interval);
  }, [isPlaying, bossIsActive, bossMechanics]);

  // Player death → defeat: when player HP reaches 0 during an active boss fight,
  // trigger defeat. Without this, the player could continue playing at 0 HP.
  useEffect(() => {
    if (bossIsActive && playerHealth.healthState.currentHP === 0) {
      bossEndBattle('defeat');
    }
  }, [bossIsActive, playerHealth.healthState.currentHP, bossEndBattle]);

  // Low health taunt (replaces low-time taunt since boss fights are untimed)
  const lowHealthTriggedRef = useRef(false);
  useEffect(() => {
    if (
      bossIsActive &&
      isPlaying &&
      playerHealth.healthState.currentHP > 0 &&
      playerHealth.healthState.currentHP <= 25 &&
      !lowHealthTriggedRef.current
    ) {
      lowHealthTriggedRef.current = true;
      bossTriggerTaunt('onLowTime'); // Reuse taunt key — contextually fits "you're almost done"
    }
    if (playerHealth.healthState.currentHP > 25) {
      lowHealthTriggedRef.current = false;
    }
  }, [bossIsActive, isPlaying, playerHealth.healthState.currentHP, bossTriggerTaunt]);

  // Boss intro handler (start or skip — same behavior)
  const handleBossIntro = useCallback(() => {
    setShowBossIntro(false);
    bossStartBattle();
    if (!isPlaying) {
      startGame();
      startAIDirector();
    }
  }, [isPlaying, startGame, startAIDirector, bossStartBattle]);

  // Check word against boss twist mechanics (delegates to useBossMechanics)
  const checkBossWord = useCallback((word: string): BossMechanicResult => {
    const result = bossMechanics.checkWord(word);
    if (result.triggerTaunt) {
      bossMechanics.triggerTaunt(result.triggerTaunt);
    }
    return result;
  }, [bossMechanics]);

  // Deal damage to boss: baseDamage × mechanicMultiplier
  const dealBossDamage = useCallback((baseDamage: number, mechanicMultiplier: number): number => {
    const damage = Math.floor(baseDamage * mechanicMultiplier);
    const result = bossDealDamage(damage);
    bossHit();
    return result;
  }, [bossDealDamage, bossHit]);

  // endBossBattle — compatible with old signature
  const endBossBattle = useCallback((isVictory: boolean) => {
    bossEndBattle(isVictory ? 'victory' : 'defeat');
  }, [bossEndBattle]);

  // triggerBossTaunt — pass through
  const triggerBossTaunt = useCallback((event: BossTauntEvent) => {
    bossTriggerTaunt(event);
  }, [bossTriggerTaunt]);

  // Build healthState shape compatible with old consumers
  const bossHealthState = useMemo(() => ({
    currentHP: bossHP,
    maxHP: bossMaxHP,
    phase: battleState.result === 'victory' ? 'victory' as const
      : battleState.result === 'defeat' ? 'defeat' as const
      : bossIsActive ? 'active' as const
      : 'intro' as const,
    totalDamageDealt: bossMaxHP - bossHP,
    isActive: bossIsActive,
  }), [bossHP, bossMaxHP, bossIsActive, battleState.result]);

  // Reset functions
  const resetBossHealth = useCallback(() => {
    bossReset();
    setBattleState({ result: 'none', showFireworks: false, defeatedTier: 'standard' });
    firstAttackBlockedRef.current = false;
    lowHealthTriggedRef.current = false;
    // Reset boss intro so retry can re-trigger the battle start
    if (isBossLevel && showBossIntroConfig) {
      setShowBossIntro(true);
    }
  }, [bossReset, isBossLevel, showBossIntroConfig]);

  // Effect callbacks wired to actual game state
  const bossEffectCallbacks = useMemo(() => ({
    onPlayerDamage: (amount: number) => {
      playerHealth.takeDamage(amount);
    },
    onTimerPenalty: (seconds: number) => {
      addTime(-seconds);
    },
    onScreenShake: (intensity?: number) => {
      shake(intensity ?? 2);
    },
    onDamageFlash: () => {
      shake(1);
    },
    onScramble: () => {
      shake(3);
      scrambleTiles?.();
    },
    onLockTiles: (indices: number[], durationMs: number) => {
      setAbilityLockedTiles(indices);
      if (abilityLockTimerRef.current) clearTimeout(abilityLockTimerRef.current);
      abilityLockTimerRef.current = setTimeout(() => setAbilityLockedTiles([]), durationMs);
    },
  }), [playerHealth, addTime, shake, scrambleTiles]);

  const mergedLockedTiles = useMemo(
    () => [...new Set([...bossLockedTiles, ...abilityLockedTiles])],
    [bossLockedTiles, abilityLockedTiles]
  );

  return {
    // Boss state
    isBossActive: bossIsActive,
    bossConfig,
    bossTaunt,
    showBossTaunt: bossTaunt !== null,
    bossHealthState,
    bossHPPercentage,
    isEnraged: bossPhaseValue === 'desperate',
    showBossIntro,
    showBossFireworks: battleState.showFireworks,
    defeatedBossTier: battleState.defeatedTier,

    // New boss state (for simplified BossOverlay)
    bossPhase: bossPhaseValue,
    bossCurrentHP: bossHP,
    bossMaxHP,
    lockedTiles: mergedLockedTiles,

    // Boss mechanic state (for W10 finalWord rotating phase)
    bossMechanicState: bossMechanics.bossState,

    // Boss combat functions
    checkBossWord,
    dealBossDamage,
    triggerBossTaunt,
    startBossBattle: bossStartBattle,
    endBossBattle,
    resetBossHealth,

    // Boss intro handler (start and skip are identical)
    handleBossIntroStart: handleBossIntro,
    handleBossIntroSkip: handleBossIntro,

    // Player health
    playerHealthState: playerHealth.healthState,
    takePlayerDamage: playerHealth.takeDamage,
    healPlayer: playerHealth.heal,
    resetPlayerHealth: playerHealth.resetHealth,

    // Effect callbacks (unused but kept for compat)
    bossEffectCallbacks,

    // Edge vignette flash on boss attacks
    showEdgeVignette,

    // Boss grid effect (phase transition visual)
    gridEffectTrigger,
  };
}

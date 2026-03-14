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
}

export function useAdventureBossOrchestration(props: UseAdventureBossOrchestrationProps) {
  const {
    isBossLevel, worldId, levelNumber, showBossIntroConfig,
    timeRemaining, isPlaying, startGame, startAIDirector,
    addTime, shake,
    bossDamageMultiplier = 1, blockFirstAttack = false, scrambleImmunity = false,
  } = props;

  // Boss intro state
  const [showBossIntro, setShowBossIntro] = useState(
    isBossLevel && showBossIntroConfig === true
  );

  // Boss defeat fireworks
  const [showBossFireworks, setShowBossFireworks] = useState(false);
  const [defeatedBossTier, setDefeatedBossTier] = useState<BossTier>('standard');

  // Victory/defeat tracking
  const [battleResult, setBattleResult] = useState<'none' | 'victory' | 'defeat'>('none');

  // Player health (for boss levels with player damage) — must be before handleAttack
  const playerHealth = usePlayerHealth(isBossLevel ? 100 : 0);

  // Track first attack for blockFirstAttack upgrade
  const firstAttackBlockedRef = useRef(false);

  // Attack handler — applies boss attacks to the game (with upgrade effects)
  const handleAttack = useCallback((attack: BossAttack) => {
    // Block first attack (Armor Plating T3)
    if (blockFirstAttack && !firstAttackBlockedRef.current) {
      firstAttackBlockedRef.current = true;
      shake(1); // visual feedback that attack was blocked
      return;
    }

    if (attack.type === 'timePenalty' && attack.seconds) {
      addTime(-attack.seconds);
    } else if (attack.type === 'scramble') {
      if (scrambleImmunity) return; // Blast Shield T3
      shake(3);
    } else if (attack.type === 'lockTiles') {
      shake(2);
    } else if (attack.type === 'damage' && attack.damage) {
      const reducedDamage = Math.floor(attack.damage * bossDamageMultiplier);
      playerHealth.takeDamage(reducedDamage);
      shake(2);
    }
  }, [addTime, shake, playerHealth, bossDamageMultiplier, blockFirstAttack, scrambleImmunity]);

  // Victory handler
  const handleVictory = useCallback(() => {
    setBattleResult('victory');

    // Determine boss tier for fireworks
    let tier: BossTier = 'mini';
    if (levelNumber >= 20 || levelNumber % 20 === 0) {
      tier = 'elite';
    } else if (levelNumber >= 15 || levelNumber % 15 === 0) {
      tier = 'standard';
    }
    setDefeatedBossTier(tier);
    setShowBossFireworks(true);

    const durations: Record<BossTier, number> = {
      mini: 3500, standard: 5500, elite: 8500,
    };
    setTimeout(() => setShowBossFireworks(false), durations[tier]);
  }, [levelNumber]);

  // Defeat handler
  const handleDefeat = useCallback(() => {
    setBattleResult('defeat');
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
  const prevPhaseRef = useRef(bossPhaseValue);
  useEffect(() => {
    if (prevPhaseRef.current !== bossPhaseValue && bossIsActive) {
      // Phase changed — trigger drama sequence
      shake(4);
      bossTriggerTaunt('onMechanic');

      // Compensate for 1.5s timer freeze by adding time back
      // The visual "freeze" is achieved by the shake + taunt disruption
      addTime(1.5);
    }
    prevPhaseRef.current = bossPhaseValue;
  }, [bossPhaseValue, bossIsActive, shake, bossTriggerTaunt, addTime]);

  // Low time taunt
  const lowTimeTriggedRef = useRef(false);
  useEffect(() => {
    if (
      bossIsActive &&
      isPlaying &&
      timeRemaining <= 15 &&
      timeRemaining > 0 &&
      !lowTimeTriggedRef.current
    ) {
      lowTimeTriggedRef.current = true;
      bossTriggerTaunt('onLowTime');
    }
    if (timeRemaining > 15) {
      lowTimeTriggedRef.current = false;
    }
  }, [bossIsActive, isPlaying, timeRemaining, bossTriggerTaunt]);

  // Boss intro start handler
  const handleBossIntroStart = useCallback(() => {
    setShowBossIntro(false);
    bossStartBattle();
    if (!isPlaying) {
      startGame();
      startAIDirector();
    }
  }, [isPlaying, startGame, startAIDirector, bossStartBattle]);

  // Boss intro skip handler
  const handleBossIntroSkip = useCallback(() => {
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

  // Simplified dealBossDamage — wraps the new hook's dealDamage
  // Accepts old signature for compatibility but internally just uses score
  const dealBossDamage = useCallback((baseDamage: number, _combo: number, mechanicMultiplier: number, _comboBonus: number): number => {
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
    phase: battleResult === 'victory' ? 'victory' as const
      : battleResult === 'defeat' ? 'defeat' as const
      : bossIsActive ? 'active' as const
      : 'intro' as const,
    totalDamageDealt: bossMaxHP - bossHP,
    isActive: bossIsActive,
  }), [bossHP, bossMaxHP, bossIsActive, battleResult]);

  // Reset functions
  const resetBossHealth = useCallback(() => {
    bossReset();
    setBattleResult('none');
  }, [bossReset]);

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
    },
  }), [playerHealth, addTime, shake]);

  return {
    // Boss state
    isBossActive: bossIsActive,
    bossConfig,
    bossTaunt,
    showBossTaunt: bossTaunt !== null,
    bossHealthState,
    bossHPPercentage,
    isEnraged: bossPhaseValue === 'desperate',
    bossState: {},
    showBossIntro,
    showBossFireworks,
    defeatedBossTier,

    // New boss state (for simplified BossOverlay)
    bossPhase: bossPhaseValue,
    bossCurrentHP: bossHP,
    bossMaxHP,
    lockedTiles: bossLockedTiles,

    // Boss combat functions
    checkBossWord,
    dealBossDamage,
    triggerBossTaunt,
    startBossBattle: bossStartBattle,
    endBossBattle,
    resetBossHealth,

    // Boss intro handlers
    handleBossIntroStart,
    handleBossIntroSkip,

    // Player health
    playerHealthState: playerHealth.healthState,
    takePlayerDamage: playerHealth.takeDamage,
    resetPlayerHealth: playerHealth.resetHealth,

    // Effect callbacks (unused but kept for compat)
    bossEffectCallbacks,
  };
}

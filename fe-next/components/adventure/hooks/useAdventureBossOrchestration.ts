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
}

export function useAdventureBossOrchestration(props: UseAdventureBossOrchestrationProps) {
  const {
    isBossLevel, worldId, levelNumber, showBossIntroConfig,
    timeRemaining, isPlaying, startGame, startAIDirector,
    addTime, shake,
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

  // Attack handler — applies boss attacks to the game
  const handleAttack = useCallback((attack: BossAttack) => {
    if (attack.type === 'timePenalty' && attack.seconds) {
      addTime(-attack.seconds);
    } else if (attack.type === 'scramble') {
      // Scramble is handled by the grid component via lockedTiles state
      shake(3);
    } else if (attack.type === 'lockTiles') {
      shake(2);
    }
  }, [addTime, shake]);

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

  // Player health (for boss levels with player damage)
  const playerHealth = usePlayerHealth(isBossLevel ? 100 : 0);

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

  // Simplified checkBossWord — no complex mechanics, just bonus for long words
  const checkBossWord = useCallback((word: string): BossMechanicResult => {
    const isGood = word.length >= 5;
    return {
      meetsRequirement: isGood,
      scoreMultiplier: isGood ? 1.5 : 1.0,
      triggerTaunt: isGood ? 'onGoodWord' : undefined,
    };
  }, []);

  // Simplified dealBossDamage — wraps the new hook's dealDamage
  // Accepts old signature for compatibility but internally just uses score
  const dealBossDamage = useCallback((baseDamage: number, _combo: number, mechanicMultiplier: number, _comboBonus: number): number => {
    const damage = Math.floor(baseDamage * mechanicMultiplier);
    return bossDealDamage(damage);
  }, [bossDealDamage]);

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

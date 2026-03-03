/**
 * useAdventureBossOrchestration Hook
 *
 * Orchestrates boss-specific concerns:
 * - Boss config/state from useAdventureBoss
 * - Player health management
 * - Boss effect callbacks (damage, timer penalty, screen shake, scramble)
 * Extracted from AdventureGame.tsx to reduce orchestrator size.
 */

import { useMemo } from 'react';
import { useAdventureBoss } from './useAdventureBoss';
import { usePlayerHealth } from '@/hooks/usePlayerHealth';
import type { EffectCallbacks } from '@/hooks/useBossEffectExecutor';

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

  const boss = useAdventureBoss({
    isBossLevel,
    worldId,
    levelNumber,
    showBossIntroConfig,
    timeRemaining,
    isPlaying,
    onStartGame: startGame,
    onStartAIDirector: startAIDirector,
  });

  const playerHealth = usePlayerHealth(isBossLevel ? 100 : 0);

  const bossEffectCallbacks: EffectCallbacks = useMemo(() => ({
    onPlayerDamage: (amount: number) => {
      if (isBossLevel) {
        playerHealth.takeDamage(amount);
      }
    },
    onTimerPenalty: (seconds: number) => {
      addTime(-seconds);
    },
    onScreenShake: (intensity?: number) => {
      shake(intensity ?? 4);
    },
    onDamageFlash: () => {
      // Flash effect handled by AdventureEffectsLayer
    },
    onScramble: () => {
      console.log('[Boss Effect] Scramble triggered');
    },
  }), [isBossLevel, playerHealth, addTime, shake]);

  return {
    // Boss state (passthrough)
    isBossActive: boss.isBossActive,
    bossConfig: boss.bossConfig,
    bossTaunt: boss.bossTaunt,
    showBossTaunt: boss.showBossTaunt,
    bossHealthState: boss.bossHealthState,
    bossHPPercentage: boss.bossHPPercentage,
    isEnraged: boss.isEnraged,
    bossState: boss.bossState,
    showBossIntro: boss.showBossIntro,
    showBossFireworks: boss.showBossFireworks,
    defeatedBossTier: boss.defeatedBossTier,

    // Boss combat functions
    checkBossWord: boss.checkBossWord,
    dealBossDamage: boss.dealBossDamage,
    triggerBossTaunt: boss.triggerBossTaunt,
    startBossBattle: boss.startBossBattle,
    endBossBattle: boss.endBossBattle,
    resetBossHealth: boss.resetBossHealth,

    // Boss intro handlers
    handleBossIntroStart: boss.handleBossIntroStart,
    handleBossIntroSkip: boss.handleBossIntroSkip,

    // Player health
    playerHealthState: playerHealth.healthState,
    takePlayerDamage: playerHealth.takeDamage,
    resetPlayerHealth: playerHealth.resetHealth,

    // Effect callbacks
    bossEffectCallbacks,
  };
}

/**
 * useBossRush (adventure hub) — per-player boss-rush sequencing.
 *
 * Used inside the adventure hub (`AdventureView`). Computes the boss sequence
 * from the player's completed level-7 fights. Shared player health across the
 * run, 20% heal between bosses.
 *
 * NOT the same as `hooks/useBossRushArcade`, which runs the standalone
 * `/adventure/boss-rush` page with a predefined random sequence.
 *
 * Usage:
 * - Pass completions to determine which bosses are available
 * - startRush() → advanceToNextBoss() → ... → isComplete / isFailed
 */

import { useState, useCallback, useMemo } from 'react';
import { getBossConfig } from '@/lib/adventure/bossConfig';
import { getLevelConfig, generateAdventureGrid, getLevelSeed, getGridSize } from '@/lib/adventure';
import { LEVELS_PER_WORLD } from '@/lib/adventure/constants';
import type { LevelCompletion, LevelConfig } from '@/types/adventure';
import type { BossConfig } from '@/types/boss';
import type { Language } from '@/types';

// ==============================================
// TYPES
// ==============================================

export interface BossRushState {
  isActive: boolean;
  currentBossIndex: number;
  defeatedBosses: number[];
  totalBosses: number;
  bossesDefeated: number;
  totalScore: number;
  startTime: number;
  isComplete: boolean;
  isFailed: boolean;
}

export interface UseBossRushReturn {
  state: BossRushState;
  canStartBossRush: boolean;
  defeatedBossWorlds: number[];
  startRush: () => void;
  advanceToNextBoss: () => void;
  addScore: (points: number) => void;
  failRush: () => void;
  resetRush: () => void;
  getCurrentBossWorldId: () => number | null;
  getCurrentBossConfig: () => BossConfig | null;
  getLevelConfigForCurrentBoss: () => LevelConfig | null;
}

// ==============================================
// CONSTANTS
// ==============================================

const BOSS_LEVEL = LEVELS_PER_WORLD; // level 7

const INITIAL_STATE: BossRushState = {
  isActive: false,
  currentBossIndex: 0,
  defeatedBosses: [],
  totalBosses: 0,
  bossesDefeated: 0,
  totalScore: 0,
  startTime: 0,
  isComplete: false,
  isFailed: false,
};

// ==============================================
// HOOK
// ==============================================

export function useBossRush(completions: LevelCompletion[], language: Language = 'en'): UseBossRushReturn {
  const [state, setState] = useState<BossRushState>(INITIAL_STATE);

  // Compute which bosses the player has defeated (level 7 completions)
  const defeatedBossWorlds = useMemo(() => {
    const worlds = new Set<number>();
    for (const c of completions) {
      if (c.level === BOSS_LEVEL && c.stars > 0) {
        worlds.add(c.world);
      }
    }
    return Array.from(worlds).sort((a, b) => a - b);
  }, [completions]);

  const canStartBossRush = defeatedBossWorlds.length >= 1;

  const startRush = useCallback(() => {
    if (defeatedBossWorlds.length === 0) return;
    setState({
      isActive: true,
      currentBossIndex: 0,
      defeatedBosses: defeatedBossWorlds,
      totalBosses: defeatedBossWorlds.length,
      bossesDefeated: 0,
      totalScore: 0,
      startTime: Date.now(),
      isComplete: false,
      isFailed: false,
    });
  }, [defeatedBossWorlds]);

  const advanceToNextBoss = useCallback(() => {
    setState(prev => {
      if (!prev.isActive) return prev;
      const newDefeated = prev.bossesDefeated + 1;
      const nextIndex = prev.currentBossIndex + 1;
      const isComplete = nextIndex >= prev.totalBosses;
      return {
        ...prev,
        currentBossIndex: nextIndex,
        bossesDefeated: newDefeated,
        isComplete,
        isActive: !isComplete,
      };
    });
  }, []);

  const addScore = useCallback((points: number) => {
    setState(prev => {
      if (!prev.isActive) return prev;
      return { ...prev, totalScore: prev.totalScore + points };
    });
  }, []);

  const failRush = useCallback(() => {
    setState(prev => ({
      ...prev,
      isFailed: true,
      isActive: false,
    }));
  }, []);

  const resetRush = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const getCurrentBossWorldId = useCallback((): number | null => {
    if (!state.isActive) return null;
    return state.defeatedBosses[state.currentBossIndex] ?? null;
  }, [state.isActive, state.defeatedBosses, state.currentBossIndex]);

  const getCurrentBossConfig = useCallback((): BossConfig | null => {
    const worldId = getCurrentBossWorldId();
    if (worldId === null) return null;
    return getBossConfig(worldId);
  }, [getCurrentBossWorldId]);

  const getLevelConfigForCurrentBoss = useCallback((): LevelConfig | null => {
    const worldId = getCurrentBossWorldId();
    if (worldId === null) return null;
    const gridSize = getGridSize(worldId) as 4 | 5 | 6 | 7;
    const seed = getLevelSeed(worldId, BOSS_LEVEL);
    const grid = generateAdventureGrid(gridSize, seed, language);
    return getLevelConfig(worldId, BOSS_LEVEL, grid);
  }, [getCurrentBossWorldId, language]);

  return {
    state,
    canStartBossRush,
    defeatedBossWorlds,
    startRush,
    advanceToNextBoss,
    addScore,
    failRush,
    resetRush,
    getCurrentBossWorldId,
    getCurrentBossConfig,
    getLevelConfigForCurrentBoss,
  };
}

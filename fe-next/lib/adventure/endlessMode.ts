/**
 * Endless Mode — procedurally generated levels with escalating difficulty.
 * Unlocked after completing all 10 worlds.
 * Each floor increases difficulty and cycles world mechanics.
 */

import type { LevelObjective } from '@/types/adventure';

export const ENDLESS_MODE_CONFIG = {
  startingGridSize: 4 as 4 | 5 | 6 | 7,
  startingTimerSeconds: 120,
  minTimerSeconds: 30,
  timerDecayPerFloor: 3,
  gridSizeUpEvery: 8, // grid grows every 8 floors
  specialTileBase: 2,
  specialTileGrowth: 0.3, // +0.3 per floor
  scoreTargetBase: 200,
  scoreTargetGrowth: 50, // +50 per floor
};

// World mechanics to cycle through (worlds 2-9)
const MECHANIC_CYCLE = [
  'synonymPairs', 'etymologyRoots', 'idioms', 'compounds',
  'anagrams', 'palindromes', 'rareWords', 'multilingual',
];

export interface EndlessDifficulty {
  gridSize: 4 | 5 | 6 | 7;
  timerSeconds: number;
  specialTileCount: number;
  scoreTarget: number;
  mechanic: string | null;
}

/** Calculate difficulty parameters for a given floor */
export function getEndlessDifficulty(floor: number): EndlessDifficulty {
  const cfg = ENDLESS_MODE_CONFIG;

  // Grid size: starts at 4, grows every 8 floors, caps at 7
  const gridGrowth = Math.floor((floor - 1) / cfg.gridSizeUpEvery);
  const gridSize = Math.min(7, cfg.startingGridSize + gridGrowth) as 4 | 5 | 6 | 7;

  // Timer: decreases, min 30s
  const timerSeconds = Math.max(
    cfg.minTimerSeconds,
    cfg.startingTimerSeconds - (floor - 1) * cfg.timerDecayPerFloor
  );

  // Special tiles: increases with floor
  const specialTileCount = Math.floor(cfg.specialTileBase + (floor - 1) * cfg.specialTileGrowth);

  // Score target: increases linearly
  const scoreTarget = cfg.scoreTargetBase + (floor - 1) * cfg.scoreTargetGrowth;

  // Cycle world mechanics
  const mechanic = floor <= 1 ? null : MECHANIC_CYCLE[(floor - 2) % MECHANIC_CYCLE.length];

  return { gridSize, timerSeconds, specialTileCount, scoreTarget, mechanic };
}

/** Generate a level config for an endless floor */
export function generateEndlessFloor(floor: number) {
  const diff = getEndlessDifficulty(floor);

  const objectives: LevelObjective[] = [
    { type: 'scoreTarget', target: diff.scoreTarget, isPrimary: true },
  ];

  // Add word count objective at higher floors
  if (floor >= 5) {
    objectives.push({ type: 'wordCount', target: 10 + floor * 2 });
  }

  return {
    world: 0, // endless mode uses world 0
    level: floor,
    gridSize: diff.gridSize,
    timerSeconds: diff.timerSeconds,
    objectives,
    specialTiles: [], // populated at runtime by grid generator
    difficulty: floor <= 5 ? 'EASY' as const : floor <= 15 ? 'MEDIUM' as const : 'HARD' as const,
    worldMechanic: diff.mechanic ?? undefined,
    chapterNumber: 1 as const,
    levelInChapter: 1 as const,
    isBossLevel: floor % 10 === 0, // boss every 10 floors
    minWordLength: floor >= 10 ? 3 : undefined,
  };
}

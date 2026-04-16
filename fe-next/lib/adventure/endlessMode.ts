/**
 * Endless Mode — procedurally generated levels with escalating difficulty.
 * Unlocked at World 3 (prologue access) via AdventureHub gate.
 * Each floor increases difficulty and cycles world mechanics.
 */

import type { LevelObjective } from '@/types/adventure';

// ==============================================
// MINI-EVENTS (every 10 floors to prevent repetition fatigue)
// ==============================================

export type EndlessMiniEvent = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  /** Effect modifiers applied to the floor */
  effects: {
    timerBonus?: number;
    scoreMultiplier?: number;
    goldMultiplier?: number;
    extraMechanic?: string;
    specialTileBoost?: number;
  };
};

const MINI_EVENTS: EndlessMiniEvent[] = [
  {
    id: 'double_gold',
    nameKey: 'adventure.endlessMode.events.doubleGold',
    descriptionKey: 'adventure.endlessMode.events.doubleGoldDesc',
    effects: { goldMultiplier: 2 },
  },
  {
    id: 'time_surge',
    nameKey: 'adventure.endlessMode.events.timeSurge',
    descriptionKey: 'adventure.endlessMode.events.timeSurgeDesc',
    effects: { timerBonus: 30 },
  },
  {
    id: 'gem_rush',
    nameKey: 'adventure.endlessMode.events.gemRush',
    descriptionKey: 'adventure.endlessMode.events.gemRushDesc',
    effects: { specialTileBoost: 5 },
  },
  {
    id: 'dual_mechanic',
    nameKey: 'adventure.endlessMode.events.dualMechanic',
    descriptionKey: 'adventure.endlessMode.events.dualMechanicDesc',
    effects: { extraMechanic: 'palindromes', scoreMultiplier: 1.5 },
  },
  {
    id: 'score_frenzy',
    nameKey: 'adventure.endlessMode.events.scoreFrenzy',
    descriptionKey: 'adventure.endlessMode.events.scoreFrenzyDesc',
    effects: { scoreMultiplier: 2 },
  },
];

/** Get the mini-event for a given floor (deterministic based on floor number) */
export function getEndlessMiniEvent(floor: number): EndlessMiniEvent | null {
  if (floor < 10 || floor % 10 !== 0) return null;
  // Cycle through events deterministically: floor 10 = event 0, floor 20 = event 1, etc.
  const eventIndex = (Math.floor(floor / 10) - 1) % MINI_EVENTS.length;
  return MINI_EVENTS[eventIndex];
}

// ==============================================
// MILESTONE REWARDS (every 5 floors)
// ==============================================

export interface EndlessMilestone {
  floor: number;
  rewardGold: number;
  rewardXp: number;
  nameKey: string;
}

export function getEndlessMilestone(floor: number): EndlessMilestone | null {
  if (floor < 5 || floor % 5 !== 0) return null;
  const tier = Math.floor(floor / 5);
  return {
    floor,
    rewardGold: tier * 50,
    rewardXp: tier * 30,
    nameKey: `adventure.endlessMode.milestone.floor${floor}`,
  };
}

// ==============================================
// DIFFICULTY CONFIG
// ==============================================

export const ENDLESS_MODE_CONFIG = {
  startingGridSize: 4 as 4 | 5 | 6 | 7,
  startingTimerSeconds: 120,
  minTimerSeconds: 45,
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
  /** Second mechanic active simultaneously (post-floor 30) */
  secondMechanic: string | null;
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

  // Post-floor 30: two mechanics active simultaneously
  const secondMechanic = floor > 30
    ? MECHANIC_CYCLE[(floor - 2 + 4) % MECHANIC_CYCLE.length]
    : null;

  return { gridSize, timerSeconds, specialTileCount, scoreTarget, mechanic, secondMechanic };
}

/** Generate a level config for an endless floor (with mini-event modifiers) */
export function generateEndlessFloor(floor: number) {
  const diff = getEndlessDifficulty(floor);
  const miniEvent = getEndlessMiniEvent(floor);

  // Apply mini-event modifiers
  const timerSeconds = diff.timerSeconds + (miniEvent?.effects.timerBonus ?? 0);
  const scoreTarget = Math.round(diff.scoreTarget * (miniEvent?.effects.scoreMultiplier ?? 1));

  const objectives: LevelObjective[] = [
    { type: 'scoreTarget', target: scoreTarget, isPrimary: true },
  ];

  // Add word count objective at higher floors — capped to what's achievable in the time
  if (floor >= 5) {
    const maxAchievable = Math.floor(timerSeconds / 4); // ~1 word per 4 seconds
    const rawTarget = 10 + floor * 2;
    objectives.push({ type: 'wordCount', target: Math.min(rawTarget, maxAchievable) });
  }

  return {
    world: 0, // endless mode uses world 0
    level: floor,
    gridSize: diff.gridSize,
    timerSeconds,
    objectives,
    specialTiles: [], // populated at runtime by grid generator
    difficulty: floor <= 5 ? 'EASY' as const : floor <= 15 ? 'MEDIUM' as const : 'HARD' as const,
    worldMechanic: diff.mechanic ?? undefined,
    chapterNumber: 1 as const,
    levelInChapter: 1 as const,
    isBossLevel: floor % 10 === 0, // boss every 10 floors
    minWordLength: floor >= 10 ? 3 : undefined,
    /** Active mini-event for this floor (null if none) */
    miniEvent: miniEvent ?? undefined,
  };
}

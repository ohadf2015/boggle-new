/**
 * Classroom economy numbers and socket names. Server computes every amount;
 * the student UI imports these same objects so the odds and prices it shows
 * are the ones the roller and the shop charge.
 */

export const WRONG_ANSWER_COST = 2;

export const POWER_UP_IDS = ['doubleCash', 'streakShield', 'hintReveal'] as const;
export type PowerUpId = (typeof POWER_UP_IDS)[number];

export const POWER_UPS: Record<PowerUpId, { cost: number; durationMs?: number }> = {
  doubleCash: { cost: 15, durationMs: 30_000 },
  streakShield: { cost: 20 },
  hintReveal: { cost: 10 },
};

export const CHEST_RARITIES = ['common', 'rare', 'epic'] as const;
export type ChestRarity = (typeof CHEST_RARITIES)[number];

/** Published odds, shown to students as-is. Must sum to 1 (tested). */
export const CHEST_ODDS: Record<ChestRarity, number> = {
  common: 0.7,
  rare: 0.25,
  epic: 0.05,
};

export const CHEST_XP: Record<ChestRarity, number> = {
  common: 10,
  rare: 25,
  epic: 60,
};

export const CLASSROOM_ECONOMY_EVENTS = {
  requestState: 'classroomEconomy:requestState',
  buyPowerUp: 'classroomEconomy:buyPowerUp',
  useHint: 'classroomEconomy:useHint',
  setConfig: 'classroomEconomy:setConfig',
  state: 'classroomEconomy:state',
  hint: 'classroomEconomy:hint',
  chest: 'classroomEconomy:chest',
  error: 'classroomEconomy:error',
} as const;

export interface ClassroomEconomySnapshot {
  cash: number;
  cashEarned: number;
  streak: number;
  multiplier: 1 | 2 | 3;
  doubleCashMsLeft: number;
  shieldHeld: boolean;
  hintsHeld: number;
  config: { wrongAnswerCost: boolean; powerUps: boolean };
  /** Last word outcome for this student. Null before the first word. */
  lastDelta: { kind: 'correct' | 'wrong'; delta: number; multiplier: 1 | 2 | 3; cost: number } | null;
}

export interface ClassroomEconomyBoard {
  top: Array<{ userId: string; username: string; cashEarned: number }>;
  you: { rank: number; cashEarned: number } | null;
}

export interface ClassroomChestReveal {
  gameCode: string;
  roundId: string;
  rarity: ChestRarity;
  xp: number;
  itemId: string;
}

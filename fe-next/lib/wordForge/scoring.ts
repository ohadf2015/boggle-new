/**
 * Word Forge Scoring Engine
 *
 * Core formula: Word Score = (Letter Points + Chip Bonuses) × Length Bonus × Mult Bonuses
 *
 * Chip runes add flat points. Mult runes multiply. Special runes do both or change rules.
 * All runes apply simultaneously (no ordering — that's a v2 feature).
 */

import type {
  WordScoreResult,
  RuneCard,
  RuneEffect,
  ScoringContext,
} from '@/types/wordForge';
import { evaluateRune } from './runeEngine';
import { applyConstraintToScore } from './bossConstraints';

// Letter point values live in the shared leaf module so scoring.ts and
// runeEngine.ts agree (and Hebrew scores correctly). Re-exported here for
// back-compat with existing importers.
export {
  LETTER_POINTS,
  getLetterPoints,
  getBasePoints,
} from './letterValues';
import { getBasePoints } from './letterValues';

// ─── Length Bonus ──────────────────────────────────────────

export const LENGTH_BONUSES: Record<number, number> = {
  3: 1,
  4: 1.5,
  5: 2,
  6: 3,
  7: 5,
};

/** Length bonus multiplier — 8+ letters all get ×8 */
export function getLengthBonus(wordLength: number): number {
  if (wordLength >= 8) return 8;
  return LENGTH_BONUSES[wordLength] ?? 1;
}

// ─── Round Targets ─────────────────────────────────────────

const ROUND_TARGETS = [50, 80, 120, 160, 220, 300, 400, 550, 750];

/** Get target score for a given round (1-indexed). Round 10+ scales by 40%. */
export function getRoundTarget(round: number): number {
  if (round <= 0) return ROUND_TARGETS[0];
  if (round <= ROUND_TARGETS.length) return ROUND_TARGETS[round - 1];
  // Endless: 40% increase per round beyond 9
  const lastTarget = ROUND_TARGETS[ROUND_TARGETS.length - 1];
  const extraRounds = round - ROUND_TARGETS.length;
  return Math.round(lastTarget * Math.pow(1.4, extraRounds));
}

/** Boss rounds are every 3rd round: 3, 6, 9, 12... */
export function isBossRound(round: number): boolean {
  return round > 0 && round % 3 === 0;
}

// ─── Score a Word ──────────────────────────────────────────

/**
 * Score a single word with all active rune effects.
 *
 * Process:
 * 1. Calculate base points (letter sum)
 * 2. Apply chip runes (flat additions to base)
 * 3. Calculate length bonus
 * 4. Apply mult runes (multiplicative on top)
 * 5. Apply special runes (can do either)
 * 6. Cursed rune effects (powerful + drawback already factored in)
 * 7. Round down to integer
 */
export function scoreWord(
  runes: RuneCard[],
  context: ScoringContext,
): WordScoreResult {
  const { word } = context;
  const basePoints = getBasePoints(word);
  const lengthBonus = getLengthBonus(word.length);

  // Collect all rune effects
  const runeEffects: RuneEffect[] = [];
  let chipBonus = 0;
  let multBonus = 1;

  for (const rune of runes) {
    const effect = evaluateRune(rune.def, context);
    if (!effect) continue;

    runeEffects.push(effect);

    if (effect.type === 'addPoints') {
      chipBonus += effect.value;
    } else if (effect.type === 'multiply') {
      multBonus *= effect.value;
    }
  }

  // Final formula: (basePoints + chipBonus) × lengthBonus × multBonus
  let totalScore = Math.max(
    0,
    Math.floor((basePoints + chipBonus) * lengthBonus * multBonus),
  );

  // Apply boss constraint scoring modifier (CRIT-1)
  if (context.bossConstraintId) {
    totalScore = applyConstraintToScore(
      context.bossConstraintId,
      totalScore,
      word,
      context.wordsThisRound,
    );
  }

  return {
    word,
    basePoints,
    lengthBonus,
    runeEffects,
    totalScore,
  };
}

// ─── XP Calculation ────────────────────────────────────────

/** Calculate Forge XP earned from a run */
export function calculateRunXp(
  highestRound: number,
  totalWords: number,
  totalScore: number,
  won: boolean,
): number {
  // Base: 10 XP per round reached
  let xp = highestRound * 10;
  // Bonus for words found
  xp += Math.floor(totalWords * 0.5);
  // Bonus for total score
  xp += Math.floor(totalScore / 100);
  // Win bonus
  if (won) xp += 50;
  return xp;
}

/** Get unlock tier from total XP */
export function getUnlockTier(totalXp: number): number {
  if (totalXp >= 1500) return 5;
  if (totalXp >= 1000) return 4;
  if (totalXp >= 600) return 3;
  if (totalXp >= 300) return 2;
  if (totalXp >= 100) return 1;
  return 0;
}

/** XP thresholds for display */
export const XP_THRESHOLDS = [
  { tier: 1, xp: 100, label: '5 new Common runes' },
  { tier: 2, xp: 300, label: 'Rare runes unlocked' },
  { tier: 3, xp: 600, label: '5 new Rare runes' },
  { tier: 4, xp: 1000, label: 'Legendary runes unlocked' },
  { tier: 5, xp: 1500, label: 'Cursed runes unlocked' },
];

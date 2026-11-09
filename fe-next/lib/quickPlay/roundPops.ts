/**
 * In-round surprise beats for Quick Play classic: which pop (if any) an
 * accepted word earns. Pure so the priority rule is testable without a board.
 *
 * - first:  the coached first round's first word (the clock starts now).
 * - golden: the word ran through the golden tile and scored double.
 * - rare:   a rare or epic word by letter rarity (blastWordRarity tiers).
 */
import { getWordRarityTier } from '@/components/blast/legacy/utils/blastWordRarity';

export type RoundPopKind = 'first' | 'golden' | 'rare';

export interface RoundPop {
  kind: RoundPopKind;
  word: string;
  points: number;
  /** Rare/epic tier, when the word is one (a golden rare word keeps its tier for analytics). */
  tier?: 'rare' | 'epic';
}

export function rareTierFor(word: string): 'rare' | 'epic' | null {
  const tier = getWordRarityTier(word);
  return tier === 'rare' || tier === 'epic' ? tier : null;
}

export function popFor(input: {
  word: string;
  points: number;
  multiplier: number;
  validCount: number;
  coach: boolean;
}): RoundPop | null {
  const tier = rareTierFor(input.word) ?? undefined;
  const base = { word: input.word, points: input.points, ...(tier ? { tier } : {}) };
  if (input.coach && input.validCount === 1) return { kind: 'first', ...base };
  if (input.multiplier > 1) return { kind: 'golden', ...base };
  if (tier) return { kind: 'rare', ...base };
  return null;
}

/** Seconds of no accepted word on a coached board before the gentle hint shows. */
export const COACH_IDLE_HINT_SEC = 10;
/** The coached first round is shorter than the 60s arcade round. */
export const COACH_ROUND_SECONDS = 45;

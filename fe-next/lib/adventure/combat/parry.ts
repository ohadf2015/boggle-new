/**
 * Boss parry system.
 *
 * When a boss telegraphs an attack, a defend window opens. The player blocks it
 * by submitting a QUALIFYING word before the telegraph ends. Qualifying means
 * the word is long enough OR hits the boss's weakness — NOT just any valid word.
 * (A plain valid word must not auto-parry, or there is no decision under
 * pressure — it would be luck, not combat.)
 *
 * A successful parry blocks the attack, counters for bonus damage, and briefly
 * stuns the boss.
 */

import { evaluateWeakness, type WeaknessRule } from './weakness';

export type BossVisualPhase = 'phase1' | 'phase2' | 'enraged';

export interface ParryRequirement {
  /** Minimum word length that qualifies as a parry. */
  minLength: number;
  /** The boss weakness — a weakness hit always qualifies, regardless of length. */
  weakness: WeaknessRule;
  /** Translation key for the on-screen defend hint. */
  hintKey: string;
}

export type ParryReason = 'length' | 'weakness';

export interface ParryResult {
  parried: boolean;
  reason?: ParryReason;
}

/**
 * Base parry length by phase — achievable inside the ~2s telegraph (a long word
 * is often already mid-trace) yet still a real choice, not any 3-letter word.
 * Eased further in enrage so defense survives faster telegraphs.
 */
const MIN_LENGTH_BY_PHASE: Record<BossVisualPhase, number> = {
  phase1: 5,
  phase2: 5,
  enraged: 4,
};

/**
 * Build the parry requirement for the current phase. A weakness-based parry is
 * always allowed (gives players who hunt the weakness a defensive payoff too).
 */
export function getParryRequirement(weakness: WeaknessRule, phase: BossVisualPhase): ParryRequirement {
  return {
    minLength: MIN_LENGTH_BY_PHASE[phase] ?? 6,
    weakness,
    hintKey: `adventure.boss.combat.parry.hint`,
  };
}

/** Evaluate whether a submitted word parries the pending attack. */
export function evaluateParry(word: string, req: ParryRequirement): ParryResult {
  const w = (word ?? '').toUpperCase();
  if (!w) return { parried: false };

  // Weakness takes precedence — it's the more skillful / intentional parry.
  if (evaluateWeakness(w, req.weakness).isWeakHit) {
    return { parried: true, reason: 'weakness' };
  }
  if (w.length >= req.minLength) {
    return { parried: true, reason: 'length' };
  }
  return { parried: false };
}

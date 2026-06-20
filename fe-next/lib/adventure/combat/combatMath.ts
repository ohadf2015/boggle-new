/**
 * resolveAttackWord — the pure heart of "which word matters".
 *
 * Combines the three RPG levers into one deterministic result for a submitted
 * word, given its base boss damage:
 *  - WEAKNESS crit: word hits the boss's elemental weakness → damage × multiplier
 *  - FOCUS crit:    player armed FOCUS → next word × 2
 *  - PARRY:         a telegraph is active and the word qualifies → block + counter
 *
 * The hook layer owns the state (consuming focus, applying the stun, dealing the
 * counter); this function just decides the numbers and what happened.
 */

import { evaluateWeakness, type WeaknessRule } from './weakness';
import { evaluateParry, type ParryRequirement, type ParryReason } from './parry';

export interface CombatContext {
  weakness: WeaknessRule;
  /** FOCUS buff armed — next word crits 2x. */
  focusArmed: boolean;
  /** Active parry requirement when the boss is telegraphing, else null. */
  parryReq: ParryRequirement | null;
}

export interface CombatResolution {
  /** Final boss damage to deal (positive integer). */
  damage: number;
  isWeakHit: boolean;
  weaknessLabel?: string;
  isCrit: boolean;
  focusConsumed: boolean;
  parried: boolean;
  parryReason?: ParryReason;
}

const FOCUS_CRIT_MULTIPLIER = 2;

export function resolveAttackWord(word: string, baseDamage: number, ctx: CombatContext): CombatResolution {
  const weak = evaluateWeakness(word, ctx.weakness);
  const focusConsumed = ctx.focusArmed;
  const critMult = focusConsumed ? FOCUS_CRIT_MULTIPLIER : 1;

  const damage = Math.max(1, Math.round(baseDamage * weak.multiplier * critMult));

  const parry = ctx.parryReq ? evaluateParry(word, ctx.parryReq) : { parried: false };

  return {
    damage,
    isWeakHit: weak.isWeakHit,
    weaknessLabel: weak.label,
    isCrit: focusConsumed,
    focusConsumed,
    parried: parry.parried,
    parryReason: parry.parried ? parry.reason : undefined,
  };
}

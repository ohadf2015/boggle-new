/**
 * Boss elemental weakness system.
 *
 * Each boss is weak to a specific word property, derived deterministically from
 * its `twistMechanic.type` so all 10 bosses get a thematically-fitting weakness
 * with zero hand-authoring. Hitting the weakness deals a "WEAKNESS!" crit — a
 * damage multiplier on top of the normal boss damage.
 *
 * This is the RPG "strategic word choice" layer: it makes *which* word you pick
 * matter, not just that you spelled something valid.
 */

import type { BossTwistType } from '@/types/boss';

/** The kinds of word property a boss can be weak to. */
export type WeaknessKind =
  | 'length' // word length >= param
  | 'palindrome' // reads the same forwards/backwards (len >= 2)
  | 'doubleLetter' // contains an adjacent doubled letter (e.g. BUZZ)
  | 'rareLetter' // contains Q, X, Z, or J
  | 'vowelHeavy'; // contains >= param distinct vowels

export interface WeaknessRule {
  kind: WeaknessKind;
  /** Threshold for length / vowelHeavy rules. */
  param?: number;
  /** Damage multiplier applied on a weak hit. */
  multiplier: number;
  /** Translation key for the weakness label (e.g. "Weak to: PALINDROMES"). */
  labelKey: string;
}

export interface WeaknessResult {
  isWeakHit: boolean;
  /** Multiplier to apply to boss damage (1 when not a weak hit). */
  multiplier: number;
  /** Translation key for the weakness label, present only on a weak hit. */
  label?: string;
}

const L = (k: string) => `adventure.boss.combat.weakness.${k}`;

/**
 * Deterministic weakness per boss twist mechanic. Spread across kinds so the
 * 10 bosses feel distinct, with the signature pairing (mirrorMatch ↔ palindrome).
 */
export const WEAKNESS_BY_TWIST: Record<BossTwistType, WeaknessRule> = {
  popQuiz: { kind: 'length', param: 6, multiplier: 1.6, labelKey: L('length') },
  hiveMind: { kind: 'doubleLetter', multiplier: 1.6, labelKey: L('doubleLetter') },
  etymologyDig: { kind: 'length', param: 7, multiplier: 1.7, labelKey: L('lengthLong') },
  idiomBattle: { kind: 'vowelHeavy', param: 3, multiplier: 1.6, labelKey: L('vowelHeavy') },
  assemblyLine: { kind: 'length', param: 7, multiplier: 1.7, labelKey: L('lengthLong') },
  scrambledReality: { kind: 'rareLetter', multiplier: 1.8, labelKey: L('rareLetter') },
  mirrorMatch: { kind: 'palindrome', multiplier: 2.0, labelKey: L('palindrome') },
  stellarForge: { kind: 'rareLetter', multiplier: 1.8, labelKey: L('rareLetter') },
  babelSummit: { kind: 'vowelHeavy', param: 3, multiplier: 1.6, labelKey: L('vowelHeavy') },
  finalWord: { kind: 'length', param: 8, multiplier: 1.8, labelKey: L('lengthEpic') },
};

const FALLBACK_RULE: WeaknessRule = { kind: 'length', param: 6, multiplier: 1.6, labelKey: L('length') };

/** Resolve the weakness rule for a boss twist type (defensive fallback). */
export function getBossWeakness(twist: BossTwistType | undefined): WeaknessRule {
  return (twist && WEAKNESS_BY_TWIST[twist]) ?? FALLBACK_RULE;
}

const RARE_LETTERS = new Set(['Q', 'X', 'Z', 'J']);
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

function isPalindrome(w: string): boolean {
  if (w.length < 2) return false;
  for (let i = 0, j = w.length - 1; i < j; i++, j--) {
    if (w[i] !== w[j]) return false;
  }
  return true;
}

function hasDoubleLetter(w: string): boolean {
  for (let i = 1; i < w.length; i++) {
    if (w[i] === w[i - 1]) return true;
  }
  return false;
}

function hasRareLetter(w: string): boolean {
  for (const ch of w) {
    if (RARE_LETTERS.has(ch)) return true;
  }
  return false;
}

function distinctVowelCount(w: string): number {
  const seen = new Set<string>();
  for (const ch of w) {
    if (VOWELS.has(ch)) seen.add(ch);
  }
  return seen.size;
}

/** Evaluate whether a word hits the boss's weakness, and the resulting multiplier. */
export function evaluateWeakness(word: string, rule: WeaknessRule): WeaknessResult {
  const w = (word ?? '').toUpperCase();
  if (!w) return { isWeakHit: false, multiplier: 1 };

  let hit = false;
  switch (rule.kind) {
    case 'length':
      hit = w.length >= (rule.param ?? 6);
      break;
    case 'palindrome':
      hit = isPalindrome(w);
      break;
    case 'doubleLetter':
      hit = hasDoubleLetter(w);
      break;
    case 'rareLetter':
      hit = hasRareLetter(w);
      break;
    case 'vowelHeavy':
      hit = distinctVowelCount(w) >= (rule.param ?? 3);
      break;
  }

  return hit
    ? { isWeakHit: true, multiplier: rule.multiplier, label: rule.labelKey }
    : { isWeakHit: false, multiplier: 1 };
}

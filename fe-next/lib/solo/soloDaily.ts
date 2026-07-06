/**
 * soloDaily — turns the session-only beta modes into a shared DAILY ritual
 * (the Wordle "watercooler" effect) using a deterministic per-day seed + modifier,
 * and a once-per-day idempotent coin award built on the existing `coinManager`.
 *
 * Persistence is localStorage only (parity with the existing daily challenge) —
 * coins persist LOCALLY, not cross-device. No new Supabase table (realtime-publication
 * rule: never publish a table without a consumer).
 */

import { addCoins } from '@/utils/coinManager';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/storageHelpers';
import { computeSoloReward, type SoloMode, type SoloRewardBreakdown } from './soloReward';

export type { SoloMode };

export interface SoloModifier {
  id: string;
  /** i18n key for the short badge label. */
  labelKey: string;
  /** i18n key for the one-line description. */
  descKey: string;
}

export interface SoloAwardResult {
  awarded: number;
  breakdown: SoloRewardBreakdown;
  bonus: number;
}

/** UTC day boundary — everyone shares the same daily puzzle worldwide. */
export function getSoloDateISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** FNV-1a 32-bit hash → deterministic unsigned seed for `mode|date`. */
export function soloSeed(mode: string, dateISO: string): number {
  const str = `${mode}|${dateISO}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — pure, reproducible, returns a thunk yielding [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-mode daily mutators — the "modifier" pillar. Labels resolved via t(). */
const MODIFIERS: Record<SoloMode, SoloModifier[]> = {
  shiritori: [
    { id: 'long-words', labelKey: 'solo.modifier.shiritori.longWords.label', descKey: 'solo.modifier.shiritori.longWords.desc' },
    { id: 'no-repeat-vowel', labelKey: 'solo.modifier.shiritori.noRepeatVowel.label', descKey: 'solo.modifier.shiritori.noRepeatVowel.desc' },
    { id: 'speed-demon', labelKey: 'solo.modifier.shiritori.speedDemon.label', descKey: 'solo.modifier.shiritori.speedDemon.desc' },
  ],
  'sealed-bid': [
    { id: 'no-clash-penalty', labelKey: 'solo.modifier.sealedBid.noClashPenalty.label', descKey: 'solo.modifier.sealedBid.noClashPenalty.desc' },
    { id: 'vowel-tax', labelKey: 'solo.modifier.sealedBid.vowelTax.label', descKey: 'solo.modifier.sealedBid.vowelTax.desc' },
    { id: 'high-stakes', labelKey: 'solo.modifier.sealedBid.highStakes.label', descKey: 'solo.modifier.sealedBid.highStakes.desc' },
  ],
  'word-alchemy': [
    { id: 'double-catalyst', labelKey: 'solo.modifier.wordAlchemy.doubleCatalyst.label', descKey: 'solo.modifier.wordAlchemy.doubleCatalyst.desc' },
    { id: 'heat-decay', labelKey: 'solo.modifier.wordAlchemy.heatDecay.label', descKey: 'solo.modifier.wordAlchemy.heatDecay.desc' },
    { id: 'pure-transmute', labelKey: 'solo.modifier.wordAlchemy.pureTransmute.label', descKey: 'solo.modifier.wordAlchemy.pureTransmute.desc' },
  ],
  crossword: [
    { id: 'themed-grid', labelKey: 'solo.modifier.crossword.themedGrid.label', descKey: 'solo.modifier.crossword.themedGrid.desc' },
    { id: 'no-check', labelKey: 'solo.modifier.crossword.noCheck.label', descKey: 'solo.modifier.crossword.noCheck.desc' },
    { id: 'time-attack', labelKey: 'solo.modifier.crossword.timeAttack.label', descKey: 'solo.modifier.crossword.timeAttack.desc' },
  ],
};

/** Deterministic daily modifier for a mode (rotates by day). */
export function pickDailyModifier(mode: SoloMode, dateISO: string): SoloModifier {
  const list = MODIFIERS[mode];
  const seed = soloSeed(`${mode}-mod`, dateISO);
  return list[seed % list.length];
}

function soloAwardKey(mode: SoloMode, dateISO: string, language: string): string {
  return `lexiclash_solo_daily_${mode}_${dateISO}_${language}`;
}

/** True if today's daily coins were already claimed for this mode + language. */
export function isSoloDailyClaimed(mode: SoloMode, dateISO: string, language: string): boolean {
  return !!getFromLocalStorage(soloAwardKey(mode, dateISO, language));
}

/**
 * Award the daily coins for a solo mode ONCE per day.
 * Replays the same day are practice (returns null). New day re-awards.
 * Mirrors `coinManager.awardDailyCoins` idempotency contract.
 */
export function awardSoloDaily(
  mode: SoloMode,
  dateISO: string,
  language: string,
  score: number,
  won: boolean,
): SoloAwardResult | null {
  if (typeof window === 'undefined') return null;
  if (isSoloDailyClaimed(mode, dateISO, language)) return null;

  const reward = computeSoloReward({ mode, score, won, seed: soloSeed(mode, dateISO) });
  if (reward.coins <= 0) return null;

  addCoins(reward.coins, 'Solo Daily', {
    mode,
    dateISO,
    language,
    score,
    won: won ? 'yes' : 'no',
    bonus: reward.bonus,
  });

  saveToLocalStorage(soloAwardKey(mode, dateISO, language), new Date().toISOString());

  return { awarded: reward.coins, breakdown: reward.breakdown, bonus: reward.bonus };
}

/**
 * Mark today's daily as claimed for a mode that awards coins through its own
 * flow (e.g. Sealed Bid cashes chips out via `addCoins` directly rather than
 * `awardSoloDaily`). Call after awarding so the once-per-day guard holds.
 */
export function markSoloDailyClaimed(mode: SoloMode, dateISO: string, language: string): void {
  if (typeof window === 'undefined') return;
  saveToLocalStorage(soloAwardKey(mode, dateISO, language), new Date().toISOString());
}

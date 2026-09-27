/**
 * Word Tower — Daily Mutators (pure).
 *
 * The shared daily twist. Every UTC day one mutator is active, chosen
 * DETERMINISTICALLY from the date key so EVERY player faces the identical twist
 * that day — the comparability that makes the daily competitive (the same lever
 * the shared seed protects). This is the "fun + random factor" spine: the tower
 * plays differently each day without breaking fairness.
 *
 * Effects fold through three pure taps so the rest of the game reads them at the
 * SAME control points the perk system already uses:
 *   - {@link mutatorWordMultiplier} — word-aware height × (golden letter, vowels, length)
 *   - {@link mutatorModifiers}      — structural effects merged into PerkModifiers
 *   - {@link mutatorSweepMult}      — crane sweep period × (speed only — fair)
 *
 * Nothing here imports the manager (no cycle); it only borrows the letter bags.
 */
import type { Language } from '@/shared/types/game';
import { WORD_TOWER_LETTER_BAGS } from '@/shared/constants/wordTowerConstants';
import type { PerkModifiers } from './perks';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';

export type MutatorId =
  | 'goldenLetter'
  | 'vowelGale'
  | 'longAndStrong'
  | 'skylineRush'
  | 'tailwind'
  | 'featherday';

export interface DailyMutator {
  id: MutatorId;
  icon: string;
  nameKey: string;
  descKey: string;
  /** Resolved per-day golden letter — set by {@link mutatorForDate} for `goldenLetter`. */
  goldenLetter?: string;
}

const def = (id: MutatorId, icon: string): DailyMutator => ({
  id,
  icon,
  nameKey: `wordTower.mutator.${id}.name`,
  descKey: `wordTower.mutator.${id}.desc`,
});

export const MUTATORS: Record<MutatorId, DailyMutator> = {
  goldenLetter: def('goldenLetter', '🌟'),
  vowelGale: def('vowelGale', '🅰️'),
  longAndStrong: def('longAndStrong', '📏'),
  skylineRush: def('skylineRush', '🚀'),
  tailwind: def('tailwind', '🪁'),
  featherday: def('featherday', '🪶'),
};

/** Stable rotation order — index = hash(dateKey) % length. */
export const ALL_MUTATOR_IDS: MutatorId[] = [
  'goldenLetter',
  'vowelGale',
  'longAndStrong',
  'skylineRush',
  'tailwind',
  'featherday',
];

// --- tuning ---
export const GOLDEN_LETTER_MULT = 1.6;
export const VOWEL_GALE_PER_VOWEL = 0.08;
export const LONG_AND_STRONG_MIN_LEN = 6;
export const LONG_AND_STRONG_MULT = 1.5;
export const SKYLINE_RUSH_HEIGHT_MULT = 1.15;
export const FEATHERDAY_TOPPLE_REDUCTION = 1;
export const TAILWIND_SWEEP_MULT = 1.2;

/** Per-language vowel sets for {@link MUTATORS.vowelGale}. */
const VOWELS: Record<Language, string> = {
  en: 'AEIOU', sv: 'AEIOUÅÄÖ', es: 'AEIOU', he: 'אהוי', ja: 'あいうえお', fr: 'AEIOU', de: 'AEIOU', ru: 'АЕИОУЫ',
};

/** Letters too rare/awkward to make a fair golden target (per language). */
const WEAK_GOLDEN: Record<Language, string> = {
  en: 'QZXJKVW', sv: 'QZXWÅÄÖ', es: 'QZXWKÑ', he: 'זטצ', ja: '', fr: 'QZXWKY', de: 'QXYÄÖ', ru: 'ЙХШЩЦЖФЭЮЯ',
};

// --- deterministic RNG (FNV-1a hash + mulberry32) imported from @/lib/rng/seededRandom ---

/**
 * The day's golden letter for a language — deterministic, drawn from the bag with
 * weak (rare/awkward) letters excluded so a golden target is always reachable.
 */
export function dailyGoldenLetter(dateKey: string, language: Language): string {
  const weak = WEAK_GOLDEN[language] || '';
  const pool = [...new Set([...(WORD_TOWER_LETTER_BAGS[language] || '')])].filter((c) => !weak.includes(c));
  if (pool.length === 0) return '';
  const rng = mulberry32(fnv1aHash(`word-tower-golden-${dateKey}`));
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * The mutator active on `dateKey` (UTC YYYY-MM-DD). Deterministic and
 * language-independent for the CHOICE (so everyone gets the same twist), but the
 * golden letter it carries is per-language (each bag differs).
 */
export function mutatorForDate(dateKey: string, language: Language = 'en'): DailyMutator {
  const idx = fnv1aHash(`word-tower-mutator-${dateKey}`) % ALL_MUTATOR_IDS.length;
  const base = MUTATORS[ALL_MUTATOR_IDS[idx]];
  if (base.id === 'goldenLetter') {
    return { ...base, goldenLetter: dailyGoldenLetter(dateKey, language) };
  }
  return base;
}

/**
 * Word-aware height multiplier for the active mutator. `canonWord` is the
 * canonical (uppercased/normalized) word. For `goldenLetter`, the active letter
 * is taken from `goldenLetter` arg, else the mutator's resolved `.goldenLetter`.
 * Returns 1 for structural/crane mutators (they fold elsewhere).
 */
export function mutatorWordMultiplier(
  m: DailyMutator,
  canonWord: string,
  language: Language,
  goldenLetter?: string,
): number {
  const w = (canonWord || '').toUpperCase();
  switch (m.id) {
    case 'goldenLetter': {
      const g = (goldenLetter ?? m.goldenLetter ?? '').toUpperCase();
      return g && w.includes(g) ? GOLDEN_LETTER_MULT : 1;
    }
    case 'vowelGale': {
      const vowels = VOWELS[language] || 'AEIOU';
      let n = 0;
      for (const ch of w) if (vowels.includes(ch)) n++;
      return 1 + n * VOWEL_GALE_PER_VOWEL;
    }
    case 'longAndStrong':
      return w.length >= LONG_AND_STRONG_MIN_LEN ? LONG_AND_STRONG_MULT : 1;
    default:
      return 1;
  }
}

/** Structural effects to merge into the perk {@link PerkModifiers} fold. */
export function mutatorModifiers(m: DailyMutator): Partial<PerkModifiers> {
  switch (m.id) {
    case 'skylineRush':
      return { heightMult: SKYLINE_RUSH_HEIGHT_MULT };
    case 'featherday':
      return { toppleReduction: FEATHERDAY_TOPPLE_REDUCTION };
    default:
      return {};
  }
}

/** Crane sweep period multiplier (>1 = slower/easier, fair — period only). */
export function mutatorSweepMult(m: DailyMutator): number {
  return m.id === 'tailwind' ? TAILWIND_SWEEP_MULT : 1;
}

/** Short English label for the locale-agnostic share card (the card is EN-only). */
const SHARE_LABEL_EN: Record<MutatorId, string> = {
  goldenLetter: 'Golden Letter',
  vowelGale: 'Vowel Gale',
  longAndStrong: 'Long & Strong',
  skylineRush: 'Skyline Rush',
  tailwind: 'Tailwind',
  featherday: 'Featherday',
};

/** `🌟 Golden Letter`-style label for the share card, or '' for an unknown id. */
export function shareLabelForMutatorId(id: MutatorId): string {
  const m = MUTATORS[id];
  if (!m) return '';
  return `${m.icon} ${SHARE_LABEL_EN[id]}`;
}

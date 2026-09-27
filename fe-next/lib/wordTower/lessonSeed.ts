/**
 * Word Tower — lesson seed. "One word list, many games."
 *
 * Turns a teacher's vocabulary list into a Word Tower WHEEL whose letters
 * actually spell that list, so the student practises THIS week's words while
 * playing the normal game. Pure and deterministic: no React, no dictionary
 * import, no I/O. The wrapper component supplies the dictionary predicate.
 *
 * The load-bearing constraint is that the ring is {@link WORD_TOWER_WHEEL_SIZE}
 * tiles and {@link isBuildable} is a MULTISET check — a pool holding the right
 * distinct letters is not enough (CHEESE needs three E tiles). So the pool is
 * built from the union-MAX letter counts of up to three lesson words, which is
 * the only construction that leaves every one of them spellable.
 */
import type { Language } from '@/shared/types/game';
import { normalizeWord, sanitizeWord } from '@/shared/utils/wordNormalization';
import {
  WORD_TOWER_WHEEL_SIZE,
  WORD_TOWER_WHEEL_MAX_SAME,
  WORD_TOWER_LETTER_BAGS,
  WORD_TOWER_VOWELS,
} from '@/shared/constants/wordTowerConstants';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';

/** Lesson words shorter than this are too easy to be worth a floor. */
export const LESSON_SEED_MIN_LEN = 4;

/**
 * Longest lesson word the ring can seed. A word longer than the wheel can never
 * be built, and a word that fills the wheel exactly leaves no room for a second
 * one — so the cap keeps at least one tile free for overlap.
 */
export const LESSON_SEED_MAX_LEN = WORD_TOWER_WHEEL_SIZE - 1;

/** Eligible words a lesson needs before the tile is worth opening. */
export const LESSON_SEED_MIN_TARGETS = 4;

/** Lesson words seeded into one ring. More than three never fits 7 tiles. */
export const LESSON_SEED_MAX_TARGETS = 3;

/** Practice points a lesson hit is worth, on top of the height it climbs. */
export const LESSON_HIT_POINTS = 50;

/**
 * Languages the lesson seed can actually run in: a non-empty Word Tower letter
 * bag AND a Word Craft dictionary to accept ordinary words from. `fr`/`de` have
 * an empty bag (generateWheel returns [] with no error — a silent no-op), and
 * `ru` has a bag but no dictionary, which would reduce the game to spelling the
 * lesson list and nothing else.
 */
const LESSON_SEED_LANGUAGES: readonly Language[] = ['en', 'he', 'sv', 'es', 'ja'];

/** Sanitize, normalize per language, uppercase — the form the wheel matches on. */
export function canonLessonWord(word: string, language: Language): string {
  return normalizeWord(sanitizeWord(word, language), language).toUpperCase();
}

/** True when this lesson's language has both a letter bag and a dictionary. */
export function lessonSeedSupportsLanguage(language: Language): boolean {
  return (
    LESSON_SEED_LANGUAGES.includes(language) &&
    (WORD_TOWER_LETTER_BAGS[language] || '').length > 0
  );
}

/**
 * The lesson words a wheel could ever spell: canonical, deduped, input order
 * preserved, and length-filtered so a target is never impossible by
 * construction.
 */
export function eligibleLessonWords(words: readonly string[], language: Language): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const w = canonLessonWord(raw ?? '', language);
    if (w.length < LESSON_SEED_MIN_LEN || w.length > LESSON_SEED_MAX_LEN) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/** Whether this lesson can drive a Word Tower practice run at all. */
export function isLessonSeedReady(words: readonly string[], language: Language): boolean {
  if (!lessonSeedSupportsLanguage(language)) return false;
  return eligibleLessonWords(words, language).length >= LESSON_SEED_MIN_TARGETS;
}

export interface LessonSeed {
  /** The wheel tiles. Empty when the lesson cannot seed a ring. */
  tray: string[];
  /** Lesson words guaranteed buildable from `tray` — the student's checklist. */
  targets: string[];
  /**
   * Eligible lesson words the packer did not seed — it stops at
   * {@link LESSON_SEED_MAX_TARGETS}, and a word can overflow the ring.
   *
   * They still count as a hit, and that is not theoretical: the letters the
   * seeded targets bring often spell one anyway. A LIGHT/NIGHT/SIGHT ring is
   * L,I,G,H,T,N,S, which builds TINS. Off the checklist (nothing guarantees
   * them) but scored when found.
   */
  extraWords: string[];
}

const EMPTY_SEED: LessonSeed = { tray: [], targets: [], extraWords: [] };

export interface LessonSeedOptions {
  /** Stable seed for the tile shuffle, so a re-mount deals the same ring. */
  seed?: string;
}

/** Letter counts of `word`. */
function letterCounts(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ch of word) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  return counts;
}

/** Union-MAX merge: the smallest multiset that can spell both inputs. */
function mergeMax(
  base: Map<string, number>,
  word: string
): { counts: Map<string, number>; size: number } {
  const counts = new Map(base);
  for (const [ch, n] of letterCounts(word)) {
    counts.set(ch, Math.max(counts.get(ch) ?? 0, n));
  }
  let size = 0;
  for (const n of counts.values()) size += n;
  return { counts, size };
}

/**
 * Filler letters for the slots the lesson words left free, most useful first:
 * the language's vowels (so ordinary words stay makeable), then its bag letters
 * by frequency. Deterministic — frequency ties break by code point.
 */
function fillerPreference(language: Language): string[] {
  const bag = [...(WORD_TOWER_LETTER_BAGS[language] || '')];
  const freq = new Map<string, number>();
  for (const ch of bag) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const byFrequency = [...freq.keys()].sort((a, b) => {
    const d = (freq.get(b) ?? 0) - (freq.get(a) ?? 0);
    return d !== 0 ? d : a.localeCompare(b);
  });
  const vowels = [...new Set(WORD_TOWER_VOWELS[language] || '')].filter((c) => freq.has(c));
  return [...vowels, ...byFrequency.filter((c) => !vowels.includes(c))];
}

/**
 * Build the wheel for a lesson.
 *
 * Packs up to {@link LESSON_SEED_MAX_TARGETS} lesson words into one ring by
 * union-max letter counts, fills any free tiles with useful filler, then
 * shuffles deterministically so the ring never reads out the answer.
 */
export function buildLessonSeed(
  words: readonly string[],
  language: Language,
  options: LessonSeedOptions = {}
): LessonSeed {
  if (!isLessonSeedReady(words, language)) return EMPTY_SEED;
  const eligible = eligibleLessonWords(words, language);

  let counts = new Map<string, number>();
  let size = 0;
  const targets: string[] = [];
  const extraWords: string[] = [];
  for (const word of eligible) {
    if (targets.length >= LESSON_SEED_MAX_TARGETS) {
      extraWords.push(word);
      continue;
    }
    const merged = mergeMax(counts, word);
    if (merged.size > WORD_TOWER_WHEEL_SIZE) {
      extraWords.push(word);
      continue;
    }
    counts = merged.counts;
    size = merged.size;
    targets.push(word);
  }
  if (targets.length === 0) return EMPTY_SEED;

  // Free tiles go to the most useful letters the lesson did not already claim,
  // so the student can still build ordinary words between lesson hits.
  const tray: string[] = [];
  for (const [ch, n] of counts) for (let i = 0; i < n; i++) tray.push(ch);
  for (const ch of fillerPreference(language)) {
    if (tray.length >= WORD_TOWER_WHEEL_SIZE) break;
    if ((counts.get(ch) ?? 0) >= WORD_TOWER_WHEEL_MAX_SAME) continue;
    tray.push(ch);
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  // A tiny bag could still leave the ring short; top it up rather than hand back
  // a wheel of the wrong size (a silent short ring is worse than a repeat).
  const preference = fillerPreference(language);
  while (tray.length < WORD_TOWER_WHEEL_SIZE && preference.length > 0) {
    tray.push(preference[tray.length % preference.length]);
  }

  const rng = mulberry32(
    fnv1aHash(`word-tower-lesson-${options.seed ?? 'default'}-${language}-${targets.join('|')}`)
  );
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tray[i], tray[j]] = [tray[j], tray[i]];
  }
  // Guarantee, rather than hope, that the ring does not spell the first target
  // in reading order — a wheel that gives the answer away is not practice.
  if (tray.join('').startsWith(targets[0])) tray.push(tray.shift() as string);

  return { tray, targets, extraWords };
}

/**
 * The lesson word a played word hits, or null when it is just an ordinary
 * dictionary word. Canonical on both sides, so casing and Hebrew sofit forms
 * match the way the tower's own dedup does.
 */
export function matchLessonTarget(
  word: string,
  seed: LessonSeed,
  language: Language
): string | null {
  const w = canonLessonWord(word ?? '', language);
  if (!w) return null;
  if (seed.targets.includes(w)) return w;
  if (seed.extraWords.includes(w)) return w;
  return null;
}

/** The next target to nudge the student towards, or null once all are hit. */
export function nextLessonTarget(seed: LessonSeed, hits: ReadonlySet<string>): string | null {
  return seed.targets.find((target) => !hits.has(target)) ?? null;
}

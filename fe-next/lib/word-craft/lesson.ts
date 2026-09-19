import type { Language } from '@/shared/types/game';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { alphabetForLocale } from './wordCraftAlphabet';
import { RACK_SIZE, type SupportedLocale } from './tileBag';
import type { RackTile } from './types';

/**
 * Word Craft classroom mode — the teacher's list steers the letters. The
 * player's opening rack and every refill pull the letters of the next unfound
 * lesson word out of the bag, so a lesson word is always within reach without
 * rigging the whole bag (the bot still draws normally). Matching goes through
 * the same canonical form Word Tower uses, so Hebrew final forms and Spanish
 * accents match the plain tiles on the board.
 */

const LESSON_LOCALES: readonly SupportedLocale[] = ['en', 'he', 'sv', 'es', 'ja'];

export function lessonLocale(language: Language): SupportedLocale | null {
  return (LESSON_LOCALES as readonly string[]).includes(language) ? (language as SupportedLocale) : null;
}

/** Canonical, deduped lesson words a rack can actually spell (2..rack size, drawable letters only). */
export function lessonTargets(words: readonly string[], language: Language, rackSize = RACK_SIZE): string[] {
  const locale = lessonLocale(language);
  if (!locale) return [];
  const alphabet = new Set(alphabetForLocale(locale));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const w = canonLessonWord(raw ?? '', language);
    const letters = Array.from(w);
    if (letters.length < 2 || letters.length > rackSize || seen.has(w)) continue;
    if (!letters.every((l) => alphabet.has(l))) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}

/**
 * Draw `count` tiles, taking the target's letters the rack is still missing
 * first (from anywhere in the bag), then the front of the bag. Pure.
 */
export function lessonDraw(
  bag: readonly RackTile[],
  count: number,
  rack: readonly RackTile[],
  target: string | null,
): { drawn: RackTile[]; rest: RackTile[] } {
  const rest = bag.slice();
  const drawn: RackTile[] = [];
  if (target) {
    const missing = Array.from(target);
    for (const t of rack) {
      const i = missing.indexOf(t.letter);
      if (i >= 0) missing.splice(i, 1);
    }
    for (const letter of missing) {
      if (drawn.length >= count) break;
      const i = rest.findIndex((t) => t.letter === letter);
      if (i >= 0) drawn.push(...rest.splice(i, 1));
    }
  }
  drawn.push(...rest.splice(0, Math.max(0, Math.min(count - drawn.length, rest.length))));
  return { drawn, rest };
}

export function foundLessonWords(played: readonly string[], targets: readonly string[], language: Language): string[] {
  const set = new Set(targets);
  const out: string[] = [];
  for (const w of played) {
    const c = canonLessonWord(w, language);
    if (set.has(c) && !out.includes(c)) out.push(c);
  }
  return out;
}

export function nextLessonTarget(targets: readonly string[], found: readonly string[]): string | null {
  return targets.find((t) => !found.includes(t)) ?? null;
}

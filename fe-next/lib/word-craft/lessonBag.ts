/**
 * Lesson-aware dealing for Word Craft played as classroom homework.
 *
 * The stock game deals from a fixed per-locale bag, so a teacher's lesson words
 * were only ever side targets the student could rarely spell. When a round is
 * launched from an assignment the deal is nudged — never resized:
 *  - the opening rack holds every letter of the first lesson target;
 *  - each PLAYER refill pulls the letters the rack is missing for the next
 *    target the player has not built yet (bot refills are untouched);
 *  - a letter the (scaled) bag lacks is produced by re-lettering a spare tile,
 *    so the sack count — the game clock — is unchanged.
 * With no targets every function here is the identity / stock front-draw.
 */

import type { Language } from '@/shared/types/game';
import { canonLessonWord } from '@/lib/wordTower/lessonSeed';
import { getTileBag, RACK_SIZE, BLANK_LETTER, type SupportedLocale } from './tileBag';
import type { RackTile } from './types';

const WORD_CRAFT_LOCALES: readonly SupportedLocale[] = ['en', 'sv', 'he', 'es', 'ja'];

const isWordCraftLocale = (value: string): value is SupportedLocale =>
  (WORD_CRAFT_LOCALES as readonly string[]).includes(value);

/**
 * Which bag/dictionary an assignment round uses. The LESSON's language wins
 * over the UI language; a lesson language Word Craft has no bag for (ru) falls
 * back to the UI locale (or en) and is explicitly unseeded.
 */
export function wordCraftLocaleFor(
  lessonLanguage: string,
  uiLanguage: string,
): { locale: SupportedLocale; seeded: boolean } {
  if (isWordCraftLocale(lessonLanguage)) return { locale: lessonLanguage, seeded: true };
  return { locale: isWordCraftLocale(uiLanguage) ? uiLanguage : 'en', seeded: false };
}

/**
 * Lesson words as the tile strings the board would spell: canonical (Hebrew
 * sofit → regular, Spanish accents folded, Ñ kept, uppercased), 2..rack
 * letters, every letter a real tile in this locale's bag, deduped, shortest
 * first (the easiest wins come first).
 */
export function lessonTargetsFor(
  words: readonly string[],
  locale: SupportedLocale,
  maxLength: number = RACK_SIZE,
): string[] {
  const { values } = getTileBag(locale);
  const out: string[] = [];
  for (const raw of words) {
    const canon = canonLessonWord(raw, locale as Language);
    const chars = [...canon];
    if (chars.length < 2 || chars.length > maxLength) continue;
    if (!chars.every((ch) => ch !== BLANK_LETTER && values[ch] !== undefined)) continue;
    if (!out.includes(canon)) out.push(canon);
  }
  return out.sort((a, b) => [...a].length - [...b].length);
}

/** First target the player has not built yet (bot words never count). */
export function nextLessonTarget(
  targets: readonly string[] | undefined,
  history: ReadonlyArray<{ who: 'player' | 'bot'; words: readonly string[] }>,
): string | null {
  if (!targets || targets.length === 0) return null;
  const built = new Set<string>();
  for (const move of history) if (move.who === 'player') for (const w of move.words) built.add(w.toUpperCase());
  return targets.find((t) => !built.has(t)) ?? null;
}

/** Letters of `target` not covered by `rack` (multiset difference). */
function missingLetters(target: string, rack: readonly RackTile[]): string[] {
  const pool = rack.filter((t) => !t.isBlank).map((t) => t.letter);
  const missing: string[] = [];
  for (const ch of target) {
    const i = pool.indexOf(ch);
    if (i >= 0) pool.splice(i, 1);
    else missing.push(ch);
  }
  return missing;
}

/**
 * Move one tile per wanted letter to the front of `tiles` (a copy). A letter
 * the bag lacks re-letters the last non-blank tile (count unchanged).
 */
function pullToFront(tiles: readonly RackTile[], wanted: readonly string[], locale: SupportedLocale): RackTile[] {
  const rest = tiles.slice();
  const front: RackTile[] = [];
  const { values } = getTileBag(locale);
  for (const letter of wanted) {
    let i = rest.findIndex((t) => t.letter === letter && !t.isBlank);
    if (i < 0) {
      i = rest.map((t) => !t.isBlank).lastIndexOf(true);
      if (i < 0) continue;
      rest[i] = { ...rest[i], letter, value: values[letter] ?? 0 };
    }
    front.push(rest.splice(i, 1)[0]);
  }
  return [...front, ...rest];
}

/** The bag with the opening target's letters leading (dealt to the player first). */
export function seedOpeningRack(tiles: RackTile[], target: string | null, locale: SupportedLocale): RackTile[] {
  if (!target) return tiles;
  return pullToFront(tiles, [...target], locale);
}

/**
 * A refill of `count` tiles. With a target, the letters the rack is missing for
 * it come first; without one this is exactly the stock front-draw.
 */
export function drawTowardTarget(
  tiles: readonly RackTile[],
  count: number,
  rack: readonly RackTile[],
  target: string | null,
  locale: SupportedLocale,
): { drawn: RackTile[]; rest: RackTile[] } {
  const ordered = target
    ? pullToFront(tiles, missingLetters(target, rack).slice(0, count), locale)
    : tiles.slice();
  const n = Math.min(count, ordered.length);
  return { drawn: ordered.slice(0, n), rest: ordered.slice(n) };
}

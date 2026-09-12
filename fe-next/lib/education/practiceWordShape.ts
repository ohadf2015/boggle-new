/**
 * practiceWordShape — one shape for the words every practice mode reads.
 *
 * `lessons.words` is a jsonb column and it genuinely holds two different things.
 * The teacher's lesson builder writes objects — `{ word, definition, synonyms,
 * example, … }` — while seeded, imported and duel-test lists are stored as plain
 * strings: `["STAR","MOON","LIGHT",…]`. The API hands back whatever the row
 * contains (`Array.isArray(row.words) ? row.words : []`), typed as `unknown[]`,
 * and the lesson page then passes it into props typed `VocabularyWord[]`.
 *
 * Nothing between those two points checks. On a string list every mode reads
 * `entry.word` and gets `undefined`: the board found no lesson words, the
 * picker locked Word Tower and every vocabulary skill "because the lesson has no
 * data", and Spelling sorted by `a.word.length` inside a comparator, threw, and
 * handed the entire round to the error boundary — "LET'S GET YOU BACK! Quick
 * glitch, but don't worry" — with nothing in the console to say what glitched.
 *
 * That is the Class 3 shape: two paths that are supposed to produce the same
 * thing, one of which quietly does not. The fix belongs at the boundary, once,
 * rather than as an `entry.word ?? entry` in each of eight modes.
 */

import type { VocabularyWord } from '@/lib/supabase/education/types';

/** Shape a raw `lessons.words` entry into the object the practice modes read. */
function normaliseEntry(entry: unknown): VocabularyWord | null {
  if (typeof entry === 'string') {
    const word = entry.trim();
    // `canIntegrate: true` matches what the lesson builder writes for a plain
    // word: nothing about it forbids the board from using it.
    return word ? ({ word, canIntegrate: true } as VocabularyWord) : null;
  }

  if (entry && typeof entry === 'object') {
    const candidate = entry as Partial<VocabularyWord>;
    if (typeof candidate.word === 'string' && candidate.word.trim().length > 0) {
      // Already in shape — returned as-is so the enrichment a teacher added
      // (definitions, synonyms, examples) survives untouched.
      return entry as VocabularyWord;
    }
  }

  return null;
}

/**
 * Normalise a raw `lessons.words` array.
 *
 * Anything that cannot become a word — null, a number, an empty string, an
 * object with no `word` — is dropped rather than passed on, because a
 * half-formed entry is exactly what crashed the round.
 */
export function toVocabularyWords(raw: readonly unknown[] | null | undefined): VocabularyWord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normaliseEntry)
    .filter((entry): entry is VocabularyWord => entry !== null);
}

/**
 * Grading a word the student PRODUCED from a meaning.
 *
 * Every vocabulary drill this product shipped before now is recognition: the
 * student picks the lesson word out of four. The research is specific that this
 * is not the same skill — retrieval practice shows a strong benefit for recall
 * and production, and no reliable benefit over restudy on recognition tasks. A
 * student who can spot `cell` among four options has not shown they can produce
 * it when the definition is all they have.
 *
 * This module is the grading half of that. It is pure, synchronous and has no
 * notion of a clock — see `produceScore`.
 *
 * NORMALIZATION. Typed input is where a produce mode quietly breaks in most of
 * the six locales we ship, so both sides go through the SAME normalizer the
 * board and the lesson-vocabulary matcher already use — `shared/utils/
 * wordNormalization`, a leaf module safe to import from client code. Writing a
 * second set of rules here is how the two drift apart:
 *
 *   he — `sanitizeWord` strips niqqud, so a student typing unvowelled matches a
 *        teacher who pasted a vowelled word; `normalizeWord` folds sofit finals.
 *        Without this the mode silently tests opaque-orthography segmentation,
 *        a harder skill than the one the teacher assigned.
 *   ru — ё folds to е, which everyday typing interchanges freely.
 *   es — accents fold, because a phone keyboard drops them.
 *   sv — å/ä/ö are NOT folded. They are distinct letters, and folding them would
 *        accept a different word (`har` for `hår`).
 */

import type { Language } from '@/shared/types/game';
import { normalizeWord, sanitizeWord } from '@/shared/utils/wordNormalization';

/**
 * `near-miss` is a real, separate outcome, not a soft `wrong`.
 *
 * A student who types `recieve` for `receive` retrieved the word and misspelled
 * it. That is a different event from not knowing it, and collapsing the two
 * throws away exactly what a teacher wants to see in the report. It earns
 * partial credit — never full, because the spelling is part of the word.
 */
export type ProduceVerdict = 'correct' | 'near-miss' | 'wrong';

export interface ProduceCheckOptions {
  language: Language;
  /**
   * The other words on the teacher's list. A one-character slip must never be
   * forgiven into a DIFFERENT word the class is also learning: `cell` and `sell`
   * are one edit apart, and crediting the wrong one teaches the wrong spelling
   * while telling the student they were basically right.
   */
  otherWords?: readonly string[];
}

/**
 * Below this length, almost every one-edit neighbour is a different real word
 * (`cat`/`bat`/`hat`/`cap`), so tolerance does more harm than good.
 */
export const PRODUCE_NEAR_MISS_MIN_LENGTH = 4;

export const PRODUCE_BASE_POINTS = 10;
/** Points surrendered per rung of the hint ladder. */
export const PRODUCE_HINT_STEP = 2;
/**
 * The floor for a CORRECT production, however much scaffolding it took.
 *
 * A student who climbed the whole ladder still retrieved and produced the word.
 * Scaffolded retrieval is the mechanism the research describes, not a failure
 * state — scoring it at zero teaches them that asking for help is worthless and
 * pushes them to guess instead.
 */
export const PRODUCE_MIN_POINTS = 4;

/** The canonical comparison key for one typed or stored word. */
function key(word: string, language: Language): string {
  if (typeof word !== 'string') return '';
  return normalizeWord(sanitizeWord(word, language), language);
}

/**
 * Optimal string alignment distance — Levenshtein plus ADJACENT TRANSPOSITION
 * as a single edit.
 *
 * Plain Levenshtein scores `recieve` → `receive` as 2, because it cannot see a
 * swap. Transposing two letters is the single most ordinary spelling slip there
 * is, so counting it as two edits would push the most common near miss of all
 * into `wrong`.
 *
 * Returns early once the distance provably exceeds `max`, so this stays cheap.
 */
function editDistanceWithin(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr: number[] = [];

  for (let i = 1; i <= a.length; i++) {
    curr = new Array(b.length + 1);
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        curr[j - 1] + 1,      // insertion
        prev[j] + 1,          // deletion
        prev[j - 1] + cost    // substitution
      );
      // Adjacent transposition (the `ie` ↔ `ei` case).
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, prev2[j - 2] + 1);
      }
      curr[j] = best;
      if (best < rowMin) rowMin = best;
    }

    // Nothing in this row can improve below rowMin, so the answer exceeds max.
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = curr;
  }

  return prev[b.length];
}

/**
 * How did the student's typed answer compare with the word they were asked for?
 */
export function checkProducedAnswer(
  typed: string,
  target: string,
  options: ProduceCheckOptions
): ProduceVerdict {
  const { language, otherWords } = options;
  const typedKey = key(typed, language);
  const targetKey = key(target, language);

  if (typedKey.length === 0 || targetKey.length === 0) return 'wrong';
  if (typedKey === targetKey) return 'correct';

  // Too short for tolerance to mean anything.
  if (targetKey.length < PRODUCE_NEAR_MISS_MIN_LENGTH) return 'wrong';

  // They produced a DIFFERENT word the teacher is also teaching. That is a
  // wrong answer to this question, not an almost-right spelling of it.
  if (otherWords?.some((other) => key(other, language) === typedKey)) return 'wrong';

  return editDistanceWithin(typedKey, targetKey, 1) <= 1 ? 'near-miss' : 'wrong';
}

/**
 * Points for one produced word.
 *
 * NOTE THE SIGNATURE: there is no time parameter, and that is the design, not an
 * omission. Dyslexia is associated with impaired precise-timing processing, so a
 * countdown used as the primary scoring axis systematically penalises the
 * students a vocabulary drill most needs to reach — it measures reading speed
 * and motor speed while reporting vocabulary. A produce round may still be
 * time-BOUNDED so a class moves together; time must not be able to change what
 * a right answer is worth. With no parameter to pass, it cannot.
 */
export function produceScore(verdict: ProduceVerdict, hintsUsed: number): number {
  if (verdict === 'wrong') return 0;
  const hints = Number.isFinite(hintsUsed) && hintsUsed > 0 ? Math.floor(hintsUsed) : 0;
  const earned = Math.max(PRODUCE_BASE_POINTS - hints * PRODUCE_HINT_STEP, PRODUCE_MIN_POINTS);
  return verdict === 'near-miss' ? Math.ceil(earned / 2) : earned;
}

/** One rung of the hint ladder. */
export type ProduceHint =
  | { kind: 'length'; length: number }
  | { kind: 'letters'; revealed: string };

/**
 * The hint ladder, cheapest rung first: how long the word is, then its opening
 * letters one at a time.
 *
 * It stops one letter short of the whole word, always. Past that point the
 * student is copying rather than retrieving, and the points would be unearned —
 * which also means the score stops reflecting what they know.
 *
 * Its purpose is the "blocked before interleaved" floor from the research: a
 * student who has not yet cleared a threshold on a word should not be left
 * staring at a definition with no way in. The ladder is the way in, and the
 * score it costs is small and bounded.
 */
export function produceHint(
  target: string,
  hintIndex: number,
  language: Language
): ProduceHint | null {
  const word = key(target, language);
  if (word.length === 0 || hintIndex < 0) return null;
  if (hintIndex === 0) return { kind: 'length', length: word.length };

  const maxRevealed = word.length - 1;
  if (hintIndex > maxRevealed) return null;
  return { kind: 'letters', revealed: word.slice(0, hintIndex) };
}

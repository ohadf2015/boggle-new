/**
 * Prompt → PRODUCE question building.
 *
 * The student is shown a meaning and types the lesson word. Nothing on screen
 * to pick from, nothing to eliminate. This is the half of vocabulary practice
 * the product did not have: every existing drill (`vocabFocus`, the live vocab
 * quiz) is four-choice recognition, and the research is explicit that retrieval
 * practice benefits recall and production while showing no reliable advantage
 * over restudy on recognition. Spotting `cell` among four options is not
 * evidence a student can produce it.
 *
 * WHY NOT REUSE `buildFocusQuestions`. Two reasons, both load-bearing:
 *
 *  1. Its synonym/antonym drafts run the OTHER WAY ROUND — prompt is the word,
 *     the choices are synonyms. Reused unchanged the student would type
 *     `chamber` and never produce `cell`, which is recognition wearing a text
 *     box. Here those cues are inverted: the synonym is the prompt, the lesson
 *     word is the answer.
 *  2. It returns `[]` below four usable words because it must fill four
 *     choices. Production needs no distractors, so a teacher with two words on
 *     the board can still run it. The floor here is ONE.
 *
 * The prompt carries only the teacher's own text — a definition, an example
 * sentence, a synonym. Labels ("another word for:") are UI copy and belong in
 * `t()` at the component, keyed off `focus`. Baking English in here would make
 * the mode untranslatable in the five non-English locales that ship.
 */

import type { Language } from '@/shared/types/game';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import { normalizeWord, sanitizeWord } from '@/shared/utils/wordNormalization';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';
import { withBlank } from './vocabFocus';

/**
 * The cues that can be inverted into "produce the lesson word".
 *
 * A deliberate subset of `VocabFocus`. `multiple_meaning` and `roots_affixes`
 * are excluded: their answers are meanings and word parts, not the lesson word,
 * so as production tasks they would be asking for something else entirely.
 */
export type ProduceFocus = 'definition' | 'context' | 'synonym' | 'antonym';

export const PRODUCE_FOCUSES: readonly ProduceFocus[] = [
  'definition',
  'context',
  'synonym',
  'antonym',
];

export const PRODUCE_DEFAULT_QUESTION_COUNT = 10;

export interface ProduceQuestion {
  focus: ProduceFocus;
  /** The lesson word the student must type. Always the taught word. */
  word: string;
  /** The cue, verbatim from the teacher's data. Never UI prose. */
  prompt: string;
  /** Shown in the feedback strip after the attempt, when the teacher supplied one. */
  definition?: string;
  /**
   * True when the student has no record of producing this word before.
   *
   * The UI owes a first exposure a brief look at the word and its meaning
   * BEFORE asking for it. Retrieval is the mechanism, but cold retrieval of a
   * word never met is just a blank — the research calls for blocked practice on
   * new material before anything is interleaved.
   */
  firstExposure: boolean;
}

export interface BuildProduceOptions {
  seed: number | string;
  count?: number;
  /**
   * Words this student has already produced correctly in an earlier session.
   * Compared through the locale normalizer, never by raw string equality.
   */
  knownWords?: readonly string[];
  /** Lesson language, for that normalizer. Defaults to English. */
  language?: Language;
}

const clean = (s: unknown): string => (typeof s === 'string' ? s.trim() : '');

const firstOf = (list: unknown): string => {
  if (!Array.isArray(list)) return '';
  for (const item of list) {
    const value = clean(item);
    if (value.length > 0) return value;
  }
  return '';
};

function key(word: string, language: Language): string {
  return normalizeWord(sanitizeWord(word, language), language);
}

/**
 * The cue for one word under one focus, or `null` when the teacher did not
 * supply the field this focus needs.
 */
function cueFor(word: VocabularyWord, focus: ProduceFocus): string | null {
  switch (focus) {
    case 'definition': {
      const definition = clean(word.definition);
      return definition.length > 0 ? definition : null;
    }
    case 'context':
      // `withBlank` is reused from vocabFocus — it is the one place that knows
      // how a teacher's example sentence becomes a blanked prompt.
      return withBlank(word.example, word.word);
    case 'synonym': {
      const synonym = firstOf(word.synonyms);
      return synonym.length > 0 ? synonym : null;
    }
    case 'antonym': {
      const antonym = firstOf(word.antonyms);
      return antonym.length > 0 ? antonym : null;
    }
    default:
      return null;
  }
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build a produce round from a lesson.
 *
 * Ordering is the research constraint made concrete: every word the student has
 * not produced before comes first, as a block, and review words follow. Within
 * each group the order is shuffled from the seed, so two students on the same
 * assignment do not get an identical sequence while each student's own round is
 * reproducible.
 */
export function buildProduceQuestions(
  words: VocabularyWord[],
  focus: ProduceFocus,
  options: BuildProduceOptions
): ProduceQuestion[] {
  if (!Array.isArray(words) || words.length === 0) return [];

  const language = options.language ?? 'en';
  const rng = mulberry32(fnv1aHash(`${focus}:${String(options.seed)}`));
  const known = new Set((options.knownWords ?? []).map((w) => key(w, language)));

  const usable: ProduceQuestion[] = [];
  for (const entry of words) {
    const word = clean(entry?.word);
    if (word.length === 0) continue;
    const prompt = cueFor(entry, focus);
    if (!prompt) continue;
    usable.push({
      focus,
      word,
      prompt,
      definition: clean(entry.definition) || undefined,
      firstExposure: !known.has(key(word, language)),
    });
  }

  if (usable.length === 0) return [];

  // Blocked first, interleaved after — NOT one shuffle over the whole set.
  const fresh = shuffle(usable.filter((q) => q.firstExposure), rng);
  const review = shuffle(usable.filter((q) => !q.firstExposure), rng);

  const count = Math.min(options.count ?? PRODUCE_DEFAULT_QUESTION_COUNT, usable.length);
  return [...fresh, ...review].slice(0, count);
}

/** How many produce questions each cue can build from this lesson. */
export function produceFocusAvailability(
  words: VocabularyWord[]
): Record<ProduceFocus, number> {
  const counts = { definition: 0, context: 0, synonym: 0, antonym: 0 } as Record<
    ProduceFocus,
    number
  >;
  if (!Array.isArray(words)) return counts;
  for (const focus of PRODUCE_FOCUSES) {
    counts[focus] = words.filter(
      (w) => clean(w?.word).length > 0 && cueFor(w, focus) !== null
    ).length;
  }
  return counts;
}

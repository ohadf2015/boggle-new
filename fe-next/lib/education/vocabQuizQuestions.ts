/**
 * Live Vocab Quiz — question-set assembly.
 *
 * The hard part (building a 4-choice question from a teacher's per-word data)
 * already exists in `vocabFocus.ts` and is used by solo practice. This module
 * adds only what a LIVE round needs on top:
 *
 *   focusAvailability — how many questions each focus can really make, so the
 *                       teacher sees it BEFORE pressing start instead of
 *                       discovering an empty round in front of a class.
 *   buildQuizQuestions — one round, with a fallback when the chosen focus is
 *                       too thin and a mixed set for `any`.
 *
 * Why the fallback matters more than it looks: as of 2026-09-05 every real
 * lesson in the database has definitions and NOTHING else (0 synonyms, 0
 * antonyms, 0 example sentences across 133 words). Teachers can enter those
 * fields in the word-list editor, but until they do, definition is the only
 * focus that can fill a round. Silently producing zero questions there would
 * be the Class 4 silent-failure bug from .claude/rules/60-recurring-pitfalls.md.
 */

import type { VocabularyWord } from '@/lib/supabase/education/types';
import {
  VOCAB_FOCUSES,
  buildFocusQuestions,
  focusQuestionCounts,
  type VocabFocus,
  type PracticeFocusSetting,
  type FocusQuestion,
} from './vocabFocus';

export type { VocabFocus, PracticeFocusSetting, FocusQuestion };

export type FocusAvailability = Record<VocabFocus, number>;

export interface BuildQuizOptions {
  focus: PracticeFocusSetting;
  count: number;
  seed: number | string;
  /**
   * The lesson's language. Only English currently tops thin distractor pools up
   * from a built-in bank, so passing it turns some otherwise-unbuildable
   * questions into real ones.
   */
  language?: string;
}

export interface QuizQuestionSet {
  questions: FocusQuestion[];
  /**
   * The focus the round actually ran with: a `VocabFocus`, `'any'` for a mixed
   * round, or null when the lesson could not produce a single question.
   */
  focusUsed: PracticeFocusSetting | null;
  /** The focus the teacher asked for, when we could not honour it. */
  fallbackFrom: VocabFocus | null;
}

/**
 * The real number of questions each focus can produce.
 *
 * Delegates to the shared builder's own scanner so a focus added there shows up
 * here automatically. Counted by BUILDING each set rather than by counting
 * usable words, because the builder also drops any word whose distractor pool
 * cannot fill three wrong choices — a teacher told "6 synonym questions" who
 * then gets 2 has been lied to by the cheaper count.
 *
 * Uncapped on purpose: this answers "how much could this lesson make", which is
 * the question the teacher's picker asks. The round length is capped separately.
 */
export function focusAvailability(
  words: VocabularyWord[],
  options: { language?: string } = {}
): FocusAvailability {
  return focusQuestionCounts(words, {
    count: Number.MAX_SAFE_INTEGER,
    seed: 'availability',
    language: options.language,
  });
}

/** Focuses that can fill at least one question, richest first. */
function playableFocuses(availability: FocusAvailability): VocabFocus[] {
  return VOCAB_FOCUSES.filter((f) => availability[f] > 0).sort(
    (a, b) => availability[b] - availability[a]
  );
}

/**
 * Interleave the per-focus sets so a mixed round alternates skills instead of
 * playing ten definitions then ten synonyms. Each lesson word appears at most
 * once — the same word drilled twice in one ten-question round reads as a bug
 * to a twelve-year-old, and it would double-count in the teacher's report.
 */
function mixFocuses(
  words: VocabularyWord[],
  focuses: VocabFocus[],
  count: number,
  seed: number | string,
  language?: string
): FocusQuestion[] {
  const perFocus = focuses.map((focus) =>
    buildFocusQuestions(words, focus, { count: Number.MAX_SAFE_INTEGER, seed: `${seed}:mix`, language })
  );

  const mixed: FocusQuestion[] = [];
  const usedWords = new Set<string>();
  let cursor = 0;

  while (mixed.length < count) {
    let tookOne = false;
    for (const set of perFocus) {
      if (mixed.length >= count) break;
      // Walk this focus's list from the shared cursor, skipping words already
      // drilled by an earlier focus in this round.
      for (let i = cursor; i < set.length; i++) {
        const candidate = set[i];
        const key = candidate.word.toLowerCase();
        if (usedWords.has(key)) continue;
        usedWords.add(key);
        mixed.push(candidate);
        tookOne = true;
        break;
      }
    }
    if (!tookOne) break;
    cursor++;
  }

  return mixed;
}

/**
 * Build one live round.
 *
 * Resolution order for a pinned focus: the focus itself → definition (the one
 * every enriched-or-not lesson tends to have) → the richest focus that works.
 */
export function buildQuizQuestions(
  words: VocabularyWord[],
  { focus, count, seed, language }: BuildQuizOptions
): QuizQuestionSet {
  const availability = focusAvailability(words, { language });
  const playable = playableFocuses(availability);

  if (playable.length === 0) {
    return { questions: [], focusUsed: null, fallbackFrom: null };
  }

  if (focus === 'any') {
    return {
      questions: mixFocuses(words, playable, count, seed, language),
      focusUsed: 'any',
      fallbackFrom: null,
    };
  }

  const requested = focus;
  const resolved: VocabFocus = availability[requested] > 0
    ? requested
    : availability.definition > 0
      ? 'definition'
      : playable[0];

  return {
    questions: buildFocusQuestions(words, resolved, { count, seed, language }),
    focusUsed: resolved,
    fallbackFrom: resolved === requested ? null : requested,
  };
}

/**
 * Classroom homework that does not require a pre-built lesson.
 *
 * Teachers stall on "create a lesson, then assign it". A word-count goal
 * ("find 12 words by Friday") or a pasted word list is the thing they can
 * send home the same minute a student joins.
 */

export type WordGoalKind = 'word_count' | 'word_list';

export const WORD_COUNT_MIN = 1;
export const WORD_COUNT_MAX = 100;
export const WORD_COUNT_DEFAULT = 10;
export const WORD_LIST_MIN = 3;
export const WORD_LIST_MAX = 40;

export interface WordCountGoal {
  kind: 'word_count';
  target: number;
  dueDate: string;
}

export interface WordListGoal {
  kind: 'word_list';
  words: string[];
  dueDate: string;
}

export type WordGoal = WordCountGoal | WordListGoal;

export type WordGoalError =
  | 'missing_due_date'
  | 'invalid_word_count'
  | 'word_list_too_short'
  | 'word_list_too_long'
  | 'empty_goal';

export function parseWordList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of raw.split(/[\n,;]+/)) {
    const word = chunk.trim();
    if (!word) continue;
    const key = word.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

export function uniqueWordCount(
  wordsAttempted: Record<string, { attempts?: number; correct?: number }> | null | undefined,
  extraWords: readonly string[] = [],
): number {
  const set = new Set<string>();
  if (wordsAttempted) {
    for (const word of Object.keys(wordsAttempted)) {
      const key = word.trim().toLocaleLowerCase();
      if (key) set.add(key);
    }
  }
  for (const word of extraWords) {
    const key = word.trim().toLocaleLowerCase();
    if (key) set.add(key);
  }
  return set.size;
}

export function wordListPracticed(
  required: readonly string[],
  wordsAttempted: Record<string, { attempts?: number; correct?: number }> | null | undefined,
): number {
  if (!required.length) return 0;
  const found = new Set(
    Object.keys(wordsAttempted ?? {}).map((w) => w.trim().toLocaleLowerCase()),
  );
  let n = 0;
  for (const word of required) {
    if (found.has(word.trim().toLocaleLowerCase())) n += 1;
  }
  return n;
}

export function isWordGoalComplete(
  goal: WordGoal,
  progress: {
    wordsAttempted?: Record<string, { attempts?: number; correct?: number }> | null;
    extraWords?: readonly string[];
  },
): boolean {
  if (goal.kind === 'word_count') {
    return uniqueWordCount(progress.wordsAttempted, progress.extraWords) >= goal.target;
  }
  return wordListPracticed(goal.words, progress.wordsAttempted) >= goal.words.length;
}

export function validateWordGoal(input: {
  kind: WordGoalKind;
  dueDate?: string | null;
  target?: number | string | null;
  wordListRaw?: string | null;
}): { ok: true; goal: WordGoal } | { ok: false; error: WordGoalError } {
  const dueDate = (input.dueDate ?? '').trim();
  if (!dueDate) return { ok: false, error: 'missing_due_date' };

  if (input.kind === 'word_count') {
    const target = typeof input.target === 'string' ? Number(input.target) : input.target;
    if (
      typeof target !== 'number' ||
      !Number.isFinite(target) ||
      !Number.isInteger(target) ||
      target < WORD_COUNT_MIN ||
      target > WORD_COUNT_MAX
    ) {
      return { ok: false, error: 'invalid_word_count' };
    }
    return { ok: true, goal: { kind: 'word_count', target, dueDate } };
  }

  const words = parseWordList(input.wordListRaw ?? '');
  if (words.length === 0) return { ok: false, error: 'empty_goal' };
  if (words.length < WORD_LIST_MIN) return { ok: false, error: 'word_list_too_short' };
  if (words.length > WORD_LIST_MAX) return { ok: false, error: 'word_list_too_long' };
  return { ok: true, goal: { kind: 'word_list', words, dueDate } };
}

export function wordGoalLessonName(goal: WordGoal, findNWords: (n: number) => string): string {
  if (goal.kind === 'word_count') return findNWords(goal.target);
  return goal.words.slice(0, 3).join(', ') + (goal.words.length > 3 ? '…' : '');
}

/**
 * Per-word progress merged across lesson rows. A word lives in every lesson
 * that teaches it, so each lesson's `student_lesson_progress` row carries its
 * own copy; the student and class views both count through here so a word is
 * one word, however many lessons it appears in.
 */

export interface WordProgressRow {
  words_mastered: readonly string[] | null | undefined;
  words_attempted:
    | Record<string, { correct?: number; attempts?: number; lastAttemptAt?: string } | null>
    | null
    | undefined;
}

export interface WordTally {
  correct: number;
  attempts: number;
  lastAt: string;
  mastered: boolean;
}

export interface StudentWordSummary {
  wordsMastered: number;
  wordsPracticed: number;
  correct: number;
  attempts: number;
  accuracy: number | null;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export const percent = (correct: number, attempts: number): number | null =>
  attempts > 0 ? Math.round((correct / attempts) * 100) : null;

export function tallyStudentWords(rows: readonly WordProgressRow[]): Map<string, WordTally> {
  const words = new Map<string, WordTally>();
  const get = (word: string) => {
    let w = words.get(word);
    if (!w) {
      w = { correct: 0, attempts: 0, lastAt: '', mastered: false };
      words.set(word, w);
    }
    return w;
  };
  for (const row of rows) {
    const attempted = row.words_attempted && typeof row.words_attempted === 'object' ? row.words_attempted : {};
    for (const [word, data] of Object.entries(attempted)) {
      if (!data || typeof data !== 'object') continue;
      const w = get(word);
      w.correct += num(data.correct);
      w.attempts += num(data.attempts);
      if (typeof data.lastAttemptAt === 'string' && data.lastAttemptAt > w.lastAt) w.lastAt = data.lastAttemptAt;
    }
    for (const word of Array.isArray(row.words_mastered) ? row.words_mastered : []) {
      if (typeof word === 'string') get(word).mastered = true;
    }
  }
  return words;
}

export function summarizeTally(words: Map<string, WordTally>): StudentWordSummary {
  let correct = 0;
  let attempts = 0;
  let wordsPracticed = 0;
  let wordsMastered = 0;
  for (const w of words.values()) {
    correct += w.correct;
    attempts += w.attempts;
    if (w.attempts > 0) wordsPracticed += 1;
    if (w.mastered) wordsMastered += 1;
  }
  return { wordsMastered, wordsPracticed, correct, attempts, accuracy: percent(correct, attempts) };
}

export function summarizeStudentWords(rows: readonly WordProgressRow[]): StudentWordSummary {
  return summarizeTally(tallyStudentWords(rows));
}

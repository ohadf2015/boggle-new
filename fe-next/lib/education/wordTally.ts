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
  /** The spelling to show: the most recently practised one, else the first seen. */
  word: string;
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

/**
 * The merge key for a stored word. Case only: Hebrew finals and niqqud stay as
 * stored, since the language-aware normalizers would fold them.
 */
export const wordKey = (word: string): string => word.normalize('NFC').trim().toLowerCase();

/** Keyed by `wordKey`; read the spelling to show from `WordTally.word`. */
export function tallyStudentWords(rows: readonly WordProgressRow[]): Map<string, WordTally> {
  const words = new Map<string, WordTally>();
  const get = (raw: string) => {
    const key = wordKey(raw);
    let w = words.get(key);
    if (!w) {
      w = { word: raw.trim(), correct: 0, attempts: 0, lastAt: '', mastered: false };
      words.set(key, w);
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
      if (typeof data.lastAttemptAt === 'string' && data.lastAttemptAt > w.lastAt) {
        w.lastAt = data.lastAttemptAt;
        w.word = word.trim();
      }
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

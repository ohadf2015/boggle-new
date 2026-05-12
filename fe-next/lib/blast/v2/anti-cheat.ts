import type { BlastLevel, Locale } from './types';
import { LOCALE_CONFIGS } from './locale-config';

const MIN_TIME_PER_WORD = 5; // seconds

export type ClearSubmission = {
  levelNumber: number;
  locale: Locale;
  wordsFound: string[];
  timeSeconds: number;
  hintsUsed: number;
  wrongAttempts: number;
  cascadesTriggered: number;
};

export type ClearValidation = { ok: true } | { ok: false; reason: string };

export function validateLevelClear(submission: ClearSubmission, level: BlastLevel): ClearValidation {
  const config = LOCALE_CONFIGS[submission.locale];
  const normWords = new Set(level.words.map(config.normalize));
  const normFound = new Set(submission.wordsFound.map(config.normalize));

  // Check all found words are in level
  for (const word of normFound) {
    if (!normWords.has(word)) {
      return { ok: false, reason: `word not in level: ${word}` };
    }
  }

  // Check time bound
  const minTime = MIN_TIME_PER_WORD * level.words.length;
  if (submission.timeSeconds < minTime) {
    return { ok: false, reason: `time too fast: ${submission.timeSeconds}s < ${minTime}s` };
  }

  return { ok: true };
}

export function starRating(submission: ClearSubmission, level: BlastLevel): 1 | 2 | 3 {
  const targetTime = 30 * level.words.length;
  const allWords = submission.wordsFound.length === level.words.length;

  if (allWords && submission.hintsUsed === 0 && submission.wrongAttempts <= 3 && submission.timeSeconds <= targetTime) {
    return 3;
  }
  if (submission.hintsUsed <= 1 || submission.wrongAttempts <= 5) {
    return 2;
  }
  return 1;
}

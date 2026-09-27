/**
 * Personal-best checks against the high-score blob.
 * Strictly greater: tying the stored best is not a new record.
 * A score of 0 is never badged.
 */

import type { ChallengeHighScores } from '../highScoreManager';

export interface RoundRecordFlags {
  scoreIsRecord: boolean;
  wordIsRecord: boolean;
}

export function bestScoreInHistory(history: ChallengeHighScores): number | null {
  const scores: number[] = [];
  if (history.allTimeBest) scores.push(history.allTimeBest.score);
  for (const entry of Object.values(history.scores ?? {})) scores.push(entry.score);
  if (scores.length === 0) return null;
  return Math.max(...scores);
}

export function bestLongestLength(history: ChallengeHighScores): number {
  const lengths: number[] = [];
  if (history.longestEver) lengths.push(history.longestEver.length);
  if (history.allTimeBest?.longestWord) lengths.push(history.allTimeBest.longestWord.length);
  for (const entry of Object.values(history.scores ?? {})) {
    if (entry.longestWord) lengths.push(entry.longestWord.length);
  }
  return lengths.length === 0 ? 0 : Math.max(...lengths);
}

export function evaluateRoundRecords(
  score: number,
  longestWord: string,
  history: ChallengeHighScores,
): RoundRecordFlags {
  const best = bestScoreInHistory(history);
  const bestLen = bestLongestLength(history);
  return {
    scoreIsRecord: score > 0 && (best === null || score > best),
    wordIsRecord: longestWord.length > 0 && longestWord.length > bestLen,
  };
}

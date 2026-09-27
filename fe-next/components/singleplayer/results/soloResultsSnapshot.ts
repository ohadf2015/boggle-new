/**
 * Snapshot the rotation inputs and record flags BEFORE this round is written
 * into localStorage, and commit the write at most once per game session.
 * sessionStorage survives a Strict Mode remount so the badge and the counter
 * don't flip on the second mount.
 */

import type { DifficultyLevel } from '@/shared/types/game';
import { incrementSoloGamesPlayed, getSoloGamesPlayed } from '@/lib/soloGamesPlayed';
import { getDailyDoneEver } from '@/lib/soloRotation';
import { getHighScores, recordGameResult, rememberLongestWord } from '../highScoreManager';
import { evaluateRoundRecords, type RoundRecordFlags } from './roundRecords';

export interface SoloResultsSnapshot {
  gamesPlayed: number;
  dailyDoneEver: boolean;
  records: RoundRecordFlags;
}

const SNAP_PREFIX = 'lexiclash:soloResultsSnap:v1:';
const COMMIT_KEY = 'lexiclash:soloRoundCommitted:v1';

function emptySnapshot(): SoloResultsSnapshot {
  return {
    gamesPlayed: 0,
    dailyDoneEver: false,
    records: { scoreIsRecord: false, wordIsRecord: false },
  };
}

export function readSoloResultsSnapshot(
  sessionId: string,
  score: number,
  longestWord: string,
): SoloResultsSnapshot {
  if (typeof window === 'undefined') return emptySnapshot();
  const key = `${SNAP_PREFIX}${sessionId}`;
  try {
    const cached = window.sessionStorage.getItem(key);
    if (cached) return JSON.parse(cached) as SoloResultsSnapshot;
  } catch {
    /* unreadable cache — recompute */
  }
  const snap: SoloResultsSnapshot = {
    gamesPlayed: getSoloGamesPlayed(),
    dailyDoneEver: getDailyDoneEver(),
    records: evaluateRoundRecords(score, longestWord, getHighScores()),
  };
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snap));
  } catch {
    /* private mode — the in-memory render still has the right flags */
  }
  return snap;
}

export function longestPlayerWord(words: readonly string[] | undefined): string {
  return (words ?? []).reduce((best, word) => (word.length > best.length ? word : best), '');
}

export function commitSoloRound(sessionId: string, round: {
  score: number;
  wordCount: number;
  longestWord: string;
  difficulty: DifficultyLevel;
  durationSeconds: number;
  /** Challenge/practice results must not advance the solo-bots rotation counter. */
  trackSoloRound?: boolean;
}): void {
  if (typeof window === 'undefined') return;
  let ids: string[] = [];
  try {
    const raw = window.sessionStorage.getItem(COMMIT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) ids = parsed.filter((id) => typeof id === 'string');
    }
  } catch {
    ids = [];
  }
  if (ids.includes(sessionId)) return;
  if (round.trackSoloRound !== false) incrementSoloGamesPlayed();
  recordGameResult(
    round.score,
    round.wordCount,
    round.longestWord,
    round.difficulty,
    round.durationSeconds,
  );
  if (round.longestWord) rememberLongestWord(round.longestWord);
  ids.push(sessionId);
  try {
    window.sessionStorage.setItem(COMMIT_KEY, JSON.stringify(ids.slice(-30)));
  } catch {
    /* the write already happened; a remount may double-count in private mode */
  }
}

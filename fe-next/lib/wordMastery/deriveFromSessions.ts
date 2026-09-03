/**
 * Lightweight derivation of per-word attempts from existing game_sessions
 * rows. Used only to seed the cache table — not on the hot game path.
 */

import { FAST_SOLVE_MS, scoreWordMastery, type WordAttempt } from './score';

export interface MasteryUpsertRow {
  player_id: string;
  word: string;
  language: string;
  times_solved: number;
  times_solved_unhinted: number;
  times_solved_fast_unhinted: number;
  times_failed: number;
  times_hinted: number;
  total_solve_ms: number;
  score: number;
  status: 'mastered' | 'learning';
}

export interface GameSessionWordRow {
  words_found: unknown;
  clues_used: number | null;
  duration_seconds: number | null;
  language: string | null;
  completed: boolean | null;
}

export interface DerivedWordAttempts {
  language: string;
  attempts: WordAttempt[];
}

function parseWordsFound(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((w): w is string => typeof w === 'string' && w.trim().length > 0);
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((w): w is string => typeof w === 'string' && w.trim().length > 0);
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function deriveAttemptsFromSessions(
  sessions: readonly GameSessionWordRow[],
): Map<string, DerivedWordAttempts> {
  const byWord = new Map<string, DerivedWordAttempts>();

  for (const session of sessions) {
    if (session.completed !== true) continue;
    const words = parseWordsFound(session.words_found);
    if (words.length === 0) continue;

    const usedHint = (session.clues_used ?? 0) > 0;
    const durationSeconds = session.duration_seconds ?? 0;
    const perWordMs =
      durationSeconds > 0 ? Math.round((durationSeconds * 1000) / words.length) : null;
    const language = (session.language || 'en').toLowerCase();

    for (const rawWord of words) {
      const word = rawWord.toLowerCase().trim();
      if (!word) continue;
      const existing = byWord.get(word);
      const attempt: WordAttempt = {
        outcome: 'solved',
        usedHint,
        durationMs: perWordMs,
      };
      if (existing) {
        existing.attempts.push(attempt);
      } else {
        byWord.set(word, { language, attempts: [attempt] });
      }
    }
  }

  return byWord;
}

export function toMasteryUpsertRows(
  playerId: string,
  derived: Map<string, DerivedWordAttempts>,
): MasteryUpsertRow[] {
  const rows: MasteryUpsertRow[] = [];
  for (const [word, { language, attempts }] of derived) {
    const { score, status } = scoreWordMastery(attempts);
    if (status === 'unseen') continue;
    rows.push({
      player_id: playerId,
      word,
      language,
      times_solved: attempts.filter((a) => a.outcome === 'solved').length,
      times_solved_unhinted: attempts.filter((a) => a.outcome === 'solved' && !a.usedHint).length,
      times_solved_fast_unhinted: attempts.filter(
        (a) =>
          a.outcome === 'solved' &&
          !a.usedHint &&
          a.durationMs != null &&
          a.durationMs <= FAST_SOLVE_MS,
      ).length,
      times_failed: attempts.filter((a) => a.outcome === 'failed').length,
      times_hinted: attempts.filter((a) => a.usedHint).length,
      total_solve_ms: attempts.reduce((sum, a) => sum + (a.durationMs ?? 0), 0),
      score,
      status,
    });
  }
  return rows;
}

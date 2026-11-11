import type { RivalSummary } from './types';

export interface H2HRow {
  player1_id: string;
  player2_id: string;
  player1_wins: number;
  player2_wins: number;
  draws: number;
  last_game_at: string | null;
}

/** Rival window: within max(20, 10%) of my score. */
export function rivalWindow(myScore: number): number {
  return Math.max(20, Math.abs(myScore) * 0.1);
}

export interface StandingRow {
  username: string;
  score: number;
  rank: number;
}

/** Classroom rival from the standings already on screen: the student just above, or the runner-up when I lead. */
export function classroomRival(standings: StandingRow[], myName: string): RivalSummary | null {
  const sorted = [...standings].sort((a, b) => a.rank - b.rank || b.score - a.score);
  const idx = sorted.findIndex((s) => s.username === myName);
  if (idx === -1) return null;
  const other = sorted[idx > 0 ? idx - 1 : idx + 1];
  if (!other) return null;
  const myScore = sorted[idx].score;
  return { kind: 'classroom', name: other.username, theirScore: other.score, myScore, gap: other.score - myScore };
}

/** The multiplayer room's live all-time record against the callout opponent, as the shared rival card. */
export function mpH2hRival(
  opponent: { username: string; userId: string } | null,
  record: { name: string; myWins: number; theirWins: number } | null,
): RivalSummary | null {
  if (!opponent || !record) return null;
  return {
    kind: 'h2h',
    userId: opponent.userId,
    name: record.name,
    record: { wins: record.myWins, losses: record.theirWins, draws: 0 },
  };
}

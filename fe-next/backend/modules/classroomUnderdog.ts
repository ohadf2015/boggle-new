/** Comeback chest: a student finishing in the bottom quartile of a round with 4+ students. */

const MIN_STUDENTS = 4;

/** Ties are generous: a tie reaching into the bottom quartile counts for everyone in it. */
export function isUnderdogFinish(myScore: number, scores: number[]): boolean {
  if (scores.length < MIN_STUDENTS) return false;
  const above = scores.filter((s) => s > myScore).length;
  const below = scores.filter((s) => s < myScore).length;
  return above > 0 && below < Math.floor(scores.length / 4);
}

type RoomUser = { authUserId?: string | null; isBot?: boolean; isHost?: boolean; isPractice?: boolean } | undefined;
type ResultRow = { username?: unknown; score?: unknown; totalScore?: unknown };

interface FinishedRoom {
  users?: Record<string, RoomUser>;
  cachedResultsPayload?: unknown;
}

const scoreOf = (row: ResultRow): number => {
  const n = Number(row.totalScore ?? row.score);
  return Number.isFinite(n) ? n : 0;
};

/** Reads the round's own results payload, so a previous round's standings never decide this chest. */
export function underdogFor(game: FinishedRoom | null | undefined, userId: string): boolean {
  const users = game?.users ?? {};
  const rows = (game?.cachedResultsPayload as { scores?: unknown } | null | undefined)?.scores;
  if (!Array.isArray(rows)) return false;
  const students = (rows as ResultRow[]).filter((row) => {
    const user = typeof row?.username === 'string' ? users[row.username] : undefined;
    return !!user && !user.isBot && !user.isHost && !user.isPractice;
  });
  const mine = students.find((row) => users[row.username as string]?.authUserId === userId);
  if (!mine) return false;
  return isUnderdogFinish(scoreOf(mine), students.map(scoreOf));
}

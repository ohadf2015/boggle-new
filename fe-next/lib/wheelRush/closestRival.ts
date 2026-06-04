/**
 * Closest-rival selection for Wheel Rush multiplayer.
 *
 * The MP wheel deliberately surfaces a SINGLE rival — the opponent whose score
 * is nearest to the player's — instead of a full leaderboard. One focused
 * head-to-head keeps the player chasing a concrete target rather than scanning
 * a crowded rail. Used by both the header chip and the "points to pass" pill so
 * the two never reference different people.
 */

export interface RivalLike {
  username: string;
  score: number;
}

/**
 * Pick the opponent closest in score to `username`.
 *
 * - Excludes the player themselves.
 * - Primary key: smallest absolute score gap (the neck-and-neck threat).
 * - Ties break toward the opponent who is AHEAD (the chase target), then by
 *   higher score, then alphabetically by username so selection is stable.
 *
 * @returns the closest rival, or `null` when the player has no opponents.
 */
export function selectClosestRival<T extends RivalLike>(
  leaderboard: T[],
  username: string,
): T | null {
  const others = leaderboard.filter(p => p.username !== username);
  if (others.length === 0) return null;

  const me = leaderboard.find(p => p.username === username);
  const myScore = me?.score ?? 0;

  return [...others].sort((a, b) => {
    const gapA = Math.abs(a.score - myScore);
    const gapB = Math.abs(b.score - myScore);
    if (gapA !== gapB) return gapA - gapB;
    // Equal gap → prefer the opponent ahead of me (someone to overtake).
    const aheadA = a.score >= myScore ? 0 : 1;
    const aheadB = b.score >= myScore ? 0 : 1;
    if (aheadA !== aheadB) return aheadA - aheadB;
    if (b.score !== a.score) return b.score - a.score;
    return a.username.localeCompare(b.username);
  })[0] ?? null;
}

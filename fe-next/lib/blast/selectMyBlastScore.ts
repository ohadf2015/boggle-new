/**
 * Live-score selectors for multiplayer Blast.
 *
 * In MP Blast the *server* is authoritative: word validation, tile bonuses and
 * cascades all run server-side (`wordValidationHandler` → `updatePlayerScore`),
 * and the result is broadcast as the `updateLeaderboard` payload. The local
 * Blast engine never increments its own `score` in MP, so the HUD must read the
 * player's live score from the broadcast leaderboard — otherwise it shows 0 for
 * the whole game.
 */

export interface BlastLeaderboardEntry {
  username: string;
  score: number;
  wordCount?: number;
}

/**
 * The current player's live score from the server leaderboard.
 * Returns 0 when the player is absent (e.g. before their first word) or when
 * leaderboard / username is missing.
 */
export function selectMyBlastScore(
  leaderboard: readonly BlastLeaderboardEntry[] | null | undefined,
  username: string | null | undefined,
): number {
  if (!leaderboard || !username) return 0;
  return leaderboard.find((e) => e.username === username)?.score ?? 0;
}

/**
 * The current player's 1-based rank (highest score = #1).
 * Null when the player is absent or input is missing. Does not mutate input.
 */
export function selectMyBlastRank(
  leaderboard: readonly BlastLeaderboardEntry[] | null | undefined,
  username: string | null | undefined,
): number | null {
  if (!leaderboard || !username) return null;
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
  const idx = sorted.findIndex((e) => e.username === username);
  return idx === -1 ? null : idx + 1;
}

export interface BlastGap {
  /**
   * 'lead'  → the player is #1; `points` is the margin over the runner-up.
   * 'behind'→ the player is not #1; `points` is what they must score to catch
   *           the player directly above them.
   */
  kind: 'lead' | 'behind';
  points: number;
}

/**
 * The current player's competitive gap to the nearest rival, for the live HUD.
 * - #1 → margin over the runner-up ({ kind: 'lead' }).
 * - otherwise → points to catch the player directly above ({ kind: 'behind' }).
 * Returns null when the player is absent, input is missing, or there is no rival
 * to compare against (alone on the board). Does not mutate the input.
 */
export function selectMyBlastGap(
  leaderboard: readonly BlastLeaderboardEntry[] | null | undefined,
  username: string | null | undefined,
): BlastGap | null {
  if (!leaderboard || !username || leaderboard.length < 2) return null;
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
  const idx = sorted.findIndex((e) => e.username === username);
  if (idx === -1) return null;
  if (idx === 0) {
    return { kind: 'lead', points: sorted[0].score - sorted[1].score };
  }
  return { kind: 'behind', points: sorted[idx - 1].score - sorted[idx].score };
}

export interface BlastStripRow {
  entry: BlastLeaderboardEntry;
  /** 1-based rank in the full leaderboard. */
  rank: number;
  isMe: boolean;
}

/**
 * Build the compact MP strip rows. The current player is ALWAYS included — even
 * when they sit outside the visible top slice — so a player can always read
 * their own live score and rank at a glance. When the player is outside the top
 * slice, the last visible leader slot is yielded to the player's own row.
 */
export function selectBlastLeaderboardStrip(
  leaderboard: readonly BlastLeaderboardEntry[] | null | undefined,
  username: string | null | undefined,
  max = 4,
): BlastStripRow[] {
  if (!leaderboard || leaderboard.length === 0) return [];
  const sorted: BlastStripRow[] = [...leaderboard]
    .sort((a, b) => b.score - a.score)
    .map((entry, i) => ({ entry, rank: i + 1, isMe: entry.username === username }));

  if (sorted.length <= max) return sorted;

  const top = sorted.slice(0, max);
  if (top.some((r) => r.isMe)) return top;

  const meRow = sorted.find((r) => r.isMe);
  if (!meRow) return top;

  // Drop the last visible leader to make room for the player's own row.
  return [...sorted.slice(0, max - 1), meRow];
}

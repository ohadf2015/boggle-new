/**
 * MP Round Aggregation Helper
 *
 * Groups game_results by gameCode and orders by created_at to build per-round mode+score breakdown.
 * Used by in-game results screen to show round-by-round summary.
 *
 * Note: game_results table structure:
 *   - game_code: room identifier
 *   - game_mode: current round's mode ('classic' | 'blast' | 'word-hunt' | 'word-tower' | 'wheel-rush' | 'shiritori')
 *   - created_at: timestamp
 *   - score: player's score for that round
 */

export interface MpRound {
  roundIndex: number;
  gameMode: string;
  scores: Array<{
    username: string;
    score: number;
    wordCount: number;
    placement: number;
  }>;
  topScore: number;
  createdAt: string;
}

/**
 * Parse raw game_results rows (unordered, may have multiple players per game)
 * and aggregate into ordered rounds with per-mode info.
 *
 * Expects rows to be: { game_code, game_mode, score, player_id, created_at, word_count, placement }
 * Typically from a Supabase query like:
 *   SELECT game_code, game_mode, score, word_count, placement, created_at
 *   FROM game_results
 *   WHERE game_code = $1
 *   ORDER BY created_at ASC, player_id ASC
 */
export function aggregateRoundsFromResults(rows: Array<{
  game_code: string;
  game_mode: string;
  score: number;
  word_count?: number | null;
  placement?: number | null;
  created_at: string;
  username?: string | null;
  player_id?: string | null;
}>): MpRound[] {
  if (rows.length === 0) return [];

  // Group by created_at to identify rounds (all rows with same timestamp = same game)
  const roundsByTimestamp = new Map<string, typeof rows>();
  for (const row of rows) {
    const ts = row.created_at;
    if (!roundsByTimestamp.has(ts)) {
      roundsByTimestamp.set(ts, []);
    }
    roundsByTimestamp.get(ts)!.push(row);
  }

  // Build ordered rounds
  const rounds: MpRound[] = [];
  let roundIndex = 0;

  for (const [createdAt, roundRows] of roundsByTimestamp) {
    const gameMode = roundRows[0]?.game_mode || 'classic';
    const scores = roundRows.map(row => ({
      username: row.username || `Player ${row.player_id?.slice(0, 6)}`,
      score: row.score,
      wordCount: row.word_count || 0,
      placement: row.placement || 0,
    }));
    const topScore = Math.max(...roundRows.map(r => r.score), 0);

    rounds.push({
      roundIndex,
      gameMode,
      scores,
      topScore,
      createdAt,
    });

    roundIndex++;
  }

  return rounds;
}

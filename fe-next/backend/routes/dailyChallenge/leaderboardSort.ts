/**
 * Pure ordering + reranking helpers for the daily-challenge leaderboards.
 *
 * Each daily-challenge leaderboard is scoped to a SINGLE language: every language
 * plays a different board, so players are only ranked against — and only see the
 * words of — others who played the same language.
 *
 * The SQL views emit one row per ATTEMPT and their `rank_position` also counts
 * guests + replays, so even within one language the route can't trust that column
 * directly — it re-sorts the rows here, collapses replays to one row per player,
 * and renumbers them 1..N.
 *
 * These helpers are intentionally pure (no DB, no I/O) so the ordering contract
 * is unit-testable and shared across every daily-challenge leaderboard route.
 */

/** Renumber `rank_position` sequentially starting at 1, preserving order + fields. */
export function rerankSequential<T>(rows: T[]): (T & { rank_position: number })[] {
  return rows.map((row, index) => ({ ...row, rank_position: index + 1 }));
}

/**
 * Collapse a player's multiple leaderboard rows into a single entry, keeping the
 * FIRST occurrence per `player_id`. Input MUST be pre-sorted best-first (via the
 * sortXGlobally helpers) so "first" == "best".
 *
 * Why: the per-language SQL views emit one row per ATTEMPT, and players replay the
 * same puzzle many times — so the same player shows up repeatedly, including
 * lower-scored duplicates that misread as "their real score". Dedup by player_id
 * collapses those same-language replays to the single best row.
 *
 * Rows with a null/missing player_id (guests) are never collapsed together.
 */
export function dedupeByPlayerKeepBest<T extends { player_id?: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const id = row.player_id;
    if (id == null) {
      out.push(row);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

/** Descending numeric compare with NULL/undefined sorted last. */
function compareNumberDescNullsLast(a: number | null | undefined, b: number | null | undefined): number {
  const an = a ?? null;
  const bn = b ?? null;
  if (an === null && bn === null) return 0;
  if (an === null) return 1;
  if (bn === null) return -1;
  return bn - an;
}

/** Ascending numeric compare with NULL/undefined sorted last (e.g. fewer attempts / faster time first). */
function compareNumberAscNullsLast(a: number | null | undefined, b: number | null | undefined): number {
  const an = a ?? null;
  const bn = b ?? null;
  if (an === null && bn === null) return 0;
  if (an === null) return 1;
  if (bn === null) return -1;
  return an - bn;
}

/** Ascending string compare (earlier timestamp first); NULL/undefined sorted last. */
function compareStringAscNullsLast(a: string | null | undefined, b: string | null | undefined): number {
  const an = a ?? null;
  const bn = b ?? null;
  if (an === null && bn === null) return 0;
  if (an === null) return 1;
  if (bn === null) return -1;
  return an.localeCompare(bn);
}

export interface WordHuntRow {
  solved?: boolean | null;
  efficiency_score?: number | null;
  attempts_used?: number | null;
  completed_at?: string | null;
}

/**
 * Global Word Hunt ordering — mirrors the `daily_word_hunt_leaderboard` view:
 * solved DESC, efficiency_score DESC NULLS LAST, attempts_used ASC, completed_at ASC.
 */
export function sortWordHuntRowsGlobally<T extends WordHuntRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const solvedDelta = (b.solved ? 1 : 0) - (a.solved ? 1 : 0);
    if (solvedDelta !== 0) return solvedDelta;

    const effDelta = compareNumberDescNullsLast(a.efficiency_score, b.efficiency_score);
    if (effDelta !== 0) return effDelta;

    const attemptsDelta = compareNumberAscNullsLast(a.attempts_used, b.attempts_used);
    if (attemptsDelta !== 0) return attemptsDelta;

    return compareStringAscNullsLast(a.completed_at, b.completed_at);
  });
}

export interface WordWheelRow {
  score?: number | null;
  word_count?: number | null;
  completed_at?: string | null;
}

/**
 * Global Word Wheel ordering — mirrors the `daily_word_wheel_leaderboard` view:
 * score DESC, word_count DESC, completed_at ASC.
 */
export function sortWordWheelRowsGlobally<T extends WordWheelRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const scoreDelta = compareNumberDescNullsLast(a.score, b.score);
    if (scoreDelta !== 0) return scoreDelta;

    const wordsDelta = compareNumberDescNullsLast(a.word_count, b.word_count);
    if (wordsDelta !== 0) return wordsDelta;

    return compareStringAscNullsLast(a.completed_at, b.completed_at);
  });
}

export interface ClassicPuzzleRow {
  score?: number | null;
  word_count?: number | null;
  time_seconds?: number | null;
}

/**
 * Global classic daily-puzzle ordering — mirrors the `daily_puzzle_leaderboard`
 * view: score DESC, word_count DESC, time_seconds ASC NULLS LAST.
 */
export function sortClassicPuzzleRowsGlobally<T extends ClassicPuzzleRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const scoreDelta = compareNumberDescNullsLast(a.score, b.score);
    if (scoreDelta !== 0) return scoreDelta;

    const wordsDelta = compareNumberDescNullsLast(a.word_count, b.word_count);
    if (wordsDelta !== 0) return wordsDelta;

    return compareNumberAscNullsLast(a.time_seconds, b.time_seconds);
  });
}

/**
 * Found-words extraction for game session logging.
 *
 * The admin game-logs dashboard reads the per-player word list from
 * `game_sessions.words_found` (JSONB). That column was historically written as
 * an empty array for multiplayer games, so guest games showed "0 words found"
 * and no longest word. This helper turns scoring-engine word details into the
 * `WordFound` shape that `logGameSession` persists.
 *
 * Note: `game.playerWords` (the source of these details) only ever contains
 * validated words — the server appends a word solely after it passes
 * dictionary/community validation. The `validated` filter here is therefore
 * defensive belt-and-suspenders, not the primary gate.
 */

/** Matches the `WordFound` JSONB shape stored in `game_sessions.words_found`. */
export interface FoundWord {
  word: string;
  timestamp: number;
  points: number;
  length: number;
}

/** Minimal slice of a scoring-engine WordDetail this helper needs. */
interface WordDetailLike {
  word?: string;
  score?: number;
  validated?: boolean;
  timestamp?: number | null;
  /** Kept (not filtered) — a duplicate is still a word the player found. */
  isDuplicate?: boolean;
}

/**
 * Build the `words_found` array for a player from their scoring word details.
 * Keeps every credited word the player actually found (duplicates included —
 * the player still found them); drops only non-validated entries.
 */
export function extractFoundWords(
  wordDetails: WordDetailLike[] | undefined | null
): FoundWord[] {
  if (!wordDetails || wordDetails.length === 0) return [];

  const found: FoundWord[] = [];
  for (const detail of wordDetails) {
    if (!detail?.word) continue;
    // Only non-validated entries are excluded; absence of the flag is treated
    // as valid (these lists are pre-validated upstream).
    if (detail.validated === false) continue;

    found.push({
      word: detail.word,
      timestamp: detail.timestamp ?? 0,
      points: detail.score ?? 0,
      length: detail.word.length,
    });
  }
  return found;
}

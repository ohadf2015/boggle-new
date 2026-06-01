/**
 * Word Wheel rarity — "did anyone else find this word?"
 *
 * Daily play is asynchronous, so true global exclusivity is only knowable
 * after the fact (and even then is "exclusive so far"). These pure helpers
 * aggregate the day's attempts into a distinct-player count per word and pick
 * the player's rarest find for a post-round celebration.
 */

export interface RarityRow {
  /** Stable per-player identity (player_id ?? guest_fingerprint). null = a guest with no fingerprint → counts as its own player. */
  id: string | null;
  words: string[];
}

/**
 * Distinct-player count per word across all attempts. Words are upper-cased so
 * casing/sofit-normalized variants collapse together; a player who listed the
 * same word twice still counts once.
 */
export function aggregateWordPlayerCounts(rows: RarityRow[]): Record<string, number> {
  const byWord = new Map<string, Set<string>>();
  rows.forEach((row, i) => {
    // Each null-id row is a separate guest → unique synthetic key per row.
    const player = row.id ?? `__anon_${i}`;
    for (const raw of row.words ?? []) {
      if (typeof raw !== 'string') continue;
      const word = raw.toUpperCase();
      if (!word) continue;
      let set = byWord.get(word);
      if (!set) { set = new Set(); byWord.set(word, set); }
      set.add(player);
    }
  });
  const counts: Record<string, number> = {};
  for (const [word, set] of byWord) counts[word] = set.size;
  return counts;
}

export interface RareFind {
  word: string;
  /** How many distinct players found this word (≥1, includes the current player). */
  playerCount: number;
  /** True when the current player is the only one who found it (so far). */
  isExclusive: boolean;
}

/**
 * The player's rarest found word: lowest distinct-player count, ties broken by
 * longer word then alphabetical (deterministic). Words with no rarity entry are
 * skipped (shouldn't happen — the player found them — but keeps it defensive).
 */
export function pickRarestFind(myWords: string[], counts: Record<string, number>): RareFind | null {
  let best: RareFind | null = null;
  for (const raw of myWords) {
    const word = (raw ?? '').toUpperCase();
    if (!word) continue;
    const playerCount = counts[word];
    if (typeof playerCount !== 'number' || playerCount < 1) continue;
    const candidate: RareFind = { word, playerCount, isExclusive: playerCount <= 1 };
    if (
      !best ||
      candidate.playerCount < best.playerCount ||
      (candidate.playerCount === best.playerCount && candidate.word.length > best.word.length) ||
      (candidate.playerCount === best.playerCount &&
        candidate.word.length === best.word.length &&
        candidate.word < best.word)
    ) {
      best = candidate;
    }
  }
  return best;
}

/** A find shared by you + at most this many others still counts as "rare". */
export const RARE_MAX_PLAYERS = 3;
/**
 * "Only you found it" is only meaningful once a real field has played — early in
 * the day the first player would trivially be "exclusive" on everything. Require
 * the most-found word to have been found by at least this many distinct players.
 */
export const MIN_FIELD_FOR_EXCLUSIVE = 3;

/**
 * The rarest find worth celebrating, with honesty gates applied:
 *  - exclusive ("only you, so far") only when a real field has played
 *  - otherwise only when shared with ≤ RARE_MAX_PLAYERS others
 * Returns null when the rarest find isn't notable.
 */
export function selectRareFindCelebration(
  myWords: string[],
  counts: Record<string, number>,
): RareFind | null {
  const find = pickRarestFind(myWords, counts);
  if (!find) return null;
  // Most-found word's player count ≈ how many people have played so far. No
  // rarity claim is meaningful until a real field has played — otherwise the
  // first players of the day see everything as "rare".
  const fieldSize = Object.values(counts).reduce((max, c) => Math.max(max, c), 0);
  if (fieldSize < MIN_FIELD_FOR_EXCLUSIVE) return null;
  if (find.isExclusive) return find;
  // Shared find: rare only when few players got it AND it's genuinely rarer than
  // the field (guards the small-field case where the rarest == the most common).
  return find.playerCount <= RARE_MAX_PLAYERS && find.playerCount < fieldSize ? find : null;
}

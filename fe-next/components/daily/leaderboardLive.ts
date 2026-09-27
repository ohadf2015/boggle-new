/**
 * leaderboardLive — pure helpers for the "watchable" layer of the daily board.
 *
 * The board polls every 30s. On its own a refreshed list looks identical to a
 * stale one; what makes it worth watching is seeing WHO moved. These helpers
 * diff two snapshots into rank movements, keep a movement visible for a short
 * while (so a climb is not erased by the very next unchanged poll), and read
 * the set of countries on the board.
 *
 * Kept pure (no React, no I/O) so the contract is unit-testable.
 */

export interface IdentityLike {
  player_id?: string | null;
  guest_fingerprint?: string | null;
}

export interface RankedLike extends IdentityLike {
  rank_position: number;
}

export interface RankMovement {
  /** Positive = climbed that many places, negative = dropped. 0 for a new entry. */
  delta: number;
  /** First appearance on the board since the previous snapshot. */
  isNew: boolean;
  /** Epoch ms when the movement was observed. */
  at: number;
}

/** How long a movement chip stays on screen after it was observed. */
export const MOVEMENT_TTL_MS = 90_000;

/** The one identity key every merge on the board agrees on. */
export function participantKey(p: IdentityLike): string | null {
  if (p.player_id) return `u:${p.player_id}`;
  if (p.guest_fingerprint) return `g:${p.guest_fingerprint}`;
  return null;
}

/**
 * Diff the previous ranks against a fresh snapshot.
 *
 * - The very first snapshot produces no movements (there is nothing to compare).
 * - Fresh movements from `liveMovements` are carried over while still within
 *   MOVEMENT_TTL_MS and the player is still on the board; a new observation
 *   for the same player replaces the old one.
 */
export function computeRankMovements(
  prevRanks: Map<string, number>,
  liveMovements: Map<string, RankMovement>,
  rows: RankedLike[],
  now: number,
): { ranks: Map<string, number>; movements: Map<string, RankMovement> } {
  const ranks = new Map<string, number>();
  for (const row of rows) {
    const key = participantKey(row);
    if (key) ranks.set(key, row.rank_position);
  }

  const movements = new Map<string, RankMovement>();
  for (const [key, m] of liveMovements) {
    if (now - m.at < MOVEMENT_TTL_MS && ranks.has(key)) movements.set(key, m);
  }

  if (prevRanks.size > 0) {
    for (const [key, rank] of ranks) {
      const prev = prevRanks.get(key);
      if (prev === undefined) {
        movements.set(key, { delta: 0, isNew: true, at: now });
        continue;
      }
      const delta = prev - rank;
      if (delta !== 0) movements.set(key, { delta, isNew: false, at: now });
    }
  }

  return { ranks, movements };
}

/**
 * Distinct ISO country codes on the board, most represented first (ties keep
 * first-seen order). Unknown / malformed codes are ignored.
 */
export function collectCountries(rows: Array<{ country_code?: string | null }>): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const code = (row.country_code ?? '').trim().toUpperCase();
    if (code.length !== 2) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code);
}

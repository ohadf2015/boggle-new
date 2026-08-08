/**
 * Word Tower — rival cohort selection + rank stakes (pure, renderer-agnostic).
 *
 * `rivalsFromLeaderboard` takes the global top-N of a board ordered
 * `best_height_m DESC` across all time. Wired straight to the rail that means a
 * player at 30 m is shown eight records at 400–900 m and a chase chip reading
 * "+870 m" — rivals they will never reach, which is wallpaper, not competition.
 *
 * This module selects a REACHABLE BAND instead: the records just above you
 * (something to chase this run) and the records just below you (something to
 * lose — a lead only feels owned once it can be taken back), plus the board
 * leader as one aspirational anchor.
 *
 * Still real leaderboard data only — no fabricated racers. Only the *selection*
 * changes; an empty board yields an empty cohort and the rail simply doesn't draw.
 */

import { rivalsFromLeaderboard, type LeaderboardRivalRow, type RivalMarker } from './rivals';

export interface RivalCohortOptions {
  /** Records just above the viewer to chase. */
  above?: number;
  /** Records just below the viewer to defend against. */
  below?: number;
  /** Also include the board leader as a single long-term goal. */
  anchor?: boolean;
}

/** Chase three, defend two — a band small enough that every ghost tower on the
 *  rail is a name you could plausibly move against in one session. */
export const DEFAULT_COHORT: Required<RivalCohortOptions> = { above: 3, below: 2, anchor: true };

/**
 * Rivals worth racing, centred on the viewer's own best.
 *
 * The band is a fixed SIZE (`above + below`), not a fixed shape: when one side
 * is short — a brand-new player with nobody below them, or a board leader with
 * nobody above — the remainder backfills from the other side, so the rail is
 * always as populated as the board allows.
 */
export function rivalCohort(
  rows: ReadonlyArray<LeaderboardRivalRow>,
  viewerBestM: number,
  opts: RivalCohortOptions = {},
): RivalMarker[] {
  const { above, below, anchor } = { ...DEFAULT_COHORT, ...opts };
  // Reuse the existing mapper for self-exclusion, zero-climb filtering and the
  // avatar/zone carry — `max` is the whole board here because we slice by
  // proximity below, not by rank.
  const all = rivalsFromLeaderboard(rows, rows.length);
  if (all.length === 0) return [];

  // Nearest-first on each side of the viewer.
  const ahead = all.filter((r) => r.heightM > viewerBestM).sort((a, b) => a.heightM - b.heightM);
  const behind = all.filter((r) => r.heightM <= viewerBestM).sort((a, b) => b.heightM - a.heightM);

  const total = above + below;
  const takeAhead = Math.min(ahead.length, Math.max(above, total - behind.length));
  const takeBehind = Math.min(behind.length, total - takeAhead);

  const picked = [...ahead.slice(0, takeAhead), ...behind.slice(0, takeBehind)];

  if (anchor) {
    // `all` is board order (best first), so the leader is simply the tallest.
    let leader = picked[0] ?? null;
    for (const r of all) if (leader === null || r.heightM > leader.heightM) leader = r;
    if (leader && !picked.some((r) => r.id === leader!.id)) picked.push(leader);
  }

  return picked.sort((a, b) => b.heightM - a.heightM);
}

/**
 * The viewer's live position on the board (1 = top).
 *
 * A tie counts as ahead of the viewer, so the rank is never over-claimed while
 * the player is merely level with a record. Their own row is excluded — matching
 * a record you already hold must not push you down a place.
 */
export function rankAmong(viewerHeightM: number, rows: ReadonlyArray<LeaderboardRivalRow>): number {
  let ahead = 0;
  for (const r of rows) {
    if (r.isYou) continue;
    if ((Number(r.bestHeightM) || 0) >= viewerHeightM) ahead++;
  }
  return ahead + 1;
}

export interface RankGain {
  from: number;
  to: number;
  /** Places gained (always ≥ 1). */
  gained: number;
}

/**
 * The overtake readout — "#12 → #11". Passing a rival used to produce a name and
 * nothing else; rank is the number players actually defend, so it is what the
 * celebration should show.
 *
 * Returns null when the rank did not improve, so a no-op never fires an empty
 * celebration.
 */
export function rankDelta(from: number, to: number): RankGain | null {
  if (!(to < from)) return null;
  return { from, to, gained: from - to };
}

/** How recently a rival's row must have moved to read as "climbing right now". */
export const LIVE_WINDOW_MS = 5 * 60_000;

export interface RivalActivity {
  /** Epoch ms of the rival's last progress write (`word_tower_progress.updated_at`). */
  updatedAt?: number | null;
  /** The rival's in-progress altitude (`current_height_m`). */
  currentHeightM?: number | null;
}

/**
 * True when a rival is genuinely mid-climb: their progress row was written inside
 * {@link LIVE_WINDOW_MS} AND they have a run actually in progress.
 *
 * Presence is derived from real writes only — an idle board flags nobody rather
 * than inventing activity. A row timestamped slightly in the future is treated as
 * live: that is client/server clock skew, not a stale row.
 */
export function isLiveRival(activity: RivalActivity, now: number): boolean {
  const at = activity.updatedAt;
  if (at == null) return false;
  if ((Number(activity.currentHeightM) || 0) <= 0) return false;
  return now - at <= LIVE_WINDOW_MS;
}

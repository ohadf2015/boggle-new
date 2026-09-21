import type { DailyModeId } from '@/lib/dailyModes';

/**
 * Merge one day's per-mode results into a single per-player board.
 *
 * The four daily modes each keep their own table, keyed the same way
 * (`player_id` / `guest_fingerprint` / `puzzle_date` / `language`), but they do
 * NOT score on the same scale — see {@link MODE_POINTS}. The hub board used to
 * sum Word Hunt + Word Wheel only, which quietly excluded half the visible
 * cards; this merges all four.
 *
 * Identity is used to GROUP and is then dropped: the returned entries carry
 * display data and scores only. The per-mode routes deliberately leak no player
 * ids ("no identifiers leaked" — app/api/connections/daily/[date]/leaderboard),
 * and a combined board must not become the hole in that.
 */

export interface ModeResultRow {
  player_id?: string | null;
  guest_fingerprint?: string | null;
  display_name?: string | null;
  avatar_emoji?: string | null;
  avatar_color?: string | null;
  avatar_image?: string | null;
  custom_avatar?: unknown;
  /** The mode's own raw metric, already selected by the caller. */
  value?: number | null;
}

export interface MergedLeaderboardEntry {
  rank: number;
  name: string;
  avatarEmoji: string | null;
  avatarColor: string | null;
  avatarImage: string | null;
  customAvatar: unknown;
  /** Sum of every mode's POINTS contribution. */
  total: number;
  /** Points per mode — 0 for a mode the player has not played today. */
  byMode: Record<DailyModeId, number>;
  /** Raw Word Tower height in metres, so the breakdown can show the real unit. */
  towerHeightM: number | null;
  /** Modes actually played today (byMode is 0 for both "unplayed" and "scored 0"). */
  playedModes: DailyModeId[];
  /** The caller's own row — set only when `opts.you` matched. */
  isYou?: boolean;
}

/* No `key` field on purpose. An earlier draft carried the group key (`u:<uuid>`
   / `g:<fingerprint>`) through for React, which put the exact identifier the
   per-mode routes withhold into the combined response — the combined board
   must not be the hole in "no identifiers leaked". Callers key on `rank`,
   which is stable for a board re-fetched whole. A privacy test asserts the
   serialized entry contains neither id. */

/**
 * How each mode's raw metric becomes comparable points.
 *
 * Measured over 60 days of production rows (2026-09-20):
 *   word-hunt   efficiency_score  avg 796   max  996
 *   word-wheel  score             avg 537   max 1698
 *   connections score             avg 993   max 1750
 *   word-tower  best_height_m     avg 103   max  578   <- metres, not points
 *
 * Three modes already share a scale. Word Tower does not: summing raw metres
 * would weight a 103m tower like a 103-point run and make the mode nearly
 * invisible in the total. x5 puts its average (~515) beside Word Wheel's (~537)
 * without flattening a genuinely exceptional tower.
 *
 * ponytail: a fixed multiplier, not a percentile normalisation — at ~12 weekly
 * players a distribution-based scale would swing wildly day to day. Revisit if
 * the tower's own scoring ever becomes point-based.
 */
export const TOWER_METRES_TO_POINTS = 5;

export function towerPoints(heightM: number | null | undefined): number {
  if (typeof heightM !== 'number' || !Number.isFinite(heightM) || heightM <= 0) return 0;
  return Math.round(heightM * TOWER_METRES_TO_POINTS);
}

const EMPTY_BY_MODE = (): Record<DailyModeId, number> => ({
  'word-hunt': 0,
  'word-wheel': 0,
  'word-tower': 0,
  connections: 0,
});

/** Group key: a real account first, else the guest fingerprint. */
export function identityOf(row: ModeResultRow): string | null {
  if (row.player_id) return `u:${row.player_id}`;
  if (row.guest_fingerprint) return `g:${row.guest_fingerprint}`;
  return null;
}

export interface MergeInput {
  mode: DailyModeId;
  rows: ModeResultRow[];
}

/**
 * @param inputs one entry per mode; a mode with no rows may be omitted.
 * @param limit  how many entries to return, highest total first.
 */
export function mergeDailyLeaderboard(
  inputs: MergeInput[],
  limit = 10,
  opts: { you?: string | null } = {},
): MergedLeaderboardEntry[] {
  const byIdentity = new Map<string, Omit<MergedLeaderboardEntry, 'rank'>>();

  for (const { mode, rows } of inputs) {
    for (const row of rows ?? []) {
      const identity = identityOf(row);
      // A row with neither id cannot be attributed to a player, and merging it
      // under a shared bucket would invent a person who played four modes.
      if (!identity) continue;

      const points = mode === 'word-tower' ? towerPoints(row.value) : Math.max(0, Math.round(row.value ?? 0));

      let entry = byIdentity.get(identity);
      if (!entry) {
        entry = {
          name: row.display_name?.trim() || '',
          avatarEmoji: row.avatar_emoji ?? null,
          avatarColor: row.avatar_color ?? null,
          avatarImage: row.avatar_image ?? null,
          customAvatar: row.custom_avatar ?? null,
          total: 0,
          byMode: EMPTY_BY_MODE(),
          towerHeightM: null,
          playedModes: [],
        };
        byIdentity.set(identity, entry);
      }

      // Same player, two rows for one mode (retry/catch-up): keep the best.
      if (points > entry.byMode[mode]) {
        entry.total += points - entry.byMode[mode];
        entry.byMode[mode] = points;
      }
      if (!entry.playedModes.includes(mode)) entry.playedModes.push(mode);

      if (mode === 'word-tower' && typeof row.value === 'number') {
        entry.towerHeightM = Math.max(entry.towerHeightM ?? 0, row.value);
      }

      // Later rows can fill in display data the first one lacked.
      if (!entry.name && row.display_name?.trim()) entry.name = row.display_name.trim();
      entry.avatarEmoji ??= row.avatar_emoji ?? null;
      entry.avatarColor ??= row.avatar_color ?? null;
      entry.avatarImage ??= row.avatar_image ?? null;
      entry.customAvatar ??= row.custom_avatar ?? null;
    }
  }

  const ranked = Array.from(byIdentity.entries())
    .sort(([, a], [, b]) => b.total - a.total || b.playedModes.length - a.playedModes.length)
    .map(([identity, entry], i) => ({
      ...entry,
      rank: i + 1,
      ...(opts.you && identity === opts.you ? { isYou: true } : {}),
    }));

  // A top-N board never shows a player ranked below N — so the one person
  // looking at it could finish today and not find themselves. Their own row
  // rides along with its TRUE rank; the identity used to find it is not echoed.
  const top = ranked.slice(0, Math.max(0, limit));
  const mine = ranked.find((e) => e.isYou);
  return mine && mine.rank > top.length ? [...top, mine] : top;
}

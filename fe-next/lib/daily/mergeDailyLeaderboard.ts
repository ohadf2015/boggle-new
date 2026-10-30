import type { DailyModeId } from '@/lib/dailyModes';

/**
 * Merge one day's per-mode results into a single per-player board.
 *
 * The four daily modes each keep their own table, keyed the same way
 * (`player_id` / `guest_fingerprint` / `puzzle_date` / `language`), but they do
 * NOT score on the same scale — see {@link TOWER_METRES_TO_POINTS}.
 *
 * Identity is used to GROUP and is then dropped: public entries carry display
 * data, scores and at most an opaque per-day `key`, never a player id or guest
 * fingerprint.
 */

export interface ModeResultRow {
  player_id?: string | null;
  guest_fingerprint?: string | null;
  display_name?: string | null;
  avatar_emoji?: string | null;
  avatar_color?: string | null;
  avatar_image?: string | null;
  custom_avatar?: unknown;
  country_code?: string | null;
  completed_at?: string | null;
  /** The mode's own raw metric, already selected by the caller. */
  value?: number | null;
}

export interface MergedLeaderboardEntry {
  rank: number;
  /** Opaque per-day row key (React keys, movement chips). Never the raw id. */
  key?: string;
  name: string;
  avatarEmoji: string | null;
  avatarColor: string | null;
  avatarImage: string | null;
  customAvatar: unknown;
  countryCode?: string | null;
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
  /** One of the caller's accepted friends. */
  isFriend?: boolean;
}

/** Server-only ranked row: still carries the group key, so it must never be serialized. */
export interface RankedBoardRow extends Omit<MergedLeaderboardEntry, 'key' | 'isYou' | 'isFriend'> {
  identity: string;
  /** When the player's latest counted result landed — the tiebreak. */
  reachedAt: string;
}

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

export interface RankOptions {
  /** Account ids to leave off the board (test accounts). */
  excludePlayerIds?: ReadonlySet<string>;
}

/** Every player with points today, ranked: total, then modes played, then who got there first. */
export function rankDailyBoard(inputs: MergeInput[], opts: RankOptions = {}): RankedBoardRow[] {
  const byIdentity = new Map<string, Omit<RankedBoardRow, 'rank'>>();

  for (const { mode, rows } of inputs) {
    for (const row of rows ?? []) {
      const identity = identityOf(row);
      // A row with neither id cannot be attributed to a player, and merging it
      // under a shared bucket would invent a person who played four modes.
      if (!identity) continue;
      if (row.player_id && opts.excludePlayerIds?.has(row.player_id)) continue;

      const points = mode === 'word-tower' ? towerPoints(row.value) : Math.max(0, Math.round(row.value ?? 0));

      let entry = byIdentity.get(identity);
      if (!entry) {
        entry = {
          identity,
          name: row.display_name?.trim() || '',
          avatarEmoji: row.avatar_emoji ?? null,
          avatarColor: row.avatar_color ?? null,
          avatarImage: row.avatar_image ?? null,
          customAvatar: row.custom_avatar ?? null,
          countryCode: row.country_code ?? null,
          total: 0,
          byMode: EMPTY_BY_MODE(),
          towerHeightM: null,
          playedModes: [],
          reachedAt: '',
        };
        byIdentity.set(identity, entry);
      }

      // Same player, two rows for one mode (retry/catch-up): keep the best.
      if (points > entry.byMode[mode]) {
        entry.total += points - entry.byMode[mode];
        entry.byMode[mode] = points;
      }
      if (!entry.playedModes.includes(mode)) entry.playedModes.push(mode);
      if (row.completed_at && row.completed_at > entry.reachedAt) entry.reachedAt = row.completed_at;

      if (mode === 'word-tower' && typeof row.value === 'number') {
        entry.towerHeightM = Math.max(entry.towerHeightM ?? 0, row.value);
      }

      // Later rows can fill in display data the first one lacked.
      if (!entry.name && row.display_name?.trim()) entry.name = row.display_name.trim();
      entry.avatarEmoji ??= row.avatar_emoji ?? null;
      entry.avatarColor ??= row.avatar_color ?? null;
      entry.avatarImage ??= row.avatar_image ?? null;
      entry.customAvatar ??= row.custom_avatar ?? null;
      entry.countryCode ??= row.country_code ?? null;
    }
  }

  return Array.from(byIdentity.values())
    .filter((e) => e.total > 0)
    .sort((a, b) =>
      b.total - a.total
      || b.playedModes.length - a.playedModes.length
      || compareReachedAt(a.reachedAt, b.reachedAt)
      || (a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

/** Earlier wins; a row with no time sorts after one that has it. */
function compareReachedAt(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -1 : 1;
}

export interface ViewOptions {
  limit?: number;
  you?: string | null;
  /** Group keys (`u:<id>`) of the caller's accepted friends. */
  friendIds?: ReadonlySet<string>;
  /** Maps a group key to an opaque row key; omitted means no `key` field. */
  keyOf?: (identity: string) => string;
}

export interface DailyBoardView {
  data: MergedLeaderboardEntry[];
  /** Ranked players on the whole board, not just the slice in `data`. */
  total: number;
  countries: string[];
}

/**
 * The public slice of a ranked board: top `limit`, plus the caller and their
 * friends at their TRUE rank when they sit below it. The group key is dropped.
 */
export function viewDailyBoard(ranked: RankedBoardRow[], opts: ViewOptions = {}): DailyBoardView {
  const limit = Math.max(0, opts.limit ?? 10);
  const data: MergedLeaderboardEntry[] = [];
  const counts = new Map<string, number>();

  for (const row of ranked) {
    const code = (row.countryCode ?? '').trim().toUpperCase();
    if (code.length === 2) counts.set(code, (counts.get(code) ?? 0) + 1);

    const isYou = !!opts.you && row.identity === opts.you;
    const isFriend = !isYou && !!opts.friendIds?.has(row.identity);
    if (row.rank > limit && !isYou && !isFriend) continue;

    const { identity, reachedAt: _reachedAt, ...pub } = row;
    data.push({
      ...pub,
      ...(opts.keyOf ? { key: opts.keyOf(identity) } : {}),
      ...(isYou ? { isYou: true } : {}),
      ...(isFriend ? { isFriend: true } : {}),
    });
  }

  const countries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  return { data, total: ranked.length, countries };
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
  return viewDailyBoard(rankDailyBoard(inputs), { limit, you: opts.you }).data;
}

import { createHmac, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { scopeDailyBoard } from '@/lib/connections/dailyBoard';
import { rankDailyBoard, type MergeInput, type RankedBoardRow } from './mergeDailyLeaderboard';

/** Generous per-mode read: prod peaks at ~70 rows a day, and ordering keeps the cut honest. */
export const PER_MODE_CAP = 500;
const CACHE_TTL_MS = 15_000;
/** A caller missing from the board forces a re-read, at most this often (bounds guests who never played). */
const MISSING_CALLER_REFRESH_MS = 2_000;

const IDENTITY = 'player_id, guest_fingerprint, display_name, avatar_emoji, avatar_color';

/* Three modes read their LEADERBOARD VIEW (keeps identity and joins custom_avatar
   off the profile). Connections reads its base table: its public view strips
   identity, so rows could not be attributed to a player. */
const SOURCES: Array<{ mode: MergeInput['mode']; table: string; metric: string; columns: string; doneAt: string }> = [
  { mode: 'word-hunt', table: 'daily_word_hunt_leaderboard', metric: 'efficiency_score', doneAt: 'completed_at', columns: `${IDENTITY}, custom_avatar, avatar_image, country_code, completed_at, efficiency_score` },
  { mode: 'word-wheel', table: 'daily_word_wheel_leaderboard', metric: 'score', doneAt: 'completed_at', columns: `${IDENTITY}, custom_avatar, avatar_image, country_code, completed_at, score` },
  { mode: 'word-tower', table: 'daily_word_tower_leaderboard', metric: 'best_height_m', doneAt: 'completed_at', columns: `${IDENTITY}, custom_avatar, country_code, completed_at, best_height_m` },
  { mode: 'connections', table: 'connections_daily_scores', metric: 'score', doneAt: 'updated_at', columns: `${IDENTITY}, avatar_image, updated_at, score` },
];

/** Side lookups (test accounts, friends) never hold the board: past this they fail open. */
const SIDE_LOOKUP_TIMEOUT_MS = 1_000;

type Row = Record<string, unknown>;

function failOpen<T>(work: PromiseLike<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => { timer = setTimeout(() => resolve(fallback), SIDE_LOOKUP_TIMEOUT_MS); });
  return Promise.race([Promise.resolve(work).catch(() => fallback), timeout]).finally(() => clearTimeout(timer));
}
const cache = new Map<string, { at: number; ranked: RankedBoardRow[] }>();

export function __resetDailyBoardCache(): void {
  cache.clear();
}

/**
 * The identity-bearing ranked board for one day, cached briefly per date+lang.
 * A caller missing from the cached board (they may have just finished) forces a
 * fresh read once the cached copy is a couple of seconds old.
 */
export async function loadRankedDailyBoard(
  admin: SupabaseClient,
  date: string,
  lang: string,
  caller: string | null,
): Promise<RankedBoardRow[]> {
  const cacheKey = `${date}:${lang}`;
  const hit = cache.get(cacheKey);
  const age = hit ? Date.now() - hit.at : Infinity;
  const callerMissing = !!caller && !hit?.ranked.some((r) => r.identity === caller);
  if (hit && age < CACHE_TTL_MS && !(callerMissing && age >= MISSING_CALLER_REFRESH_MS)) {
    return hit.ranked;
  }

  const settled = await Promise.allSettled(SOURCES.map(({ mode, table, columns, metric }) => {
    let q = admin.from(table).select(columns).eq('puzzle_date', date);
    // Pyramid-day Connections runs score on another scale and rank only among themselves.
    if (mode === 'connections') q = scopeDailyBoard(q, date, null);
    return (lang === 'all' ? q : q.eq('language', lang))
      .order(metric, { ascending: false })
      .limit(PER_MODE_CAP);
  }));

  // One mode failing must not blank the whole board — the others still stand.
  const inputs: MergeInput[] = SOURCES.map((src, i) => {
    const r = settled[i];
    const rows = r.status === 'fulfilled' && Array.isArray(r.value?.data) ? (r.value.data as unknown as Row[]) : [];
    return {
      mode: src.mode,
      rows: rows.map((row) => ({
        ...row,
        completed_at: typeof row[src.doneAt] === 'string' ? (row[src.doneAt] as string) : null,
        value: typeof row[src.metric] === 'number' ? (row[src.metric] as number) : 0,
      })),
    };
  });

  const ranked = rankDailyBoard(inputs, { excludePlayerIds: await testAccountIds(admin, inputs) });
  cache.set(cacheKey, { at: Date.now(), ranked });
  return ranked;
}

async function testAccountIds(admin: SupabaseClient, inputs: MergeInput[]): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const { rows } of inputs) for (const r of rows) if (r.player_id) ids.add(r.player_id);
  if (ids.size === 0) return new Set();
  return failOpen(
    admin.from('profiles').select('id').in('id', Array.from(ids)).eq('is_test_account', true)
      .then(({ data }) => new Set((data ?? []).map((p: { id: string }) => p.id))),
    new Set<string>(),
  );
}

/** Group keys (`u:<id>`) of the user's accepted friends, either direction. */
export async function friendIdentities(admin: SupabaseClient, userId: string): Promise<Set<string>> {
  return failOpen(
    admin
      .from('friends')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .then(({ data }) => new Set((data ?? []).map((f: { user_id: string; friend_id: string }) =>
        `u:${f.user_id === userId ? f.friend_id : f.user_id}`))),
    new Set<string>(),
  );
}

const KEY_SECRET = process.env.SUPABASE_JWT_SECRET || randomBytes(32).toString('hex');

/** Opaque, per-day row key: stable across polls, unlinkable across days, reveals no id. */
export function opaqueRowKey(date: string): (identity: string) => string {
  return (identity) => createHmac('sha256', KEY_SECRET).update(`${date}|${identity}`).digest('base64url').slice(0, 16);
}

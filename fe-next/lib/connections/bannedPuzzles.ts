import { createClient } from '@/utils/supabase/client';

const CACHE_KEY = 'connections:banned-puzzles:v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — view is cheap, but stale is fine

interface CacheShape {
  ids: string[];
  ts: number;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getCachedBannedIds(): ReadonlySet<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed || !Array.isArray(parsed.ids)) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

function writeCache(ids: string[]): void {
  if (!isBrowser()) return;
  try {
    const payload: CacheShape = { ids, ts: Date.now() };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage full / quota — non-fatal
  }
}

function isCacheFresh(): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as CacheShape;
    return Number.isFinite(parsed.ts) && Date.now() - parsed.ts < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * Fetches the auto-banned puzzle IDs from `v_connections_banned_puzzles`.
 * Puzzles land here once ≥3 distinct authenticated players flag them as
 * dislike+gave_up (see migration `connections_banned_puzzles_view`).
 *
 * Caches in localStorage for {@link CACHE_TTL_MS}. Falls back to cache on
 * network error so a flaky connection doesn't expose disliked puzzles.
 */
export async function fetchBannedPuzzleIds(): Promise<ReadonlySet<string>> {
  if (isCacheFresh()) return getCachedBannedIds();
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('v_connections_banned_puzzles')
      .select('puzzle_id');
    if (error || !data) return getCachedBannedIds();
    const ids = data.map((row) => row.puzzle_id as string).filter(Boolean);
    writeCache(ids);
    return new Set(ids);
  } catch {
    return getCachedBannedIds();
  }
}

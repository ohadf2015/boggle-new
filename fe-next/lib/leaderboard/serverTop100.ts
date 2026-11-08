/**
 * Server-side fetch of the global top-100 leaderboard for SSR seeding.
 *
 * Mirrors GET /api/leaderboard (backend/routes/leaderboard.ts): same Redis
 * key, same column selection, same cache write-back. The route itself stays
 * untouched — this exists so the leaderboard page's server component can pass
 * real rows as initial props instead of shipping an empty SSR shell to
 * crawlers and slow-JS users.
 *
 * Must only be imported from Server Components / route handlers. The Redis
 * read goes through getSharedRedisClient because the Next.js bundle gets its
 * own copy of the redis module whose local connection is never initialized
 * (see the note in backend/redis/connection.ts).
 *
 * Returns null on any failure or when Supabase is unconfigured — callers
 * should fall back to client-side fetching (build-time prerender has no
 * Redis/Supabase, and the page must still generate).
 */

import { getSharedRedisClient } from '@/backend/redis/connection';
import { KEYS } from '@/backend/redis/keys';
import { getTTLWithJitter, TTL_CONFIG } from '@/backend/redis/config';
import { getSupabase, isSupabaseConfigured } from '@/backend/modules/supabase/client';

const SSR_LEADERBOARD_TIMEOUT_MS = 4000;

async function fetchTop100(): Promise<unknown[] | null> {
  if (!isSupabaseConfigured()) return null;

  const redis = getSharedRedisClient();

  try {
    const cached = redis ? await redis.get(KEYS.leaderboardTop()) : null;
    if (cached) return JSON.parse(cached) as unknown[];
  } catch {
    // Cache unreadable — fall through to Supabase.
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('leaderboard')
    .select('player_id, username, display_name, avatar_emoji, avatar_color, avatar_image, total_score, games_played, games_won, ranked_mmr')
    .order('total_score', { ascending: false })
    .limit(100);

  if (error) return null;

  const rows = data ?? [];

  if (redis && rows.length > 0) {
    try {
      await redis.set(
        KEYS.leaderboardTop(),
        JSON.stringify(rows),
        'EX',
        getTTLWithJitter(TTL_CONFIG.LEADERBOARD_TOP)
      );
    } catch {
      // Write-back is best-effort — the next API hit will populate the cache.
    }
  }

  return rows;
}

export async function getServerLeaderboardTop100(): Promise<unknown[] | null> {
  const timeout = new Promise<null>((resolve) => {
    const timer = setTimeout(() => resolve(null), SSR_LEADERBOARD_TIMEOUT_MS);
    // Node-only: don't keep the process alive for the timer. No-op in edge runtimes.
    (timer as { unref?: () => void }).unref?.();
  });

  return Promise.race([fetchTop100(), timeout]);
}

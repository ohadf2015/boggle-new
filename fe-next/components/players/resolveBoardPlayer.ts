import { postWithAuth } from '@/utils/authFetch';

const cache = new Map<string, string | null>();

/**
 * Signed-in player behind an opaque daily-board row key, for boards rendered
 * outside a FriendStatusProvider (the daily hub's top-players list). Same
 * endpoint and rules as FriendStatusContext.resolveBoardKey: signed-in viewers
 * only, guests' rows 404. Answers (including "not found") are cached per day+key.
 */
export async function resolveBoardPlayer(boardDate: string, key: string): Promise<string | null> {
  const cacheKey = `${boardDate}|${key}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;
  try {
    const res = await postWithAuth('/api/friends/board-player', { date: boardDate, key });
    const userId = res.ok ? ((await res.json()) as { userId?: string }).userId ?? null : null;
    if (res.ok || res.status === 404) cache.set(cacheKey, userId);
    return userId;
  } catch {
    return null;
  }
}

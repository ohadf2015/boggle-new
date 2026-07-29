/**
 * blastLeaderboard — weekly Redis ZSET leaderboard for blast mode.
 *
 * Keys: `blast:lb:<lang>:<difficulty>:<YYYY-Www>`
 *   - Auto-rotating via ISO-week embedding (no cron needed)
 *   - 14-day TTL keeps current + prior week readable
 *
 * Writes use ZADD GT so only a player's best score per week sticks.
 * Reads compute percentile via ZREVRANK + ZCARD.
 *
 * All functions are fire-and-forget: Redis downtime never throws.
 */
import { getRedisClient } from '@/backend/redis/connection';

const TTL_SECONDS = 14 * 24 * 60 * 60; // 14 days

/**
 * ISO 8601 week number. Thursday's year determines the week-year,
 * so year boundaries (e.g. Jan 1 2027 → 2026-W53) are handled correctly.
 */
function getIsoWeekParts(date: Date): { year: number; week: number } {
  // Copy to avoid mutating caller
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Shift to the Thursday of the current ISO week (ISO day: Mon=1..Sun=7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const year = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year, week };
}

export function getWeekKey(
  lang: string,
  difficulty: string,
  date: Date = new Date(),
): string {
  const { year, week } = getIsoWeekParts(date);
  const ww = String(week).padStart(2, '0');
  return `blast:lb:${lang}:${difficulty}:${year}-W${ww}`;
}

/**
 * Record a player's score on this week's leaderboard.
 * Uses ZADD GT so only the best score of the week sticks.
 * Silent no-op if Redis is unavailable or the write fails.
 */
export async function addToWeeklyLeaderboard(
  userId: string,
  score: number,
  lang: string,
  difficulty: string,
  date: Date = new Date(),
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const key = getWeekKey(lang, difficulty, date);
  try {
    // ioredis's zadd accepts variadic args; GT flag requires Redis 6.2+
    await (client.zadd as (...args: unknown[]) => Promise<unknown>)(
      key,
      'GT',
      score,
      userId,
    );
    await client.expire(key, TTL_SECONDS);
  } catch {
    // Fire-and-forget — swallow so the game loop never blocks on Redis
  }
}

/**
 * Get a player's percentile on this week's leaderboard.
 * 100 = top player, 1 = last player, null = not ranked / Redis down.
 */
export async function getLeaderboardPercentile(
  userId: string,
  lang: string,
  difficulty: string,
  date: Date = new Date(),
): Promise<number | null> {
  const client = getRedisClient();
  if (!client) return null;

  const key = getWeekKey(lang, difficulty, date);
  try {
    const [rank, total] = await Promise.all([
      client.zrevrank(key, userId),
      client.zcard(key),
    ]);
    if (rank === null || rank === undefined || !total || total <= 0) {
      return null;
    }
    // rank is 0-indexed from top → player beats (total - rank - 1) others + themselves
    const pct = Math.round(((total - rank) / total) * 100);
    // Clamp to [1, 100] so "last place" never shows as 0%
    return Math.max(1, Math.min(100, pct));
  } catch {
    return null;
  }
}

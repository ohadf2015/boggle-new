import { getCacheClient } from './redisCache';

const LEADERBOARD_KEY = (period: string) => `leaderboard:${period}`;

export async function updateLeaderboardScore(
  period: string,
  userId: string,
  score: number
): Promise<void> {
  const redis = getCacheClient();
  await redis.zadd(LEADERBOARD_KEY(period), score, userId);
}

export async function getTopPlayers(
  period: string,
  limit: number = 20
): Promise<Array<{ userId: string; score: number; rank: number }>> {
  const redis = getCacheClient();
  const results = await redis.zrevrange(
    LEADERBOARD_KEY(period),
    0,
    limit - 1,
    'WITHSCORES'
  );

  const entries: Array<{ userId: string; score: number; rank: number }> = [];
  for (let i = 0; i < results.length; i += 2) {
    entries.push({
      userId: results[i],
      score: parseFloat(results[i + 1]),
      rank: Math.floor(i / 2) + 1,
    });
  }
  return entries;
}

export async function getPlayerRank(
  period: string,
  userId: string
): Promise<number | null> {
  const redis = getCacheClient();
  const rank = await redis.zrevrank(LEADERBOARD_KEY(period), userId);
  return rank !== null ? rank + 1 : null;
}

export async function getPlayerScore(
  period: string,
  userId: string
): Promise<number | null> {
  const redis = getCacheClient();
  const score = await redis.zscore(LEADERBOARD_KEY(period), userId);
  return score !== null ? parseFloat(score) : null;
}

interface Standing {
  username: string;
  score: number;
}

interface Callout {
  type: string;
  timestamp: number;
  pair?: readonly [string, string];
}

const PHOTO_FINISH_MIN_GAP = 5;
const PHOTO_FINISH_SHARE = 0.1;
const PHOTO_FINISH_MAX_GAP = 15;
export const STALE_CALLOUT_MS = 8000;

export function rankByScore<T extends Standing>(leaderboard: readonly T[]): T[] {
  return [...leaderboard].sort((a, b) => b.score - a.score);
}

export function photoFinishPair(leaderboard: readonly Standing[]): { first: string; second: string; gap: number } | null {
  const [first, second] = rankByScore(leaderboard);
  if (!first || !second || second.score <= 0) return null;
  const gap = first.score - second.score;
  const close = Math.min(PHOTO_FINISH_MAX_GAP, Math.max(PHOTO_FINISH_MIN_GAP, Math.round(first.score * PHOTO_FINISH_SHARE)));
  return gap <= close ? { first: first.username, second: second.username, gap } : null;
}

export function dropWaitedTooLong<T extends Callout>(queue: T[], now: number): T[] {
  const fresh = queue.filter((n) => now - n.timestamp <= STALE_CALLOUT_MS);
  return fresh.length === queue.length ? queue : fresh;
}

export function dropBrokenPhotoFinish<T extends Callout>(queue: T[], leaderboard: readonly Standing[]): T[] {
  if (!queue.some((n) => n.type === 'photo_finish')) return queue;
  const pair = photoFinishPair(leaderboard);
  const holds = (n: T) => !!pair && !!n.pair && n.pair.includes(pair.first) && n.pair.includes(pair.second);
  const kept = queue.filter((n) => n.type !== 'photo_finish' || holds(n));
  return kept.length === queue.length ? queue : kept;
}

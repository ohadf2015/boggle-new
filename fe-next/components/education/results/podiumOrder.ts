/**
 * The podium's order is the SCORE's order. The server ranks the room, but a
 * payload that arrives with rank 2 holding fewer points than rank 3 (a rematch
 * merge, a late-scored word, a hand-built fixture) put a lower number on a
 * higher pedestal in front of thirty children. So the projector re-derives rank
 * from score, keeping the server's rank only as the tie-break, and every
 * consumer (pedestals AND the winner bar) reads the same ordered array — one
 * source, so the gold pedestal and the "winner" line can never name two people.
 */

export interface RankedEntry {
  username: string;
  score: number;
  rank: number;
}

export function orderPodiumByScore<T extends RankedEntry>(entries: readonly T[]): T[] {
  return [...entries]
    .sort((a, b) => b.score - a.score || a.rank - b.rank)
    .slice(0, 3)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

/**
 * Where a placing's count-up starts. Third lands first; second then counts up
 * FROM third's score and first FROM second's, so a frame caught mid-reveal can
 * never show silver below bronze (the "85 on silver, 87 on bronze" capture).
 */
export function podiumCountFloor(ordered: readonly RankedEntry[], rank: number): number {
  const below = ordered.find((p) => p.rank === rank + 1);
  const self = ordered.find((p) => p.rank === rank);
  if (!below || !self) return 0;
  return Math.min(below.score, self.score);
}

'use client';

import { useTopPlayers, type TopPlayer } from './useTopPlayers';

export interface HallOfFameEntry {
  username: string;
  displayName: string | null;
  totalScore: number;
  avatarImage: string | null;
  avatarConfig: Record<string, string> | null;
  profilePictureUrl: string | null;
}

/**
 * Hall of Fame — reuses useTopPlayers to avoid duplicate Supabase queries.
 * Both hooks query the same `leaderboard` table ordered by total_score DESC.
 */
export function useHallOfFame(limit = 5) {
  const { players, loading } = useTopPlayers(limit);

  // Map TopPlayer → HallOfFameEntry (same shape, just different type name)
  const champions: HallOfFameEntry[] = players.map((p: TopPlayer) => ({
    username: p.username,
    displayName: p.displayName,
    totalScore: p.totalScore,
    avatarImage: p.avatarImage,
    avatarConfig: p.avatarConfig as Record<string, string> | null,
    profilePictureUrl: p.profilePictureUrl,
  }));

  return { champions, loading };
}

'use client';

import { useTopPlayers, type TopPlayer } from './useTopPlayers';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface HallOfFameEntry {
  username: string;
  displayName: string | null;
  totalScore: number;
  avatarImage: string | null;
  avatarConfig: CustomAvatarConfig | null;
}

interface UseHallOfFameOptions {
  /** Pre-fetched server data forwarded to useTopPlayers */
  initialData?: TopPlayer[];
}

/**
 * Hall of Fame — reuses useTopPlayers to avoid duplicate Supabase queries.
 * Both hooks query the same `leaderboard` table ordered by total_score DESC.
 * Pass `initialData` from a server component to skip the client-side fetch.
 */
export function useHallOfFame(limit = 5, options: UseHallOfFameOptions = {}) {
  const { players, loading } = useTopPlayers(limit, { initialData: options.initialData });

  // Map TopPlayer → HallOfFameEntry (same shape, just different type name)
  const champions: HallOfFameEntry[] = players.map((p: TopPlayer) => ({
    username: p.username,
    displayName: p.displayName,
    totalScore: p.totalScore,
    avatarImage: p.avatarImage,
    avatarConfig: p.avatarConfig,
  }));

  return { champions, loading };
}

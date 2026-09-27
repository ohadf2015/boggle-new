import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, loggedProcedure } from '../trpc';
import { cacheAside } from '../../cache/redisCache';
import logger from '../../utils/logger';
import type { CustomAvatarConfig } from '../../../shared/types/customAvatar';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');

// Public columns only — NEVER email, coins, UTM, admin flags or tokens.
// premium_avatar_parts is cosmetic ownership (drives the public "32/81 parts"
// collection count on the profile showcase), not account data.
export const PUBLIC_PROFILE_COLUMNS = [
  'id', 'username', 'display_name', 'avatar_config',
  'country_code', 'current_level', 'total_xp', 'total_games', 'total_score',
  'total_words', 'casual_wins', 'ranked_wins', 'longest_word', 'longest_word_length',
  'achievement_counts', 'created_at', 'premium_avatar_parts',
].join(', ');

export interface PublicProfileRow {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_config?: unknown;
  country_code?: string | null;
  current_level?: number | null;
  total_xp?: number | null;
  total_games?: number | null;
  total_score?: number | null;
  total_words?: number | null;
  casual_wins?: number | null;
  ranked_wins?: number | null;
  longest_word?: string | null;
  longest_word_length?: number | null;
  achievement_counts?: Record<string, number> | null;
  created_at?: string | null;
  premium_avatar_parts?: unknown;
}

/** Pure row → public payload. Whitelists every field; nothing passes through. */
export function toPublicProfile(
  profile: PublicProfileRow,
  { higherCount, totalPlayers }: { higherCount: number | null; totalPlayers: number | null },
) {
  const rank = (higherCount || 0) + 1;
  const total = totalPlayers || 1;
  const percentile = Math.max(1, Math.round((rank / total) * 100));

  const totalGames = profile.total_games || 0;
  const totalWins = (profile.casual_wins || 0) + (profile.ranked_wins || 0);
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const createdAt = profile.created_at ? new Date(profile.created_at) : new Date();
  const memberSince = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

  const ownedAvatarParts = Array.isArray(profile.premium_avatar_parts)
    ? profile.premium_avatar_parts.filter((k): k is string => typeof k === 'string')
    : [];

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name || profile.username,
    customAvatar: (profile.avatar_config as CustomAvatarConfig | null) || null,
    countryCode: profile.country_code || null,
    currentLevel: profile.current_level || 1,
    totalXp: profile.total_xp || 0,
    totalGames,
    totalScore: profile.total_score || 0,
    totalWords: profile.total_words || 0,
    totalWins,
    winRate,
    longestWord: profile.longest_word || null,
    longestWordLength: profile.longest_word_length || 0,
    achievementCounts: profile.achievement_counts || {},
    ownedAvatarParts,
    memberSince,
    percentile,
    totalPlayersAbove: higherCount || 0,
  };
}

function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export const playerProfileRouter = router({
  get: loggedProcedure
    .input(
      z.object({
        id: z.string().min(1).max(100).refine(
          (val) => !/[<>"';]/.test(val),
          { message: 'Invalid player identifier' }
        ),
      })
    )
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Database not available' });
      }

      return cacheAside(`profile:${input.id}`, async () => {
        const supabase = getSupabase();
        const isUuid = isValidUuid(input.id);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select(PUBLIC_PROFILE_COLUMNS)
          .eq(isUuid ? 'id' : 'username', input.id)
          .single();

        if (error || !profile) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Player not found' });
        }

        const { count: higherCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gt('total_score', profile.total_score || 0);

        const { count: totalPlayers } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('total_games', 1);

        return toPublicProfile(profile as PublicProfileRow, { higherCount, totalPlayers });
      }, 300);
    }),
});

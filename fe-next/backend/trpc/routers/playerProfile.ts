import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, loggedProcedure } from '../trpc';
import { cacheAside } from '../../cache/redisCache';
import logger from '../../utils/logger';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');

const PUBLIC_PROFILE_COLUMNS = [
  'id', 'username', 'display_name', 'avatar_config',
  'country_code', 'current_level', 'total_xp', 'total_games', 'total_score',
  'total_words', 'casual_wins', 'ranked_wins', 'longest_word', 'longest_word_length',
  'achievement_counts', 'created_at',
].join(', ');

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

        const rank = (higherCount || 0) + 1;
        const total = totalPlayers || 1;
        const percentile = Math.max(1, Math.round((rank / total) * 100));

        const totalGames = profile.total_games || 0;
        const totalWins = (profile.casual_wins || 0) + (profile.ranked_wins || 0);
        const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        const createdAt = profile.created_at ? new Date(profile.created_at) : new Date();
        const memberSince = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

        return {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name || profile.username,
          customAvatar: profile.avatar_config || null,
          countryCode: profile.country_code || null,
          currentLevel: profile.current_level || 1,
          totalXp: profile.total_xp || 0,
          totalGames,
          totalScore: profile.total_score || 0,
          totalWords: profile.total_words || 0,
          winRate,
          longestWord: profile.longest_word || null,
          longestWordLength: profile.longest_word_length || 0,
          achievementCounts: profile.achievement_counts || {},
          memberSince,
          percentile,
          totalPlayersAbove: higherCount || 0,
        };
      }, 300);
    }),
});

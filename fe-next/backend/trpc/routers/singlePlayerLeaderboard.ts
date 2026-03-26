import { z } from 'zod';
import { router, loggedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import logger from '../../utils/logger';
import { cacheAside } from '../../cache/redisCache';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');

function ensureSupabase() {
  if (!isSupabaseConfigured()) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Leaderboard service not available' });
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Database service unavailable' });
  }
  return supabase;
}

// ==================== Schemas ====================

const syncScoreSchema = z.object({
  guestFingerprint: z.string().min(1),
  score: z.number().int().min(0),
  wordCount: z.number().int().min(0),
  longestWord: z.string().optional(),
  username: z.string().default('Guest'),
  avatarEmoji: z.string().default('\uD83C\uDFAE'),
  avatarColor: z.string().default('#6366f1'),
});

const leaderboardSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
});

const statsSchema = z.object({
  fingerprint: z.string().min(1),
});

// ==================== Router ====================

export const singlePlayerLeaderboardRouter = router({
  syncScore: loggedProcedure
    .input(syncScoreSchema)
    .mutation(async ({ input }) => {
      const supabase = ensureSupabase();
      const { guestFingerprint, score, wordCount, longestWord, username, avatarEmoji, avatarColor } = input;

      // Check existing entry
      const { data: existing, error: fetchError } = await supabase
        .from('single_player_leaderboard')
        .select('guest_fingerprint, total_score, games_played, best_score, longest_word')
        .eq('guest_fingerprint', guestFingerprint)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        logger.error('LEADERBOARD_TRPC', `Fetch error: ${fetchError.message}`);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to sync score' });
      }

      let updatedScore: number;
      let updatedGames: number;

      if (existing) {
        updatedScore = existing.total_score + score;
        updatedGames = existing.games_played + 1;
        const bestScore = Math.max(existing.best_score || 0, score);

        const { error: updateError } = await supabase
          .from('single_player_leaderboard')
          .update({
            total_score: updatedScore,
            games_played: updatedGames,
            best_score: bestScore,
            longest_word: longestWord || existing.longest_word,
            updated_at: new Date().toISOString(),
          })
          .eq('guest_fingerprint', guestFingerprint);

        if (updateError) {
          logger.error('LEADERBOARD_TRPC', `Update error: ${updateError.message}`);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update score' });
        }

        logger.info('LEADERBOARD_TRPC', `Updated ${guestFingerprint}: ${existing.total_score}+${score}=${updatedScore}`);
      } else {
        updatedScore = score;
        updatedGames = 1;

        const { error: insertError } = await supabase
          .from('single_player_leaderboard')
          .insert({
            guest_fingerprint: guestFingerprint,
            username, avatar_emoji: avatarEmoji, avatar_color: avatarColor,
            total_score: score, games_played: 1, best_score: score,
            longest_word: longestWord,
          });

        if (insertError) {
          logger.error('LEADERBOARD_TRPC', `Insert error: ${insertError.message}`);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create entry' });
        }

        logger.info('LEADERBOARD_TRPC', `Created ${guestFingerprint}: score=${score}`);
      }

      return { success: true, totalScore: updatedScore, gamesPlayed: updatedGames };
    }),

  getLeaderboard: loggedProcedure
    .input(leaderboardSchema)
    .query(async ({ input }) => {
      const supabase = ensureSupabase();
      const { limit } = input;

      interface LeaderboardEntry {
        guest_fingerprint: string;
        username: string;
        avatar_emoji: string;
        avatar_color: string;
        total_score: number;
        games_played: number;
        best_score: number;
        longest_word: string | null;
        updated_at: string;
      }

      const data = await cacheAside<{ leaderboard: (LeaderboardEntry & { rank: number })[]; count: number }>(
        `trpc:sp-leaderboard:${limit}`,
        async () => {
          const { data: leaderboard, error } = await supabase
            .from('single_player_leaderboard')
            .select('guest_fingerprint, username, avatar_emoji, avatar_color, total_score, games_played, best_score, longest_word, updated_at')
            .gt('games_played', 0)
            .order('total_score', { ascending: false })
            .limit(limit);

          if (error) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch leaderboard' });
          }

          const ranked = (leaderboard || []).map((entry: LeaderboardEntry, index: number) => ({
            ...entry,
            rank: index + 1,
          }));

          return { leaderboard: ranked, count: ranked.length };
        },
        60,
      );

      return data;
    }),

  getStats: loggedProcedure
    .input(statsSchema)
    .query(async ({ input }) => {
      const supabase = ensureSupabase();
      const { fingerprint } = input;

      const data = await cacheAside(
        `trpc:sp-stats:${fingerprint}`,
        async () => {
          const { data: stats, error } = await supabase
            .from('single_player_leaderboard')
            .select('*')
            .eq('guest_fingerprint', fingerprint)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch stats' });
          }

          if (!stats) {
            return { exists: false as const, totalScore: 0, gamesPlayed: 0, bestScore: 0 };
          }

          const { count } = await supabase
            .from('single_player_leaderboard')
            .select('*', { count: 'exact', head: true })
            .gt('total_score', stats.total_score);

          return {
            exists: true as const,
            totalScore: stats.total_score,
            gamesPlayed: stats.games_played,
            bestScore: stats.best_score,
            longestWord: stats.longest_word,
            username: stats.username,
            avatarEmoji: stats.avatar_emoji,
            avatarColor: stats.avatar_color,
            rank: (count || 0) + 1,
          };
        },
        120,
      );

      return data;
    }),
});

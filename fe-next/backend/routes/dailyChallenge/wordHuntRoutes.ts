/**
 * Word Hunt Daily Challenge Routes
 * Handles /api/daily-challenge/word-hunt/* endpoints
 */

import express, { Request, Response, Router } from 'express';
import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import { getCachedDailyPuzzle } from '../../redisClient';
import logger from '../../utils/logger';
import { generateDailyPuzzleAsync } from '../../../utils/dailyChallenge/gridGeneration.server';
import { getPuzzleNumber } from '../../../utils/dailyChallenge';
import type { Language } from '../../../types';
import { ensureLanguageLoaded } from '../../dictionary';

import {
  type LeaderboardParams,
  type LeaderboardQuery,
  type CachedPuzzle,
  type WordHuntSubmitRequest,
  type WordHuntStatsParams,
  type WordHuntStatsResponse,
} from './types';
import {
  normalizeWordForComparison,
  isWordValidForDailyChallenge,
  isValidDateFormat,
  isValidLanguage,
} from './utils';
import { completeMission } from '../../modules/dailyMissionsManager';

const router: Router = express.Router();

/**
 * POST /api/daily-challenge/word-hunt/submit
 * Submit a Word Hunt daily challenge result
 */
router.post('/submit', async (req: WordHuntSubmitRequest, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const {
      puzzleDate,
      puzzleNumber,
      language,
      playerId,
      guestFingerprint,
      displayName,
      avatarEmoji,
      avatarColor,
      countryCode,
      solved,
      attemptsUsed,
      targetWord,
      attemptWords,
      wordsDiscovered,
      lifeRemaining,
      clueTokensEarned,
      clueTokensSpent,
      hintsUnlocked,
      efficiencyScore
    } = req.body;

    // Validate required fields
    if (!puzzleDate || !puzzleNumber || !language || solved === undefined || attemptsUsed === undefined || attemptsUsed === null || !targetWord || !attemptWords) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (attemptsUsed < 1 || attemptsUsed > 10) {
      res.status(400).json({ error: 'Attempts must be between 1 and 10' });
      return;
    }

    if (!playerId && !guestFingerprint) {
      res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
      return;
    }

    logger.info('API', `[WordHunt Submit] Received: playerId=${playerId || 'null'}, guestFingerprint=${guestFingerprint ? guestFingerprint.substring(0, 8) + '...' : 'null'}, displayName=${displayName}, solved=${solved}, attempts=${attemptsUsed}`);

    // Validate puzzleDate is today or yesterday (UTC) to prevent clock-drift abuse
    const serverDate = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (puzzleDate !== serverDate && puzzleDate !== yesterday) {
      logger.info('API', `[WordHunt] Date drift: client=${puzzleDate}, server=${serverDate}`);
      res.status(400).json({ error: 'Invalid puzzle date' });
      return;
    }

    // Server-side validation
    try {
      let expectedPuzzle: CachedPuzzle | null = await getCachedDailyPuzzle(puzzleDate, language) as CachedPuzzle | null;
      if (!expectedPuzzle || !expectedPuzzle.targetWord) {
        expectedPuzzle = await generateDailyPuzzleAsync(puzzleDate, language as Language) as CachedPuzzle;
      }
      const expectedTargetWord = normalizeWordForComparison(expectedPuzzle.targetWord, language as Language);
      const submittedTargetWord = normalizeWordForComparison(targetWord, language as Language);

      if (expectedTargetWord !== submittedTargetWord) {
        logger.info('API', `Word Hunt validation failed: expected ${expectedTargetWord}, got ${submittedTargetWord} for ${puzzleDate}/${language}`);
        res.status(400).json({ error: 'Invalid target word for this puzzle' });
        return;
      }

      const expectedPuzzleNumber = getPuzzleNumber(puzzleDate);
      if (expectedPuzzleNumber !== puzzleNumber) {
        logger.info('API', `Word Hunt validation failed: expected puzzle #${expectedPuzzleNumber}, got #${puzzleNumber}`);
        res.status(400).json({ error: 'Invalid puzzle number' });
        return;
      }

      if (solved && attemptWords && attemptWords.length > 0) {
        const hasMatchingAttempt = attemptWords.some((a) => {
          const normalized = normalizeWordForComparison(a.word, language as Language);
          return normalized === expectedTargetWord;
        });
        // Auto-win path: if no attempt matches the target word directly,
        // the player may have revealed all letter positions through word discoveries.
        // Allow solved=true in this case (wordsDiscovered serves as proof).
        if (!hasMatchingAttempt && (!wordsDiscovered || wordsDiscovered.length === 0)) {
          logger.info('API', `Word Hunt validation failed: solved=true but no attempt matches target "${expectedTargetWord}" and no words discovered`);
          res.status(400).json({ error: 'Invalid solve claim' });
          return;
        }
      }

      // Dictionary validation is ADVISORY only
      await ensureLanguageLoaded(language as Language);

      if (!isWordValidForDailyChallenge(expectedTargetWord, language as Language)) {
        logger.info('API', `[WordHunt Advisory] Target word "${expectedTargetWord}" not found in dictionary for language ${language} - allowing submission`);
      }

      if (attemptWords && attemptWords.length > 0) {
        const invalidWords: string[] = [];
        for (const attempt of attemptWords) {
          const normalizedWord = normalizeWordForComparison(attempt.word, language as Language);
          if (!isWordValidForDailyChallenge(normalizedWord, language as Language)) {
            invalidWords.push(normalizedWord);
          }
        }
        if (invalidWords.length > 0) {
          logger.info('API', `[WordHunt Advisory] Invalid words in submission: ${invalidWords.join(', ')} for language ${language} - allowing submission`);
        }
      }
    } catch (validationError) {
      // Dictionary validation is advisory-only — don't report as error
      logger.debug('API', `Word Hunt dictionary validation error (advisory, non-blocking): ${(validationError as Error).message}`);
    }

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    // NOTE: Atomic insert with unique constraint fallback prevents race conditions
    const insertData: Record<string, unknown> = {
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      language,
      solved,
      attempts_used: attemptsUsed,
      target_word: targetWord,
      attempt_words: attemptWords,
      completed_at: new Date().toISOString(),
      display_name: displayName || 'Anonymous',
      avatar_emoji: avatarEmoji || '🎯',
      avatar_color: avatarColor || '#6366f1',
      country_code: countryCode || undefined
    };

    // Add survival mode fields (round floats to integers)
    if (wordsDiscovered !== undefined) insertData.words_discovered = wordsDiscovered;
    if (lifeRemaining !== undefined) insertData.life_remaining = Math.round(lifeRemaining);
    if (clueTokensEarned !== undefined) insertData.clue_tokens_earned = Math.round(clueTokensEarned);
    if (clueTokensSpent !== undefined) insertData.clue_tokens_spent = Math.round(clueTokensSpent);
    if (hintsUnlocked !== undefined) insertData.hints_unlocked = Math.round(hintsUnlocked);
    if (efficiencyScore !== undefined) insertData.efficiency_score = Math.round(efficiencyScore);

    if (playerId) {
      insertData.player_id = playerId;
    } else {
      insertData.guest_fingerprint = guestFingerprint;
    }

    const { data, error } = await supabase
      .from('daily_word_hunt_attempts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        logger.info('API', `[WordHunt Submit] Already submitted for ${puzzleDate}/${language}`);
        res.json({ success: true, alreadySubmitted: true });
        return;
      }
      logger.error('API', `Word Hunt submit error: ${error.message}`);
      res.status(500).json({ error: 'Failed to submit result' });
      return;
    }

    logger.info('API', `[WordHunt Submit] SUCCESS: id=${data.id}, playerType=${playerId ? 'authenticated' : 'guest'}, displayName=${displayName}, solved=${solved}`);

    // Mark daily mission as complete for authenticated users (fire-and-forget)
    if (playerId) {
      completeMission(playerId, 'word_hunt').catch((err) => {
        logger.error('API', `[WordHunt] Daily mission update failed for ${playerId}: ${(err as Error).message}`);
      });
    }

    // Update profile stats for authenticated users (all attempts count for games played)
    if (playerId) {
      try {
        const scoreToAdd = solved && efficiencyScore !== undefined && efficiencyScore > 0
          ? Math.round(efficiencyScore)
          : 0;
        // Atomic increment to prevent multi-tab race conditions
        const { error: updateError } = await supabase.rpc('increment_profile_stats', {
          p_user_id: playerId,
          p_score: scoreToAdd,
          p_games: 1,
        });

        if (updateError) {
          // Fallback to non-atomic update if RPC doesn't exist yet
          if (updateError.code === '42883' || updateError.message?.includes('function')) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('total_score, total_games')
              .eq('id', playerId)
              .single();

            if (profile) {
              await supabase
                .from('profiles')
                .update({
                  total_score: (profile.total_score || 0) + scoreToAdd,
                  total_games: (profile.total_games || 0) + 1,
                  last_game_at: new Date().toISOString(),
                })
                .eq('id', playerId);
            }
          } else {
            logger.error('API', `[WordHunt] Failed to update profile stats for ${playerId}: ${updateError.message}`);
          }
        } else {
          logger.info('API', `[WordHunt] Updated profile stats atomically for ${playerId}: +${scoreToAdd} points`);
        }
      } catch (scoreError) {
        logger.error('API', `[WordHunt] Failed to update profile stats for ${playerId}: ${(scoreError as Error).message}`);
      }
    }

    res.json({ success: true, alreadySubmitted: false, data });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Hunt submit error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/word-hunt/leaderboard/:date/:language
 */
router.get('/leaderboard/:date/:language', async (req: Request<LeaderboardParams, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    const { date, language } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50') || 50, 100);

    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('API', 'Word Hunt leaderboard: Supabase client is null despite isSupabaseConfigured() returning true');
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const { data, error } = await supabase
      .from('daily_word_hunt_leaderboard')
      .select('*')
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('solved', true)
      .not('player_id', 'is', null)
      .order('rank_position', { ascending: true })
      .limit(limit);

    if (error) {
      const errorDetails = JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint });
      logger.error('API', `Word Hunt leaderboard error: ${errorDetails}`);

      const isAuthError =
        error.message?.includes('401') ||
        error.message?.includes('JWT') ||
        error.message?.includes('Invalid API key') ||
        error.code === 'PGRST301' ||
        error.code === 'PGRST302' ||
        error.code === 'PGRST303';

      if (isAuthError) {
        logger.error('API', 'Supabase authentication failed - check SUPABASE_SERVICE_ROLE_KEY environment variable');
        res.status(503).json({ error: 'Database authentication failed', hint: 'The service role key may be invalid or expired. Check server logs.' });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    const { count, error: countError } = await supabase
      .from('daily_word_hunt_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('solved', true)
      .not('player_id', 'is', null);

    if (countError) {
      logger.warn('API', `Word Hunt leaderboard count error: ${countError.message || countError.code || 'Unknown'}`, { code: countError.code, details: countError.details, hint: countError.hint });
    }

    const { count: totalPlayersCount, error: totalPlayersError } = await supabase
      .from('daily_word_hunt_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language);

    if (totalPlayersError) {
      logger.debug('API', `Word Hunt total players count error: ${totalPlayersError.message || totalPlayersError.code || 'Unknown'}`);
    }

    const { count: totalSolvedCount, error: totalSolvedError } = await supabase
      .from('daily_word_hunt_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('solved', true);

    if (totalSolvedError) {
      logger.warn('API', `Word Hunt total solved count error: ${totalSolvedError.message || totalSolvedError.code || 'Unknown'}`, { code: totalSolvedError.code, details: totalSolvedError.details });
    }

    const { count: guestSolvedCount, error: guestSolvedError } = await supabase
      .from('daily_word_hunt_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('solved', true)
      .is('player_id', null)
      .not('guest_fingerprint', 'is', null);

    if (guestSolvedError) {
      logger.warn('API', `Word Hunt guest solved count error: ${guestSolvedError.message || guestSolvedError.code || 'Unknown'}`, { code: guestSolvedError.code, details: guestSolvedError.details });
    }

    // Re-number rank_position sequentially among authenticated players only.
    // The view's rank_position includes guests, so post-filter rows would otherwise
    // keep gaps (e.g. only auth player showing as rank #2 because rank #1 was a guest).
    const rerankedData = (data || []).map((row, index) => ({
      ...row,
      rank_position: index + 1,
    }));

    const dataLength = rerankedData.length;
    const queryCount = count ?? 0;
    const totalParticipants = Math.max(queryCount, dataLength);
    const totalPlayers = totalPlayersCount ?? 0;
    const totalSolved = totalSolvedCount ?? 0;
    const guestPlayerCount = guestSolvedCount ?? 0;

    logger.info('API', `[WordHunt Leaderboard] ${date}/${language}: leaderboard=${totalParticipants}, totalPlayers=${totalPlayers}, totalSolved=${totalSolved}, guests=${guestPlayerCount}`);

    res.json({
      data: rerankedData,
      totalParticipants,
      totalPlayers,
      totalSolved,
      guestPlayerCount,
      date,
      language
    });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Hunt leaderboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/word-hunt/stats/:date/:language
 */
router.get('/stats/:date/:language', async (req: Request<WordHuntStatsParams>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const { date, language } = req.params;
    const playerId = req.query.playerId as string | undefined;
    const guestFingerprint = req.query.guestFingerprint as string | undefined;

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const { data: stats, error: statsError } = await supabase
      .from('daily_word_hunt_stats')
      .select('*')
      .eq('puzzle_date', date)
      .eq('language', language)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      logger.error('API', `Word Hunt stats error: ${statsError.message}`);
      res.status(500).json({ error: 'Failed to fetch stats' });
      return;
    }

    const attemptDistribution: Record<string, number> = {};
    if (stats) {
      for (let i = 1; i <= 10; i++) {
        attemptDistribution[i.toString()] = stats[`solved_in_${i}`] || 0;
      }
    }

    const response: WordHuntStatsResponse = {
      totalPlayers: stats?.total_players || 0,
      solvedCount: stats?.solved_count || 0,
      solveRate: stats?.solve_rate || 0,
      attemptDistribution,
      avgAttemptsSolved: stats?.avg_attempts_solved || null,
      avgLifeRemaining: stats?.avg_life_remaining || null,
      avgEfficiencyScore: stats?.avg_efficiency_score || null,
      maxEfficiencyScore: stats?.max_efficiency_score || null,
      avgWordsDiscovered: stats?.avg_words_discovered || null
    };

    if (playerId || guestFingerprint) {
      let yourAttemptQuery = supabase
        .from('daily_word_hunt_attempts')
        .select('solved, attempts_used, efficiency_score')
        .eq('puzzle_date', date)
        .eq('language', language);

      if (playerId) {
        yourAttemptQuery = yourAttemptQuery.eq('player_id', playerId);
      } else {
        yourAttemptQuery = yourAttemptQuery.eq('guest_fingerprint', guestFingerprint);
      }

      const { data: yourAttempt } = await yourAttemptQuery.single();

      if (yourAttempt && yourAttempt.solved && stats) {
        // Compute auth-only rank: count auth players ranked above this player + 1.
        // The view's rank_position includes guests, so using it directly would
        // disagree with the reranked leaderboard list.
        let rankQuery = supabase
          .from('daily_word_hunt_leaderboard')
          .select('rank_position')
          .eq('puzzle_date', date)
          .eq('language', language);

        if (playerId) {
          rankQuery = rankQuery.eq('player_id', playerId);
        } else {
          rankQuery = rankQuery.eq('guest_fingerprint', guestFingerprint);
        }

        const { data: rankData } = await rankQuery.single();
        let rank: number | undefined;
        if (rankData && playerId) {
          const { count: authPlayersAbove } = await supabase
            .from('daily_word_hunt_leaderboard')
            .select('*', { count: 'exact', head: true })
            .eq('puzzle_date', date)
            .eq('language', language)
            .not('player_id', 'is', null)
            .lt('rank_position', rankData.rank_position);

          rank = (authPlayersAbove ?? 0) + 1;
        } else if (rankData) {
          rank = rankData.rank_position;
        }

        let percentile = 0;
        if (rank && stats.total_players > 0) {
          const playersBehindYou = stats.total_players - rank;
          percentile = Math.round((playersBehindYou / stats.total_players) * 100);
        }

        let efficiencyPercentile: number | undefined;
        const totalSolved = stats.solved_count;
        if (yourAttempt.efficiency_score !== undefined && yourAttempt.efficiency_score !== null) {
          const { count: worseEfficiency } = await supabase
            .from('daily_word_hunt_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('puzzle_date', date)
            .eq('language', language)
            .eq('solved', true)
            .lt('efficiency_score', yourAttempt.efficiency_score);

          if (worseEfficiency !== null && totalSolved > 0) {
            efficiencyPercentile = Math.round((worseEfficiency / totalSolved) * 100);
          }
        }

        response.yourStats = {
          solved: yourAttempt.solved,
          attemptsUsed: yourAttempt.attempts_used,
          percentile,
          rank,
          efficiencyScore: yourAttempt.efficiency_score,
          efficiencyPercentile
        };
      } else if (yourAttempt) {
        response.yourStats = {
          solved: yourAttempt.solved,
          attemptsUsed: yourAttempt.attempts_used,
          percentile: 0,
          efficiencyScore: yourAttempt.efficiency_score
        };
      }
    }

    res.json(response);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Hunt stats error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/word-hunt/check-played/:date/:language
 */
router.get('/check-played/:date/:language', async (req: Request<{ date: string; language: string }, unknown, unknown, { playerId?: string; guestFingerprint?: string }>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      // Return error instead of false — prevents replay when DB is down
      res.status(503).json({ error: 'Service temporarily unavailable', hasPlayed: null });
      return;
    }

    const { date, language } = req.params;
    const playerId = req.query.playerId as string | undefined;
    const guestFingerprint = req.query.guestFingerprint as string | undefined;

    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    if (!playerId && !guestFingerprint) {
      res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      res.json({ hasPlayed: false });
      return;
    }

    let query = supabase
      .from('daily_word_hunt_attempts')
      .select('id, solved, attempts_used, efficiency_score, words_discovered, life_remaining, target_word, attempt_words, completed_at, clue_tokens_earned, clue_tokens_spent, hints_unlocked')
      .eq('puzzle_date', date)
      .eq('language', language);

    if (playerId) {
      query = query.eq('player_id', playerId);
    } else {
      query = query.eq('guest_fingerprint', guestFingerprint);
    }

    const { data: existingAttempt, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      logger.error('API', `Check played error: ${error.message}`);
      res.status(500).json({ error: 'Failed to check attempt status' });
      return;
    }

    if (existingAttempt) {
      let streakData = { currentStreak: 0, longestStreak: 0 };

      if (playerId) {
        const { data: playerStats } = await supabase
          .from('word_hunt_player_stats')
          .select('current_streak, longest_streak')
          .eq('player_id', playerId)
          .single();

        if (playerStats) {
          streakData = {
            currentStreak: playerStats.current_streak || 0,
            longestStreak: playerStats.longest_streak || 0
          };
        }
      }

      res.json({
        hasPlayed: true,
        result: {
          solved: existingAttempt.solved,
          attemptsUsed: existingAttempt.attempts_used,
          efficiencyScore: existingAttempt.efficiency_score,
          wordsDiscovered: existingAttempt.words_discovered,
          lifeRemaining: existingAttempt.life_remaining,
          targetWord: existingAttempt.target_word,
          attempts: existingAttempt.attempt_words,
          completedAt: existingAttempt.completed_at,
          clueTokensEarned: existingAttempt.clue_tokens_earned ?? 0,
          clueTokensSpent: existingAttempt.clue_tokens_spent ?? 0,
          hintsUnlocked: existingAttempt.hints_unlocked ?? 0
        },
        streak: streakData
      });
    } else {
      res.json({ hasPlayed: false });
    }
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Check played error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/word-hunt/alltime-leaderboard/:language
 */
router.get('/alltime-leaderboard/:language', async (req: Request<{ language: string }, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    const { language } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50') || 50, 100);

    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      logger.error('API', 'Word Hunt all-time leaderboard: Supabase client is null despite isSupabaseConfigured() returning true');
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const { data, error } = await supabase
      .from('word_hunt_alltime_leaderboard')
      .select('*')
      .eq('language', language)
      .order('rank_position', { ascending: true })
      .limit(limit);

    if (error) {
      const errorDetails = JSON.stringify({ message: error.message, code: error.code, details: error.details, hint: error.hint });
      logger.error('API', `Word Hunt all-time leaderboard error: ${errorDetails}`);

      const isAuthError =
        error.message?.includes('401') ||
        error.message?.includes('JWT') ||
        error.message?.includes('Invalid API key') ||
        error.code === 'PGRST301' ||
        error.code === 'PGRST302' ||
        error.code === 'PGRST303';

      if (isAuthError) {
        logger.error('API', 'Supabase authentication failed - check SUPABASE_SERVICE_ROLE_KEY environment variable');
        res.status(503).json({ error: 'Database authentication failed', hint: 'The service role key may be invalid or expired. Check server logs.' });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    const { count, error: countError } = await supabase
      .from('word_hunt_alltime_leaderboard')
      .select('*', { count: 'exact', head: true })
      .eq('language', language);

    if (countError) {
      logger.warn('API', `Word Hunt all-time leaderboard count error: ${countError.message}`);
    }

    res.json({
      data: data || [],
      totalParticipants: count || data?.length || 0,
      language
    });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Hunt all-time leaderboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

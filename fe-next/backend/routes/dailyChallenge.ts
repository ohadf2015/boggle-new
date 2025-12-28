/**
 * Daily Challenge API Routes
 * Handles /api/daily-challenge/* endpoints
 */

import express, { Request, Response, Router } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
import logger from '../utils/logger';

const router: Router = express.Router();

// ==================== Types ====================

interface LeaderboardParams {
  date: string;
  language: string;
}

interface LeaderboardQuery {
  limit?: string;
}

interface LeaderboardEntry {
  rank_position: number;
  player_id?: string;
  guest_fingerprint?: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  score: number;
  word_count: number;
  longest_word?: string;
  time_seconds?: number;
}

interface LeaderboardResponse {
  data: LeaderboardEntry[];
  totalParticipants: number;
  date: string;
  language: string;
  error?: string;
}

interface SubmitRequest extends Request {
  body: {
    puzzleDate?: string;
    puzzleNumber?: number;
    language?: string;
    playerId?: string;
    guestFingerprint?: string;
    displayName?: string;
    avatarEmoji?: string;
    avatarColor?: string;
    score?: number;
    wordCount?: number;
    wordsByLength?: Record<string, number>;
    timeSeconds?: number;
    longestWord?: string;
  };
}

interface SubmitResponse {
  success: boolean;
  alreadySubmitted?: boolean;
  data?: AttemptData;
  rank?: number | null;
  error?: string;
}

interface AttemptData {
  id: string;
  puzzle_date: string;
  puzzle_number: number;
  language: string;
  score: number;
  word_count: number;
  words_by_length: Record<string, number>;
  time_seconds: number;
  longest_word: string | null;
  longest_word_length: number | null;
  completed_at: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  player_id?: string;
  guest_fingerprint?: string;
}

interface AttemptInsertData {
  puzzle_date: string;
  puzzle_number: number;
  language: string;
  score: number;
  word_count: number;
  words_by_length: Record<string, number>;
  time_seconds: number;
  longest_word: string | null;
  longest_word_length: number | null;
  completed_at: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  player_id?: string;
  guest_fingerprint?: string;
}

interface PuzzleStats {
  total_attempts: number;
  total_completions: number;
  average_score: number;
  average_words: number;
  top_score: number;
}

interface StatsResponse {
  data: PuzzleStats;
  error?: string;
}

const VALID_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'] as const;
type ValidLanguage = typeof VALID_LANGUAGES[number];

/**
 * GET /api/daily-challenge/leaderboard/:date/:language
 * Get daily challenge leaderboard for a specific date and language
 *
 * @param date - Date in YYYY-MM-DD format
 * @param language - Language code (en, he, sv, ja, es)
 */
router.get('/leaderboard/:date/:language', async (req: Request<LeaderboardParams, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    const { date, language } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50') || 50, 100);

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    // Validate language
    if (!VALID_LANGUAGES.includes(language as ValidLanguage)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const supabase = getSupabase();

    // Fetch leaderboard from the view
    const { data, error } = await supabase
      .from('daily_puzzle_leaderboard')
      .select('*')
      .eq('puzzle_date', date)
      .eq('language', language)
      .order('rank_position', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('API', `Daily leaderboard error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    // Get total participant count
    const { count, error: countError } = await supabase
      .from('daily_puzzle_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language);

    if (countError) {
      logger.warn('API', `Daily leaderboard count error: ${countError.message}`);
    }

    res.json({
      data: data || [],
      totalParticipants: count || data?.length || 0,
      date,
      language
    } as LeaderboardResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Daily leaderboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/daily-challenge/submit
 * Submit a daily challenge result
 */
router.post('/submit', async (req: SubmitRequest, res: Response): Promise<void> => {
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
      score,
      wordCount,
      wordsByLength,
      timeSeconds,
      longestWord
    } = req.body;

    // Validate required fields
    if (!puzzleDate || !puzzleNumber || !language || score === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Must have either playerId or guestFingerprint
    if (!playerId && !guestFingerprint) {
      res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
      return;
    }

    const supabase = getSupabase();

    // Check if already submitted
    let existingQuery = supabase
      .from('daily_puzzle_attempts')
      .select('id')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language);

    if (playerId) {
      existingQuery = existingQuery.eq('player_id', playerId);
    } else {
      existingQuery = existingQuery.eq('guest_fingerprint', guestFingerprint);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      // Already submitted - return existing entry
      res.json({ success: true, alreadySubmitted: true } as SubmitResponse);
      return;
    }

    // Insert new attempt
    const insertData: AttemptInsertData = {
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      language,
      score,
      word_count: wordCount || 0,
      words_by_length: wordsByLength || {},
      time_seconds: timeSeconds || 0,
      longest_word: longestWord || null,
      longest_word_length: longestWord ? longestWord.length : null,
      completed_at: new Date().toISOString(),
      display_name: displayName || 'Anonymous',
      avatar_emoji: avatarEmoji || '🎯',
      avatar_color: avatarColor || '#6366f1'
    };

    if (playerId) {
      insertData.player_id = playerId;
    } else {
      insertData.guest_fingerprint = guestFingerprint;
    }

    const { data, error } = await supabase
      .from('daily_puzzle_attempts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation (already submitted)
      if (error.code === '23505') {
        res.json({ success: true, alreadySubmitted: true } as SubmitResponse);
        return;
      }
      logger.error('API', `Daily challenge submit error: ${error.message}`);
      res.status(500).json({ error: 'Failed to submit result' });
      return;
    }

    // Get the player's rank
    const { data: rankData } = await supabase
      .from('daily_puzzle_leaderboard')
      .select('rank_position')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language)
      .eq(playerId ? 'player_id' : 'guest_fingerprint', playerId || guestFingerprint)
      .single();

    res.json({
      success: true,
      data,
      rank: rankData?.rank_position || null
    } as SubmitResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Daily challenge submit error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/stats/:date/:language
 * Get aggregate stats for a daily challenge
 */
router.get('/stats/:date/:language', async (req: Request<LeaderboardParams>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const { date, language } = req.params;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('daily_puzzles')
      .select('*')
      .eq('puzzle_date', date)
      .eq('language', language)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('API', `Daily stats error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch stats' });
      return;
    }

    res.json({
      data: data || {
        total_attempts: 0,
        total_completions: 0,
        average_score: 0,
        average_words: 0,
        top_score: 0
      }
    } as StatsResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Daily stats error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== Word Hunt Routes ====================

interface WordHuntSubmitRequest extends Request {
  body: {
    puzzleDate?: string;
    puzzleNumber?: number;
    language?: string;
    playerId?: string;
    guestFingerprint?: string;
    displayName?: string;
    avatarEmoji?: string;
    avatarColor?: string;
    solved?: boolean;
    attemptsUsed?: number;
    targetWord?: string;
    attemptWords?: Array<{
      word: string;
      feedback: Array<{
        letter: string;
        feedback: 'green' | 'yellow' | 'gray';
        position: number;
      }>;
      timestamp: number;
    }>;
    // Survival mode fields
    wordsDiscovered?: Array<{
      word: string;
      timestamp: number;
      lifeGained: number;
      tokensGained: number;
    }>;
    lifeRemaining?: number;
    clueTokensEarned?: number;
    clueTokensSpent?: number;
    hintsUnlocked?: number;
    efficiencyScore?: number;
  };
}

interface WordHuntStatsParams {
  date: string;
  language: string;
}

interface WordHuntStatsResponse {
  totalPlayers: number;
  solvedCount: number;
  solveRate: number;
  attemptDistribution: Record<string, number>;
  avgAttemptsSolved: number | null;
  // Survival mode stats
  avgLifeRemaining?: number | null;
  avgEfficiencyScore?: number | null;
  maxEfficiencyScore?: number | null;
  avgWordsDiscovered?: number | null;
  yourStats?: {
    solved: boolean;
    attemptsUsed: number;
    percentile: number;
    efficiencyScore?: number;
    efficiencyPercentile?: number;
  };
}

/**
 * POST /api/daily-challenge/word-hunt/submit
 * Submit a Word Hunt daily challenge result
 */
router.post('/word-hunt/submit', async (req: WordHuntSubmitRequest, res: Response): Promise<void> => {
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
    if (!puzzleDate || !puzzleNumber || !language || solved === undefined || !attemptsUsed || !targetWord || !attemptWords) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate attempts range
    if (attemptsUsed < 1 || attemptsUsed > 10) {
      res.status(400).json({ error: 'Attempts must be between 1 and 10' });
      return;
    }

    // Must have either playerId or guestFingerprint
    if (!playerId && !guestFingerprint) {
      res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
      return;
    }

    const supabase = getSupabase();

    // Check if already submitted
    let existingQuery = supabase
      .from('daily_word_hunt_attempts')
      .select('id')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language);

    if (playerId) {
      existingQuery = existingQuery.eq('player_id', playerId);
    } else {
      existingQuery = existingQuery.eq('guest_fingerprint', guestFingerprint);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      // Already submitted
      res.json({ success: true, alreadySubmitted: true });
      return;
    }

    // Insert new Word Hunt attempt
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
      avatar_color: avatarColor || '#6366f1'
    };

    // Add survival mode fields if present
    if (wordsDiscovered !== undefined) {
      insertData.words_discovered = wordsDiscovered;
    }
    if (lifeRemaining !== undefined) {
      insertData.life_remaining = lifeRemaining;
    }
    if (clueTokensEarned !== undefined) {
      insertData.clue_tokens_earned = clueTokensEarned;
    }
    if (clueTokensSpent !== undefined) {
      insertData.clue_tokens_spent = clueTokensSpent;
    }
    if (hintsUnlocked !== undefined) {
      insertData.hints_unlocked = hintsUnlocked;
    }
    if (efficiencyScore !== undefined) {
      insertData.efficiency_score = efficiencyScore;
    }

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
      // Check for unique constraint violation
      if (error.code === '23505') {
        res.json({ success: true, alreadySubmitted: true });
        return;
      }
      logger.error('API', `Word Hunt submit error: ${error.message}`);
      res.status(500).json({ error: 'Failed to submit result' });
      return;
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Hunt submit error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/word-hunt/stats/:date/:language
 * Get Word Hunt aggregate statistics (Wordle-style)
 */
router.get('/word-hunt/stats/:date/:language', async (req: Request<WordHuntStatsParams>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const { date, language } = req.params;
    const playerId = req.query.playerId as string | undefined;
    const guestFingerprint = req.query.guestFingerprint as string | undefined;

    const supabase = getSupabase();

    // Fetch aggregate stats from the view
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

    // Build attempt distribution object
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
      // Survival mode stats
      avgLifeRemaining: stats?.avg_life_remaining || null,
      avgEfficiencyScore: stats?.avg_efficiency_score || null,
      maxEfficiencyScore: stats?.max_efficiency_score || null,
      avgWordsDiscovered: stats?.avg_words_discovered || null
    };

    // If playerId or guestFingerprint provided, get their personal stats
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
        // Calculate percentile (better than X% of players)
        let betterThan = 0;
        const totalSolved = stats.solved_count;

        if (totalSolved > 0) {
          // Count how many players used more attempts
          for (let i = yourAttempt.attempts_used + 1; i <= 10; i++) {
            betterThan += stats[`solved_in_${i}`] || 0;
          }
          // Add failed attempts
          betterThan += stats.failed_count || 0;

          const percentile = Math.round((betterThan / stats.total_players) * 100);

          // Calculate efficiency percentile if efficiency_score exists
          let efficiencyPercentile: number | undefined;
          if (yourAttempt.efficiency_score !== undefined && yourAttempt.efficiency_score !== null) {
            // Count how many solved players have lower efficiency score
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
            efficiencyScore: yourAttempt.efficiency_score,
            efficiencyPercentile
          };
        }
      } else if (yourAttempt) {
        response.yourStats = {
          solved: yourAttempt.solved,
          attemptsUsed: yourAttempt.attempts_used,
          percentile: 0, // Didn't solve it
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

export default router;

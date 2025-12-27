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

export default router;

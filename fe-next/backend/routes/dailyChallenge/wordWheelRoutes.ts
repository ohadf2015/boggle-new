/**
 * Word Wheel Daily Challenge Routes
 * Handles /api/daily-challenge/word-wheel/* endpoints
 */

import express, { Request, Response, Router } from 'express';
import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import logger from '../../utils/logger';

import {
  type LeaderboardParams,
  type LeaderboardQuery,
} from './types';
import {
  isValidDateFormat,
  isValidLanguage,
} from './utils';

const router: Router = express.Router();

// ==========================================
// Types
// ==========================================

interface WordWheelSubmitBody {
  puzzleDate?: string;
  puzzleNumber?: number;
  language?: string;
  playerId?: string;
  guestFingerprint?: string;
  displayName?: string;
  avatarEmoji?: string;
  avatarColor?: string;
  avatarImage?: string;
  countryCode?: string;
  score?: number;
  wordCount?: number;
  wordsFound?: string[];
  longestWord?: string;
  timeSeconds?: number;
  centerLetter?: string;
}

// ==========================================
// POST /api/daily-challenge/word-wheel/submit
// ==========================================

router.post('/submit', async (req: Request<unknown, unknown, WordWheelSubmitBody>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const {
      puzzleDate, puzzleNumber, language, playerId, guestFingerprint,
      displayName, avatarEmoji, avatarColor, avatarImage,
      countryCode, score, wordCount, wordsFound, longestWord, timeSeconds, centerLetter,
    } = req.body;

    if (!puzzleDate || !puzzleNumber || !language || score === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!playerId && !guestFingerprint) {
      res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const insertData: Record<string, unknown> = {
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      language,
      score,
      word_count: wordCount || 0,
      words_found: wordsFound || [],
      longest_word: longestWord || null,
      longest_word_length: longestWord ? longestWord.length : null,
      time_seconds: timeSeconds || 0,
      center_letter: centerLetter || null,
      completed_at: new Date().toISOString(),
      display_name: displayName || 'Anonymous',
      avatar_emoji: avatarEmoji || '🎯',
      avatar_color: avatarColor || '#6366f1',
      avatar_image: avatarImage || null,
      country_code: countryCode || null,
    };

    if (playerId) {
      insertData.player_id = playerId;
    } else {
      insertData.guest_fingerprint = guestFingerprint;
    }

    const { data, error } = await supabase
      .from('daily_word_wheel_attempts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        res.json({ success: true, alreadySubmitted: true });
        return;
      }
      logger.error('API', `Word Wheel submit error: ${error.message}`);
      res.status(500).json({ error: 'Failed to submit result' });
      return;
    }

    // Compute rank among authenticated players
    let rank: number | null = null;
    if (playerId) {
      const { count: playersAbove } = await supabase
        .from('daily_word_wheel_leaderboard')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_date', puzzleDate)
        .eq('language', language)
        .not('player_id', 'is', null)
        .gt('score', score);

      rank = (playersAbove ?? 0) + 1;
    }

    res.json({ success: true, alreadySubmitted: false, data, rank });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Wheel submit error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// GET /api/daily-challenge/word-wheel/leaderboard/:date/:language
// ==========================================

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
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const { data, error } = await supabase
      .from('daily_word_wheel_leaderboard')
      .select('*')
      .eq('puzzle_date', date)
      .eq('language', language)
      .not('player_id', 'is', null)
      .order('rank_position', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('API', `Word Wheel leaderboard error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    // Re-rank after filtering out guests
    const rerankedData = (data || []).map((row, index) => ({
      ...row,
      rank_position: index + 1,
    }));

    const { count: totalCount } = await supabase
      .from('daily_word_wheel_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language);

    const { count: guestCount } = await supabase
      .from('daily_word_wheel_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language)
      .is('player_id', null)
      .not('guest_fingerprint', 'is', null);

    res.json({
      data: rerankedData,
      totalParticipants: rerankedData.length,
      totalAttempts: totalCount ?? 0,
      guestPlayerCount: guestCount ?? 0,
      date,
      language,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Wheel leaderboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

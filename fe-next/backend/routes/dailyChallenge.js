/**
 * Daily Challenge API Routes
 * Handles /api/daily-challenge/* endpoints
 */

const express = require('express');
const router = express.Router();
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
const logger = require('../utils/logger');

/**
 * GET /api/daily-challenge/leaderboard/:date/:language
 * Get daily challenge leaderboard for a specific date and language
 *
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} language - Language code (en, he, sv, ja, es)
 */
router.get('/leaderboard/:date/:language', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Leaderboard service not available' });
    }

    const { date, language } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Validate language
    const validLanguages = ['en', 'he', 'sv', 'ja', 'es'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({ error: 'Invalid language code' });
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
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
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
    });
  } catch (error) {
    logger.error('API', `Daily leaderboard error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/daily-challenge/submit
 * Submit a daily challenge result
 */
router.post('/submit', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Service not available' });
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
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Must have either playerId or guestFingerprint
    if (!playerId && !guestFingerprint) {
      return res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
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
      return res.json({ success: true, alreadySubmitted: true });
    }

    // Insert new attempt
    const insertData = {
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      language,
      score,
      word_count: wordCount || 0,
      words_by_length: wordsByLength || {},
      time_seconds: timeSeconds || 0,
      longest_word: longestWord || null,
      longest_word_length: longestWord ? longestWord.length : null,
      completed_at: new Date().toISOString()
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
        return res.json({ success: true, alreadySubmitted: true });
      }
      logger.error('API', `Daily challenge submit error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to submit result' });
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
    });
  } catch (error) {
    logger.error('API', `Daily challenge submit error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/stats/:date/:language
 * Get aggregate stats for a daily challenge
 */
router.get('/stats/:date/:language', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Service not available' });
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
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }

    res.json({
      data: data || {
        total_attempts: 0,
        total_completions: 0,
        average_score: 0,
        average_words: 0,
        top_score: 0
      }
    });
  } catch (error) {
    logger.error('API', `Daily stats error: ${error.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

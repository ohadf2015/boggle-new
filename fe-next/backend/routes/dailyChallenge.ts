/**
 * Daily Challenge API Routes
 * Handles /api/daily-challenge/* endpoints
 */

import express, { Request, Response, Router } from 'express';

const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
import logger from '../utils/logger';
import { generateDailyPuzzle, generateDailyPuzzleAsync, getPuzzleNumber } from '../../utils/dailyChallenge';
import { isDictionaryWord } from '../dictionary';
import { isWordCommunityValid } from '../modules/communityWordManager';
import type { Language } from '../../types';

/**
 * Check if a word is valid for daily challenge submission.
 * Valid means: in dictionary OR community-validated (6+ net votes).
 * Pending words (awaiting community validation) are NOT valid.
 */
function isWordValidForDailyChallenge(word: string, language: Language): boolean {
  // Check static dictionary first
  const inDictionary = isDictionaryWord(word, language);
  if (inDictionary === true) {
    return true;
  }

  // Check community-validated words (6+ net votes)
  if (isWordCommunityValid(word, language)) {
    return true;
  }

  // Pending words and unknown words are NOT valid
  return false;
}

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
    avatarImage?: string;
    profilePictureUrl?: string;
    countryCode?: string;
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
  avatar_image?: string;
  profile_picture_url?: string;
  country_code?: string;
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
 * GET /api/daily-challenge/puzzle/:date/:language
 * Get the daily puzzle for a specific date and language
 * This endpoint returns the AI-selected word if available, otherwise deterministic
 */
router.get('/puzzle/:date/:language', async (req: Request<LeaderboardParams>, res: Response): Promise<void> => {
  try {
    const { date, language } = req.params;

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

    // Generate puzzle with async version (checks DB for AI-selected word)
    const puzzle = await generateDailyPuzzleAsync(date, language as Language);

    res.json({
      grid: puzzle.grid,
      targetWord: puzzle.targetWord,
      puzzleDate: puzzle.puzzleDate,
      puzzleNumber: puzzle.puzzleNumber,
      language: puzzle.language
    });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Daily puzzle error: ${err.message}`);

    // Fall back to sync version on error
    try {
      const { date, language } = req.params;
      const puzzle = generateDailyPuzzle(date, language as Language);
      res.json({
        grid: puzzle.grid,
        targetWord: puzzle.targetWord,
        puzzleDate: puzzle.puzzleDate,
        puzzleNumber: puzzle.puzzleNumber,
        language: puzzle.language
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Failed to generate puzzle' });
    }
  }
});

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
    // Filter: only show authenticated users (no guests)
    const { data, error } = await supabase
      .from('daily_puzzle_leaderboard')
      .select('*')
      .eq('puzzle_date', date)
      .eq('language', language)
      .not('player_id', 'is', null)
      .order('rank_position', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('API', `Daily leaderboard error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    // Get total participant count (only authenticated users for leaderboard)
    const { count, error: countError } = await supabase
      .from('daily_puzzle_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language)
      .not('player_id', 'is', null);

    if (countError) {
      logger.warn('API', `Daily leaderboard count error: ${countError.message}`);
    }

    // Get total attempts count (including guests and all attempts)
    const { count: totalCount, error: totalCountError } = await supabase
      .from('daily_puzzle_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language);

    if (totalCountError) {
      logger.warn('API', `Daily leaderboard total count error: ${totalCountError.message}`);
    }

    // Calculate participant count - ensure we show at least as many as we have data rows
    const dataLength = data?.length || 0;
    const queryCount = count ?? 0;
    const totalParticipants = Math.max(queryCount, dataLength);

    res.json({
      data: data || [],
      totalParticipants,
      totalAttempts: totalCount ?? 0,
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
      avatarImage,
      profilePictureUrl,
      countryCode,
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
      avatar_color: avatarColor || '#6366f1',
      avatar_image: avatarImage || undefined,
      profile_picture_url: profilePictureUrl || undefined,
      country_code: countryCode || undefined
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
    countryCode?: string;
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
    rank?: number;
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

    // Debug logging for Word Hunt submission
    logger.info('API', `[WordHunt Submit] Received: playerId=${playerId || 'null'}, guestFingerprint=${guestFingerprint ? guestFingerprint.substring(0, 8) + '...' : 'null'}, displayName=${displayName}, solved=${solved}, attempts=${attemptsUsed}`);

    // Server-side validation: Verify target word matches expected puzzle
    try {
      // Use async version to check database for AI-selected word first
      const expectedPuzzle = await generateDailyPuzzleAsync(puzzleDate, language as Language);
      const expectedTargetWord = expectedPuzzle.targetWord.toUpperCase();
      const submittedTargetWord = targetWord.toUpperCase();

      if (expectedTargetWord !== submittedTargetWord) {
        logger.warn('API', `Word Hunt validation failed: expected ${expectedTargetWord}, got ${submittedTargetWord} for ${puzzleDate}/${language}`);
        res.status(400).json({ error: 'Invalid target word for this puzzle' });
        return;
      }

      // Verify puzzle number matches
      const expectedPuzzleNumber = getPuzzleNumber(puzzleDate);
      if (expectedPuzzleNumber !== puzzleNumber) {
        logger.warn('API', `Word Hunt validation failed: expected puzzle #${expectedPuzzleNumber}, got #${puzzleNumber}`);
        res.status(400).json({ error: 'Invalid puzzle number' });
        return;
      }

      // If solved, verify the last attempt matches the target word
      if (solved && attemptWords && attemptWords.length > 0) {
        const lastAttempt = attemptWords[attemptWords.length - 1];
        if (lastAttempt.word.toUpperCase() !== expectedTargetWord) {
          logger.warn('API', `Word Hunt validation failed: solved=true but last attempt "${lastAttempt.word}" doesn't match target "${expectedTargetWord}"`);
          res.status(400).json({ error: 'Invalid solve claim' });
          return;
        }
      }

      // Validate target word is in dictionary or community-validated
      if (!isWordValidForDailyChallenge(expectedTargetWord, language as Language)) {
        logger.warn('API', `Word Hunt validation failed: target word "${expectedTargetWord}" is not valid for language ${language}`);
        res.status(400).json({ error: 'Invalid target word - not in dictionary' });
        return;
      }

      // Validate all attempt words are in dictionary or community-validated
      // Pending words (awaiting validation) are rejected
      if (attemptWords && attemptWords.length > 0) {
        const invalidWords: string[] = [];
        for (const attempt of attemptWords) {
          const wordUpper = attempt.word.toUpperCase();
          if (!isWordValidForDailyChallenge(wordUpper, language as Language)) {
            invalidWords.push(wordUpper);
          }
        }
        if (invalidWords.length > 0) {
          logger.warn('API', `Word Hunt validation failed: invalid words submitted: ${invalidWords.join(', ')} for language ${language}`);
          res.status(400).json({
            error: 'Invalid words submitted - not in dictionary',
            invalidWords
          });
          return;
        }
      }
    } catch (validationError) {
      logger.error('API', `Word Hunt validation error: ${(validationError as Error).message}`);
      // Continue without blocking - validation errors shouldn't prevent submission
      // Just log for monitoring
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
      avatar_color: avatarColor || '#6366f1',
      country_code: countryCode || undefined
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
        logger.info('API', `[WordHunt Submit] Already submitted for ${puzzleDate}/${language}`);
        res.json({ success: true, alreadySubmitted: true });
        return;
      }
      logger.error('API', `Word Hunt submit error: ${error.message}`);
      res.status(500).json({ error: 'Failed to submit result' });
      return;
    }

    // Debug: Log successful insertion
    logger.info('API', `[WordHunt Submit] SUCCESS: id=${data.id}, playerType=${playerId ? 'authenticated' : 'guest'}, displayName=${displayName}, solved=${solved}`);

    // Update leaderboard score for authenticated users who solved the challenge
    // The efficiency score (0-100) is added to their total_score
    // The database trigger will automatically sync to the leaderboard table
    if (playerId && solved && efficiencyScore !== undefined && efficiencyScore > 0) {
      try {
        const scoreToAdd = Math.round(efficiencyScore); // Round to integer

        // Fetch current score and update atomically
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_score')
          .eq('id', playerId)
          .single();

        if (profile) {
          const newTotalScore = (profile.total_score || 0) + scoreToAdd;
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ total_score: newTotalScore })
            .eq('id', playerId);

          if (updateError) {
            logger.error('API', `[WordHunt] Failed to update leaderboard score for ${playerId}: ${updateError.message}`);
          } else {
            logger.info('API', `[WordHunt] Updated leaderboard score for ${playerId}: +${scoreToAdd} efficiency points (total: ${newTotalScore})`);
          }
        }
      } catch (scoreError) {
        // Log but don't fail the request - the daily challenge submission was successful
        logger.error('API', `[WordHunt] Failed to update leaderboard score for ${playerId}: ${(scoreError as Error).message}`);
      }
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
 * GET /api/daily-challenge/word-hunt/leaderboard/:date/:language
 * Get Word Hunt leaderboard for a specific date and language
 */
router.get('/word-hunt/leaderboard/:date/:language', async (req: Request<LeaderboardParams, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> => {
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

    // Fetch leaderboard from the Word Hunt leaderboard view
    // Filter: only show solved attempts from authenticated users
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
      logger.error('API', `Word Hunt leaderboard error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    // Get total participant count (only solved attempts from authenticated users)
    const { count, error: countError } = await supabase
      .from('daily_word_hunt_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('solved', true)
      .not('player_id', 'is', null);

    if (countError) {
      logger.warn('API', `Word Hunt leaderboard count error: ${countError.message}`);
    }

    // Get total attempts count (including guests and failed attempts)
    const { count: totalCount, error: totalCountError } = await supabase
      .from('daily_word_hunt_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language);

    if (totalCountError) {
      logger.warn('API', `Word Hunt leaderboard total count error: ${totalCountError.message}`);
    }

    // Get guest player count (guests who played, regardless of solved status)
    const { count: guestCount, error: guestCountError } = await supabase
      .from('daily_word_hunt_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language)
      .is('player_id', null)
      .not('guest_fingerprint', 'is', null);

    if (guestCountError) {
      logger.warn('API', `Word Hunt leaderboard guest count error: ${guestCountError.message}`);
    }

    // Calculate participant count - ensure we show at least as many as we have data rows
    const dataLength = data?.length || 0;
    const queryCount = count ?? 0;
    const totalParticipants = Math.max(queryCount, dataLength);
    const guestPlayerCount = guestCount ?? 0;

    // Debug: Log leaderboard fetch results
    logger.info('API', `[WordHunt Leaderboard] ${date}/${language}: total=${totalParticipants}, totalAttempts=${totalCount ?? 0}, guests=${guestPlayerCount}, authenticated=${(totalCount ?? 0) - guestPlayerCount}`);

    res.json({
      data: data || [],
      totalParticipants,
      totalAttempts: totalCount ?? 0,
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
        // Get player's rank from leaderboard
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
        const rank = rankData?.rank_position;

        // Calculate percentile based on rank position
        // Rank 1 of 10 players = better than 90% (9/10)
        // Rank 10 of 10 players = better than 0% (0/10)
        let percentile = 0;
        if (rank && stats.total_players > 0) {
          // Players beaten = total players - your rank
          // (rank 1 beats total-1 players, rank 2 beats total-2, etc.)
          const playersBehindYou = stats.total_players - rank;
          percentile = Math.round((playersBehindYou / stats.total_players) * 100);
        }

        // Calculate efficiency percentile if efficiency_score exists
        let efficiencyPercentile: number | undefined;
        const totalSolved = stats.solved_count;
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
          rank,
          efficiencyScore: yourAttempt.efficiency_score,
          efficiencyPercentile
        };
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

/**
 * GET /api/daily-challenge/word-hunt/alltime-leaderboard/:language
 * Get all-time Word Hunt leaderboard for a specific language
 * Ranked by total efficiency score across all puzzles
 */
router.get('/word-hunt/alltime-leaderboard/:language', async (req: Request<{ language: string }, unknown, unknown, LeaderboardQuery>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Leaderboard service not available' });
      return;
    }

    const { language } = req.params;
    const limit = Math.min(parseInt(req.query.limit || '50') || 50, 100);

    // Validate language
    if (!VALID_LANGUAGES.includes(language as ValidLanguage)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    const supabase = getSupabase();

    // Fetch all-time leaderboard from the view
    const { data, error } = await supabase
      .from('word_hunt_alltime_leaderboard')
      .select('*')
      .eq('language', language)
      .order('rank_position', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('API', `Word Hunt all-time leaderboard error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    // Get total participant count for this language
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

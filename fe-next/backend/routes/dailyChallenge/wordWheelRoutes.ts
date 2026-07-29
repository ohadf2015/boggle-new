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
import { updateDailyProfileStats } from './profileStats';
import { updateLeaderboardEntry } from '../../modules/supabase/leaderboard';
import { leaderboardPointsForGame } from '../../modules/leaderboardScoring';
import { updateQuestProgress } from '../../modules/weeklyQuestManager';
import { shouldCreditDailyChallengeQuest } from '../../../lib/daily/questCredit';
import { aggregateWordPlayerCounts, type RarityRow } from '../../../lib/wordWheel/wordRarity';

// Upper bound on attempts scanned for the rarity aggregate. A daily puzzle's
// attempts are date+language scoped (indexed), so this caps a popular day's
// read without an unbounded table scan.
const RARITY_ROW_CAP = 5000;

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
  isCatchup?: boolean;
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
      countryCode, score, wordCount, wordsFound, longestWord, timeSeconds, centerLetter, isCatchup,
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

    insertData.is_catchup = Boolean(isCatchup);

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
        // Canonical row exists from a prior submit. Return it so the client
        // can sync UI/localStorage to the truth instead of overwriting with
        // the wasted replay.
        let canonicalQuery = supabase
          .from('daily_word_wheel_attempts')
          .select('score, word_count, words_found, longest_word, time_seconds, center_letter, completed_at')
          .eq('puzzle_date', puzzleDate)
          .eq('language', language);
        canonicalQuery = playerId
          ? canonicalQuery.eq('player_id', playerId)
          : canonicalQuery.eq('guest_fingerprint', guestFingerprint);

        const { data: existing } = await canonicalQuery.maybeSingle();

        const result = existing
          ? {
              score: existing.score ?? 0,
              wordCount: existing.word_count ?? 0,
              wordsFound: Array.isArray(existing.words_found)
                ? (existing.words_found as unknown[]).filter((w): w is string => typeof w === 'string')
                : [],
              longestWord: existing.longest_word ?? null,
              timeSeconds: existing.time_seconds ?? 0,
              centerLetter: existing.center_letter ?? null,
              completedAt: existing.completed_at ?? null,
            }
          : null;

        res.json({ success: true, alreadySubmitted: true, result });
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

    // Bump authenticated players' lifetime stats + unique_days_played so
    // daily-challenge-only players can unlock DEDICATION (7d) / LOYAL_PLAYER (30d).
    if (playerId) {
      try {
        // Daily challenge is the dominant competitive event — weight its
        // leaderboard contribution above casual play (DAILY_LEADERBOARD_WEIGHT).
        await updateDailyProfileStats({ supabase, playerId, scoreToAdd: leaderboardPointsForGame('daily', score) });
      } catch (scoreError) {
        logger.error('API', `[WordWheel] Failed to update profile stats for ${playerId}: ${(scoreError as Error).message}`);
      }
      // Re-derive the season-scoped leaderboard row from the freshly bumped
      // lifetime total. Daily play owns most of the season score, so without
      // this the season + all-time leaderboards lag profiles.total_score. Non-fatal.
      await updateLeaderboardEntry(playerId).catch((err) => {
        logger.warn('API', `[WordWheel] updateLeaderboardEntry failed for ${playerId}: ${(err as Error).message}`);
      });
    }

    // Credit the `daily_challenges` weekly quest — non-fatal. This path only runs
    // on a fresh insert (a duplicate submit returns early above), so it can never
    // double-count.
    if (shouldCreditDailyChallengeQuest({ mode: 'word_wheel', playerId, wordCount })) {
      updateQuestProgress(playerId as string, { dailyChallengesCompleted: 1 }).catch((err) => {
        logger.error('API', `[WordWheel] weekly quest update failed for ${playerId}: ${(err as Error).message}`);
      });
    }

    res.json({ success: true, alreadySubmitted: false, data, rank });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Wheel submit error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// GET /api/daily-challenge/word-wheel/check-played/:date/:language
// Returns the canonical server-side completion record so the client can sync
// across devices instead of relying solely on per-device localStorage.
// ==========================================

router.get('/check-played/:date/:language', async (
  req: Request<{ date: string; language: string }, unknown, unknown, { playerId?: string; guestFingerprint?: string }>,
  res: Response,
): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      // Match Word Hunt: signal "unknown" rather than `false` so a DB outage
      // does not let users replay completed puzzles.
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
      .from('daily_word_wheel_attempts')
      .select('score, word_count, words_found, longest_word, time_seconds, center_letter, completed_at')
      .eq('puzzle_date', date)
      .eq('language', language);

    if (playerId) {
      query = query.eq('player_id', playerId);
    } else {
      query = query.eq('guest_fingerprint', guestFingerprint);
    }

    const { data: existing, error } = await query.maybeSingle();

    if (error) {
      logger.error('API', `Word Wheel check-played error: ${error.message}`);
      res.status(500).json({ error: 'Failed to check attempt status' });
      return;
    }

    if (!existing) {
      res.json({ hasPlayed: false });
      return;
    }

    const rawWords = Array.isArray(existing.words_found) ? (existing.words_found as unknown[]) : [];
    const wordsFound = rawWords.filter((w): w is string => typeof w === 'string');

    res.json({
      hasPlayed: true,
      result: {
        score: existing.score ?? 0,
        wordCount: existing.word_count ?? wordsFound.length,
        wordsFound,
        longestWord: existing.longest_word ?? null,
        timeSeconds: existing.time_seconds ?? 0,
        centerLetter: existing.center_letter ?? null,
        completedAt: existing.completed_at ?? null,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Wheel check-played error: ${err.message}`);
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

    // Wheel has no `solved` boolean — anyone who submitted ≥1 word counts as solved.
    const { count: totalSolvedCount } = await supabase
      .from('daily_word_wheel_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('puzzle_date', date)
      .eq('language', language)
      .gt('word_count', 0);

    res.set('Cache-Control', 'public, max-age=20, s-maxage=20, stale-while-revalidate=60');
    res.json({
      data: rerankedData,
      totalParticipants: rerankedData.length,
      totalSolved: totalSolvedCount ?? 0,
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

// ==========================================
// GET /api/daily-challenge/word-wheel/alltime-leaderboard/:language
// ==========================================

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
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const { data, error } = await supabase
      .from('word_wheel_alltime_leaderboard')
      .select('*')
      .eq('language', language)
      .order('rank_position', { ascending: true })
      .limit(limit);

    if (error) {
      logger.error('API', `Word Wheel all-time leaderboard error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
      return;
    }

    const { count } = await supabase
      .from('word_wheel_alltime_leaderboard')
      .select('*', { count: 'exact', head: true })
      .eq('language', language);

    res.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=180');
    res.json({
      data: data || [],
      totalParticipants: count || data?.length || 0,
      language,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Wheel all-time leaderboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// GET /api/daily-challenge/word-wheel/words/:date/:language/:playerId
// Lazy fetch of words submitted by a specific player (for leaderboard row expansion)
// ==========================================

interface WordsRouteParams {
  date: string;
  language: string;
  playerId: string;
}

router.get('/words/:date/:language/:playerId', async (req: Request<WordsRouteParams>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const { date, language, playerId } = req.params;

    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }
    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }
    if (!playerId || typeof playerId !== 'string' || playerId.length > 128) {
      res.status(400).json({ error: 'Invalid playerId' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const { data, error } = await supabase
      .from('daily_word_wheel_attempts')
      .select('words_found, score, word_count, longest_word, display_name, avatar_emoji, avatar_color, avatar_image')
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) {
      logger.error('API', `Word Wheel words fetch error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch words' });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'No attempt found for this player' });
      return;
    }

    const raw = Array.isArray(data.words_found) ? (data.words_found as unknown[]) : [];
    const wordsFound = raw.filter((w): w is string => typeof w === 'string');

    res.json({
      wordsFound,
      wordCount: data.word_count ?? wordsFound.length,
      score: data.score ?? 0,
      longestWord: data.longest_word ?? null,
      displayName: data.display_name ?? 'Anonymous',
      avatarEmoji: data.avatar_emoji ?? '🎯',
      avatarColor: data.avatar_color ?? '#6366f1',
      avatarImage: data.avatar_image ?? null,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Wheel words fetch error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// GET /api/daily-challenge/word-wheel/word-rarity/:date/:language
// ==========================================
// Distinct-player count per word across the day's attempts. Powers the
// results-screen "rarest find / only you found X (so far)" celebration.
// NOTE: daily play is async — counts are a point-in-time snapshot, never final.

router.get('/word-rarity/:date/:language', async (req: Request<{ date: string; language: string }>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const { date, language } = req.params;
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
      .from('daily_word_wheel_attempts')
      .select('player_id, guest_fingerprint, words_found')
      .eq('puzzle_date', date)
      .eq('language', language)
      .limit(RARITY_ROW_CAP);

    if (error) {
      logger.error('API', `Word Wheel rarity fetch error: ${error.message}`);
      res.status(500).json({ error: 'Failed to fetch rarity' });
      return;
    }

    const rows: RarityRow[] = (data ?? []).map((row) => ({
      id: (row.player_id as string | null) ?? (row.guest_fingerprint as string | null) ?? null,
      words: Array.isArray(row.words_found)
        ? (row.words_found as unknown[]).filter((w): w is string => typeof w === 'string')
        : [],
    }));

    res.json({ counts: aggregateWordPlayerCounts(rows) });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Wheel rarity fetch error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

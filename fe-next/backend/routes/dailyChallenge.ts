/**
 * Daily Challenge API Routes
 * Handles /api/daily-challenge/* endpoints
 */

import express, { Request, Response, Router } from 'express';
import { getSupabase, isSupabaseConfigured } from '../modules/supabaseServer';
import { getCachedDailyPuzzle, cacheDailyPuzzle, getCachedDailyLeaderboard, cacheDailyLeaderboard } from '../redisClient';
import { coalesce } from '../utils/requestCoalescing';
import logger from '../utils/logger';
import { generateDailyPuzzle } from '../../utils/dailyChallenge';
import { generateDailyPuzzleAsync } from '../../utils/dailyChallenge/gridGeneration.server';
import { isUsableDailyPuzzle } from '../../utils/dailyChallenge/puzzlePayload';
import { COIN_COSTS } from '../../utils/coinManager';
import type { Language } from '../../types';
import wordHuntRouter from './dailyChallenge/wordHuntRoutes';
import wordWheelRouter from './dailyChallenge/wordWheelRoutes';
import { rerankSequential, dedupeByPlayerKeepBest, sortClassicPuzzleRowsGlobally } from './dailyChallenge/leaderboardSort';
import { updateQuestProgress } from '../modules/weeklyQuestManager';
import { shouldCreditDailyChallengeQuest } from '../../lib/daily/questCredit';

// Import types and utilities from extracted modules
import {
  type LeaderboardParams,
  type LeaderboardQuery,
  type LeaderboardResponse,
  type SubmitRequest,
  type SubmitResponse,
  type AttemptInsertData,
  type StatsResponse,
} from './dailyChallenge/types';
import {
  isValidDateFormat,
  isValidLanguage,
} from './dailyChallenge/utils';
import { validateSuggestionInput } from './dailyChallenge/suggestionValidation';

const router: Router = express.Router();

/**
 * GET /api/daily-challenge/puzzle/:date/:language
 * Get the daily puzzle for a specific date and language
 */
router.get('/puzzle/:date/:language', async (req: Request<LeaderboardParams>, res: Response): Promise<void> => {
  try {
    const { date, language } = req.params;

    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

    // Skip a poisoned cache entry (empty grid/targetWord) — serving it blanks
    // the client. Falling through regenerates and overwrites it below.
    const cached = await getCachedDailyPuzzle(date, language);
    if (cached && isUsableDailyPuzzle(cached)) {
      res.json(cached);
      return;
    }

    const result = await coalesce(`daily:puzzle:${language}:${date}`, async () => {
      const recheck = await getCachedDailyPuzzle(date, language);
      if (recheck && isUsableDailyPuzzle(recheck)) return recheck;

      const puzzle = await generateDailyPuzzleAsync(date, language as Language);
      const payload = {
        grid: puzzle.grid,
        targetWord: puzzle.targetWord,
        puzzleDate: puzzle.puzzleDate,
        puzzleNumber: puzzle.puzzleNumber,
        language: puzzle.language,
        meaning: puzzle.meaning ?? null,
      };

      // Never cache an empty puzzle — regenerate synchronously as a last resort
      // so we cache and serve a usable board instead of poisoning every client.
      if (!isUsableDailyPuzzle(payload)) {
        const fallback = generateDailyPuzzle(date, language as Language);
        const fallbackPayload = {
          grid: fallback.grid,
          targetWord: fallback.targetWord,
          puzzleDate: fallback.puzzleDate,
          puzzleNumber: fallback.puzzleNumber,
          language: fallback.language,
          meaning: null,
        };
        if (isUsableDailyPuzzle(fallbackPayload)) {
          await cacheDailyPuzzle(date, language, fallbackPayload);
        }
        return fallbackPayload;
      }

      await cacheDailyPuzzle(date, language, payload);
      return payload;
    });

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Daily puzzle error: ${err.message}`);

    try {
      const { date, language } = req.params;
      const puzzle = generateDailyPuzzle(date, language as Language);
      res.json({
        grid: puzzle.grid,
        targetWord: puzzle.targetWord,
        puzzleDate: puzzle.puzzleDate,
        puzzleNumber: puzzle.puzzleNumber,
        language: puzzle.language,
        meaning: null,
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Failed to generate puzzle' });
    }
  }
});

/**
 * GET /api/daily-challenge/leaderboard/:date/:language
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

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    const cached = await getCachedDailyLeaderboard(date, language, limit);
    if (cached) {
      res.json(cached);
      return;
    }

    const result = await coalesce(`daily:lb:${language}:${date}:${limit}`, async (): Promise<LeaderboardResponse> => {
      const recheck = await getCachedDailyLeaderboard(date, language, limit);
      if (recheck) {
        return recheck as LeaderboardResponse;
      }

      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      // Per-language leaderboard: each language plays a DIFFERENT board, so players are
      // only ranked against — and only see the words of — others who played the same
      // language. The view's rank_position counts guests + replays, so we re-sort and
      // renumber below.
      const { data, error } = await supabase
        .from('daily_puzzle_leaderboard')
        .select('*')
        .eq('puzzle_date', date)
        .eq('language', language)
        .not('player_id', 'is', null)
        .order('score', { ascending: false, nullsFirst: false })
        .order('word_count', { ascending: false, nullsFirst: false })
        .order('time_seconds', { ascending: true, nullsFirst: false })
        // Over-fetch: view has one row per ATTEMPT, so a player occupies many slots
        // (same-language replays). Pull extra so dedup-to-one-per-player still yields `limit`.
        // ponytail: ×10 cap 500 covers current worst case; move to DISTINCT ON in the view if replays climb.
        .limit(Math.min(limit * 10, 500));

      if (error) {
        throw new Error(`Daily leaderboard fetch error: ${error.message}`);
      }

      const { count, error: countError } = await supabase
        .from('daily_puzzle_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_date', date)
        .eq('language', language)
        .not('player_id', 'is', null);

      if (countError) {
        logger.warn('API', `Daily leaderboard count error: ${countError.message}`);
      }

      const { count: totalCount, error: totalCountError } = await supabase
        .from('daily_puzzle_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_date', date)
        .eq('language', language);

      if (totalCountError) {
        logger.warn('API', `Daily leaderboard total count error: ${totalCountError.message}`);
      }

      const { count: guestCount, error: guestCountError } = await supabase
        .from('daily_puzzle_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_date', date)
        .eq('language', language)
        .is('player_id', null)
        .not('guest_fingerprint', 'is', null);

      if (guestCountError) {
        logger.warn('API', `Daily leaderboard guest count error: ${guestCountError.message}`);
      }

      // Sort by the scoring order, collapse each player to their single best row
      // (view has one row per ATTEMPT — same-language replays), trim to limit, then
      // renumber 1..N. The view's rank_position includes guests/replays, so it can't
      // be trusted directly here.
      const rerankedData = rerankSequential(
        dedupeByPlayerKeepBest(sortClassicPuzzleRowsGlobally(data || [])).slice(0, limit),
      );

      const dataLength = rerankedData.length;
      const queryCount = count ?? 0;
      const totalParticipants = Math.max(queryCount, dataLength);

      const payload: LeaderboardResponse = {
        data: rerankedData,
        totalParticipants,
        totalAttempts: totalCount ?? 0,
        guestPlayerCount: guestCount ?? 0,
        date,
        language,
      };

      await cacheDailyLeaderboard(date, language, limit, payload);
      return payload;
    });

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Daily leaderboard error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/daily-challenge/submit
 */
/**
 * Compute the score that should be persisted on a daily-challenge submission.
 * On retry (existing row found), apply a server-side penalty clamped to 0.
 * Exported for unit testing — keep pure (no I/O).
 */
export function computeRetryScore(rawScore: number, isRetry: boolean): { finalScore: number; penaltyApplied: number } {
  const penaltyApplied = isRetry ? COIN_COSTS.DAILY_RETRY_LEADERBOARD_PENALTY : 0;
  const finalScore = Math.max(0, rawScore - penaltyApplied);
  return { finalScore, penaltyApplied };
}

router.post('/submit', async (req: SubmitRequest, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const {
      puzzleDate, puzzleNumber, language, playerId, guestFingerprint,
      displayName, avatarEmoji, avatarColor, avatarImage,
      countryCode, score, wordCount, wordsByLength, timeSeconds, longestWord
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

    // Detect retry via existing row (player_id OR guest_fingerprint + puzzle_date + language).
    // The unique_player_daily constraint blocked re-INSERT before, so retry scores were
    // silently dropped. Now: SELECT first → UPDATE on retry with server-applied penalty.
    const idColumn: 'player_id' | 'guest_fingerprint' = playerId ? 'player_id' : 'guest_fingerprint';
    const idValue = playerId || (guestFingerprint as string);

    const { data: existing, error: existingError } = await supabase
      .from('daily_puzzle_attempts')
      .select('id, score')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language)
      .eq(idColumn, idValue)
      .maybeSingle();

    if (existingError) {
      logger.error('API', `Daily challenge submit lookup error: ${existingError.message}`);
      res.status(500).json({ error: 'Failed to submit result' });
      return;
    }

    const isRetry = !!existing;
    const { finalScore, penaltyApplied } = computeRetryScore(score, isRetry);

    const writeData: AttemptInsertData = {
      puzzle_date: puzzleDate,
      puzzle_number: puzzleNumber,
      language,
      score: finalScore,
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
      country_code: countryCode || undefined
    };

    if (playerId) {
      writeData.player_id = playerId;
    } else {
      writeData.guest_fingerprint = guestFingerprint;
    }

    let data: unknown = null;
    if (isRetry && existing) {
      const { data: updated, error: updateError } = await supabase
        .from('daily_puzzle_attempts')
        .update(writeData)
        .eq('id', existing.id)
        .select()
        .single();
      if (updateError) {
        logger.error('API', `Daily challenge retry update error: ${updateError.message}`);
        res.status(500).json({ error: 'Failed to submit result' });
        return;
      }
      data = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('daily_puzzle_attempts')
        .insert(writeData)
        .select()
        .single();
      if (insertError) {
        // Race: a concurrent submit landed first. Treat this attempt as a retry
        // so the leaderboard still reflects the latest score (with penalty).
        if ((insertError as { code?: string }).code === '23505') {
          const { data: raced } = await supabase
            .from('daily_puzzle_attempts')
            .select('id')
            .eq('puzzle_date', puzzleDate)
            .eq('language', language)
            .eq(idColumn, idValue)
            .maybeSingle();
          if (raced) {
            const racePayload = { ...writeData, score: Math.max(0, score - COIN_COSTS.DAILY_RETRY_LEADERBOARD_PENALTY) };
            const { data: updated, error: raceUpdateError } = await supabase
              .from('daily_puzzle_attempts')
              .update(racePayload)
              .eq('id', raced.id)
              .select()
              .single();
            if (raceUpdateError) {
              logger.error('API', `Daily challenge race-update error: ${raceUpdateError.message}`);
              res.status(500).json({ error: 'Failed to submit result' });
              return;
            }
            data = updated;
          } else {
            logger.error('API', `Daily challenge submit error: ${insertError.message}`);
            res.status(500).json({ error: 'Failed to submit result' });
            return;
          }
        } else {
          logger.error('API', `Daily challenge submit error: ${insertError.message}`);
          res.status(500).json({ error: 'Failed to submit result' });
          return;
        }
      } else {
        data = inserted;
      }
    }

    // Compute auth-only rank: count auth players ranked above this player + 1.
    // The view's rank_position includes guests, so we can't use it directly —
    // it would disagree with the reranked leaderboard list.
    let rank: number | null = null;
    const { data: rankData } = await supabase
      .from('daily_puzzle_leaderboard')
      .select('rank_position')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language)
      .eq(playerId ? 'player_id' : 'guest_fingerprint', playerId || guestFingerprint)
      .single();

    if (rankData && playerId) {
      const { count: authPlayersAbove } = await supabase
        .from('daily_puzzle_leaderboard')
        .select('*', { count: 'exact', head: true })
        .eq('puzzle_date', puzzleDate)
        .eq('language', language)
        .not('player_id', 'is', null)
        .lt('rank_position', rankData.rank_position);

      rank = (authPlayersAbove ?? 0) + 1;
    } else if (rankData) {
      rank = rankData.rank_position;
    }

    // Credit the `daily_challenges` weekly quest — non-fatal, fire-and-forget.
    if (shouldCreditDailyChallengeQuest({ mode: 'puzzle', playerId, isRetry, wordCount })) {
      updateQuestProgress(playerId as string, { dailyChallengesCompleted: 1 }).catch((err) => {
        logger.error('API', `[DailyChallenge] weekly quest update failed for ${playerId}: ${(err as Error).message}`);
      });
    }

    res.json({
      success: true,
      alreadySubmitted: false,
      isRetry,
      penaltyApplied,
      finalScore,
      data,
      rank
    } as SubmitResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Daily challenge submit error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/stats/:date/:language
 */
router.get('/stats/:date/:language', async (req: Request<LeaderboardParams>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const { date, language } = req.params;

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

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

/**
 * POST /api/daily-challenge/suggest-word
 * Player suggests a future daily word. Stored pending; the nightly validator
 * judges it and, if good, places it on an upcoming day.
 */
router.post('/suggest-word', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language, word, playerId, guestFingerprint } = (req.body ?? {}) as {
      language?: string; word?: string; playerId?: string; guestFingerprint?: string;
    };
    const validation = validateSuggestionInput(language, word);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
    const wordUpper = validation.word as string;

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'unavailable' });
      return;
    }

    // Light anti-spam: cap pending suggestions per authenticated submitter.
    if (playerId) {
      const { count } = await supabase
        .from('daily_word_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('suggested_by', playerId)
        .eq('status', 'pending');
      if ((count ?? 0) >= 5) {
        res.status(429).json({ error: 'too_many', message: 'You already have pending suggestions' });
        return;
      }
    }

    const { error } = await supabase.from('daily_word_suggestions').insert({
      language,
      word: wordUpper,
      suggested_by: playerId ?? null,
      guest_fingerprint: guestFingerprint ?? null,
    });

    if (error) {
      // unique_violation on the pending (language, upper(word)) index → already queued
      if ((error as { code?: string }).code === '23505') {
        res.json({ ok: true, status: 'pending', duplicate: true });
        return;
      }
      logger.error('DAILY', 'suggest-word insert failed', error);
      res.status(500).json({ error: 'insert_failed' });
      return;
    }

    res.json({ ok: true, status: 'pending' });
  } catch (e) {
    logger.error('DAILY', 'suggest-word error', e);
    res.status(500).json({ error: 'error' });
  }
});

// Mount Word Hunt routes
router.use('/word-hunt', wordHuntRouter);

// Mount Word Wheel routes
router.use('/word-wheel', wordWheelRouter);

export default router;

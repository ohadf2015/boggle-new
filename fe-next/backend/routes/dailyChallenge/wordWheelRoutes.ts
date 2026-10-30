/**
 * Word Wheel Daily Challenge Routes
 * Handles /api/daily-challenge/word-wheel/* endpoints
 */

import express, { Request, Response, Router } from 'express';
import { completeDailyQuestsForResult } from '../../modules/dailyMissionsManager';
import { questResultForWordWheel } from '../../../shared/dailyQuestPool';
import { getSupabase, isSupabaseConfigured } from '../../modules/supabaseServer';
import logger from '../../utils/logger';

import { isValidDateFormat, isValidLanguage, sanitizeGuestDisplayName } from './utils';
import { updateDailyProfileStats } from './profileStats';
import { createSeasonLeaderboardHandler } from './seasonLeaderboard';
import { updateLeaderboardEntry } from '../../modules/supabase/leaderboard';
import { leaderboardPointsForGame } from '../../modules/leaderboardScoring';
import { updateQuestProgress } from '../../modules/weeklyQuestManager';
import { shouldCreditDailyChallengeQuest } from '../../../lib/daily/questCredit';
import { isSubmittableDate } from '../../../utils/dailyChallenge/catchUp';
import { goldCoinsFor } from '../../../utils/dailyChallenge/wordWheelScoring';
import { awardCoinsServer } from '../../services/economy/awardCoins';
import { resolveDailyPlayer } from './resolveDailyPlayer';
import wordWheelLeaderboardRoutes from './wordWheelLeaderboardRoutes';
import { sanitizeWheelSubmission, isWheelCatchup } from './wordWheelSubmission';


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
      puzzleDate, language, guestFingerprint,
      displayName, avatarEmoji, avatarColor, avatarImage,
      countryCode, score: claimedScore, wordsFound: claimedWords, timeSeconds: claimedTime, isCatchup,
    } = req.body;

    if (!puzzleDate || !req.body.puzzleNumber || !language || claimedScore === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (!req.body.playerId && !guestFingerprint) {
      res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
      return;
    }

    if (!isValidDateFormat(puzzleDate) || !isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid puzzle date or language' });
      return;
    }

    const now = new Date();
    const serverDate = now.toISOString().split('T')[0];
    if (!isSubmittableDate(serverDate, puzzleDate)) {
      res.status(400).json({ error: 'Invalid puzzle date' });
      return;
    }

    const resolved = await resolveDailyPlayer(req, req.body.playerId);
    if (!resolved.ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const playerId = resolved.playerId;

    const sanitized = sanitizeWheelSubmission({
      puzzleDate, language, claimedScore, claimedWords, claimedTime,
    });
    if (!sanitized) {
      res.status(400).json({ error: 'Invalid puzzle' });
      return;
    }
    const { puzzle, wordsFound, score, timeSeconds, longestWord, goldLetter } = sanitized;
    const wordCount = wordsFound.length;
    const puzzleNumber = puzzle.puzzleNumber;

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
      word_count: wordCount,
      words_found: wordsFound,
      longest_word: longestWord,
      longest_word_length: longestWord ? longestWord.length : null,
      time_seconds: timeSeconds,
      center_letter: puzzle.centerLetter,
      completed_at: now.toISOString(),
      display_name: sanitizeGuestDisplayName(displayName),
      avatar_emoji: avatarEmoji || '🎯',
      avatar_color: avatarColor || '#6366f1',
      avatar_image: avatarImage || null,
      country_code: countryCode || null,
    };

    insertData.is_catchup = isWheelCatchup(serverDate, puzzleDate, Boolean(isCatchup), now);

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

      // Credit TODAY'S quests too. This seam only ever bumped the weekly
      // `dailyChallengesCompleted` counter, so finishing the daily Word Wheel
      // moved no daily mission at all — the hub advertised "Daily Missions"
      // above a game that could not advance one. Non-fatal, same as above.
      completeDailyQuestsForResult(
        playerId as string,
        questResultForWordWheel({ score, wordsFound }),
      ).catch((err) => {
        logger.error('API', `[WordWheel] daily quest update failed for ${playerId}: ${(err as Error).message}`);
      });
    }

    let coins = playerId ? goldCoinsFor(wordsFound, goldLetter) : 0;
    if (playerId && coins > 0) {
      // The gold-coin cap is per day: a second language's board that day pays nothing.
      const { count: otherLanguages } = await supabase
        .from('daily_word_wheel_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId)
        .eq('puzzle_date', puzzleDate)
        .neq('language', language);
      if ((otherLanguages ?? 0) > 0) coins = 0;
    }
    if (playerId && coins > 0) {
      // Fresh-insert path only, so the one-row-per-day unique key keeps this from paying twice.
      const award = await awardCoinsServer(playerId, coins, 'daily_wheel_gold', { puzzleDate, language });
      if (!award.success) logger.warn('API', `[WordWheel] gold coins not awarded to ${playerId}: ${award.error}`);
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

router.use(wordWheelLeaderboardRoutes);

// ==========================================
// GET /api/daily-challenge/word-wheel/season-leaderboard/:language?season=<id>
// Season-windowed board (current season by default). See seasonLeaderboard.ts.
// ==========================================

router.get('/season-leaderboard/:language', createSeasonLeaderboardHandler('daily_word_wheel_season_leaderboard'));

// ==========================================
// GET /api/daily-challenge/word-wheel/words/:date/:language/:playerId
// Lazy fetch of words submitted by a specific player (for leaderboard row expansion)
// ==========================================

interface WordsRouteParams {
  date: string;
  language: string;
  playerId?: string;
}

const handleWords = async (req: Request<WordsRouteParams>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const { date, language } = req.params;
    const playerId = req.params.playerId;
    // Guests have no player id; POST keeps their fingerprint (a credential) out of URLs and logs.
    const guestFingerprint = playerId ? null : req.body?.guestFingerprint;

    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }
    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }
    const identity = playerId ?? guestFingerprint;
    if (!identity || typeof identity !== 'string' || identity.length > 128) {
      res.status(400).json({ error: 'Invalid playerId' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const base = supabase
      .from('daily_word_wheel_attempts')
      .select('words_found, score, word_count, longest_word, display_name, avatar_emoji, avatar_color, avatar_image')
      .eq('puzzle_date', date)
      .eq('language', language);
    const { data, error } = await (playerId
      ? base.eq('player_id', playerId)
      : base.eq('guest_fingerprint', identity).is('player_id', null)
    ).maybeSingle();

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
};

router.get('/words/:date/:language/:playerId', handleWords);
router.post('/words/:date/:language', handleWords);

export default router;

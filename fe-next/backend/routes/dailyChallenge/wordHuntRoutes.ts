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
  computeWordHuntRetryScore,
  sanitizeGuestDisplayName,
  clampWordHuntClaim,
  deriveWordHuntCatchup,
} from './utils';
import { resolveDailyPlayer } from './resolveDailyPlayer';
import { completeDailyQuestsForResult } from '../../modules/dailyMissionsManager';
import { emptyQuestResult } from '../../../shared/dailyQuestPool';
import { createSeasonLeaderboardHandler } from './seasonLeaderboard';
import { wordHuntDailyBoard, wordHuntAlltimeBoard } from './wordHuntBoards';
import { updateDailyProfileStats } from './profileStats';
import { updateLeaderboardEntry } from '../../modules/supabase/leaderboard';
import { leaderboardPointsForGame } from '../../modules/leaderboardScoring';
import {
  computeCycleProgress,
  computeChestTierForCycle,
  computeCurrentStreak,
  type HuntScoreRow,
  type WheelScoreRow,
  type PuzzleScoreRow,
} from '../../../lib/daily/weeklyChest';
import { updateQuestProgress } from '../../modules/weeklyQuestManager';
import { shouldCreditDailyChallengeQuest } from '../../../lib/daily/questCredit';
import { isSubmittableDate } from '../../../utils/dailyChallenge/catchUp';
import { freezeDateToBridge } from '../../../lib/daily/chestFreezeBridge';

const router: Router = express.Router();

type HuntStatsRow = Record<string, number> & { total_players: number; solved_count: number };

const HUNT_STATS_COLUMNS: string = 'total_players, solved_count, solve_rate, avg_attempts_solved, avg_life_remaining, avg_efficiency_score, max_efficiency_score, avg_words_discovered, solved_in_1, solved_in_2, solved_in_3, solved_in_4, solved_in_5, solved_in_6, solved_in_7, solved_in_8, solved_in_9, solved_in_10';

function alreadySubmittedResponse(row: unknown) {
  return { success: true, alreadySubmitted: true, isRetry: true, penaltyApplied: 0, data: row, chestReady: false, freezeBridged: false };
}

/**
 * Read a player's or guest's daily streak, on the same rules an authenticated
 * player already gets from GET /api/daily/weekly-chest/status: the full
 * consecutive-day run across all three daily modes (classic puzzle, Word Hunt,
 * Word Wheel), via the same `computeCurrentStreak` used there — see
 * fe-next/lib/daily/weeklyChest.ts and fe-next/app/api/daily/weekly-chest/status/route.ts.
 *
 * `word_hunt_player_stats` (current_streak/longest_streak columns, migrations
 * 020/067) is NOT used here: verified directly against the live database that
 * the table doesn't exist and no trigger calls update_word_hunt_player_stats()
 * — it's an orphaned function left behind by a migration that was never
 * actually wired up. The /check-played read that used to hit it (guarded by
 * `if (playerId)`) was already dead for authenticated players too; this
 * replaces it with the mechanism the product's "day N" fire icon actually
 * uses today, extended to accept a guest_fingerprint the same as a player_id.
 *
 * Guests don't get streak-freeze bridging (daily_streak_freezes and
 * player_engagement are player_id-only tables — no guest_fingerprint column),
 * so an authenticated caller of this same endpoint may occasionally read one
 * lower than the fire icon on a day a freeze is actively bridging a gap. That
 * is a disclosed simplification, not a fabricated number — it only ever
 * under-reports a real, unfrozen gap.
 */
async function fetchDailyStreak(
  supabase: ReturnType<typeof getSupabase>,
  idColumn: 'player_id' | 'guest_fingerprint',
  idValue: string
): Promise<{ currentStreak: number; lastPlayedDate: string | null }> {
  const today = new Date().toISOString().split('T')[0];

  const [puzzleRes, huntRes, wheelRes] = await Promise.all([
    supabase!.from('daily_puzzle_attempts').select('puzzle_date').eq(idColumn, idValue).gt('word_count', 0),
    supabase!.from('daily_word_hunt_attempts').select('puzzle_date').eq(idColumn, idValue).eq('solved', true).eq('is_catchup', false),
    supabase!.from('daily_word_wheel_attempts').select('puzzle_date').eq(idColumn, idValue).gt('word_count', 0),
  ]);

  const allDates = [
    ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
    ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
  ];

  const currentStreak = computeCurrentStreak(allDates, today);
  const lastPlayedDate = allDates.length > 0 ? allDates.reduce((max, d) => (d > max ? d : max)) : null;

  return { currentStreak, lastPlayedDate };
}

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
      playerId: bodyPlayerId,
      guestFingerprint,
      displayName,
      avatarEmoji,
      avatarColor,
      countryCode,
      isCatchup,
      solved,
      attemptsUsed,
      targetWord,
      attemptWords,
      wordsDiscovered,
      lifeRemaining: rawLifeRemaining,
      clueTokensEarned,
      clueTokensSpent,
      hintsUnlocked,
      efficiencyScore: rawEfficiencyScore,
      extraTries: clientExtraTries
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

    const resolvedPlayer = await resolveDailyPlayer(req, bodyPlayerId);
    if (!resolvedPlayer.ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const playerId = resolvedPlayer.playerId;

    if (!playerId && !guestFingerprint) {
      res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
      return;
    }

    const clampedClaim = clampWordHuntClaim({
      solved: Boolean(solved),
      attemptsUsed,
      lifeRemaining: rawLifeRemaining,
      wordsDiscovered,
      efficiencyScore: rawEfficiencyScore,
    });
    const lifeRemaining = rawLifeRemaining === undefined ? undefined : clampedClaim.lifeRemaining;
    const efficiencyScore = rawEfficiencyScore === undefined ? undefined : clampedClaim.efficiencyScore;

    logger.info('API', `[WordHunt Submit] Received: playerId=${playerId || 'null'}, guestFingerprint=${guestFingerprint ? guestFingerprint.substring(0, 8) + '...' : 'null'}, displayName=${displayName}, solved=${solved}, attempts=${attemptsUsed}`);

    // Accept today plus the catch-up window (last 3 days). Anything older — or a
    // future date — is rejected to block clock-drift abuse.
    const serverDate = new Date().toISOString().split('T')[0];
    if (!isSubmittableDate(serverDate, puzzleDate)) {
      logger.info('API', `[WordHunt] Date out of window: client=${puzzleDate}, server=${serverDate}`);
      res.status(400).json({ error: 'Invalid puzzle date' });
      return;
    }
    const isCatchupRow = deriveWordHuntCatchup(new Date(), puzzleDate, Boolean(isCatchup));

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

      if (solved) {
        const hasMatchingAttempt = Array.isArray(attemptWords) && attemptWords.some((a) =>
          typeof a?.word === 'string' && normalizeWordForComparison(a.word, language as Language) === expectedTargetWord,
        );
        if (!hasMatchingAttempt) {
          logger.info('API', `Word Hunt validation failed: solved=true but no attempt matches target "${expectedTargetWord}"`);
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
      display_name: sanitizeGuestDisplayName(displayName),
      avatar_emoji: avatarEmoji || '🎯',
      avatar_color: avatarColor || '#6366f1',
      country_code: countryCode || undefined,
      is_catchup: isCatchupRow
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

    // Retry detection: existing row for (player|guest, date, language) means this is
    // a second attempt. Apply server-side leaderboard penalty and UPDATE in place
    // so the leaderboard reflects the latest run instead of silently dropping it.
    const idColumn: 'player_id' | 'guest_fingerprint' = playerId ? 'player_id' : 'guest_fingerprint';
    const idValue = playerId || (guestFingerprint as string);

    const { data: existing, error: existingError } = await supabase
      .from('daily_word_hunt_attempts')
      .select('id, extra_tries, solved, efficiency_score')
      .eq('puzzle_date', puzzleDate)
      .eq('language', language)
      .eq(idColumn, idValue)
      .maybeSingle();

    if (existingError) {
      logger.error('API', `Word Hunt submit lookup error: ${existingError.message}`);
      res.status(500).json({ error: 'Failed to submit result' });
      return;
    }

    if (existing?.solved) {
      res.json(alreadySubmittedResponse(existing));
      return;
    }

    // Captured BEFORE the update so weekly-quest credit can detect the
    // solved=false → solved=true transition on a paid retry. May be reassigned
    // on the race-update path below if the concurrent submit landed first.
    let wasAlreadySolved = !!existing?.solved;
    const existingExtraTries = existing?.extra_tries || 0;
    const reportedExtraTries = Math.max(0, Math.round(clientExtraTries ?? 0));
    const { finalScore, penaltyApplied, isPaidRetry } = computeWordHuntRetryScore({
      rawEfficiency: efficiencyScore ?? 0,
      existingExtraTries,
      reportedExtraTries,
      hasExistingRow: !!existing,
    });
    if (isPaidRetry && efficiencyScore !== undefined) {
      insertData.efficiency_score = finalScore;
    }
    if (existing) {
      insertData.extra_tries = Math.max(existingExtraTries, reportedExtraTries);
      if (insertData.efficiency_score !== undefined) {
        insertData.efficiency_score = Math.max(Number(existing.efficiency_score) || 0, insertData.efficiency_score as number);
      }
    }

    let data: Record<string, unknown> | null = null;
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('daily_word_hunt_attempts')
        .update(insertData)
        .eq('id', existing.id)
        .select()
        .single();
      if (updateError) {
        logger.error('API', `Word Hunt retry update error: ${updateError.message}`);
        res.status(500).json({ error: 'Failed to submit result' });
        return;
      }
      data = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('daily_word_hunt_attempts')
        .insert(insertData)
        .select()
        .single();
      if (insertError) {
        // Race: concurrent submit landed first → re-detect and update.
        if ((insertError as { code?: string }).code === '23505') {
          const { data: raced } = await supabase
            .from('daily_word_hunt_attempts')
            .select('id, extra_tries, solved, efficiency_score')
            .eq('puzzle_date', puzzleDate)
            .eq('language', language)
            .eq(idColumn, idValue)
            .maybeSingle();
          if (raced?.solved) {
            res.json(alreadySubmittedResponse(raced));
            return;
          }
          if (raced) {
            wasAlreadySolved = !!raced.solved;
            const racePayload: Record<string, unknown> = { ...insertData };
            const racedExtraTries = raced.extra_tries || 0;
            const racedScore = computeWordHuntRetryScore({
              rawEfficiency: efficiencyScore ?? 0,
              existingExtraTries: racedExtraTries,
              reportedExtraTries,
              hasExistingRow: true,
            });
            if (efficiencyScore !== undefined) {
              racePayload.efficiency_score = Math.max(Number(raced.efficiency_score) || 0, racedScore.finalScore);
            }
            racePayload.extra_tries = Math.max(racedExtraTries, reportedExtraTries);
            const { data: updated, error: raceUpdateError } = await supabase
              .from('daily_word_hunt_attempts')
              .update(racePayload)
              .eq('id', raced.id)
              .select()
              .single();
            if (raceUpdateError) {
              logger.error('API', `Word Hunt race-update error: ${raceUpdateError.message}`);
              res.status(500).json({ error: 'Failed to submit result' });
              return;
            }
            data = updated;
          } else {
            logger.error('API', `Word Hunt submit error: ${insertError.message}`);
            res.status(500).json({ error: 'Failed to submit result' });
            return;
          }
        } else {
          logger.error('API', `Word Hunt submit error: ${insertError.message}`);
          res.status(500).json({ error: 'Failed to submit result' });
          return;
        }
      } else {
        data = inserted;
      }
    }

    const isRetry = !!existing;
    logger.info('API', `[WordHunt Submit] SUCCESS: id=${(data as { id?: string })?.id}, playerType=${playerId ? 'authenticated' : 'guest'}, displayName=${displayName}, solved=${solved}, isRetry=${isRetry}, isPaidRetry=${isPaidRetry}, penalty=${penaltyApplied}`);

    // Evaluate today's daily quests against this word-hunt result (fire-and-forget).
    // mode 'word-hunt' satisfies the word-hunt discovery quest; the longest
    // discovered word / count can satisfy skill quests too.
    if (playerId) {
      const discovered: Array<{ word?: string }> = Array.isArray(wordsDiscovered)
        ? wordsDiscovered
        : [];
      const longestWordLength = discovered.reduce(
        (m: number, w) => Math.max(m, w?.word?.length || 0),
        0,
      );
      completeDailyQuestsForResult(
        playerId,
        emptyQuestResult({
          mode: 'word-hunt',
          longestWordLength,
          wordsFound: discovered.length,
        }),
      ).catch((err) => {
        logger.error('API', `[WordHunt] Daily quest update failed for ${playerId}: ${(err as Error).message}`);
      });
    }

    // Update profile stats for authenticated users (all attempts count for games played).
    // Helper also bumps `unique_days_played`, which backs the DEDICATION (7d) and
    // LOYAL_PLAYER (30d) achievements — bypassing /api/stats/record-game is why
    // daily-challenge-only players never unlocked the 7-day title.
    // Skip on retry: first attempt already counted; second attempt would double-count.
    if (playerId && !isRetry) {
      // The daily challenge is the headline competitive event: its leaderboard
      // contribution is weighted far above casual play (DAILY_LEADERBOARD_WEIGHT)
      // so the season + global leaderboard is driven mostly by daily play. This
      // is the SINGLE owner of daily total_score (record-game adds 0 for daily).
      const scoreToAdd = solved && efficiencyScore !== undefined && efficiencyScore > 0
        ? leaderboardPointsForGame('daily', efficiencyScore)
        : 0;
      try {
        await updateDailyProfileStats({ supabase, playerId, scoreToAdd });
      } catch (scoreError) {
        logger.error('API', `[WordHunt] Failed to update profile stats for ${playerId}: ${(scoreError as Error).message}`);
      }
      // Re-derive the season-scoped leaderboard row from the freshly bumped
      // lifetime total. Daily play owns most of the season score, so without
      // this the season + all-time leaderboards lag profiles.total_score. Non-fatal.
      await updateLeaderboardEntry(playerId).catch((err) => {
        logger.warn('API', `[WordHunt] updateLeaderboardEntry failed for ${playerId}: ${(err as Error).message}`);
      });
    }

    // Credit the `daily_challenges` weekly quest on the submission that
    // *transitions* the row to solved=true. Includes paid retries that flip
    // a failed first attempt to solved.
    if (shouldCreditDailyChallengeQuest({ mode: 'word_hunt', playerId, solved, isRetry, wasAlreadySolved })) {
      updateQuestProgress(playerId as string, { dailyChallengesCompleted: 1 }).catch((err) => {
        logger.error('API', `[WordHunt] weekly quest update failed for ${playerId}: ${(err as Error).message}`);
      });
    }

    // Weekly chest hook — non-fatal
    let chestReady = false
    let chestTier: string | undefined
    // Freeze-bridge signal — true only when a freeze was *newly consumed on
    // this submit* (one-shot event for the "streak saved!" results moment).
    let freezeBridged = false
    let freezesRemaining: number | undefined
    if (playerId) {
      try {
        const today = new Date().toISOString().split('T')[0]
        // Only *completed* attempts count toward the streak — keep in sync with
        // /api/daily/weekly-chest/status + claim.
        // Catch-up plays are excluded (.eq is_catchup false) — they fill personal
        // stats but must not bridge weekly-chest cycles (anti-farm).
        const [puzzleRes, huntRes, wheelRes] = await Promise.all([
          supabase.from('daily_puzzle_attempts').select('puzzle_date,score,time_seconds').eq('player_id', playerId).gt('word_count', 0),
          supabase.from('daily_word_hunt_attempts').select('puzzle_date,efficiency_score').eq('player_id', playerId).eq('solved', true).eq('is_catchup', false),
          supabase.from('daily_word_wheel_attempts').select('puzzle_date,score,time_seconds').eq('player_id', playerId).gt('word_count', 0).eq('is_catchup', false),
        ])
        const allDates = [
          ...(puzzleRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
          ...(huntRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
          ...(wheelRes.data ?? []).map((r: { puzzle_date: string }) => r.puzzle_date),
        ]

        // Freeze bridge: a freeze the player earned (player_engagement pool, e.g.
        // from a gold chest) can cover ONE missed daily so a nearly-complete
        // chest cycle isn't cleared. Never on a catch-up submit. Frozen days then
        // bridge continuity below but carry no score row, so they don't inflate
        // the tier (computeChestTierForCycle filters scores by date).
        let frozenDates: string[] = []
        try {
          const [{ data: freezeRows }, { data: engRow }] = await Promise.all([
            supabase.from('daily_streak_freezes').select('frozen_date').eq('player_id', playerId),
            supabase.from('player_engagement').select('streak_freezes_available').eq('player_id', playerId).maybeSingle(),
          ])
          frozenDates = (freezeRows ?? []).map((r: { frozen_date: string }) => r.frozen_date)
          const freezesAvailable = engRow?.streak_freezes_available ?? 0
          if (!isCatchupRow) {
            const bridgeDate = freezeDateToBridge(allDates, today, freezesAvailable)
            if (bridgeDate && !frozenDates.includes(bridgeDate)) {
              const { error: insErr } = await supabase
                .from('daily_streak_freezes')
                .insert({ player_id: playerId, frozen_date: bridgeDate })
              if (!insErr) {
                await supabase.from('player_engagement')
                  .update({ streak_freezes_available: freezesAvailable - 1 })
                  .eq('player_id', playerId)
                frozenDates.push(bridgeDate)
                freezeBridged = true
                freezesRemaining = Math.max(0, freezesAvailable - 1)
                logger.info('API', `[WordHunt] freeze bridged missed daily ${bridgeDate} for ${playerId}`)
              }
            }
          }
        } catch (fe) {
          logger.error('API', `[WordHunt] freeze bridge error: ${(fe as Error).message}`)
        }

        const progress = computeCycleProgress([...allDates, ...frozenDates], today)
        if (progress.isClaimable) {
          const { data: existing } = await supabase
            .from('daily_weekly_chests').select('id').eq('player_id', playerId).eq('cycle_start', progress.cycleStart)
          if (!existing?.length) {
            const REWARDS = {
              bronze: { coins: 150, badge_id: 'badge_weekly_bronze' },
              silver: { coins: 300, badge_id: 'badge_weekly_silver' },
              gold:   { coins: 600, badge_id: 'badge_weekly_gold' },
            } as const
            // All three modes + the consistency floor decide the tier — keep in
            // sync with /api/daily/weekly-chest/status + claim.
            const { weekScore, tier } = computeChestTierForCycle(
              progress.completedDates,
              (huntRes.data ?? []) as HuntScoreRow[],
              (wheelRes.data ?? []) as WheelScoreRow[],
              (puzzleRes.data ?? []) as PuzzleScoreRow[],
            )
            await supabase.from('daily_weekly_chests').insert({
              player_id: playerId, cycle_start: progress.cycleStart,
              cycle_number: progress.cycleNumber, tier,
              contents: { ...REWARDS[tier], week_score: weekScore },
            })
            chestReady = true
            chestTier = tier
          }
        }
      } catch (e) {
        logger.error('API', `[WordHunt] weekly chest hook error: ${(e as Error).message}`)
      }
    }

    res.json({ success: true, alreadySubmitted: false, isRetry, penaltyApplied, data, chestReady, chestTier, freezeBridged, freezesRemaining });
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Hunt submit error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /api/daily-challenge/word-hunt/leaderboard/:date/:language — see wordHuntBoards.ts. */
router.get('/leaderboard/:date/:language', wordHuntDailyBoard);

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

    const { data: statsRow, error: statsError } = await supabase
      .from('daily_word_hunt_stats')
      .select(HUNT_STATS_COLUMNS)
      .eq('puzzle_date', date)
      .eq('language', language)
      .maybeSingle();

    const stats = statsRow as unknown as HuntStatsRow | null;

    if (statsError) {
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

        const hasEfficiency = yourAttempt.efficiency_score !== undefined && yourAttempt.efficiency_score !== null;
        const [{ data: rankData }, { count: worseEfficiency }] = await Promise.all([
          rankQuery.single(),
          hasEfficiency
            ? supabase
              .from('daily_word_hunt_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('puzzle_date', date)
              .eq('language', language)
              .eq('solved', true)
              .lt('efficiency_score', yourAttempt.efficiency_score)
            : Promise.resolve({ count: null }),
        ]);
        let rank: number | undefined;
        if (rankData && playerId) {
          const { count: authPlayersAbove } = await supabase
            .from('daily_word_hunt_leaderboard')
            .select('player_id', { count: 'exact', head: true })
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
        if (hasEfficiency && worseEfficiency !== null && worseEfficiency !== undefined && totalSolved > 0) {
          efficiencyPercentile = Math.round((worseEfficiency / totalSolved) * 100);
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

    const idColumn: 'player_id' | 'guest_fingerprint' = playerId ? 'player_id' : 'guest_fingerprint';
    const idValue = playerId || (guestFingerprint as string);

    let query = supabase
      .from('daily_word_hunt_attempts')
      .select('id, solved, attempts_used, efficiency_score, words_discovered, life_remaining, target_word, attempt_words, completed_at, clue_tokens_earned, clue_tokens_spent, hints_unlocked')
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq(idColumn, idValue);

    const { data: existingAttempt, error } = await query.single();

    if (error && error.code !== 'PGRST116') {
      logger.error('API', `Check played error: ${error.message}`);
      res.status(500).json({ error: 'Failed to check attempt status' });
      return;
    }

    if (existingAttempt) {
      // Guests earn this the same way authenticated players do — see
      // fetchDailyStreak above. No consumer of this response reads
      // `longestStreak` (word_hunt_player_stats never really tracked it live
      // either — see fetchDailyStreak's comment), so it's not fabricated here.
      const { currentStreak } = await fetchDailyStreak(supabase, idColumn, idValue);
      const streakData = { currentStreak };

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
 * GET /api/daily-challenge/word-hunt/streak
 *
 * Standalone streak read — independent of any single day's attempt, unlike
 * /check-played/:date/:language which only returns a streak as a side effect
 * of an existing row for that exact date. This is what lets a hub/landing
 * surface show "you're on day 3" to a guest (or player) who hasn't played
 * today yet, instead of that being visible only after submitting a score.
 *
 * Trust note: like /check-played and /stats above, this is a read of data
 * keyed on whatever playerId/guestFingerprint the caller passes — there is no
 * session check anywhere in this router (submit trusts the same fields to
 * WRITE). That's a pre-existing trust boundary for the whole daily-challenge
 * API, not something this endpoint introduces: it can only be used to look up
 * a streak, never to move or inflate one, so it doesn't add new spoofing
 * surface. Forging someone else's guest_fingerprint to inflate an attempt
 * count would have to go through /submit, which already accepts any
 * client-supplied identifier today — that's an existing gap, out of scope
 * here.
 */
router.get('/streak', async (req: Request<unknown, unknown, unknown, { playerId?: string; guestFingerprint?: string }>, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Service not available' });
      return;
    }

    const playerId = req.query.playerId as string | undefined;
    const guestFingerprint = req.query.guestFingerprint as string | undefined;

    if (!playerId && !guestFingerprint) {
      res.status(400).json({ error: 'Either playerId or guestFingerprint is required' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database connection unavailable' });
      return;
    }

    const idColumn: 'player_id' | 'guest_fingerprint' = playerId ? 'player_id' : 'guest_fingerprint';
    const idValue = playerId || (guestFingerprint as string);

    const streak = await fetchDailyStreak(supabase, idColumn, idValue);
    res.json(streak);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Word Hunt streak error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/daily-challenge/word-hunt/season-leaderboard/:language?season=<id>
 * Season-windowed board (current season by default), folded per player across
 * languages unless `:language` is concrete. See seasonLeaderboard.ts.
 */
router.get('/season-leaderboard/:language', createSeasonLeaderboardHandler('daily_word_hunt_season_leaderboard'));

/** GET /api/daily-challenge/word-hunt/alltime-leaderboard/:language — see wordHuntBoards.ts. */
router.get('/alltime-leaderboard/:language', wordHuntAlltimeBoard);

export default router;

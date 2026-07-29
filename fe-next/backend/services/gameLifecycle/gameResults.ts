/**
 * Game Results Service
 *
 * Handles recording game results to Supabase and emitting XP/engagement events.
 */

import type { Server } from 'socket.io';
import type { WordDetail } from '@/shared/types';
import type { GameState } from '../../modules/gameState/types';
import { processGameResults, isSupabaseConfigured } from '../../modules/supabaseServer';
import { notifyLevelUp, notifyAchievementsBatch, getUserLocalesBatch } from '../../modules/pushNotificationTriggers';
import type { PushLocale } from '../../utils/pushTranslations';
import type { GameResultsOutput } from '../../modules/supabase/gameProcessing';
import type { UserAuthInfo } from '../../modules/supabase/client';
import { updateQuestProgress } from '../../modules/weeklyQuestManager';
import { completeMissionForMode } from '../../modules/dailyMissionsManager';
import type { GameStats } from '@/shared/weeklyQuestTemplates';
import { getSocketById, safeEmit } from '../../utils/socketHelpers';
import { incrementWordApproval } from '../../redis/wordApproval';
import { processGameEndEngagement, processAchievementEngagement } from '../../handlers/engagementHandler';
import { updateRankedMmr, fetchRankedBaselines, type RankedParticipant } from '../../modules/supabase/rankedMmr';
import { DEFAULT_RATING, DEFAULT_RD } from '@/shared/utils/eloRating';
import logger from '../../utils/logger';
import type { PlayerResult, UserData } from './types';
import { verifyBoostToken } from '../../utils/boostToken';
import { applyFirstWordBonus, applyScoreMultiplier } from '@/shared/utils/boostEffects';
import { getPostHogServer } from '@/lib/posthog';

export interface PlayerBoostClaim { sessionId: string; token: string }

/**
 * Apply boost tokens (firstWordBonus, scoreMultiplier) to player scores.
 *
 * scoreMultiplier requires real word timestamps. The bridge prefers `ts` (already
 * supplied by some callers/tests), falls back to `timestamp` (the field declared
 * on WordDetail and populated by `scoreManager.recordWordForPlayer`). When no
 * source has a real timestamp the boost FAILS CLOSED — applying with ts=0 would
 * place every word "before" the cutoff and grant the multiplier unconditionally,
 * which the v1 audit (SRV-CRIT-1) flagged as exploitable.
 */
export function applyBoostsToScores(
  scores: PlayerResult[],
  claimsByUsername: Record<string, PlayerBoostClaim>,
  gameStartTs: number,
): PlayerResult[] {
  return scores.map((player) => {
    const claim = claimsByUsername[player.username];
    if (!claim) return player;
    const v = verifyBoostToken(claim.token, claim.sessionId);
    if (!v.valid || !v.boostType) return player;

    // Bridge timestamp from `ts` (caller-provided) or WordDetail.timestamp.
    // Records without either get ts=0 and we use the resolved-flag below to
    // decide whether scoreMultiplier can safely run.
    let anyResolvedTs = false;
    const wordDetails = (player.wordDetails ?? []).map((w: any) => {
      const resolved = (typeof w.ts === 'number' ? w.ts : undefined)
        ?? (typeof w.timestamp === 'number' ? w.timestamp : undefined);
      if (resolved !== undefined) anyResolvedTs = true;
      return { ...w, ts: resolved ?? 0 };
    });
    let nextWords = wordDetails;
    let boostApplied = false;

    if (v.boostType === 'firstWordBonus') {
      nextWords = applyFirstWordBonus(wordDetails);
      boostApplied = true;
    }
    else if (v.boostType === 'scoreMultiplier') {
      // Fail closed if no timestamps OR no game start reference — without a
      // verifiable submit-time we can't prove a word landed inside the window.
      if (!anyResolvedTs || !gameStartTs || gameStartTs <= 0) {
        return player;
      }
      nextWords = applyScoreMultiplier(wordDetails, gameStartTs);
      boostApplied = true;
    }
    else return player;

    const totalScore = nextWords.reduce((s, w) => s + (w.score ?? 0), 0);

    // Emit PostHog event for applied boost
    if (boostApplied) {
      getPostHogServer()?.capture({
        distinctId: player.username,
        event: 'boost_applied',
        properties: {
          boost_type: v.boostType,
          mode: 'mp',
        },
      });
    }

    return { ...player, wordDetails: nextWords as typeof player.wordDetails, totalScore };
  });
}

// Track pending engagement timeouts per game so they can be cleared on game cleanup
const pendingEngagementTimeouts = new Map<string, ReturnType<typeof setTimeout>[]>();

/**
 * Clear all pending engagement timeouts for a game.
 * Should be called when a game is deleted/cleaned up to prevent
 * orphaned Supabase queries from dead sockets.
 */
export function clearEngagementTimeouts(gameCode: string): void {
  const timeouts = pendingEngagementTimeouts.get(gameCode);
  if (timeouts) {
    for (const t of timeouts) clearTimeout(t);
    pendingEngagementTimeouts.delete(gameCode);
    logger.debug('ENGAGEMENT', `Cleared ${timeouts.length} pending engagement timeout(s) for game ${gameCode}`);
  }
}

/**
 * Record game results to Supabase and emit XP/engagement events
 */
export async function recordGameResultsToSupabase(
  io: Server,
  gameCode: string,
  scoresArray: PlayerResult[],
  game: GameState
): Promise<void> {
  try {
    // Filter out bot players — they have no auth identity and shouldn't be persisted
    const humanScores = scoresArray.filter(
      (p) => !(game.users?.[p.username] as unknown as { isBot?: boolean })?.isBot
    );
    if (humanScores.length === 0) {
      logger.debug('GAME_RESULTS', `Game ${gameCode} had only bots, skipping Supabase save`);
      return;
    }

    // Build userAuthMap from game.users (humans only)
    const userAuthMap: Record<string, UserAuthInfo> = {};

    for (const [username, userData] of Object.entries(game.users || {}) as [
      string,
      UserData
    ][]) {
      if ((userData as unknown as { isBot?: boolean }).isBot) continue;
      userAuthMap[username] = {
        authUserId: userData.authUserId,
        guestTokenHash: userData.guestTokenHash,
        guestSessionId: userData.guestSessionId,
        socketId: userData.socketId,
      };

      // Debug: Log auth info for each player
      logger.info('GAME_RESULTS', `Player ${username} auth context: authUserId=${userData.authUserId || 'NONE'}, guestHash=${userData.guestTokenHash ? 'yes' : 'no'}`);
    }

    // Build gameInfo from game object
    const gameInfo = {
      language: game.language || 'en',
      isRanked: game.isRanked || false,
      timePlayed: game.timerSeconds || 0,
      gameMode: game.gameMode || 'classic',
    };

    // Boosts are applied upstream in `processFinalScores` (gameScores.ts) so
    // broadcast and persist see identical totals. The scores arriving here are
    // already boosted; do NOT re-apply (would double the multiplier).
    const boostedScores = humanScores;

    // Sort scores to calculate placements for stats recording
    const sortedForStats = [...boostedScores].sort(
      (a, b) => b.totalScore - a.totalScore
    );
    const totalPlayersInGame = humanScores.length;

    // Map PlayerResult[] to PlayerScore[] format expected by processGameResults
    const mappedScores = boostedScores.map((playerResult) => {
      const placement =
        sortedForStats.findIndex((p) => p.username === playerResult.username) + 1;
      const longestWord =
        playerResult.wordDetails?.reduce(
          (max: string, w: WordDetail) =>
            (w.word?.length || 0) > (max?.length || 0) ? w.word : max,
          ''
        ) || '';

      return {
        username: playerResult.username,
        score: playerResult.totalScore || 0,
        wordCount: playerResult.wordDetails?.length || 0,
        longestWord,
        placement,
        achievements: playerResult.achievements?.map((a) => a.key) || [],
        totalPlayers: totalPlayersInGame,
      };
    });

    const results: GameResultsOutput = await processGameResults(
      gameCode,
      mappedScores,
      gameInfo,
      userAuthMap
    );
    logger.info('SUPABASE', `Game ${gameCode} results recorded`);

    // Update ranked MMR if this was a ranked game
    // Farming guards: minimum duration + minimum max-score to prevent
    // forfeit/rage-quit MMR boosting (start game → opponent leaves → free win).
    const MIN_RANKED_DURATION_SEC = 60;
    const MIN_RANKED_MAX_SCORE = 20;
    const maxScore = scoresArray.reduce(
      (m, p) => ((p.totalScore || 0) > m ? (p.totalScore || 0) : m),
      0
    );
    const durationOk = (gameInfo.timePlayed || 0) >= MIN_RANKED_DURATION_SEC;
    const scoreOk = maxScore >= MIN_RANKED_MAX_SCORE;
    if (gameInfo.isRanked && scoresArray.length >= 2 && !(durationOk && scoreOk)) {
      logger.warn(
        'RANKED',
        `Skipping MMR for ${gameCode}: duration=${gameInfo.timePlayed}s maxScore=${maxScore} (floor ${MIN_RANKED_DURATION_SEC}s / ${MIN_RANKED_MAX_SCORE}pts)`
      );
    }
    if (gameInfo.isRanked && scoresArray.length >= 2 && durationOk && scoreOk) {
      try {
        const sortedForRanked = [...boostedScores].sort((a, b) => b.totalScore - a.totalScore);
        const playerIds = sortedForRanked
          .map(p => (game.users?.[p.username] as UserData | undefined)?.authUserId)
          .filter((id): id is string => !!id);
        const baselines = await fetchRankedBaselines(playerIds);
        const rankedParticipants: RankedParticipant[] = sortedForRanked.map((p, i) => {
          const userData = game.users?.[p.username] as UserData | undefined;
          const playerId = userData?.authUserId || '';
          const baseline = baselines.get(playerId);
          return {
            playerId,
            placement: i + 1,
            score: p.totalScore,
            currentMmr: baseline?.currentMmr ?? DEFAULT_RATING,
            peakMmr: baseline?.peakMmr ?? DEFAULT_RATING,
            rd: baseline?.rd ?? DEFAULT_RD,
            gamesPlayed: baseline?.gamesPlayed ?? 0,
            priorWins: baseline?.priorWins ?? 0,
          };
        }).filter(p => p.playerId);

        if (rankedParticipants.length >= 2) {
          await updateRankedMmr(rankedParticipants);
          logger.info('RANKED', `Updated MMR for ${rankedParticipants.length} players in game ${gameCode}`);
        }
      } catch (rankedErr) {
        logger.error('RANKED', `Failed to update MMR for game ${gameCode}: ${(rankedErr as Error).message}`);
      }
    }

    // Pre-fetch every notify-eligible recipient's locale in ONE query so the
    // emit* fan-outs below don't trigger N+1 profiles round-trips. Previously
    // each notifyLevelUp / notifyAchievementsBatch call awaited its own
    // getUserLocale, saturating the Supabase semaphore (Sentry 136).
    const notifyAuthIds = collectNotifyAuthIds(results, game);
    const localeMap = await getUserLocalesBatch(notifyAuthIds);

    // Emit XP events to each player
    emitXpEvents(io, results, game, localeMap);

    // Emit lifetime achievements to players
    emitLifetimeAchievements(io, results, game, localeMap);

    // Process engagement events for each player
    await processEngagementEvents(io, scoresArray, game, gameCode);

    // Update weekly quest progress for each authenticated player
    await updateWeeklyQuestProgressForPlayers(scoresArray, game, userAuthMap, io);

    // Fire-and-forget: mark multiplayer quest slot complete for each human player
    for (const p of humanScores) {
      const authUserId = (game.users?.[p.username] as UserData | undefined)?.authUserId;
      if (authUserId) {
        completeMissionForMode(authUserId, 'multiplayer').catch(() => {});
      }
    }

    // Increment word approval counts for dictionary words
    // OPTIMIZATION: Batch all operations with Promise.all instead of sequential awaits
    // This reduces score processing time from 10+ seconds to ~100ms for typical games
    await incrementWordApprovals(scoresArray, game.language || 'en', gameCode);
  } catch (err: unknown) {
    const error = err as Error;
    logger.error('SUPABASE', `Failed to record game results: ${error.message}`);
  }
}

/**
 * Emit XP gained and level up events to players
 */
 
function collectNotifyAuthIds(results: any, game: GameState): string[] {
  const ids = new Set<string>();
  for (const [username, xp] of Object.entries(results?.xpResults ?? {}) as [string, any][]) {
    if (xp?.leveledUp) {
      const authUserId = (game.users?.[username] as UserData | undefined)?.authUserId;
      if (authUserId) ids.add(authUserId);
    }
  }
  for (const [username, list] of Object.entries(results?.lifetimeAchievements ?? {}) as [string, any[]][]) {
    if (Array.isArray(list) && list.length > 0) {
      const authUserId = (game.users?.[username] as UserData | undefined)?.authUserId;
      if (authUserId) ids.add(authUserId);
    }
  }
  return Array.from(ids);
}

function emitXpEvents(
  io: Server,
  results: any,
  game: GameState,
  localeMap: Map<string, PushLocale> = new Map()
): void {
  if (!results.xpResults) return;

   
  for (const [username, xpInfo] of Object.entries(results.xpResults) as [string, any][]) {
    if (xpInfo.socketId) {
      const playerSocket = getSocketById(io, xpInfo.socketId);
      if (playerSocket) {
        // Emit XP gained event
        safeEmit(playerSocket, 'xpGained', {
          xpEarned: xpInfo.xpEarned,
          xpBreakdown: xpInfo.xpBreakdown,
          newTotalXp: xpInfo.newTotalXp,
          newLevel: xpInfo.newLevel,
        });
        logger.debug('XP', `Emitted xpGained to ${username}: +${xpInfo.xpEarned} XP`);

        // Emit level up event if applicable
        if (xpInfo.leveledUp) {
          safeEmit(playerSocket, 'levelUp', {
            oldLevel: xpInfo.oldLevel,
            newLevel: xpInfo.newLevel,
            levelsGained: xpInfo.levelsGained,
            newTitles: xpInfo.newTitles || [],
          });
          logger.info(
            'XP',
            `Emitted levelUp to ${username}: ${xpInfo.oldLevel} -> ${xpInfo.newLevel}`
          );
          const authUserId = (game.users?.[username] as UserData | undefined)?.authUserId;
          if (authUserId) {
            notifyLevelUp(authUserId, xpInfo.newLevel, localeMap.get(authUserId) ?? 'en');
          }
        }
      }
    }
  }
}

/**
 * Emit lifetime achievement unlock events
 */
 
function emitLifetimeAchievements(
  io: Server,
  results: any,
  game: GameState,
  localeMap: Map<string, PushLocale> = new Map()
): void {
  if (!results.lifetimeAchievements) return;

   
  for (const [username, achievements] of Object.entries(results.lifetimeAchievements) as [string, any[]][]) {
    if (achievements.length > 0) {
      // Find the user's socket
      const userData = game.users?.[username] as UserData | undefined;
      if (userData?.socketId) {
        const playerSocket = getSocketById(io, userData.socketId);
        if (playerSocket) {
          safeEmit(playerSocket, 'lifetimeAchievementsUnlocked', {
            achievements: achievements,
          });
          logger.info(
            'ACHIEVEMENT',
            `Emitted ${achievements.length} lifetime achievement(s) to ${username}: ${achievements.map((a) => a.key).join(', ')}`
          );
        }
      }
      if (userData?.authUserId) {
        // Pass raw keys so the trigger resolves locale-aware names from the
        // shared achievements translation table; batch coalesces N unlocks
        // into a single push (was N separate banners pre-batch).
        const keys = achievements.map((a) => a.key as string);
        notifyAchievementsBatch(userData.authUserId, keys, localeMap.get(userData.authUserId) ?? 'en');
      }
    }
  }
}

/**
 * Process engagement events for each player
 * Handles daily challenges, near-misses, mystery rewards
 */
async function processEngagementEvents(
  io: Server,
  scoresArray: PlayerResult[],
  game: GameState,
  gameCode: string
): Promise<void> {
  const playerCount = scoresArray.length;
  const sortedScores = [...scoresArray].sort(
    (a, b) => b.totalScore - a.totalScore
  );
  const winnerUsername = sortedScores[0]?.username;

  for (const playerResult of scoresArray) {
    const userData = game.users?.[playerResult.username] as UserData | undefined;
    if (!userData) continue;

    const playerSocket = getSocketById(io, userData.socketId);
    const playerId = userData.authUserId;

    // Build game stats for engagement processing
    const gameStats = {
      score: playerResult.totalScore || 0,
      wordCount: playerResult.wordDetails?.length || 0,
      longestWord:
        playerResult.wordDetails?.reduce(
          (max: string, w: WordDetail) =>
            (w.word?.length || 0) > (max?.length || 0) ? w.word : max,
          ''
        ) || '',
      isWinner: playerResult.username === winnerUsername && playerCount > 1,
      placement:
        sortedScores.findIndex((p) => p.username === playerResult.username) + 1,
      playerCount,
      achievements: playerResult.achievements?.map((a) => a.key) || [],
    };

    // Process engagement (daily challenges, near-misses, mystery rewards)
    // Mystery rewards are delayed by 15 seconds to avoid overwhelming users
    if (playerSocket && playerId) {
      const timeoutId = setTimeout(async () => {
        // Skip if socket disconnected while we were waiting
        if (playerSocket.disconnected) {
          logger.debug('ENGAGEMENT', `Skipping engagement for ${playerId} - socket disconnected`);
          return;
        }

        try {
          await processGameEndEngagement(playerSocket, playerId, gameStats, gameCode);

          // Process achievement engagement for mystery rewards
          for (const achievement of playerResult.achievements || []) {
            if (playerSocket.disconnected) break;
            await processAchievementEngagement(
              playerSocket,
              playerId,
              achievement.key,
              gameCode
            );
          }
        } catch (err) {
          logger.error('ENGAGEMENT', `Delayed engagement failed for ${playerId}: ${(err as Error).message}`);
        }
      }, 15000); // 15 second delay

      // Track timeout for cleanup
      const gameTimeouts = pendingEngagementTimeouts.get(gameCode) || [];
      gameTimeouts.push(timeoutId);
      pendingEngagementTimeouts.set(gameCode, gameTimeouts);
    }
  }
}

/**
 * Increment word approval counts for dictionary words
 * Batched for performance
 */
async function incrementWordApprovals(
  scoresArray: PlayerResult[],
  language: string,
  gameCode: string
): Promise<void> {
  const wordApprovalOps: Promise<unknown>[] = [];

  for (const playerResult of scoresArray) {
    for (const wordDetail of playerResult.wordDetails || []) {
      if (wordDetail.validated && wordDetail.inDictionary) {
        wordApprovalOps.push(incrementWordApproval(wordDetail.word, language, gameCode));
      }
    }
  }

  if (wordApprovalOps.length > 0) {
    await Promise.all(wordApprovalOps);
  }
}

/**
 * Update weekly quest progress for all authenticated players after a game.
 */
async function updateWeeklyQuestProgressForPlayers(
  scoresArray: PlayerResult[],
  game: GameState,
  userAuthMap: Record<string, UserAuthInfo>,
  io?: Server,
): Promise<void> {
  const isWin = (username: string) => {
    const sorted = [...scoresArray].sort((a, b) => b.totalScore - a.totalScore);
    return sorted[0]?.username === username;
  };

  const ops = scoresArray.map(async (player) => {
    const authInfo = userAuthMap[player.username];
    if (!authInfo?.authUserId) return;

    // Extract max combo from word details (each word records its comboLevel)
    const playerMaxCombo = (player.wordDetails ?? []).reduce(
      (max, w) => Math.max(max, w.comboLevel ?? 0), 0
    );

    const wordsCount = player.wordDetails?.length ?? 0;
    const stats: GameStats = {
      gamesPlayed: 1,
      wordsFound: wordsCount,
      wordsInSession: wordsCount,
      longWordsFound: player.wordDetails?.filter(w => (w.word?.length ?? 0) >= 6).length ?? 0,
      maxCombo: playerMaxCombo,
      maxScore: player.totalScore ?? 0,
      multiplayerWins: isWin(player.username) ? 1 : 0,
    };

    try {
      const questResult = await updateQuestProgress(authInfo.authUserId, stats);
      if (questResult?.completed && io) {
        const userData = game.users?.[player.username];
        if (userData?.socketId) {
          io.to(userData.socketId).emit('weeklyQuestCompleted', {
            questType: questResult.questType,
            xpReward: questResult.xpReward,
            description: questResult.description,
          });
        }
      }
    } catch (err) {
      logger.error('WEEKLY_QUEST', `Failed to update quest for ${player.username}: ${err}`);
    }
  });

  await Promise.all(ops);
}

export { isSupabaseConfigured };

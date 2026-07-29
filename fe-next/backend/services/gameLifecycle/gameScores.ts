/**
 * Game Scores Service
 *
 * Handles final score calculation, achievements,
 * and broadcasting results to all players.
 */

import type { Server } from 'socket.io';
import { getGame } from '../../modules/gameStateManager';
import { isDictionaryWord } from '../../dictionary';
import {
  isWordCommunityValid,
  isWordValidForScoring,
} from '../../modules/communityWordManager';
import { calculateGameScores, type PlayerScoreResult } from '../../modules/scoringEngine';
import { sortWithWordHuntWinner } from '@/shared/utils/scoring';
import {
  awardFinalAchievements,
  ACHIEVEMENT_ICONS,
} from '../../modules/achievementManager';
import { calculatePlayerTitles } from '../../modules/playerTitlesManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { isSupabaseConfigured } from '../../modules/supabaseServer';
import { recordGameResultsToSupabase, applyBoostsToScores } from './gameResults';
import logger from '../../utils/logger';

/**
 * Calculate and broadcast final scores
 *
 * Performs:
 * 1. Word validation (dictionary, community, AI)
 * 2. Score calculation with duplicate handling
 * 3. Achievement awarding
 * 4. Title calculation
 * 5. Broadcasting results to all clients
 * 6. Recording to database
 */
export async function calculateAndBroadcastFinalScores(
  io: Server,
  gameCode: string
): Promise<void> {
  const game = getGame(gameCode);
  if (!game || game.gameState !== 'finished') return;

  logger.info('FINAL_SCORES', `Calculating final scores for game ${gameCode}`);
  const language = game.language || 'en';

  // Build data structures in single pass
  const wordCountMap: Record<string, number> = {};
  const wordToSubmitters = new Map<string, string[]>();
  const dictionaryValidatedWords = new Set<string>();
  const communityValidatedWords = new Set<string>();
  const nonDictionaryWords: string[] = [];
  const seenWords = new Set<string>();

  for (const [username, words] of Object.entries(game.playerWords || {}) as [
    string,
    string[]
  ][]) {
    const isBot = game.users?.[username]?.isBot;
    for (const word of words) {
      // Only humans affect wordCountMap/submitters — bots must not strip uniqueness bonuses
      if (!isBot) {
        wordCountMap[word] = (wordCountMap[word] || 0) + 1;

        if (!wordToSubmitters.has(word)) {
          wordToSubmitters.set(word, []);
        }
        wordToSubmitters.get(word)!.push(username);
      }

      // All players (including bots) get dictionary validation so their words show up in results
      if (!seenWords.has(word)) {
        seenWords.add(word);

        if (isDictionaryWord(word, language)) {
          dictionaryValidatedWords.add(word);
        } else if (
          isWordCommunityValid(word, language) ||
          isWordValidForScoring(word, language)
        ) {
          communityValidatedWords.add(word);
        } else {
          nonDictionaryWords.push(word);
        }
      }
    }
  }

  // Non-dictionary words are rejected (no AI validation)
  const aiValidatedWords = new Map<string, any>();

  if (nonDictionaryWords.length > 0) {
    logger.info('FINAL_SCORES', `Rejecting ${nonDictionaryWords.length} non-dictionary words (AI validation disabled)`);
    for (const word of nonDictionaryWords) {
      aiValidatedWords.set(word, {
        isValid: false,
        isAiVerified: false,
        reason: 'Not in dictionary',
      });
    }
  }

  // Get player count for duplicate rule logic
  const playerCount = Object.keys(game.users || {}).length;

  // Disable duplicate rule for large rooms (more than 7 players) or Word Hunt mode
  const duplicateRuleDisabled = playerCount > 7 || game.gameMode === 'word-hunt';

  // Calculate final scores

  const finalScores: PlayerScoreResult[] = calculateGameScores(
    game as any,
    wordCountMap,
    dictionaryValidatedWords,
    communityValidatedWords,
    aiValidatedWords,
    { playerCount, gameMode: game.gameMode }
  );

  // Apply MP boost tokens (firstWordBonus, scoreMultiplier) BEFORE sorting and
  // before broadcast so client and Supabase see the same totals — previously
  // boosts were only applied inside recordGameResultsToSupabase, which left the
  // 'validatedScores' broadcast unboosted (audit SRV-M1). PlayerResult shape is
  // a superset of the boost helper's input so the cast is safe.
  if (game.playerBoosts && Object.keys(game.playerBoosts).length > 0) {
    const gameStartTs = game.gameStartedAt ?? game.startTime ?? game.createdAt ?? 0;
    const boosted = applyBoostsToScores(
      finalScores as unknown as Parameters<typeof applyBoostsToScores>[0],
      game.playerBoosts,
      gameStartTs,
    );
    finalScores.length = 0;
    finalScores.push(...(boosted as unknown as PlayerScoreResult[]));
  }

  // In Word Hunt, the player who found the target word is the winner
  // Re-sort so target finder ranks first, others by score
  if (game.gameMode === 'word-hunt' && game.wordHuntState?.targetFoundBy) {
    const sorted = sortWithWordHuntWinner(finalScores, game.wordHuntState.targetFoundBy, (p) => p.totalScore);
    finalScores.length = 0;
    finalScores.push(...sorted);
  }

  // Update game state with final scores
  for (const playerResult of finalScores) {
    game.playerScores[playerResult.username] = playerResult.totalScore;
  }

  // Award final achievements
  const usernames = finalScores.map((p) => p.username);
   
  awardFinalAchievements(game as any, usernames);

  // Copy achievements to player results (convert keys to objects with icons)
  // PlayerScoreResult.achievements is string[], convert for broadcast
  const resultsWithIconAchievements = finalScores.map((playerResult) => {
    const achievementKeys: string[] = playerResult.achievements || [];
    return {
      ...playerResult,
      achievements: achievementKeys.map((key) => ({
        key,
        icon: ACHIEVEMENT_ICONS[key] || '🏅',
      })),
    };
  });

  // Calculate player titles
   
  const titles = calculatePlayerTitles(resultsWithIconAchievements as any, game as any);
  for (const playerResult of resultsWithIconAchievements) {
    (playerResult as Record<string, unknown>).titles = titles[playerResult.username] || [];
  }

  // Build word hunt summary if applicable
  const huntState = game.gameMode === 'word-hunt' ? game.wordHuntState : null;
  const wordHuntSummary = huntState ? {
    targetWord: huntState.targetWord,
    playerLives: huntState.playerLives as Record<string, number>,
    eliminatedPlayers: huntState.eliminatedPlayers as string[],
    targetFoundBy: huntState.targetFoundBy as string | null,
    foundTarget: !!huntState.targetFoundBy,
    survivalTime: game.gameStartedAt ? Math.round((Date.now() - game.gameStartedAt) / 1000) : 0,
    discoveryWords: huntState.discoveryWordCount || 0,
  } : undefined;

  // Build blast mode summary if applicable
  const blastState = game.gameMode === 'blast' ? game.blastModeState : null;
  const blastSummary = blastState ? {
    playerMoves: blastState.playerMoves as Record<string, number>,
    playerStats: blastState.playerStats ?? {},
  } : undefined;

  // Build wheel rush summary if applicable
  const wheelRushState = game.gameMode === 'wheel-rush' ? game.wheelRushState : null;
  const wheelRushSummary = wheelRushState ? {
    playerStats: wheelRushState.playerStats ?? {},
  } : undefined;

  // Broadcast results to all clients
  // Host expects 'validationComplete', players expect 'validatedScores'
  // Include duplicateRuleDisabled flag so frontend can display a notice
  const resultsPayload = {
    scores: resultsWithIconAchievements,
    letterGrid: game.letterGrid,
    duplicateRuleDisabled,
    playerCount,
    gameMode: game.gameMode,
    wordHuntSummary,
    blastSummary,
    wheelRushSummary,
    tvMode: game.tvMode ?? false,
  };
  // Cache results on game state so reconnecting clients can retrieve them
  game.cachedResultsPayload = resultsPayload;

  broadcastToRoom(io, getGameRoom(gameCode), 'validatedScores', resultsPayload);
  broadcastToRoom(io, getGameRoom(gameCode), 'validationComplete', resultsPayload);

  // Record to database
  if (isSupabaseConfigured()) {
    await recordGameResultsToSupabase(io, gameCode, resultsWithIconAchievements, game);
  }
}

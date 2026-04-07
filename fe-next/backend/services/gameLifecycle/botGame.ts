/**
 * Bot Game Service
 *
 * Handles bot initialization and submission handling for multiplayer games.
 * Includes score capping to ensure bots never outscore the best human player.
 */

import type { Server } from 'socket.io';
import type { LetterGrid, Language } from '@/shared/types';
import {
  addPlayerWord,
  updatePlayerScore,
  trackBotWord,
  getLeaderboard,
  getGame,
  recordFirstFinder,
} from '../../modules/gameStateManager';
import { broadcastToRoom, volatileBroadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { calculateBlastTileBonus, getTilesOnPath, recordBlastMove, getWordPath } from '../../modules/blastModeManager';
import { processTilesForWord } from '@/components/blast/utils/clearTilesProcessor';
import { computeGravityResult } from '@/components/blast/utils/blastGravity';
import { createSeededRandom } from '@/components/blast/utils/blastLetterGenerator';
import { BLAST_SPECIAL_TILE_CHANCE } from '@/shared/constants/blastMultiplayerConstants';
import { BOARD_WORD_SCORE_PER_LETTER } from '@/shared/constants/wordHuntMultiplayerConstants';
import * as botManager from '../../modules/botManager';
import logger from '../../utils/logger';
import type { BotSubmission } from './types';
import type { Bot } from '../../modules/botBehavior';
import { startBotsForWordHunt } from './botWordHunt';
import { restoreLife, getLifeBonus } from '../../modules/wordHuntManager';

/** Score target ratios per difficulty — bots aim for this % of best human score */
const BOT_SCORE_TARGET: Record<string, number> = {
  easy: 0.55,    // Easy bots aim for ~55% of best human
  medium: 0.80,  // Medium bots aim for ~80%
  hard: 0.95,    // Hard bots aim for ~95% — close but usually beatable
};

/** Minimum score bots can reach before any human scores (creates early pressure) */
const BOT_INITIAL_CEILING: Record<string, number> = {
  easy: 40,
  medium: 80,
  hard: 150,
};

/**
 * Get the best human (non-bot) player's score in a game.
 */
export function getBestHumanScore(gameCode: string): number {
  const leaderboard = getLeaderboard(gameCode);
  let best = 0;
  for (const entry of leaderboard) {
    if (!entry.isBot && entry.score > best) {
      best = entry.score;
    }
  }
  return best;
}

/**
 * Check whether a bot should be allowed to score.
 * Bots target a percentage of the best human's score (difficulty-dependent).
 * This creates competitive pressure without making bots unbeatable.
 * A ±10% random variance is applied to the target to feel natural.
 */
export function shouldBotScore(
  gameCode: string,
  _botUsername: string,
  currentBotScore: number,
  pendingScore: number,
  botDifficulty: string = 'medium'
): boolean {
  const bestHuman = getBestHumanScore(gameCode);
  const projectedScore = currentBotScore + pendingScore;

  if (bestHuman === 0) {
    // No human scored yet — allow up to difficulty-based ceiling
    const ceiling = BOT_INITIAL_CEILING[botDifficulty] ?? BOT_INITIAL_CEILING.medium;
    return projectedScore <= ceiling;
  }

  const baseTarget = BOT_SCORE_TARGET[botDifficulty] ?? BOT_SCORE_TARGET.medium;
  // Add slight per-game variance (±10%) so bots don't always land at exact same ratio
  const variance = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
  const scoreTarget = bestHuman * baseTarget * variance;

  return projectedScore <= scoreTarget;
}

/**
 * Start bots for a game
 *
 * Note: Bot initialization is async but we don't await to avoid blocking the game timer.
 * Each bot tracks its own start time to calculate accurate remaining game time.
 */
export function startBotsForGame(
  io: Server,
  gameCode: string,
  letterGrid: LetterGrid | null,
  language: Language,
  timerSeconds: number
): void {
  const bots: Bot[] = botManager.getGameBots(gameCode);
  if (bots.length === 0) return;

  const game = getGame(gameCode);
  const isWordHunt = game?.gameMode === 'word-hunt' && game.wordHuntState;

  // Safety check: ensure letterGrid is valid before starting bots
  if (!letterGrid || !Array.isArray(letterGrid) || letterGrid.length === 0) {
    logger.error('BOT', `Cannot start bots for game ${gameCode}: letterGrid is invalid`);
    return;
  }

  logger.info('BOT', `Starting ${bots.length} bots for game ${gameCode}`);

  // Store game start time so bots can calculate actual remaining time
  const gameStartTime = Date.now();

  for (const bot of bots) {
    botManager.startBot(
      bot,
      letterGrid,
      language,
      async (submission: BotSubmission) => {
        const { username, word, score, comboLevel } = submission;

        if (!bot || !bot.isActive) return;

        if (!word || typeof word !== 'string') {
          logger.warn('BOT', `Bot "${username}" submitted invalid word: ${word}`);
          return;
        }

        // Get current game state for mode-specific logic
        const currentGame = getGame(gameCode);

        // Bug fix: Calculate blast mode tile bonus (same as human path)
        let blastTileBonus = 0;
        if (currentGame?.gameMode === 'blast' && currentGame.blastModeState) {
          try {
            const blastState = currentGame.blastModeState;
            const tilesOnPath = getTilesOnPath(
              word,
              currentGame.letterPositions || new Map(),
              blastState.overlay,
              blastState.overlayMap
            );
            blastTileBonus = calculateBlastTileBonus(tilesOnPath);
            const gemCount = tilesOnPath.filter((t: string) => t === 'gem').length;
            recordBlastMove(blastState, username, comboLevel || 0, word, tilesOnPath.length, gemCount, blastTileBonus);

            // Mutate board state + broadcast (same as human words in wordValidationHandler)
            if (blastState.grid && blastState.tileStates) {
              const wordPath = getWordPath(word, currentGame.letterPositions || new Map());
              const gridSize = blastState.grid.length;
              const totalMoves = (blastState.totalMoves ?? 0) + 1;
              blastState.totalMoves = totalMoves;
              const rng = createSeededRandom((blastState.seed ?? 0) + totalMoves);

              const processResult = processTilesForWord({
                prev: blastState.tileStates,
                path: wordPath,
                word,
                baseScore: word.length - 1,
                gridSize,
                currentWave: 1,
                rng,
              });

              const gravityResult = computeGravityResult(
                blastState.grid, processResult.next, gridSize,
                language, BLAST_SPECIAL_TILE_CHANCE,
                undefined, 0, rng,
                false, // no refill — tiles stay missing
              );

              blastState.grid = gravityResult.newGrid;
              blastState.tileStates = gravityResult.newTileStates;

              broadcastToRoom(io, getGameRoom(gameCode), 'blastBoardUpdate', {
                grid: gravityResult.newGrid,
                tileStates: gravityResult.newTileStates,
                clearedBy: username,
                word,
                clearedCount: processResult.newlyClearedCount,
                totalMoves,
              });
            }
          } catch (err) {
            logger.error('BOT', `Blast bonus error for "${username}": ${(err as Error).message}`);
          }
        }

        // Word Hunt board bonus: extra score per letter for finding grid words
        const wordHuntBoardBonus = (currentGame?.gameMode === 'word-hunt' && currentGame.wordHuntState)
          ? word.length * BOARD_WORD_SCORE_PER_LETTER
          : 0;

        const totalScore = score + blastTileBonus + wordHuntBoardBonus;

        // Score cap: keep bot within competitive range of best human
        if (!shouldBotScore(gameCode, username, bot.score, totalScore, bot.difficulty)) {
          logger.debug('BOT', `Bot "${username}" score capped at ${bot.score} (target reached for ${bot.difficulty})`);
          return;
        }

        // Bug fix: Sync combo to server state (mirrors wordValidationHandler)
        if (currentGame) {
          if (!currentGame.playerCombos) currentGame.playerCombos = {};
          currentGame.playerCombos[username] = (comboLevel || 0) + 1;
        }

        addPlayerWord(gameCode, username, word, {
          autoValidated: true,
          score: totalScore,
          comboBonus: 0,
          comboLevel: comboLevel || 0,
          isBot: true,
        });

        // Record bot as first finder so humans get "found by other" feedback
        recordFirstFinder(gameCode, word, username, bot.avatar);

        // Restore bot life in Word Hunt mode (same as humans)
        if (currentGame?.gameMode === 'word-hunt' && currentGame.wordHuntState) {
          try {
            const lifeBonus = getLifeBonus(word.length);
            restoreLife(currentGame.wordHuntState, username, lifeBonus);
            // Broadcast life update so frontend leaderboard shows bot life recovery
            broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
              playerLives: currentGame.wordHuntState.playerLives,
              eliminatedPlayers: currentGame.wordHuntState.eliminatedPlayers,
            });
          } catch { /* non-critical */ }
        }

        trackBotWord(gameCode, word, username, totalScore);
        updatePlayerScore(gameCode, username, totalScore, true);

        // Broadcast bot word activity so players see bots are playing
        volatileBroadcastToRoom(io, getGameRoom(gameCode), 'botWordFound', {
          username,
          word,
          score: totalScore,
        });

        // Also emit playerFoundWord so the frontend treats bot words like human words
        // (leaderboard updates, opponent activity feed, word count tracking)
        const playerWordCount = currentGame?.playerWords?.[username]?.length || 0;
        volatileBroadcastToRoom(io, getGameRoom(gameCode), 'playerFoundWord', {
          username,
          word,
          wordCount: playerWordCount,
          score: (currentGame?.playerScores?.[username] || 0),
          comboLevel: comboLevel || 0,
        });

        const leaderboard = getLeaderboard(gameCode);
        volatileBroadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', {
          leaderboard,
        });
      },
      timerSeconds,
      gameStartTime
    );
  }

  // Word Hunt: also start target-guessing loop AFTER classic word-finding init.
  // Must be after startBot() since startBot calls stopBot() which clears activeTimers.
  // Use setTimeout(0) to ensure startBot's sync initialization completes first.
  if (isWordHunt) {
    setTimeout(() => {
      const freshBots = botManager.getGameBots(gameCode);
      if (freshBots.length > 0) {
        startBotsForWordHunt(io, gameCode, freshBots, game!.wordHuntState!, language, timerSeconds);
      }
    }, 100);
  }
}

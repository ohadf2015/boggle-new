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
} from '../../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import * as botManager from '../../modules/botManager';
import logger from '../../utils/logger';
import type { BotSubmission } from './types';
import type { Bot } from '../../modules/botBehavior';
import { startBotsForWordHunt } from './botWordHunt';

/** Score buffer when no human has scored yet — creates initial pressure */
const BOT_SCORE_BUFFER = 20;

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
 * Bots must never exceed the best human player's score.
 * When no human has scored, bots get a small buffer to create pressure.
 */
export function shouldBotScore(
  gameCode: string,
  _botUsername: string,
  currentBotScore: number,
  pendingScore: number
): boolean {
  const bestHuman = getBestHumanScore(gameCode);
  const projectedScore = currentBotScore + pendingScore;

  if (bestHuman === 0) {
    // No human scored yet — allow up to buffer
    return projectedScore <= BOT_SCORE_BUFFER;
  }

  return projectedScore <= bestHuman;
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

  // Word-hunt mode: bots need a different strategy (target guessing)
  const game = getGame(gameCode);
  if (game?.gameMode === 'word-hunt' && (game as any).wordHuntState) {
    startBotsForWordHunt(io, gameCode, bots, (game as any).wordHuntState, language, timerSeconds);
    return;
  }

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

        // Score cap: don't let bot outscore best human
        if (!shouldBotScore(gameCode, username, bot.score, score)) {
          logger.debug('BOT', `Bot "${username}" score capped (would exceed best human)`);
          return;
        }

        addPlayerWord(gameCode, username, word, {
          autoValidated: true,
          score,
          comboBonus: 0,
          comboLevel: comboLevel || 0,
          isBot: true,
        });

        trackBotWord(gameCode, word, username, score);
        updatePlayerScore(gameCode, username, score, true);

        const leaderboard = getLeaderboard(gameCode);
        broadcastToRoom(io, getGameRoom(gameCode), 'updateLeaderboard', {
          leaderboard,
        });
      },
      timerSeconds,
      gameStartTime
    );
  }
}

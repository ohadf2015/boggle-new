/**
 * Bot Game Service
 *
 * Handles bot initialization and submission handling for multiplayer games.
 */

import type { Server } from 'socket.io';
import type { LetterGrid, Language } from '@/shared/types';
import {
  addPlayerWord,
  updatePlayerScore,
  trackBotWord,
  getLeaderboard,
} from '../../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import * as botManager from '../../modules/botManager';
import logger from '../../utils/logger';
import type { BotSubmission } from './types';
import type { Bot } from '../../modules/botBehavior';

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

  // Safety check: ensure letterGrid is valid before starting bots
  if (!letterGrid || !Array.isArray(letterGrid) || letterGrid.length === 0) {
    logger.error('BOT', `Cannot start bots for game ${gameCode}: letterGrid is invalid`);
    return;
  }

  logger.info('BOT', `Starting ${bots.length} bots for game ${gameCode}`);

  // Store game start time so bots can calculate actual remaining time
  const gameStartTime = Date.now();

  for (const bot of bots) {
    // Start each bot with its own callback
    // Note: startBot is async but we intentionally don't await it here
    // to allow bots to initialize in parallel without blocking
    botManager.startBot(
      bot,
      letterGrid,
      language,
      async (submission: BotSubmission) => {
        const { username, word, score, comboLevel } = submission;

        // Use the bot from closure - it's the same bot object
        if (!bot || !bot.isActive) return;

        // Safety check: ensure word is valid
        if (!word || typeof word !== 'string') {
          logger.warn('BOT', `Bot "${username}" submitted invalid word: ${word}`);
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

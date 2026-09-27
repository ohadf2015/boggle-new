/**
 * Auto-Add Bots Service
 *
 * Automatically adds bot players when a solo human starts a multiplayer game.
 * Uses adaptive difficulty based on the host's game history.
 */

import { addUserToGame } from '../../modules/gameStateManager';
import * as botManager from '../../modules/botManager';
import logger from '../../utils/logger';
import type { GameState } from '../../modules/gameState/types';

type GameLike = Pick<GameState, 'users' | 'language'> & { gameState?: string };

interface AutoAddResult {
  botsAdded: number;
}

/** Difficulties to rotate through for variety */
const BOT_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Auto-add bots when a solo human player starts a multiplayer game.
 *
 * Counts active (non-disconnected) human players. If exactly 1 human
 * and no existing bots, adds 2-3 bots with adaptive difficulty.
 */
export async function autoAddBotsForSoloPlayer(
  gameCode: string,
  game: GameLike
): Promise<AutoAddResult> {
  if (!game?.users) {
    return { botsAdded: 0 };
  }

  // Only add bots during game start (in-progress state) — not mid-game or post-game
  if (game.gameState && game.gameState !== 'in-progress') {
    return { botsAdded: 0 };
  }

  const users = Object.entries(game.users);

  // Count active human players
  const humanCount = users.filter(
    ([, u]) => !u.isBot && !u.disconnected
  ).length;

  // Count existing bots. The in-memory registry (botManager) is the primary
  // source, but it is wiped on server restart while the persisted game state
  // keeps the bot users — trusting it alone re-added 2-3 bots every round.
  // game.users isBot flags survive restarts, so take the max of both.
  const botsInRegistry = botManager.getGameBots(gameCode).length;
  const botsInUsers = users.filter(([, u]) => u.isBot).length;
  const existingBots = Math.max(botsInRegistry, botsInUsers);

  // Only auto-add if solo human with no bots
  if (humanCount !== 1 || existingBots > 0) {
    return { botsAdded: 0 };
  }

  // Find the host's auth ID for adaptive difficulty
  const hostEntry = users.find(([, u]) => u.isHost && !u.isBot);
  const hostAuthUserId = hostEntry?.[1]?.authUserId || null;

  // Add 2-3 bots (randomized for variety)
  const botCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
  let botsAdded = 0;

  for (let i = 0; i < botCount; i++) {
    try {
      const difficulty = BOT_DIFFICULTIES[i % BOT_DIFFICULTIES.length];
      let bot;

      if (hostAuthUserId) {
        bot = await botManager.addBotWithAdaptiveDifficulty(
          gameCode,
          hostAuthUserId,
          difficulty,
          game.users as unknown as Record<string, botManager.GameUser>,
          game.language
        );
      } else {
        bot = botManager.addBot(
          gameCode,
          difficulty,
          game.users as unknown as Record<string, botManager.GameUser>,
          game.language
        );
      }

      // Register bot as a game user
      addUserToGame(gameCode, bot.username, `bot-${bot.id}`, {
        avatar: bot.avatar,
        isHost: false,
        playerId: bot.id,
      });

      // Mark as bot in game state
      if (game.users[bot.username]) {
        game.users[bot.username].isBot = true;
        game.users[bot.username].botDifficulty = bot.difficulty;
      }

      botsAdded++;
    } catch (error) {
      logger.error('BOT', `Failed to auto-add bot ${i + 1}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  if (botsAdded > 0) {
    logger.info('BOT', `Auto-added ${botsAdded} bots for solo player in game ${gameCode}`);
  }

  return { botsAdded };
}

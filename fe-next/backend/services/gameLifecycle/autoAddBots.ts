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
type DuoGameLike = GameLike & Partial<Pick<GameState, 'isPrivate' | 'isClassroom' | 'isRanked' | 'tournamentId'>>;

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

/**
 * exp-mp-duo-bot-v1: a public room that starts with exactly two humans and no
 * bot gets ONE easy bot, so the round plays as three (28d: 2-player rooms
 * where the player found 0 words replayed 67% vs ~89% in rooms of 3+). The
 * bot stays seated, so later rounds of the room see it and add nothing.
 * Never a classroom, a ranked game, a private room or a tournament. The host's
 * client asks for it (`duoBot` on startGame); this is the authoritative gate.
 */
export async function autoAddBotForDuo(gameCode: string, game: DuoGameLike): Promise<AutoAddResult> {
  if (!game?.users) return { botsAdded: 0 };
  if (game.isClassroom || game.isRanked || game.isPrivate || game.tournamentId) return { botsAdded: 0 };
  if (game.gameState !== 'in-progress') return { botsAdded: 0 };

  const users = Object.values(game.users);
  const humanCount = users.filter((u) => !u.isBot && !u.disconnected).length;
  const existingBots = Math.max(botManager.getGameBots(gameCode).length, users.filter((u) => u.isBot).length);
  if (humanCount !== 2 || existingBots > 0) return { botsAdded: 0 };

  try {
    const bot = botManager.addBot(
      gameCode,
      'easy',
      game.users as unknown as Record<string, botManager.GameUser>,
      game.language
    );
    addUserToGame(gameCode, bot.username, `bot-${bot.id}`, {
      avatar: bot.avatar,
      isHost: false,
      playerId: bot.id,
    });
    if (game.users[bot.username]) {
      game.users[bot.username].isBot = true;
      game.users[bot.username].botDifficulty = bot.difficulty;
    }
    logger.info('BOT', `Duo room ${gameCode}: added 1 ${bot.difficulty} bot (exp-mp-duo-bot-v1)`);
    return { botsAdded: 1 };
  } catch (error) {
    logger.error('BOT', `Failed to add duo bot in ${gameCode}: ${error instanceof Error ? error.message : 'Unknown'}`);
    return { botsAdded: 0 };
  }
}

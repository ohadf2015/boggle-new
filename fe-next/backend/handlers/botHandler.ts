/**
 * Bot Handler
 * Handles bot management events: add, remove, list bots
 */

import type { Server, Socket } from 'socket.io';
import type { Game, GameUser, Avatar, ActiveRoom } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  addUserToGame,
  removeUserFromGame,
  getGameUsers,
  getActiveRooms,
  deleteGame,
  isRoomEmpty
} from '../modules/gameStateManager.js';

import { broadcastToRoom, broadcastActiveRooms, getGameRoom } from '../utils/socketHelpers.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import * as botManager from '../modules/botManager.js';
import { clearGameTimer } from '../utils/timerManager.js';
import logger from '../utils/logger.js';
import { validatePayload, addBotSchema, removeBotSchema } from '../utils/socketValidation.js';
import { isInProgress } from '../utils/gameStateMachine.js';

import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

// Types for payloads
interface AddBotPayload {
  difficulty?: string;
}

interface RemoveBotPayload {
  botId?: string;
  botUsername?: string;
  username?: string;
}

interface SetAutoFillPayload {
  enabled: boolean;
  targetCount?: number;
}

interface SetAutoStartPayload {
  enabled: boolean;
  countdownSeconds?: number;
}

// Store for auto-start timers
const autoStartTimers: Map<string, NodeJS.Timeout> = new Map();

interface Bot {
  id: string;
  username: string;
  difficulty: string;
  avatar: Avatar;
  gameCode?: string;
  isActive?: boolean;
}

/**
 * Register bot-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerBotHandlers(io: Server, socket: Socket): void {

  // Handle adding a bot to the room (host only)
  socket.on('addBot', (data: AddBotPayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(addBotSchema, data || {});
    if (!validation.success) {
      emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, { message: `Invalid request: ${validation.error}` });
      return;
    }

    const { difficulty = 'medium' } = validation.data as AddBotPayload;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { message: 'Only the host can add bots' });
      return;
    }

    // Check if game is in progress (use state machine helper)
    if (isInProgress(game.gameState)) {
      emitError(socket, ErrorCodes.GAME_ALREADY_STARTED, { message: 'Cannot add bots during a game' });
      return;
    }

    // Check player limit
    const currentPlayerCount = Object.keys(game.users).length;
    const currentBotCount: number = botManager.getGameBots(gameCode).length;
    if (currentPlayerCount + currentBotCount >= MAX_PLAYERS_PER_ROOM) {
      emitError(socket, ErrorCodes.GAME_FULL);
      return;
    }

    // Create the bot with the game's language for localized names
    // Type assertion needed: gameStateManager.GameUser and botManager.GameUser have slightly different avatar types
    const bot: Bot = botManager.addBot(gameCode, difficulty, game.users as unknown as Record<string, botManager.GameUser>, game.language || 'en');

    // Add bot as a user
    addUserToGame(gameCode, bot.username, `bot-${bot.id}`, {
      avatar: bot.avatar,
      isHost: false,
      playerId: bot.id,
    });

    // Mark user as bot in game state
    if (game.users[bot.username]) {
      game.users[bot.username].isBot = true;
      game.users[bot.username].botDifficulty = bot.difficulty;
    }

    logger.info('BOT', `Bot "${bot.username}" (${difficulty}) added to game ${gameCode}`);

    // Broadcast updates
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode) as GameUser[]
    });

    // Confirm to host
    socket.emit('botAdded', {
      success: true,
      bot: {
        id: bot.id,
        username: bot.username,
        difficulty: bot.difficulty,
        avatar: bot.avatar
      }
    });

    broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
  });

  // Handle removing a bot from the room (host only)
  socket.on('removeBot', (data: RemoveBotPayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { botId, botUsername, username } = data || {};
    const botUsernameToFind = botUsername || username;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { message: 'Only the host can remove bots' });
      return;
    }

    // Check if game is in progress (use state machine helper)
    // Allow removal in waiting, finished, or validating states
    if (isInProgress(game.gameState)) {
      emitError(socket, ErrorCodes.GAME_ALREADY_STARTED, { message: 'Cannot remove bots during a game' });
      return;
    }

    // Find bot by ID or username - check both botManager and game.users
    let bots: Bot[] = botManager.getGameBots(gameCode);
    let botToRemove: Bot | undefined = undefined;
    if (botId) {
      botToRemove = bots.find(b => b.id === botId);
    } else if (botUsernameToFind) {
      botToRemove = bots.find(b => b.username === botUsernameToFind);
    }

    // If bot not found in botManager, try to find in game.users as fallback
    // This handles edge cases where state might be out of sync
    if (!botToRemove && botUsernameToFind && game.users[botUsernameToFind]?.isBot) {
      logger.warn('BOT', `Bot "${botUsernameToFind}" not in botManager, removing from game.users only`);
      removeUserFromGame(gameCode, botUsernameToFind);

      // Check if room is now empty and close it immediately
      if (isRoomEmpty(gameCode)) {
        logger.info('BOT', `Room ${gameCode} is empty after bot removal - closing immediately`);
        clearGameTimer(gameCode);
        botManager.stopAllBots(gameCode);
        deleteGame(gameCode);
        broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
        socket.emit('botRemoved', {
          success: true,
          username: botUsernameToFind
        });
        return;
      }

      // Broadcast updates
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode) as GameUser[]
      });

      socket.emit('botRemoved', {
        success: true,
        username: botUsernameToFind
      });

      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      return;
    }

    if (!botToRemove) {
      // Idempotent: bot is already gone from both botManager and game.users.
      // The client UI is stale (race, double-click, reconnect) — confirm success
      // and resync user list so the client clears the ghost entry. Erroring here
      // surfaces as a thrown "Bot not found" exception in the browser.
      logger.info('BOT', `removeBot: bot "${botId || botUsernameToFind || 'unknown'}" already absent from game ${gameCode} — treating as success`);
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode) as GameUser[]
      });
      socket.emit('botRemoved', {
        success: true,
        botId,
        username: botUsernameToFind
      });
      return;
    }

    // Verify bot belongs to this game (skip if gameCode is undefined - older bot format)
    if (botToRemove.gameCode && botToRemove.gameCode !== gameCode) {
      emitError(socket, ErrorCodes.AUTH_FORBIDDEN, { message: 'Bot does not belong to this game' });
      return;
    }

    const removedUsername = botToRemove.username;

    // Remove bot from manager - pass both gameCode and bot identifier
    botManager.removeBot(gameCode, botToRemove.id || botToRemove.username);

    // Remove from game users
    removeUserFromGame(gameCode, removedUsername);

    logger.info('BOT', `Bot "${removedUsername}" removed from game ${gameCode}`);

    // Check if room is now empty and close it immediately
    if (isRoomEmpty(gameCode)) {
      logger.info('BOT', `Room ${gameCode} is empty after bot "${removedUsername}" removal - closing immediately`);
      clearGameTimer(gameCode);
      botManager.stopAllBots(gameCode);
      deleteGame(gameCode);
      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      socket.emit('botRemoved', {
        success: true,
        botId: botToRemove.id,
        username: removedUsername
      });
      return;
    }

    // Broadcast updates
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode) as GameUser[]
    });

    // Confirm to host
    socket.emit('botRemoved', {
      success: true,
      botId: botToRemove.id,
      username: removedUsername
    });

    broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
  });

  // Handle get bots list
  socket.on('getBots', () => {
    // Light RL: read-only but maps over bot list per call
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      socket.emit('botsList', { bots: [] });
      return;
    }

    const bots: Bot[] = botManager.getGameBots(gameCode);
    socket.emit('botsList', {
      bots: bots.map(bot => ({
        id: bot.id,
        username: bot.username,
        difficulty: bot.difficulty,
        avatar: bot.avatar
      }))
    });
  });

  // Handle auto-fill bots request
  socket.on('setAutoFill', (data: SetAutoFillPayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { enabled, targetCount = 8 } = data || {};
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { message: 'Only the host can enable auto-fill' });
      return;
    }

    // Check if game is in progress
    if (isInProgress(game.gameState)) {
      emitError(socket, ErrorCodes.GAME_ALREADY_STARTED, { message: 'Cannot auto-fill during a game' });
      return;
    }

    if (!enabled) {
      logger.info('BOT', `Auto-fill disabled for game ${gameCode}`);
      socket.emit('autoFillComplete', { botsAdded: 0 });
      return;
    }

    // Fill room with bots up to targetCount
    const currentPlayerCount = Object.keys(game.users).length;
    const botsToAdd = Math.min(targetCount - currentPlayerCount, MAX_PLAYERS_PER_ROOM - currentPlayerCount);
    let botsAdded = 0;

    const difficulties = ['easy', 'medium', 'hard'];

    for (let i = 0; i < botsToAdd; i++) {
      // Rotate through difficulties for variety
      const difficulty = difficulties[i % difficulties.length];
      // Type assertion needed: gameStateManager.GameUser and botManager.GameUser have slightly different avatar types
      const bot: Bot = botManager.addBot(gameCode, difficulty, game.users as unknown as Record<string, botManager.GameUser>, game.language || 'en');

      addUserToGame(gameCode, bot.username, `bot-${bot.id}`, {
        avatar: bot.avatar,
        isHost: false,
        playerId: bot.id,
      });

      if (game.users[bot.username]) {
        game.users[bot.username].isBot = true;
        game.users[bot.username].botDifficulty = bot.difficulty;
      }

      botsAdded++;
    }

    logger.info('BOT', `Auto-fill: Added ${botsAdded} bots to game ${gameCode}`);

    // Broadcast updates
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode) as GameUser[]
    });

    socket.emit('autoFillComplete', { botsAdded });
    broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
  });

  // Handle auto-start timer request
  socket.on('setAutoStart', (data: SetAutoStartPayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { enabled, countdownSeconds = 30 } = data || {};
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { message: 'Only the host can enable auto-start' });
      return;
    }

    // Check if game is in progress
    if (isInProgress(game.gameState)) {
      emitError(socket, ErrorCodes.GAME_ALREADY_STARTED, { message: 'Cannot enable auto-start during a game' });
      return;
    }

    // Clear any existing timer for this game
    const existingTimer = autoStartTimers.get(gameCode);
    if (existingTimer) {
      clearInterval(existingTimer);
      autoStartTimers.delete(gameCode);
    }

    if (!enabled) {
      logger.info('BOT', `Auto-start cancelled for game ${gameCode}`);
      broadcastToRoom(io, getGameRoom(gameCode), 'autoStartCancelled', {});
      return;
    }

    // Check minimum players
    const playerCount = Object.keys(game.users).length;
    if (playerCount < 2) {
      emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, { message: 'Need at least 2 players to auto-start' });
      return;
    }

    logger.info('BOT', `Auto-start enabled for game ${gameCode} - ${countdownSeconds}s countdown`);

    let remaining = countdownSeconds;

    // Broadcast initial countdown
    broadcastToRoom(io, getGameRoom(gameCode), 'autoStartCountdown', { remaining });

    // Start countdown timer
    const countdownInterval = setInterval(() => {
      remaining--;

      if (remaining <= 0) {
        clearInterval(countdownInterval);
        autoStartTimers.delete(gameCode);

        // Verify game still exists and is in waiting state
        const currentGame = getGame(gameCode);
        if (currentGame && !isInProgress(currentGame.gameState)) {
          logger.info('BOT', `Auto-start: Starting game ${gameCode}`);
          // Emit to host socket to trigger game start
          socket.emit('autoStartTrigger', {});
        }
        return;
      }

      // Broadcast countdown update
      broadcastToRoom(io, getGameRoom(gameCode), 'autoStartCountdown', { remaining });
    }, 1000);

    autoStartTimers.set(gameCode, countdownInterval);
  });
}

export { registerBotHandlers };

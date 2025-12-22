/**
 * Bot Handler
 * Handles bot management events: add, remove, list bots
 */

const {
  getGame,
  getGameBySocketId,
  addUserToGame,
  removeUserFromGame,
  getGameUsers,
  getActiveRooms,
  deleteGame,
  isRoomEmpty
} = require('../modules/gameStateManager');

const { broadcastToRoom, getGameRoom } = require('../utils/socketHelpers');
const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const botManager = require('../modules/botManager');
const timerManager = require('../utils/timerManager');
const logger = require('../utils/logger');
const { validatePayload, addBotSchema, removeBotSchema } = require('../utils/socketValidation');
const { isInProgress } = require('../utils/gameStateMachine');

// Configuration
const MAX_PLAYERS_PER_ROOM = 50;

/**
 * Register bot-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerBotHandlers(io, socket) {

  // Handle adding a bot to the room (host only)
  socket.on('addBot', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(addBotSchema, data || {});
    if (!validation.success) {
      emitError(socket, `Invalid request: ${validation.error}`);
      return;
    }

    const { difficulty = 'medium' } = validation.data;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, 'Only the host can add bots');
      return;
    }

    // Check if game is in progress (use state machine helper)
    if (isInProgress(game.gameState)) {
      emitError(socket, 'Cannot add bots during a game');
      return;
    }

    // Check player limit
    const currentPlayerCount = Object.keys(game.users).length;
    const currentBotCount = botManager.getGameBots(gameCode).length;
    if (currentPlayerCount + currentBotCount >= MAX_PLAYERS_PER_ROOM) {
      emitError(socket, 'Room is full');
      return;
    }

    // Create the bot with the game's language for localized names
    const bot = botManager.addBot(gameCode, difficulty, game.users, game.language || 'en');

    // Add bot as a user
    addUserToGame(gameCode, bot.username, `bot-${bot.id}`, {
      avatar: bot.avatar,
      isHost: false,
      playerId: bot.id,
      isBot: true
    });

    // Mark user as bot in game state
    if (game.users[bot.username]) {
      game.users[bot.username].isBot = true;
      game.users[bot.username].botDifficulty = bot.difficulty;
    }

    logger.info('BOT', `Bot "${bot.username}" (${difficulty}) added to game ${gameCode}`);

    // Broadcast updates
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
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

    io.emit('activeRooms', { rooms: getActiveRooms() });
  });

  // Handle removing a bot from the room (host only)
  socket.on('removeBot', (data) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const { botId, botUsername, username } = data || {};
    const botUsernameToFind = botUsername || username;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    // Verify sender is host
    if (game.hostSocketId !== socket.id) {
      emitError(socket, 'Only the host can remove bots');
      return;
    }

    // Check if game is in progress (use state machine helper)
    // Allow removal in waiting, finished, or validating states
    if (isInProgress(game.gameState)) {
      emitError(socket, 'Cannot remove bots during a game');
      return;
    }

    // Find bot by ID or username - check both botManager and game.users
    let bots = botManager.getGameBots(gameCode);
    let botToRemove = null;
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
        timerManager.clearGameTimer(gameCode);
        botManager.stopAllBots(gameCode);
        deleteGame(gameCode);
        io.emit('activeRooms', { rooms: getActiveRooms() });
        socket.emit('botRemoved', {
          success: true,
          username: botUsernameToFind
        });
        return;
      }

      // Broadcast updates
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode)
      });

      socket.emit('botRemoved', {
        success: true,
        username: botUsernameToFind
      });

      io.emit('activeRooms', { rooms: getActiveRooms() });
      return;
    }

    if (!botToRemove) {
      emitError(socket, 'Bot not found');
      return;
    }

    // Verify bot belongs to this game (skip if gameCode is undefined - older bot format)
    if (botToRemove.gameCode && botToRemove.gameCode !== gameCode) {
      emitError(socket, 'Bot does not belong to this game');
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
      timerManager.clearGameTimer(gameCode);
      botManager.stopAllBots(gameCode);
      deleteGame(gameCode);
      io.emit('activeRooms', { rooms: getActiveRooms() });
      socket.emit('botRemoved', {
        success: true,
        botId: botToRemove.id,
        username: removedUsername
      });
      return;
    }

    // Broadcast updates
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });

    // Confirm to host
    socket.emit('botRemoved', {
      success: true,
      botId: botToRemove.id,
      username: removedUsername
    });

    io.emit('activeRooms', { rooms: getActiveRooms() });
  });

  // Handle get bots list
  socket.on('getBots', () => {
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      socket.emit('botsList', { bots: [] });
      return;
    }

    const bots = botManager.getGameBots(gameCode);
    socket.emit('botsList', {
      bots: bots.map(bot => ({
        id: bot.id,
        username: bot.username,
        difficulty: bot.difficulty,
        avatar: bot.avatar
      }))
    });
  });
}

module.exports = { registerBotHandlers };

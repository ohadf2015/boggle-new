/**
 * Chat Handler
 * Handles chat message events
 */

const { getGame, getGameBySocketId, getUsernameBySocketId } = require('../modules/gameStateManager');
const { broadcastToRoom, getGameRoom } = require('../utils/socketHelpers');
const { cleanProfanity } = require('../utils/profanityFilter');
const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const { inc } = require('../utils/metrics');
const { isSocketMigrating } = require('./shared');
const { validatePayload, chatMessageSchema } = require('../utils/socketValidation');

// Rate limit weight for chat
const CHAT_WEIGHT = parseInt(process.env.RATE_WEIGHT_CHAT || '1');

/**
 * Sanitize HTML to prevent XSS attacks
 */
function sanitizeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Register chat-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerChatHandlers(io, socket) {

  // Handle chat messages
  socket.on('chatMessage', (data) => {
    if (isSocketMigrating(socket)) return;

    if (!checkRateLimit(socket.id, CHAT_WEIGHT)) {
      inc('rateLimited');
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(chatMessageSchema, data);
    if (!validation.success) {
      emitError(socket, `Invalid request: ${validation.error}`);
      return;
    }

    const { message, gameCode: providedGameCode } = validation.data;
    const gameCode = providedGameCode || getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !message || !username) {
      emitError(socket, ErrorMessages.INVALID_MESSAGE);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    const isHostUser = game.hostSocketId === socket.id;

    // Filter profanity and sanitize HTML
    const cleanMessage = sanitizeHtml(cleanProfanity(message.trim().substring(0, 500)));
    const timestamp = Date.now();
    const chatMessageData = {
      username: isHostUser ? 'Host' : sanitizeHtml(username),
      message: cleanMessage,
      timestamp,
      isHost: isHostUser
    };

    // Store message in game chat history (persists across rounds)
    if (!game.chatHistory) {
      game.chatHistory = [];
    }
    game.chatHistory.push(chatMessageData);
    // Keep only last 100 messages
    if (game.chatHistory.length > 100) {
      game.chatHistory = game.chatHistory.slice(-100);
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'chatMessage', chatMessageData);
  });

  // Handle chat history request (for late joiners and page refresh)
  socket.on('requestChatHistory', (data) => {
    if (isSocketMigrating(socket)) return;

    const gameCode = data?.gameCode || getGameBySocketId(socket.id);
    if (!gameCode) {
      socket.emit('chatHistory', { messages: [] });
      return;
    }

    const game = getGame(gameCode);
    if (!game || !game.chatHistory) {
      socket.emit('chatHistory', { messages: [] });
      return;
    }

    socket.emit('chatHistory', { messages: game.chatHistory });
  });
}

module.exports = { registerChatHandlers };

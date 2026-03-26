/**
 * Chat Handler
 * Handles chat message events
 */

import type { Server, Socket } from 'socket.io';
import type { Game, ChatMessagePayload } from '@/shared/types';
import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';
import { cleanProfanity } from '../utils/profanityFilter';
import { sanitizeHtml } from '../utils/sanitize';
import { emitError, ErrorMessages } from '../utils/errorHandler';
import { checkRateLimit } from '../utils/rateLimiter';
import { checkSocketRateLimit } from '../middleware/rateLimiterRedis';
import { inc } from '../utils/metrics';
import logger from '../utils/logger';
import { isSocketMigrating } from './shared';
import { validatePayload, chatMessageSchema } from '../utils/socketValidation';

// Rate limit weight for chat
const CHAT_WEIGHT = parseInt(process.env.RATE_WEIGHT_CHAT || '1');

// Types for payloads
interface ChatMessageData {
  message: string;
  gameCode?: string;
}

interface ChatHistoryRequest {
  gameCode?: string;
}

/**
 * Register chat-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerChatHandlers(io: Server, socket: Socket): void {

  // Handle chat messages
  socket.on('chatMessage', async (data: ChatMessageData) => {
    if (isSocketMigrating(socket)) return;

    if (!checkRateLimit(socket.id, CHAT_WEIGHT)) {
      inc('rateLimited');
      socket.emit('rateLimited');
      return;
    }

    // Per-action rate limit for chat messages (3/s)
    const rl = await checkSocketRateLimit(socket.id, 'chatMessage');
    if (!rl.allowed) {
      logger.warn('RATE_LIMIT', 'Rate limited', { socketId: socket.id, action: 'chatMessage' });
      socket.emit('rate-limited', { action: 'chatMessage', retryAfterMs: rl.retryAfterMs });
      return;
    }

    // Validate payload
    const validation = validatePayload(chatMessageSchema, data);
    if (!validation.success) {
      emitError(socket, `Invalid request: ${validation.error}`);
      return;
    }

    const { message, gameCode: providedGameCode } = validation.data as ChatMessageData;
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
    const chatMessageData: ChatMessagePayload = {
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

    // Use non-volatile broadcast — chat messages must not be silently dropped (R-1)
    broadcastToRoom(io, getGameRoom(gameCode), 'chatMessage', chatMessageData);
  });

  // Handle chat history request (for late joiners and page refresh)
  socket.on('requestChatHistory', (data: ChatHistoryRequest) => {
    if (!checkRateLimit(socket.id)) return;
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

export { registerChatHandlers };

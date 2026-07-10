/**
 * Reaction Handler
 * Broadcasts quick emoji reactions to other players in the same game room
 */

import type { Server, Socket } from 'socket.io';
import { getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager';
import { getGameRoom } from '../utils/socketHelpers';
import { checkRateLimit } from '../utils/rateLimiter';
import { checkSocketRateLimit } from '../middleware/rateLimiterRedis';
import { inc } from '../utils/metrics';
import logger from '../utils/logger';
import { isSocketMigrating } from './shared';

const VALID_REACTION_IDS = new Set(['fire', 'clap', 'wow', 'dead', 'crown', 'zap', 'love']);
const REACTION_WEIGHT = 1;

interface QuickReactionData {
  reactionId: string;
  username: string;
}

function registerReactionHandlers(_io: Server, socket: Socket): void {
  socket.on('quickReaction', async (data: QuickReactionData) => {
    if (isSocketMigrating(socket)) return;

    if (!checkRateLimit(socket.id, REACTION_WEIGHT)) {
      inc('rateLimited');
      return;
    }

    // Per-action rate limit for emoji reactions (2/s)
    const rl = await checkSocketRateLimit(socket.id, 'emojiReaction');
    if (!rl.allowed) {
      logger.warn('RATE_LIMIT', 'Rate limited', { socketId: socket.id, action: 'emojiReaction' });
      socket.emit('rate-limited', { action: 'emojiReaction', retryAfterMs: rl.retryAfterMs });
      return;
    }

    const { reactionId } = data;
    if (!reactionId || !VALID_REACTION_IDS.has(reactionId)) return;

    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);
    if (!gameCode || !username) return;

    // Broadcast to all other players in the room (sender already shows locally)
    socket.to(getGameRoom(gameCode)).emit('quickReaction', { reactionId, username });
  });
}

export { registerReactionHandlers };

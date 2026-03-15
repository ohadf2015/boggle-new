/**
 * Reaction Handler
 * Broadcasts quick emoji reactions to other players in the same game room
 */

import type { Server, Socket } from 'socket.io';
import { getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager';
import { getGameRoom } from '../utils/socketHelpers';
import { checkRateLimit } from '../utils/rateLimiter';
import { inc } from '../utils/metrics';
import { isSocketMigrating } from './shared';

const VALID_REACTION_IDS = new Set(['fire', 'clap', 'wow', 'dead', 'crown', 'zap']);
const REACTION_WEIGHT = 1;

interface QuickReactionData {
  reactionId: string;
  username: string;
}

function registerReactionHandlers(_io: Server, socket: Socket): void {
  socket.on('quickReaction', (data: QuickReactionData) => {
    if (isSocketMigrating(socket)) return;

    if (!checkRateLimit(socket.id, REACTION_WEIGHT)) {
      inc('rateLimited');
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

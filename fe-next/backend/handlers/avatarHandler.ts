/**
 * Avatar Handler
 * Handles avatar update events in multiplayer rooms
 */

import type { Server, Socket } from 'socket.io';
import { getGame, getGameBySocketId, getUsernameBySocketId } from '../modules/gameStateManager';
import { broadcastToRoom, getGameRoom } from '../utils/socketHelpers';
import { emitError, ErrorCodes } from '../utils/errorHandler';
import { checkRateLimit } from '../utils/rateLimiter';
import { isSocketMigrating } from './shared';
import { z } from 'zod';

const AVATAR_WEIGHT = parseInt(process.env.RATE_WEIGHT_AVATAR || '2');

import { customAvatarSchema } from '../../shared/types/customAvatar';

const updateAvatarSchema = z.object({
  gameCode: z.string().min(1).max(20).optional(),
  avatarImage: z.string().min(1).max(100).optional(),
  customAvatar: customAvatarSchema.optional(),
});

/**
 * Register avatar-related socket event handlers
 */
function registerAvatarHandlers(io: Server, socket: Socket): void {
  socket.on('updateAvatar', (data: unknown) => {
    if (isSocketMigrating(socket)) return;

    if (!checkRateLimit(socket.id, AVATAR_WEIGHT)) {
      socket.emit('rateLimited');
      return;
    }

    const parsed = updateAvatarSchema.safeParse(data);
    if (!parsed.success) {
      emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, { message: 'Invalid avatar data' });
      return;
    }

    const { avatarImage, customAvatar, gameCode: providedGameCode } = parsed.data;
    const gameCode = providedGameCode || getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Update avatar in game state
    const player = game.users?.[username];
    if (player && player.avatar) {
      if (avatarImage) {
        player.avatar.avatarImage = avatarImage;
      }
      if (customAvatar) {
        player.avatar.customAvatar = customAvatar;
      }
    }

    // Broadcast to all room members
    broadcastToRoom(io, getGameRoom(gameCode), 'avatarUpdated', {
      username,
      avatarImage,
      customAvatar,
    });
  });
}

export { registerAvatarHandlers };

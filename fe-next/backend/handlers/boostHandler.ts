/**
 * Boost Handler
 * Socket handler for applying boost tokens to player accounts in a game.
 */

import { z } from 'zod';
import type { Server, Socket } from 'socket.io';
import { getGame, updateGame, getUsernameBySocketId } from '../modules/gameStateManager';
import { verifyBoostToken } from '../utils/boostToken';
import { validatePayload } from '../utils/socketValidation';
import { checkRateLimit } from '../utils/rateLimiter';
import { checkSocketRateLimit } from '../middleware/rateLimiterRedis';
import { inc } from '../utils/metrics';
import logger from '../utils/logger';
import { isSocketMigrating } from './shared';

const boostApplySchema = z.object({
  gameCode: z.string().min(1),
  sessionId: z.string().min(1),
  token: z.string().min(1),
});

interface BoostApplyData {
  gameCode: string;
  sessionId: string;
  token: string;
}

const BOOST_WEIGHT = parseInt(process.env.RATE_WEIGHT_BOOST || '1');

export function registerBoostHandlers(io: Server, socket: Socket): void {
  socket.on('boost:apply', async (data: BoostApplyData) => {
    if (isSocketMigrating(socket)) return;

    if (!checkRateLimit(socket.id, BOOST_WEIGHT)) {
      inc('rateLimited');
      socket.emit('rateLimited');
      return;
    }

    // Per-action rate limit for boost apply (5/s per socket)
    const rl = await checkSocketRateLimit(socket.id, 'boost:apply');
    if (!rl.allowed) {
      logger.warn('RATE_LIMIT', 'Rate limited', { socketId: socket.id, action: 'boost:apply' });
      socket.emit('rate-limited', { action: 'boost:apply', retryAfterMs: rl.retryAfterMs });
      return;
    }

    // Validate payload
    const validation = validatePayload(boostApplySchema, data);
    if (!validation.success) {
      socket.emit('error', { error: 'INVALID_PAYLOAD', message: validation.error });
      return;
    }

    try {
      const { gameCode, sessionId, token } = data;

      // Get game state
      const game = getGame(gameCode);
      if (!game) {
        socket.emit('error', { error: 'GAME_NOT_FOUND', message: 'Game not found' });
        return;
      }

      // Get player username from socket
      const username = getUsernameBySocketId(socket.id);
      if (!username) {
        socket.emit('error', { error: 'NOT_IN_GAME', message: 'You are not in this game' });
        return;
      }

      // Verify the token
      const verification = verifyBoostToken(token, sessionId);
      if (!verification.valid) {
        socket.emit('error', {
          error: 'INVALID_BOOST_TOKEN',
          message: `Token validation failed: ${verification.reason}`,
        });
        logger.warn('BOOST', `Invalid token for ${username} in game ${gameCode}: ${verification.reason}`);
        return;
      }

      // Stash the boost claim into game state
      if (!game.playerBoosts) {
        game.playerBoosts = {};
      }
      // Idempotency guard — reject re-claim within the same session so a duplicate
      // socket emit (race or replay) cannot grant a second boost benefit. A new
      // sessionId (next game) is allowed to overwrite (audit SRV-MED).
      const existing = game.playerBoosts[username];
      if (existing && existing.sessionId === sessionId) {
        socket.emit('error', {
          error: 'BOOST_ALREADY_CLAIMED',
          message: 'A boost was already claimed for this session',
        });
        logger.warn('BOOST', `Duplicate boost claim for ${username} in game ${gameCode} (session ${sessionId})`);
        return;
      }
      game.playerBoosts[username] = { sessionId, token };

      // Persist the updated game state
      updateGame(gameCode, game);

      socket.emit('boost:applied', {
        success: true,
        boostType: verification.boostType,
      });

      logger.info('BOOST', `Applied ${verification.boostType} boost for ${username} in game ${gameCode}`);
    } catch (err) {
      const error = err as Error;
      logger.error('BOOST', `Failed to apply boost: ${error.message}`);
      socket.emit('error', { error: 'INTERNAL_ERROR', message: 'Failed to apply boost' });
    }
  });
}

export { boostApplySchema };

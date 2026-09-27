/**
 * Word Pack Handler
 * Handles applying a UGC word pack to a waiting game room.
 */

import type { Server, Socket } from 'socket.io';
import { getGame, getGameBySocketId } from '../modules/gameStateManager.js';
import { getPackById } from '../modules/supabase/ugcPacks.js';
import { broadcastToRoom } from '../utils/socketHelpers.js';
import { ApplyWordPackSchema } from '../../shared/schemas/socketSchemas.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';

export function registerWordPackHandler(io: Server, socket: Socket): void {
  socket.on('apply-word-pack', async (payload: unknown) => {
    // Heavy weight: each call hits Supabase. Cap at ~10/10s effective.
    if (!checkRateLimit(socket.id, 5)) {
      socket.emit('error', { code: 'RATE_LIMITED', message: 'Slow down.' });
      return;
    }
    try {
      // Validate payload
      const parsed = ApplyWordPackSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', {
          code: 'INVALID_PAYLOAD',
          message: 'Invalid pack ID format. Must be a UUID.',
        });
        return;
      }

      const { packId } = parsed.data;

      // Resolve game
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) {
        socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'No game found for this socket.' });
        return;
      }
      const game = getGame(gameCode);
      if (!game) {
        socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found.' });
        return;
      }

      // Guard: only allowed while waiting
      if (game.gameState !== 'waiting') {
        socket.emit('error', {
          code: 'GAME_ALREADY_STARTED',
          message: 'Word pack can only be applied before the game starts.',
        });
        return;
      }

      // Guard: only host may apply a pack
      if (game.hostSocketId !== socket.id) {
        socket.emit('error', {
          code: 'NOT_HOST',
          message: 'Only the host can apply a word pack.',
        });
        return;
      }

      // Fetch pack from Supabase
      let pack;
      try {
        pack = await getPackById(packId);
      } catch (err) {
        logger.error('wordPackHandler', `getPackById failed packId=${packId}`);
        socket.emit('error', { code: 'PACK_FETCH_ERROR', message: 'Failed to fetch word pack.' });
        return;
      }

      if (!pack) {
        socket.emit('error', { code: 'PACK_NOT_FOUND', message: 'Word pack not found.' });
        return;
      }

      // Apply pack to game state
      game.selectedVocabulary = new Set(pack.words.map((w: string) => w.toUpperCase()));
      game.activeWordPack = {
        id: pack.id,
        name: pack.name,
        emoji: pack.theme_emoji,
        wordCount: pack.word_count,
      };

      logger.info('wordPackHandler', `Word pack applied gameCode=${game.gameCode} packId=${pack.id} wordCount=${pack.word_count}`);

      // Broadcast to room
      broadcastToRoom(io, game.gameCode, 'word-pack-applied', {
        id: pack.id,
        name: pack.name,
        emoji: pack.theme_emoji,
        wordCount: pack.word_count,
      });
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('wordPackHandler', `apply-word-pack handler failed: ${err.message}`);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to apply word pack.' });
    }
  });
}

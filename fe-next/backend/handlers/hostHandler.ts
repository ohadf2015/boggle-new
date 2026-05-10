/**
 * Host Handler
 * Handles host-specific operations: keep alive, reactivate
 */

import type { Server, Socket } from 'socket.io';
import type { Language } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  markHostActive,
  reactivateHost
} from '../modules/gameStateManager.js';

import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';

const ALLOWED_LANGUAGES: readonly Language[] = ['en', 'he', 'sv', 'ja', 'es'];

/**
 * Register host-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerHostHandlers(io: Server, socket: Socket): void {

  // Handle host keep alive
  socket.on('hostKeepAlive', () => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Verify sender is host
    if (game.hostSocketId !== socket.id) return;

    markHostActive(gameCode);
    logger.debug('HOST', `Host keep-alive for game ${gameCode}`);
  });

  // Handle host reactivate (after being idle)
  socket.on('hostReactivate', () => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Verify sender is host
    if (game.hostSocketId !== socket.id) return;

    reactivateHost(gameCode);
    logger.info('HOST', `Host reactivated for game ${gameCode}`);

    socket.emit('hostReactivated', { success: true });
  });

  // Handle host changing the room dictionary language pre-game
  socket.on('changeRoomLanguage', (data: { gameCode?: string; language?: string } | undefined) => {
    // Weight 3: each accepted change broadcasts to all lobby clients. Rapid
    // spam would create a re-render storm; pre-game UI doesn't need >1/sec.
    if (!checkRateLimit(socket.id, 3)) return;
    if (!data || typeof data.gameCode !== 'string' || typeof data.language !== 'string') return;
    if (!ALLOWED_LANGUAGES.includes(data.language as Language)) return;

    const game = getGame(data.gameCode);
    if (!game) return;
    if (game.hostSocketId !== socket.id) return;

    // Pre-game only — language must not change once a round starts. Silent return
    // matches the rest of this file (hostKeepAlive/hostReactivate); the picker is
    // server-authoritative and only updates on `roomLanguageChanged` broadcast.
    if (game.gameState !== 'waiting') return;

    const newLang = data.language as Language;
    game.language = newLang;

    const changedBy = game.hostUsername || 'host';
    io.to(data.gameCode).emit('roomLanguageChanged', {
      language: newLang,
      changedBy,
    });
    logger.info('HOST', `Room ${data.gameCode} language changed to ${newLang} by ${changedBy}`);
  });
}

export { registerHostHandlers };

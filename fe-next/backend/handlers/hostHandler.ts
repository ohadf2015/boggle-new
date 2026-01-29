/**
 * Host Handler
 * Handles host-specific operations: keep alive, reactivate
 */

import type { Server, Socket } from 'socket.io';
import type { Game } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  markHostActive,
  reactivateHost
} from '../modules/gameStateManager.js';

import logger from '../utils/logger.js';

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
}

export { registerHostHandlers };

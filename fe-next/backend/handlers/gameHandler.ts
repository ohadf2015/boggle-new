/**
 * Game Handler
 * Main entry point for game-related socket events.
 * Delegates to focused sub-handlers for better maintainability.
 *
 * Sub-handlers:
 * - gameLifecycleHandler: create, start, end, reset
 * - playerJoinHandler: join, leave, reconnection
 * - roomManagementHandler: close room, get rooms, grid shuffling
 */

import type { Server, Socket } from 'socket.io';

import { registerGameLifecycleHandlers } from './gameLifecycleHandler.js';
import { registerPlayerJoinHandlers } from './playerJoinHandler.js';
import { registerRoomManagementHandlers } from './roomManagementHandler.js';
import { MAX_PLAYERS_PER_ROOM } from '../utils/consts.js';

/**
 * Register all game-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerGameHandlers(io: Server, socket: Socket): void {
  // Register lifecycle handlers (create, start, end, reset)
  registerGameLifecycleHandlers(io, socket);

  // Register player join/leave handlers
  registerPlayerJoinHandlers(io, socket);

  // Register room management handlers
  registerRoomManagementHandlers(io, socket);
}

export { registerGameHandlers, MAX_PLAYERS_PER_ROOM };

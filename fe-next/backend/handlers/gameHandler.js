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

const { registerGameLifecycleHandlers } = require('./gameLifecycleHandler');
const { registerPlayerJoinHandlers } = require('./playerJoinHandler');
const { registerRoomManagementHandlers } = require('./roomManagementHandler');
const { MAX_PLAYERS_PER_ROOM } = require('../utils/consts');

/**
 * Register all game-related socket event handlers
 * @param {Server} io - Socket.IO server instance
 * @param {Socket} socket - Socket.IO socket instance
 */
function registerGameHandlers(io, socket) {
  // Register lifecycle handlers (create, start, end, reset)
  registerGameLifecycleHandlers(io, socket);

  // Register player join/leave handlers
  registerPlayerJoinHandlers(io, socket);

  // Register room management handlers
  registerRoomManagementHandlers(io, socket);
}

module.exports = { registerGameHandlers, MAX_PLAYERS_PER_ROOM };

/**
 * Kick Handler
 * Allows host to kick players and auto-kicks inactive players
 */

import type { Server, Socket } from 'socket.io';

import {
  getGame,
  getGameBySocketId,
  getSocketIdByUsername,
  removeUserFromGame,
  getGameUsers,
  getActiveRooms,
  clearSocketMappingsForLeave,
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
  safeEmit,
  getSocketById,
  leaveRoom,
} from '../utils/socketHelpers.js';

import { checkRateLimit } from '../utils/rateLimiter.js';
import { cleanupPlayerData } from '../utils/playerCleanup.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import logger from '../utils/logger.js';

// Auto-kick: players with AFK presence for this long in lobby get kicked
const AUTO_KICK_AFK_MS = parseInt(process.env.AUTO_KICK_AFK_MS || '180000'); // 3 minutes

interface KickPlayerPayload {
  targetUsername: string;
}

/**
 * Core kick logic — used by both manual host kick and auto-kick
 */
function executeKick(
  io: Server,
  gameCode: string,
  targetUsername: string,
  reason: 'host' | 'inactive'
): void {
  const game = getGame(gameCode);
  if (!game) return;

  // Initialize kickedPlayers set if missing
  if (!game.kickedPlayers) {
    game.kickedPlayers = new Set<string>();
  }

  const targetSocketId = getSocketIdByUsername(gameCode, targetUsername);

  // Notify target before removing
  if (targetSocketId) {
    const targetSocket = getSocketById(io, targetSocketId);
    if (targetSocket) {
      safeEmit(targetSocket, 'kicked', { reason });
      leaveRoom(targetSocket, getGameRoom(gameCode));
    }
    clearSocketMappingsForLeave(targetSocketId, gameCode, targetUsername);
  }

  // Notify game start coordinator
  gameStartCoordinator.handlePlayerDisconnect(gameCode, targetUsername);

  // Clean up player data and remove
  cleanupPlayerData(game as any, targetUsername);
  removeUserFromGame(gameCode, targetUsername);

  // Block re-join
  game.kickedPlayers!.add(targetUsername);

  // Broadcast to room
  broadcastToRoom(io, getGameRoom(gameCode), 'playerKicked', {
    username: targetUsername,
    reason,
  });

  broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
    users: getGameUsers(gameCode),
  });

  broadcastActiveRooms(io, getActiveRooms());

  logger.info('KICK', `${targetUsername} kicked from ${gameCode} (reason: ${reason})`);
}

/**
 * Register kick-related socket event handlers
 */
function registerKickHandler(io: Server, socket: Socket): void {
  socket.on('kickPlayer', (data: KickPlayerPayload) => {
    if (!checkRateLimit(socket.id)) return;

    const { targetUsername } = data || {};
    if (!targetUsername) return;

    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Host guard
    if (game.hostSocketId !== socket.id) return;

    // Cannot kick yourself
    if (targetUsername === game.hostUsername) return;

    // Target must exist in game
    if (!game.users[targetUsername]) return;

    executeKick(io, gameCode, targetUsername, 'host');
  });
}

/**
 * Check all games for AFK players in lobby and auto-kick them.
 * Called periodically from presenceHandler's health check interval.
 */
function checkAutoKickInactive(io: Server, forEachGame: (cb: (gameCode: string, game: any) => void) => void): void {
  const now = Date.now();

  forEachGame((gameCode: string, game: any) => {
    // Only auto-kick in lobby (waiting state), not during active games
    if (game.gameState !== 'waiting') return;

    const usernames = Object.keys(game.users || {});
    for (const username of usernames) {
      const user = game.users[username];
      if (!user || user.isHost || user.isBot || user.disconnected) continue;

      // Check if player has been AFK long enough
      const lastActivity = user.lastActivity || user.lastHeartbeat || 0;
      if (lastActivity > 0 && (now - lastActivity) > AUTO_KICK_AFK_MS) {
        logger.info('KICK', `Auto-kicking ${username} from ${gameCode} (AFK for ${Math.round((now - lastActivity) / 1000)}s)`);
        executeKick(io, gameCode, username, 'inactive');
      }
    }
  });
}

export { registerKickHandler, executeKick, checkAutoKickInactive };

/**
 * Connection Handler
 * Handles disconnect events and connection cleanup
 */

import type { Server, Socket } from 'socket.io';
import type { Game, GameUser, ActiveRoom } from '@/shared/types';

import {
  getGame,
  getGameBySocketId,
  getUsernameBySocketId,
  removeUserFromGame,
  getGameUsers,
  getActiveRooms,
  deleteGame,
  updateHostSocketId,
  isRoomEmpty,
  getNextEligibleHost,
  transferHost
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
  safeEmit,
  getSocketById,
  leaveAllGameRooms
} from '../utils/socketHelpers.js';

import { clearGameTimer } from '../utils/timerManager.js';
import { resetRateLimit } from '../utils/rateLimiter.js';
import { cleanupPlayerData } from '../utils/playerCleanup.js';
import { cleanupGameBots } from '../modules/botManager.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import logger from '../utils/logger.js';

// Configuration
const HOST_RECONNECTION_GRACE_PERIOD = parseInt(process.env.HOST_RECONNECTION_GRACE_PERIOD || '30000');
const PLAYER_RECONNECTION_GRACE_PERIOD = parseInt(process.env.PLAYER_RECONNECTION_GRACE_PERIOD || '120000');

// Extended GameUser type with reconnection timeout
interface GameUserWithTimeout extends GameUser {
  reconnectionTimeout?: ReturnType<typeof setTimeout>;
}

/**
 * Register connection-related socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerConnectionHandlers(io: Server, socket: Socket): void {

  // Handle disconnect
  socket.on('disconnect', (reason: string) => {
    // Clean up migration timeout if set (prevents timer accumulation)
    if (socket.data?.migrationTimeout) {
      clearTimeout(socket.data.migrationTimeout);
      delete socket.data.migrationTimeout;
    }

    // Skip if this socket was migrating (multi-tab scenario)
    if (socket.data && socket.data.migrating) {
      logger.debug('SOCKET', `Socket ${socket.id} disconnect skipped (was migrating)`);
      return;
    }

    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    logger.info('SOCKET', `Socket ${socket.id} disconnected (reason: ${reason})${gameCode ? ` from game ${gameCode}` : ''}`);

    // Clean up rate limiting
    resetRateLimit(socket.id);

    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Check if this is the host disconnecting
    // Type assertion needed: GameState and Game have slightly different type definitions
    if (game.hostSocketId === socket.id) {
      handleHostDisconnect(io, socket, game as unknown as Game, gameCode, username || 'Unknown', reason);
    } else if (username) {
      handlePlayerDisconnect(io, socket, game as unknown as Game, gameCode, username, reason);
    }
  });
}

/**
 * Handle host disconnection
 * Attempts to transfer host to another player, only closes room if no eligible players
 */
function handleHostDisconnect(io: Server, socket: Socket, game: Game, gameCode: string, username: string, reason: string): void {
  logger.info('SOCKET', `Host (${username}) disconnected from game ${gameCode}`);

  // Clear any existing host reconnection timeout
  // NOTE: Stored as hostReconnectionTimeout to avoid conflicts if multiple
  // disconnect events fire simultaneously (per-user isolation)
  if ((game as any).hostReconnectionTimeout) {
    clearTimeout((game as any).hostReconnectionTimeout);
    (game as any).hostReconnectionTimeout = null;
  }

  // Notify game start coordinator so ack sequence adjusts for the missing player
  gameStartCoordinator.handlePlayerDisconnect(gameCode, username);

  // Mark host as disconnected BEFORE checking if room is empty
  // This ensures isRoomEmpty correctly counts the disconnecting host as inactive
  if (game.users[username]) {
    game.users[username].disconnected = true;
    game.users[username].disconnectedAt = Date.now();
  }

  // Check if room is now empty (no other active players)
  if (isRoomEmpty(gameCode)) {
    logger.info('SOCKET', `Room ${gameCode} is empty after host ${username} disconnected - closing immediately`);
    clearGameTimer(gameCode);
    cleanupGameBots(gameCode);
    deleteGame(gameCode);
    broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
    return;
  }

  // Try to find a new host from remaining connected players
  const nextHost = getNextEligibleHost(gameCode, username);

  if (nextHost) {
    // Transfer host to the next eligible player
    const transferResult = transferHost(gameCode, nextHost);

    if (transferResult.success) {
      logger.info('SOCKET', `Host transferred in game ${gameCode}: ${username} -> ${nextHost}`);

      // Notify all players about the host transfer
      broadcastToRoom(io, getGameRoom(gameCode), 'hostTransferred', {
        previousHost: username,
        newHost: nextHost,
        message: `${username} left. ${nextHost} is now the host.`
      });

      // Update users list for all clients
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode) as GameUser[]
      });

      // Update active rooms
      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      return;
    } else {
      logger.warn('SOCKET', `Failed to transfer host in game ${gameCode}: ${transferResult.error}`);
    }
  }

  // No eligible player found for host transfer - use grace period before closing
  logger.info('SOCKET', `No eligible host found for game ${gameCode}, starting grace period`);

  // Notify players that host disconnected
  broadcastToRoom(io, getGameRoom(gameCode), 'hostDisconnected', {
    message: 'Host disconnected. Waiting for reconnection...',
    gracePeriodMs: HOST_RECONNECTION_GRACE_PERIOD
  });

  // Start grace period for host reconnection
  (game as any).hostReconnectionTimeout = setTimeout(() => {
    const currentGame = getGame(gameCode);
    if (!currentGame) return;

    // Check if host is still disconnected (socket hasn't changed)
    if (currentGame.hostSocketId === socket.id) {
      // Try one more time to find an eligible host
      const finalNextHost = getNextEligibleHost(gameCode, username);

      if (finalNextHost) {
        const finalTransferResult = transferHost(gameCode, finalNextHost);
        if (finalTransferResult.success) {
          broadcastToRoom(io, getGameRoom(gameCode), 'hostTransferred', {
            previousHost: username,
            newHost: finalNextHost,
            message: `${username} did not reconnect. ${finalNextHost} is now the host.`
          });
          broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
            users: getGameUsers(gameCode) as GameUser[]
          });
          broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
          return;
        }
      }

      logger.info('SOCKET', `Host reconnection timeout for game ${gameCode} - closing room`);

      // Stop timer and bots
      clearGameTimer(gameCode);
      cleanupGameBots(gameCode);

      // Notify all players
      broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', {
        message: 'Host did not reconnect. Room is closing.'
      });

      // Clean up game
      deleteGame(gameCode);
      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
    }
  }, HOST_RECONNECTION_GRACE_PERIOD);

  logger.debug('SOCKET', `Started ${HOST_RECONNECTION_GRACE_PERIOD}ms reconnection timer for host in game ${gameCode}`);
}

/**
 * Handle player disconnection
 */
function handlePlayerDisconnect(io: Server, socket: Socket, game: Game, gameCode: string, username: string, reason: string): void {
  logger.info('SOCKET', `Player ${username} disconnected from game ${gameCode}`);

  // Check if user is a bot (bots don't have reconnection handling)
  const userData: GameUserWithTimeout | undefined = game.users?.[username];
  if (userData?.isBot) {
    // Remove bot immediately
    removeUserFromGame(gameCode, username);

    // Check if room is now empty and close it immediately
    if (isRoomEmpty(gameCode)) {
      logger.info('SOCKET', `Room ${gameCode} is empty after bot ${username} removed - closing immediately`);
      clearGameTimer(gameCode);
      cleanupGameBots(gameCode);
      deleteGame(gameCode);
      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      return;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode) as GameUser[]
    });
    return;
  }

  // Notify game start coordinator so ack sequence adjusts for the missing player
  gameStartCoordinator.handlePlayerDisconnect(gameCode, username);

  // Mark user as disconnected but don't remove yet (allow reconnection)
  if (game.users[username]) {
    game.users[username].disconnected = true;
    game.users[username].disconnectedAt = Date.now();

    // Check if room is now empty (all players disconnected)
    if (isRoomEmpty(gameCode)) {
      logger.info('SOCKET', `Room ${gameCode} is empty after ${username} disconnected - closing immediately`);
      clearGameTimer(gameCode);
      cleanupGameBots(gameCode);
      deleteGame(gameCode);
      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      return;
    }

    // Room still has active players - notify and start reconnection grace period
    broadcastToRoom(io, getGameRoom(gameCode), 'playerDisconnected', {
      username,
      message: `${username} disconnected. Waiting for reconnection...`
    });

    // Start player reconnection grace period
    const reconnectionTimeout = setTimeout(() => {
      const currentGame = getGame(gameCode);
      if (!currentGame) return;

      const currentUserData: GameUserWithTimeout | undefined = currentGame.users?.[username] as unknown as GameUserWithTimeout | undefined;
      if (currentUserData && currentUserData.disconnected) {
        logger.info('SOCKET', `Player ${username} reconnection timeout - removing from game ${gameCode}`);

        // Clean up player data
        cleanupPlayerData(currentGame, username);
        removeUserFromGame(gameCode, username);

        // Check if room is now empty and close it immediately
        if (isRoomEmpty(gameCode)) {
          logger.info('SOCKET', `Room ${gameCode} is empty after ${username} timeout - closing immediately`);
          clearGameTimer(gameCode);
          cleanupGameBots(gameCode);
          deleteGame(gameCode);
          broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
          return;
        }

        // Notify remaining players
        broadcastToRoom(io, getGameRoom(gameCode), 'playerLeft', {
          username,
          message: `${username} did not reconnect and was removed.`
        });

        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
          users: getGameUsers(gameCode) as GameUser[]
        });

        broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      }
    }, PLAYER_RECONNECTION_GRACE_PERIOD);

    // Store timeout reference for cancellation on reconnect
    (game.users[username] as GameUserWithTimeout).reconnectionTimeout = reconnectionTimeout;

    logger.debug('SOCKET', `Started ${PLAYER_RECONNECTION_GRACE_PERIOD}ms reconnection timer for ${username} in game ${gameCode}`);
  }
}

export { registerConnectionHandlers };

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
  isRoomEmpty,
  getNextEligibleHost,
  transferHost
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
} from '../utils/socketHelpers.js';

import timerManager, { clearGameTimer } from '../utils/timerManager.js';
import { resetRateLimit } from '../utils/rateLimiter.js';
import { cleanupPlayerData } from '../utils/playerCleanup.js';
import { cleanupGameBots } from '../modules/botManager.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { startGameTimer } from '../services/gameLifecycle/gameTimer.js';
import logger from '../utils/logger.js';

// Configuration
// Host grace defaults to 5 minutes so a backgrounded Chrome tab / locked phone
// does not tear down the host's room. Periodic empty-room sweep
// (gameStateManager.cleanupEmptyRooms) reads the same env var to stay in sync.
const HOST_RECONNECTION_GRACE_PERIOD = parseInt(process.env.HOST_RECONNECTION_GRACE_PERIOD || '300000');
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

    // Ping timeout is the most common cause of mid-game disconnections
    // (mobile sleep, network switch, poor WiFi). Log at warn for visibility.
    if (reason === 'ping timeout') {
      logger.warn('SOCKET', `Socket ${socket.id} ping timeout${gameCode ? ` in game ${gameCode} (user: ${username})` : ''} — client didn't respond within pingTimeout`);
    } else {
      logger.info('SOCKET', `Socket ${socket.id} disconnected (reason: ${reason})${gameCode ? ` from game ${gameCode}` : ''}`);
    }

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
function handleHostDisconnect(io: Server, socket: Socket, game: Game, gameCode: string, username: string, _reason: string): void {
  logger.info('SOCKET', `Host (${username}) disconnected from game ${gameCode}`);

  // Clear any existing host reconnection timeout to prevent double-fire
  timerManager.clearTimer(`hostReconnect:${gameCode}`);

  // Notify game start coordinator so ack sequence adjusts for the missing player
  const hostCoordResult = gameStartCoordinator.handlePlayerDisconnect(gameCode, username);
  if (hostCoordResult && hostCoordResult.startTimer) {
    startGameTimer(io, gameCode, game.gameDuration || game.timerSeconds || 180);
  }

  // Mark host as disconnected BEFORE checking if room is empty
  // This ensures isRoomEmpty correctly counts the disconnecting host as inactive
  if (game.users[username]) {
    game.users[username].disconnected = true;
    game.users[username].disconnectedAt = Date.now();
  }

  // NOTE: previously we deleted the room immediately when the host was the
  // last active user (`isRoomEmpty(gameCode)`). That made backgrounding Chrome
  // / locking the phone instantly destroy the room — even though the user
  // never explicitly closed it. Now we always fall through to the grace-period
  // path: getNextEligibleHost will return null for solo rooms, so the existing
  // grace-timer block schedules a delayed close, giving the host a chance to
  // reconnect within HOST_RECONNECTION_GRACE_PERIOD.

  // Try to find a new host from remaining connected players
  // Retry up to 3 times in case candidates disconnect between selection and transfer
  let hostTransferred = false;
  const triedCandidates = new Set<string>();
  for (let attempt = 0; attempt < 3; attempt++) {
    const nextHost = getNextEligibleHost(gameCode, username);
    if (!nextHost || triedCandidates.has(nextHost)) break;
    triedCandidates.add(nextHost);

    const transferResult = transferHost(gameCode, nextHost);
    if (transferResult.success) {
      logger.info('SOCKET', `Host transferred in game ${gameCode}: ${username} -> ${nextHost}`);

      broadcastToRoom(io, getGameRoom(gameCode), 'hostTransferred', {
        previousHost: username,
        newHost: nextHost,
        message: `${username} left. ${nextHost} is now the host.`
      });

      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode) as GameUser[]
      });

      broadcastActiveRooms(io, getActiveRooms() as unknown as ActiveRoom[]);
      hostTransferred = true;
      break;
    } else {
      logger.warn('SOCKET', `Failed to transfer host in game ${gameCode} to ${nextHost}: ${transferResult.error}, retrying...`);
    }
  }

  if (hostTransferred) return;

  // No eligible player found for host transfer - use grace period before closing
  logger.info('SOCKET', `No eligible host found for game ${gameCode}, starting grace period`);

  // Notify players that host disconnected
  broadcastToRoom(io, getGameRoom(gameCode), 'hostDisconnected', {
    message: 'Host disconnected. Waiting for reconnection...',
    gracePeriodMs: HOST_RECONNECTION_GRACE_PERIOD
  });

  // Start grace period for host reconnection
  timerManager.setTimeout(`hostReconnect:${gameCode}`, () => {
    try {
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
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('SOCKET', `Error in host reconnection timeout for ${gameCode}: ${err.message}`);
    }
  }, HOST_RECONNECTION_GRACE_PERIOD);

  logger.debug('SOCKET', `Started ${HOST_RECONNECTION_GRACE_PERIOD}ms reconnection timer for host in game ${gameCode}`);
}

/**
 * Handle player disconnection
 */
function handlePlayerDisconnect(io: Server, _socket: Socket, game: Game, gameCode: string, username: string, _reason: string): void {
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
  const playerCoordResult = gameStartCoordinator.handlePlayerDisconnect(gameCode, username);
  if (playerCoordResult && playerCoordResult.startTimer) {
    startGameTimer(io, gameCode, game.gameDuration || game.timerSeconds || 180);
  }

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
    timerManager.setTimeout(`reconnect:${gameCode}:${username}`, () => {
      try {
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
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('SOCKET', `Error in player reconnection timeout for ${username} in ${gameCode}: ${err.message}`);
      }
    }, PLAYER_RECONNECTION_GRACE_PERIOD);

    logger.debug('SOCKET', `Started ${PLAYER_RECONNECTION_GRACE_PERIOD}ms reconnection timer for ${username} in game ${gameCode}`);
  }
}

export { registerConnectionHandlers };

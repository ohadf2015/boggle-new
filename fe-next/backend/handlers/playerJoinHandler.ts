/**
 * Player Join Handler
 * Handles player join, leave, and reconnection events
 */

import type { Server, Socket } from 'socket.io';
import type { GameUser, Avatar } from '@/shared/types';

import {
  getGame,
  deleteGame,
  addUserToGame,
  removeUserFromGame,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getGameBySocketId,
  getGameUsers,
  getActiveRooms,
  isRoomEmpty,
  addSpectatorToGame,
  getGameSpectators,
  upgradeSpectatorToPlayer,
  clearSocketMappingsForLeave,
  restoreGameFromRedis,
  getNextEligibleHost,
  transferHost
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
  joinRoom,
  leaveRoom,
  LOBBY_ROOM,
} from '../utils/socketHelpers.js';

import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import timerManager, { clearGameTimer } from '../utils/timerManager.js';
import { cleanupGameBots } from '../modules/botManager.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { startGameTimer } from '../services/gameLifecycle/gameTimer.js';
import { generateRandomAvatar } from '../utils/gameUtils.js';
import logger from '../utils/logger.js';
import { validatePayload, joinGameSchema } from '../utils/socketValidation.js';
import { MAX_PLAYERS_PER_ROOM } from '../utils/consts.js';
import { isInProgress, shouldSendGameState } from '../utils/gameStateMachine.js';
import { notifyPlayerJoined } from '../modules/notificationService.js';
import {
  handleReconnection,
  handleLateJoin,
  handleTournamentJoin,
  handleExistingAuthConnectionJoin
} from './playerReconnectHandler';
import { ensurePlayerState } from './playerDataInit';

// Types for payloads
interface JoinGamePayload {
  gameCode: string;
  username: string;
  playerId?: string;
  avatar?: Avatar;
  authUserId?: string;
  guestTokenHash?: string;
  guestSessionId?: string;
}

interface LeaveRoomPayload {
  gameCode: string;
  username: string;
}

interface UpgradeToPlayerPayload {
  gameCode: string;
}

/**
 * Register player join/leave socket event handlers
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
 */
function registerPlayerJoinHandlers(io: Server, socket: Socket): void {

  // Handle player joining
  socket.on('join', async (data: JoinGamePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload
    const validation = validatePayload(joinGameSchema, data);
    if (!validation.success) {
      emitError(socket, `Invalid request: ${validation.error}`);
      return;
    }

    let { gameCode, username, playerId, avatar, authUserId: clientAuthUserId, guestTokenHash, guestSessionId } = validation.data as JoinGamePayload;

    // Use server-verified user ID if available (from JWT middleware), ignore client-supplied value
    const authUserId = (socket.data?.verifiedUserId as string | undefined) || undefined;
    if (clientAuthUserId && authUserId && clientAuthUserId !== authUserId) {
      logger.warn('SOCKET', `Auth ID mismatch for ${username}: client="${clientAuthUserId}" verified="${authUserId}"`);
    }

    logger.info('SOCKET', `Join request: ${username} to game ${gameCode}${authUserId ? ` (verified: ${authUserId})` : ' (guest)'}`);

    let game = getGame(gameCode);
    if (!game) {
      const restoredGame = await restoreGameFromRedis(gameCode);
      if (restoredGame) {
        game = restoredGame;
        logger.info('SOCKET', `Restored game ${gameCode} from Redis for join request`);
      } else {
        emitError(socket, ErrorCodes.GAME_NOT_FOUND);
        return;
      }
    }

    // Handle multi-tab detection and existing auth connection
    if (authUserId) {
      const authResult = await handleExistingAuthConnectionJoin(io, socket, authUserId, gameCode, username);
      // If user is reconnecting to same game, use their existing username to prevent duplicates
      if (authResult.handled && authResult.existingUsername) {
        logger.info('SOCKET', `Using existing username "${authResult.existingUsername}" instead of "${username}" for auth user reconnection`);
        username = authResult.existingUsername;
      }
    }

    // Block kicked players from re-joining
    if (game.kickedPlayers?.has(username)) {
      emitError(socket, ErrorCodes.PLAYER_KICKED, { message: 'You have been kicked from this room' });
      return;
    }

    // Block late joins for ranked games (use state machine helper)
    if (game.isRanked && isInProgress(game.gameState) && !game.allowLateJoin) {
      const existingSocketId = getSocketIdByUsername(gameCode, username);
      if (!existingSocketId) {
        emitError(socket, ErrorCodes.GAME_CLOSED, { message: 'Cannot join ranked game in progress' });
        return;
      }
    }

    // Check for existing user (reconnection)
    const existingSocketId = getSocketIdByUsername(gameCode, username);

    // Check player limit
    if (!existingSocketId && Object.keys(game.users).length >= MAX_PLAYERS_PER_ROOM) {
      // Add as spectator
      const userAvatar = avatar || generateRandomAvatar();
      addSpectatorToGame(gameCode, username, socket.id, {
        avatar: userAvatar,
        authUserId: authUserId || null,
        guestTokenHash: guestTokenHash || null,
        guestSessionId: guestSessionId || null
      });

      joinRoom(socket, getGameRoom(gameCode));
      leaveRoom(socket, LOBBY_ROOM); // Stop receiving lobby broadcasts while in-game
      socket.emit('joinedAsSpectator', {
        success: true,
        gameCode,
        spectator: true,
        roomName: game.roomName,
        language: game.language,
        username
      });

      // Broadcast spectator list update
      broadcastToRoom(io, getGameRoom(gameCode), 'spectatorList', {
        spectators: getGameSpectators(gameCode)
      });

      logger.info('SOCKET', `${username} joined as spectator in game ${gameCode}`);
      return;
    }

    // Handle reconnection
    if (existingSocketId || game.users[username]) {
      handleReconnection(io, socket, game, gameCode, username, authUserId, guestTokenHash);
      return;
    }

    // Add new user
    const userAvatar = avatar || generateRandomAvatar();
    logger.info('PLAYER_JOIN', `Adding user ${username} to game ${gameCode} with authUserId=${authUserId || 'NONE'}, guestHash=${guestTokenHash ? 'yes' : 'no'}`);
    addUserToGame(gameCode, username, socket.id, {
      avatar: userAvatar,
      isHost: false,
      playerId,
      authUserId: authUserId || null,
      guestTokenHash: guestTokenHash || null,
      guestSessionId: guestSessionId || null
    });

    joinRoom(socket, getGameRoom(gameCode));
    leaveRoom(socket, LOBBY_ROOM); // Stop receiving lobby broadcasts while in-game

    socket.emit('joined', {
      success: true,
      gameCode,
      isHost: false,
      username,
      roomName: game.roomName,
      language: game.language,
      isPrivate: game.isPrivate || false,
      users: getGameUsers(gameCode)
    });

    // If game is in progress, send current state (use state machine helper)
    if (shouldSendGameState(game.gameState)) {
      handleLateJoin(socket, game, gameCode, username);
    }

    // Handle tournament join
    handleTournamentJoin(io, socket, gameCode, username, userAvatar);

    // Broadcast updates
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });
    broadcastActiveRooms(io, getActiveRooms());

    logger.info('SOCKET', `${username} joined game ${gameCode}`);

    // Fire-and-forget notification
    notifyPlayerJoined({
      gameCode,
      roomName: game.roomName,
      language: game.language,
      playerCount: Object.keys(game.users).length
    }, {
      username,
      isAuthenticated: !!authUserId
    }).catch(() => {}); // Swallow errors - never block game flow
  });

  // Handle leave room
  // Derive username from server-side mapping to prevent impersonation
  socket.on('leaveRoom', ({ gameCode }: LeaveRoomPayload) => {
    const username = getUsernameBySocketId(socket.id);
    if (!gameCode || !username) return;

    // Guard: if socket→game mapping already cleared (disconnect fired first), bail
    const mappedGame = getGameBySocketId(socket.id);
    if (!mappedGame || mappedGame !== gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Check if leaving user is the host
    const isLeavingUserHost = game.hostUsername === username;

    // Explicit `leaveRoom` (the user pressed Exit) — always fully remove,
    // regardless of game state. Distinct from a transport disconnect, which
    // hits `connectionHandler` and marks the user as `disconnected: true`
    // pending a reconnect grace window. If we kept the in-progress slot open
    // here, the user would silently auto-resume on next visit — surprising.
    if (isInProgress(game.gameState) || game.gameState === 'finished') {
      // Cancel any pending reconnection timer from a prior network drop.
      timerManager.clearTimer(`reconnect:${gameCode}:${username}`);

      // Notify game start coordinator so ack sequence adjusts.
      const leaveCoordResult = gameStartCoordinator.handlePlayerDisconnect(gameCode, username);
      if (leaveCoordResult && leaveCoordResult.startTimer) {
        startGameTimer(io, gameCode, game.gameDuration || game.timerSeconds || 180);
      }

      clearSocketMappingsForLeave(socket.id, gameCode, username);
      removeUserFromGame(gameCode, username);

      logger.info('SOCKET', `${username} left room ${gameCode} (in-progress — fully removed on explicit exit)`);

      broadcastToRoom(io, getGameRoom(gameCode), 'playerLeft', {
        username,
        message: `${username} left the room`
      });

      broadcastToRoom(io, getGameRoom(gameCode), 'spectatorList', {
        spectators: getGameSpectators(gameCode)
      });
    } else {
      // Game not started yet - fully remove user
      removeUserFromGame(gameCode, username);
      logger.info('SOCKET', `${username} left room ${gameCode} (waiting state - fully removed)`);
    }

    leaveRoom(socket, getGameRoom(gameCode));
    joinRoom(socket, LOBBY_ROOM); // Rejoin lobby to receive room list updates
    socket.emit('leftRoom', { success: true });

    // Check if room is now empty and close it immediately
    if (isRoomEmpty(gameCode)) {
      logger.info('SOCKET', `Room ${gameCode} is empty after ${username} left - closing immediately`);
      clearGameTimer(gameCode);
      cleanupGameBots(gameCode);
      gameStartCoordinator.cleanupSequence(gameCode);
      deleteGame(gameCode);
      broadcastActiveRooms(io, getActiveRooms());
      return;
    }

    // Handle host transfer if the leaving user was the host
    if (isLeavingUserHost) {
      const nextHost = getNextEligibleHost(gameCode, username);
      if (nextHost) {
        const transferResult = transferHost(gameCode, nextHost);
        if (transferResult.success) {
          logger.info('SOCKET', `Host transferred in game ${gameCode}: ${username} -> ${nextHost} (explicit leave)`);

          // Notify all players about the host transfer
          broadcastToRoom(io, getGameRoom(gameCode), 'hostTransferred', {
            previousHost: username,
            newHost: nextHost,
            message: `${username} left. ${nextHost} is now the host.`
          });
        }
      } else {
        // No eligible host found - close the room
        logger.info('SOCKET', `No eligible host found for game ${gameCode} after host ${username} left - closing room`);
        clearGameTimer(gameCode);
        cleanupGameBots(gameCode);
        gameStartCoordinator.cleanupSequence(gameCode);

        broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', {
          message: 'Host left and no other players available. Room is closing.'
        });

        deleteGame(gameCode);
        broadcastActiveRooms(io, getActiveRooms());
        return;
      }
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });
    broadcastActiveRooms(io, getActiveRooms());
  });

  // Handle spectator upgrade to player
  socket.on('upgradeToPlayer', ({ gameCode }: UpgradeToPlayerPayload) => {
    if (!checkRateLimit(socket.id)) return;
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    // Find spectator by socket ID
    const spectators = getGameSpectators(gameCode);
    const spectator = spectators.find(s => s.socketId === socket.id);

    if (!spectator) {
      emitError(socket, ErrorCodes.AUTH_FORBIDDEN, { message: 'You are not a spectator in this game' });
      return;
    }

    const username = spectator.username;

    // Check if room has space
    if (Object.keys(game.users).length >= MAX_PLAYERS_PER_ROOM) {
      emitError(socket, ErrorCodes.GAME_FULL, { message: 'Room is still full. Please wait for a slot to open.' });
      return;
    }

    // Only allow upgrade during waiting or in-progress states
    // Prevent upgrades during 'finished' or 'validating' which could corrupt results
    const isLateJoin = isInProgress(game.gameState);
    if (game.gameState !== 'waiting' && !isLateJoin) {
      emitError(socket, ErrorCodes.GAME_CLOSED, { message: 'Cannot join while game is ending. Wait for the next round.' });
      return;
    }

    // Upgrade spectator to player
    const success = upgradeSpectatorToPlayer(gameCode, username);

    if (!success) {
      emitError(socket, ErrorCodes.INTERNAL_ERROR, { message: 'Failed to join game' });
      return;
    }

    logger.info('SOCKET', `Spectator ${username} upgraded to player in game ${gameCode}`);

    socket.emit('spectatorUpgraded', {
      success: true,
      username,
      users: getGameUsers(gameCode),
      isHost: false,
      lateJoin: isLateJoin
    });

    // If game is in progress, initialize player data and send current state
    if (isLateJoin) {
      const currentGame = getGame(gameCode);
      if (currentGame) {
        ensurePlayerState(currentGame, username);
      }
      handleLateJoin(socket, game, gameCode, username);
    }

    // Broadcast updates to room
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });
    broadcastToRoom(io, getGameRoom(gameCode), 'spectatorList', {
      spectators: getGameSpectators(gameCode)
    });
  });
}

// Helper functions (handleReconnection, handleLateJoin, handleTournamentJoin, handleExistingAuthConnectionJoin)
// are in ./playerReconnectHandler.ts

export {
  registerPlayerJoinHandlers,
  handleReconnection,
  handleLateJoin,
  handleTournamentJoin,
  handleExistingAuthConnectionJoin
};

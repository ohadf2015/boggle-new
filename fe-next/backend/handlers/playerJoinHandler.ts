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
import { startGameTimer, resumeGameTimerIfMissing } from '../services/gameLifecycle/gameTimer.js';
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
      // Typed (LOW severity → debug, not Sentry) — bad username is expected user
      // input, not a fault. Sentry JAVASCRIPT-NEXTJS-1MB/1MC/1MD.
      emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, { message: `Invalid request: ${validation.error}` });
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

    // A server restart/redeploy wipes the in-memory setInterval game clock
    // (round countdown + word-hunt life drain) and bot loops while Redis keeps
    // the game state. Whichever path rehydrated this game (the sync getGame
    // above, or an async restore upstream), an in-progress game whose timer was
    // orphaned must have it resumed — otherwise the round is frozen: word-hunt
    // life stays pinned at its last value, the round never ends, and players
    // can still submit words (the "stuck at full life for everyone" report).
    // No-op for normal live reconnects (a timer is already running) and for
    // waiting/finished games — see resumeGameTimerIfMissing's guards.
    // Awaited so the dictionary is warm (bot solving + word validation) before
    // the resumed round runs.
    await resumeGameTimerIfMissing(io, gameCode);

    // Handle multi-tab detection and existing auth connection
    if (authUserId) {
      const authResult = await handleExistingAuthConnectionJoin(io, socket, authUserId, gameCode, username);
      // If user is reconnecting to same game, use their existing username to prevent duplicates
      if (authResult.handled && authResult.existingUsername) {
        logger.info('SOCKET', `Using existing username "${authResult.existingUsername}" instead of "${username}" for auth user reconnection`);
        username = authResult.existingUsername;
      }
    } else if (guestTokenHash) {
      // Audit HIGH #4 (2026-05-10): guest reconnect path. If a guest host
      // returns to their game (sessionStorage cleared, new tab, etc.) and
      // picks a different display name, the username-based reconnect lookup
      // would miss them — they'd land as a brand-new player without host
      // status. Match on guestTokenHash instead so they reclaim their slot.
      for (const [existingName, user] of Object.entries(game.users)) {
        if (user.guestTokenHash && user.guestTokenHash === guestTokenHash) {
          if (existingName !== username) {
            logger.info('SOCKET', `Guest reconnect by tokenHash: "${username}" → existing slot "${existingName}" in game ${gameCode}`);
            username = existingName;
          }
          break;
        }
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

    // `gameInProgress` lets the client arm the lost-`startGame` safety-net for
    // late joiners (it already does this for reconnections). Without it, a
    // late-join `startGame` that races the client's listener registration is
    // lost silently → player stuck on a default grid while the real mode runs.
    const gameInProgress = shouldSendGameState(game.gameState);
    socket.emit('joined', {
      success: true,
      gameCode,
      isHost: false,
      username,
      roomName: game.roomName,
      language: game.language,
      isPrivate: game.isPrivate || false,
      users: getGameUsers(gameCode),
      gameInProgress
    });

    // If game is in progress, send current state (use state machine helper)
    if (gameInProgress) {
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
  socket.on('leaveRoom', ({ gameCode, username: payloadUsername }: LeaveRoomPayload) => {
    // Light RL: each leave does state mutation + broadcast. Spam → repeated
    // updateUsers fanouts to all lobby clients.
    if (!checkRateLimit(socket.id)) return;
    // Prefer socket-mapped username (auth source of truth) but fall back to
    // the payload when the socket reconnected mid-session and lost its
    // mapping. Without this fallback an explicit Exit silently no-ops and
    // the user keeps showing as a "ghost" room member in the lobby.
    const username = getUsernameBySocketId(socket.id) || payloadUsername;
    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game) return;
    // Verify the user is actually a member of this game — guards against a
    // malicious payload trying to evict someone else after a socket reconnect.
    if (!game.users[username]) return;

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
      // Audit MED #6 (2026-05-10): also clear any stale reconnect timers from
      // a prior network flap, mirroring the in-progress branch above. Without
      // this, a player who flapped + then explicitly leaves leaves a phantom
      // timer in the manager that never fires (game already cleaned up) but
      // wastes a slot in the timer map.
      timerManager.clearTimer(`reconnect:${gameCode}:${username}`);
      if (isLeavingUserHost) {
        timerManager.clearTimer(`hostReconnect:${gameCode}`);
      }
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
            message: `${username} left. ${nextHost} is now the host.`,
            i18nKey: 'multiplayerFlow.hostTransferredAnnouncement',
            i18nParams: { previousHost: username, newHost: nextHost }
          });
        }
      } else {
        // No eligible host found - close the room
        logger.info('SOCKET', `No eligible host found for game ${gameCode} after host ${username} left - closing room`);
        clearGameTimer(gameCode);
        cleanupGameBots(gameCode);
        gameStartCoordinator.cleanupSequence(gameCode);

        broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', {
          message: 'Host left and no other players available. Room is closing.',
          i18nKey: 'multiplayerFlow.hostLeftReason.explicitNoSuccessor',
          i18nParams: { host: username },
          reason: 'explicit_no_successor'
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

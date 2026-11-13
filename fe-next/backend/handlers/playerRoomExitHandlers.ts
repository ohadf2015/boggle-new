/**
 * Leaving a room and a spectator taking a free seat. Registered by
 * registerPlayerJoinHandlers; moved out of playerJoinHandler unchanged.
 */

import type { Server, Socket } from 'socket.io';

import {
  getGame,
  deleteGame,
  removeUserFromGame,
  getUsernameBySocketId,
  getGameUsers,
  getActiveRooms,
  isRoomEmpty,
  getGameSpectators,
  upgradeSpectatorToPlayer,
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
import logger from '../utils/logger.js';
import { MAX_PLAYERS_PER_ROOM } from '../utils/consts.js';
import { isInProgress } from '../utils/gameStateMachine.js';
import { handleLateJoin } from './playerReconnectHandler';
import { ensurePlayerState } from './playerDataInit';
import { removeMidRoundLeaver } from './midRoundLeave.js';
import { sessionEndedNotice } from './classroomSessionEndedNotice';

interface LeaveRoomPayload {
  gameCode: string;
  username: string;
}

interface UpgradeToPlayerPayload {
  gameCode: string;
}

export function registerPlayerRoomExitHandlers(io: Server, socket: Socket): void {
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
      removeMidRoundLeaver(io, gameCode, game, socket.id, username);

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
      // Same rule as a host disconnect: a classroom, ranked or tournament seat is never handed to another player.
      const skipTransfer = game.isClassroom || game.isRanked || !!game.tournamentId;
      const nextHost = skipTransfer ? null : getNextEligibleHost(gameCode, username);
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

        broadcastToRoom(io, getGameRoom(gameCode), 'hostLeftRoomClosing', game.isClassroom ? sessionEndedNotice() : {
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

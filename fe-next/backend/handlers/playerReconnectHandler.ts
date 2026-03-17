/**
 * Player Reconnect Handler
 * Handles reconnection, late join, tournament join, and auth connection management
 */

import type { Server, Socket } from 'socket.io';
import type { Game, GameUser, Avatar } from '@/shared/types';

import {
  getGame,
  deleteGame,
  removeUserFromGame,
  getGameUsers,
  getActiveRooms,
  updateHostSocketId,
  updateUserSocketId,
  getLeaderboard,
  getTournamentIdFromGame,
  getAuthUserConnection,
  isRoomEmpty,
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastToRoomExceptSender,
  broadcastActiveRooms,
  getGameRoom,
  joinRoom,
  leaveRoom,
  safeEmit,
  getSocketById,
  disconnectSocket
} from '../utils/socketHelpers.js';

import { clearGameTimer } from '../utils/timerManager.js';
import { cleanupGameBots } from '../modules/botManager.js';
import { addPlayerMidTournament, getTournament, getTournamentStandings } from '../modules/tournamentManager.js';
import { ACHIEVEMENT_ICONS } from '../modules/achievementManager.js';
import logger from '../utils/logger.js';
import { isInProgress } from '../utils/gameStateMachine.js';
import { HUNT_INITIAL_LIFE } from '@/shared/constants/wordHuntMultiplayerConstants';

interface AuthConnectionResult {
  handled: boolean;
  existingUsername?: string;
  isHost?: boolean;
}

interface AuthConnection {
  socketId: string;
  gameCode: string;
  username: string;
  isHost: boolean;
}

/**
 * Handle existing authenticated connection when joining a game
 * @returns - { handled: boolean, existingUsername?: string, isHost?: boolean }
 */
async function handleExistingAuthConnectionJoin(io: Server, socket: Socket, authUserId: string, gameCode: string, username: string): Promise<AuthConnectionResult> {
  const existingConnection: AuthConnection | null = getAuthUserConnection(authUserId);
  if (!existingConnection) return { handled: false };

  const isSameSocket = existingConnection.socketId === socket.id;

  if (existingConnection.gameCode === gameCode) {
    if (!isSameSocket) {
      const oldSocket = getSocketById(io, existingConnection.socketId);
      if (oldSocket && oldSocket.connected) {
        // Old socket is still connected - this is a multi-tab session takeover
        // Use existing username to prevent duplicates
        oldSocket.data = oldSocket.data || {};
        oldSocket.data.migrating = true;
        // Auto-clear migration flag after 10 seconds (safety net for crashed tabs)
        oldSocket.data.migrationTimeout = setTimeout(() => {
          if (oldSocket.data) {
            oldSocket.data.migrating = false;
          }
        }, 10000);
        safeEmit(oldSocket, 'sessionTakenOver', {
          message: 'Your session was moved to another tab',
          gameCode
        });
        setTimeout(() => {
          if (oldSocket.connected) disconnectSocket(oldSocket, true);
        }, 100);

        logger.info('SOCKET', `Auth user ${authUserId} reconnecting to same game ${gameCode}, using existing username: ${existingConnection.username}`);
        return {
          handled: true,
          existingUsername: existingConnection.username,
          isHost: existingConnection.isHost
        };
      }
      // Old socket is NOT connected - user is rejoining fresh via invite link
      // Allow them to use their new username/avatar choice
      logger.info('SOCKET', `Auth user ${authUserId} rejoining game ${gameCode} with fresh connection (old socket disconnected), allowing new username: ${username}`);
      return { handled: false };
    }
    // Same socket reconnecting - use existing username
    logger.info('SOCKET', `Auth user ${authUserId} reconnecting to same game ${gameCode} (same socket), using existing username: ${existingConnection.username}`);
    return {
      handled: true,
      existingUsername: existingConnection.username,
      isHost: existingConnection.isHost
    };
  }

  if (!isSameSocket) {
    const oldSocket = getSocketById(io, existingConnection.socketId);
    if (oldSocket && oldSocket.connected) {
      safeEmit(oldSocket, 'sessionMigrated', {
        message: 'Your session was moved to another tab'
      });
      disconnectSocket(oldSocket, true);
    }
  }

  if (existingConnection.isHost) {
    const oldGame = getGame(existingConnection.gameCode);
    if (oldGame) {
      if (oldGame.reconnectionTimeout) {
        clearTimeout(oldGame.reconnectionTimeout);
        oldGame.reconnectionTimeout = null;
      }
      broadcastToRoom(io, getGameRoom(existingConnection.gameCode), 'hostLeftRoomClosing', {
        message: 'Host joined a different game. Room is closing.'
      });
      clearGameTimer(existingConnection.gameCode);
      deleteGame(existingConnection.gameCode);
      broadcastActiveRooms(io, getActiveRooms());
    }
  } else {
    removeUserFromGame(existingConnection.gameCode, existingConnection.username);

    // Check if the old room is now empty and close it immediately
    if (isRoomEmpty(existingConnection.gameCode)) {
      logger.info('SOCKET', `Room ${existingConnection.gameCode} is empty after ${existingConnection.username} left to join ${gameCode} - closing immediately`);
      clearGameTimer(existingConnection.gameCode);
      cleanupGameBots(existingConnection.gameCode);
      deleteGame(existingConnection.gameCode);
      broadcastActiveRooms(io, getActiveRooms());
    } else {
      const oldGame = getGame(existingConnection.gameCode);
      if (oldGame) {
        broadcastToRoom(io, getGameRoom(existingConnection.gameCode), 'updateUsers', {
          users: getGameUsers(existingConnection.gameCode)
        });
      }
    }
  }

  if (isSameSocket) {
    leaveRoom(socket, getGameRoom(existingConnection.gameCode));
  }

  return { handled: false };
}

/**
 * Handle player reconnection to an existing game
 */
function handleReconnection(io: Server, socket: Socket, game: Game, gameCode: string, username: string, authUserId?: string, guestTokenHash?: string): void {
  const existingAuthUserId = game.users[username]?.authUserId;
  logger.info('SOCKET', `Reconnection detected for ${username}: existingAuthUserId=${existingAuthUserId || 'NONE'}, newAuthUserId=${authUserId || 'NONE'}`);

  if (game.users[username]) {
    game.users[username].disconnected = false;
    delete game.users[username].disconnectedAt;

    if ((game.users[username] as GameUser & { reconnectionTimeout?: ReturnType<typeof setTimeout> }).reconnectionTimeout) {
      clearTimeout((game.users[username] as GameUser & { reconnectionTimeout?: ReturnType<typeof setTimeout> }).reconnectionTimeout);
      delete (game.users[username] as GameUser & { reconnectionTimeout?: ReturnType<typeof setTimeout> }).reconnectionTimeout;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'playerReconnected', { username });
  }

  // Pass auth context - use undefined (not null) to preserve existing values
  // The updateUserSocketId function will only overwrite if new values are truthy
  updateUserSocketId(gameCode, username, socket.id, {
    authUserId: authUserId,
    guestTokenHash: guestTokenHash
  });

  if (game.hostUsername === username) {
    updateHostSocketId(gameCode, socket.id);
    if (game.hostReconnectionTimeout) {
      clearTimeout(game.hostReconnectionTimeout);
      game.hostReconnectionTimeout = null;
    }
  }

  joinRoom(socket, getGameRoom(gameCode));

  socket.emit('joined', {
    success: true,
    gameCode,
    isHost: game.hostUsername === username,
    username,
    roomName: game.roomName,
    language: game.language,
    reconnected: true,
    users: getGameUsers(gameCode)
  });

  // Send game state on reconnection if game is in progress (use state machine helper)
  if (isInProgress(game.gameState)) {
    const reconnectPayload: Record<string, any> = {
      letterGrid: game.letterGrid,
      timerSeconds: game.remainingTime || game.timerSeconds,
      language: game.language,
      minWordLength: game.minWordLength || 2,
      messageId: 'reconnect-' + Date.now(),
      reconnect: true,
      skipAck: true,
      boardTheme: (game as Game & { boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null }).boardTheme || null,
      gameMode: game.gameMode || 'classic',
    };

    // Include blast mode state for reconnecting players
    if (game.gameMode === 'blast' && game.blastModeState) {
      reconnectPayload.blastTileOverlay = game.blastModeState.overlay || [];
      reconnectPayload.blastSeed = game.blastModeState.seed ?? null;
    }

    // Include word hunt state for reconnecting players
    if (game.gameMode === 'word-hunt' && game.wordHuntState) {
      reconnectPayload.wordHuntTargetLength = game.wordHuntState.targetWordLength ?? 0;
      reconnectPayload.wordHuntEliminatedPlayers = game.wordHuntState.eliminatedPlayers || [];
      reconnectPayload.wordHuntPlayerLives = game.wordHuntState.playerLives || {};
    }

    socket.emit('startGame', reconnectPayload);

    // Send current leaderboard and player's achievements so UI is fully restored
    const leaderboard = getLeaderboard(gameCode);
    socket.emit('updateLeaderboard', { leaderboard });

    const playerAchievementKeys: string[] = game.playerAchievements?.[username] || [];
    if (playerAchievementKeys.length > 0) {
      const achievements = playerAchievementKeys
        .map((key: string) => ({ key, icon: ACHIEVEMENT_ICONS[key] }))
        .filter((a: { key: string; icon: string | undefined }) => a.icon);
      if (achievements.length > 0) {
        socket.emit('liveAchievementUnlocked', { achievements });
      }
    }
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
    users: getGameUsers(gameCode)
  });
}

/**
 * Handle late join to an in-progress game
 */
function handleLateJoin(socket: Socket, game: Game, gameCode: string, username: string): void {
  logger.info('SOCKET', `${username} joining game ${gameCode} in progress`);

  const lateJoinPayload: Record<string, any> = {
    letterGrid: game.letterGrid,
    timerSeconds: game.remainingTime || game.timerSeconds,
    language: game.language,
    minWordLength: game.minWordLength || 2,
    messageId: 'late-join-' + Date.now(),
    lateJoin: true,
    skipAck: true,
    boardTheme: (game as Game & { boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null }).boardTheme || null,
    gameMode: game.gameMode || 'classic',
  };

  // Include blast mode state for late joiners
  if (game.gameMode === 'blast' && game.blastModeState) {
    lateJoinPayload.blastTileOverlay = game.blastModeState.overlay || [];
    lateJoinPayload.blastSeed = game.blastModeState.seed ?? null;
  }

  // Include word hunt state for late joiners — also initialize their lives
  if (game.gameMode === 'word-hunt' && game.wordHuntState) {
    // Add late-joiner to playerLives if not already present
    if (!(username in game.wordHuntState.playerLives)) {
      game.wordHuntState.playerLives[username] = HUNT_INITIAL_LIFE;
    }
    lateJoinPayload.wordHuntTargetLength = game.wordHuntState.targetWordLength ?? 0;
    lateJoinPayload.wordHuntEliminatedPlayers = game.wordHuntState.eliminatedPlayers || [];
    lateJoinPayload.wordHuntPlayerLives = game.wordHuntState.playerLives || {};
  }

  socket.emit('startGame', lateJoinPayload);

  const leaderboard = getLeaderboard(gameCode);
  socket.emit('updateLeaderboard', { leaderboard });

  const playerAchievementKeys: string[] = game.playerAchievements?.[username] || [];
  if (playerAchievementKeys.length > 0) {
    const achievements = playerAchievementKeys
      .map(key => ({ key, icon: ACHIEVEMENT_ICONS[key] }))
      .filter((a: { key: string; icon: string | undefined }) => a.icon);
    logger.info('ACHIEVEMENT', `Late join: Resending ${achievements.length} achievements to ${username}: ${playerAchievementKeys.join(', ')} (gameState: ${game.gameState})`);
    socket.emit('liveAchievementUnlocked', { achievements });
  }
}

/**
 * Handle tournament join for a player
 */
function handleTournamentJoin(_io: Server, socket: Socket, gameCode: string, username: string, userAvatar: Avatar, profilePictureUrl?: string): void {
  const tournamentId = getTournamentIdFromGame(gameCode);
  if (!tournamentId) return;

  try {
    const tournamentAvatar = { ...userAvatar, profilePictureUrl: profilePictureUrl || null };
    addPlayerMidTournament(tournamentId, socket.id, username, JSON.stringify(tournamentAvatar));

    const tournament = getTournament(tournamentId);
    if (!tournament) {
      logger.warn('TOURNAMENT', `Tournament ${tournamentId} not found after adding player`);
      return;
    }
    const standings = getTournamentStandings(tournamentId) || [];

    socket.emit('tournamentInfo', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        totalRounds: tournament.totalRounds,
        currentRound: tournament.currentRound,
        status: tournament.status
      },
      standings
    });

    broadcastToRoomExceptSender(socket, getGameRoom(gameCode), 'tournamentPlayerJoined', {
      username,
      standings
    });
  } catch (err: unknown) {
    const error = err as Error;
    logger.warn('TOURNAMENT', `Could not add ${username} to tournament: ${error.message}`);
  }
}

export {
  handleReconnection,
  handleLateJoin,
  handleTournamentJoin,
  handleExistingAuthConnectionJoin
};

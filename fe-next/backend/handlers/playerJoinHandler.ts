/**
 * Player Join Handler
 * Handles player join, leave, and reconnection events
 */

import type { Server, Socket } from 'socket.io';
import type { Game, GameUser, Avatar, Language, LeaderboardEntry, TournamentStanding } from '@/shared/types';

const {
  getGame,
  deleteGame,
  addUserToGame,
  removeUserFromGame,
  getGameBySocketId,
  getSocketIdByUsername,
  getGameUsers,
  getActiveRooms,
  updateHostSocketId,
  updateUserSocketId,
  getLeaderboard,
  getTournamentIdFromGame,
  getAuthUserConnection,
  isRoomEmpty,
  addSpectatorToGame,
  getGameSpectators,
  upgradeSpectatorToPlayer,
  isSpectator,
  clearSocketMappingsForLeave,
  restoreGameFromRedis
} = require('../modules/gameStateManager');

const {
  broadcastToRoom,
  broadcastToRoomExceptSender,
  getGameRoom,
  joinRoom,
  leaveRoom,
  safeEmit,
  getSocketById,
  disconnectSocket
} = require('../utils/socketHelpers');

const { emitError, ErrorMessages } = require('../utils/errorHandler');
const { checkRateLimit } = require('../utils/rateLimiter');
const timerManager = require('../utils/timerManager');
const botManager = require('../modules/botManager');
const tournamentManager = require('../modules/tournamentManager');
const { generateRandomAvatar } = require('../utils/gameUtils');
const { ACHIEVEMENT_ICONS } = require('../modules/achievementManager');
const logger = require('../utils/logger');
const { validatePayload, joinGameSchema, leaveRoomSchema } = require('../utils/socketValidation');
const { MAX_PLAYERS_PER_ROOM } = require('../utils/consts');
const { isInProgress, canJoinFreely, shouldSendGameState } = require('../utils/gameStateMachine');
const { notifyPlayerJoined } = require('../modules/notificationService');

// Types for payloads
interface JoinGamePayload {
  gameCode: string;
  username: string;
  playerId?: string;
  avatar?: Avatar;
  authUserId?: string;
  guestTokenHash?: string;
  profilePictureUrl?: string;
}

interface LeaveRoomPayload {
  gameCode: string;
  username: string;
}

interface UpgradeToPlayerPayload {
  gameCode: string;
}

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

interface Spectator {
  username: string;
  socketId: string;
  avatar?: Avatar;
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

    let { gameCode, username, playerId, avatar, authUserId, guestTokenHash, profilePictureUrl } = validation.data as JoinGamePayload;

    logger.info('SOCKET', `Join request: ${username} to game ${gameCode}`);

    let game = getGame(gameCode);
    if (!game) {
      const restoredGame = await restoreGameFromRedis(gameCode);
      if (restoredGame) {
        game = restoredGame;
        logger.info('SOCKET', `Restored game ${gameCode} from Redis for join request`);
      } else {
        emitError(socket, ErrorMessages.GAME_NOT_FOUND);
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

    // Block late joins for ranked games (use state machine helper)
    if (game.isRanked && isInProgress(game.gameState) && !game.allowLateJoin) {
      const existingSocketId = getSocketIdByUsername(gameCode, username);
      if (!existingSocketId) {
        emitError(socket, 'Cannot join ranked game in progress');
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
        avatar: { ...userAvatar, profilePictureUrl: profilePictureUrl || null },
        authUserId: authUserId || null,
        guestTokenHash: guestTokenHash || null
      });

      joinRoom(socket, getGameRoom(gameCode));
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
    addUserToGame(gameCode, username, socket.id, {
      avatar: { ...userAvatar, profilePictureUrl: profilePictureUrl || null },
      isHost: false,
      playerId,
      authUserId: authUserId || null,
      guestTokenHash: guestTokenHash || null
    });

    joinRoom(socket, getGameRoom(gameCode));

    socket.emit('joined', {
      success: true,
      gameCode,
      isHost: false,
      username,
      roomName: game.roomName,
      language: game.language,
      users: getGameUsers(gameCode)
    });

    // If game is in progress, send current state (use state machine helper)
    if (shouldSendGameState(game.gameState)) {
      handleLateJoin(socket, game, gameCode, username);
    }

    // Handle tournament join
    handleTournamentJoin(io, socket, gameCode, username, userAvatar, profilePictureUrl);

    // Broadcast updates
    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });
    io.emit('activeRooms', { rooms: getActiveRooms() });

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
  socket.on('leaveRoom', ({ gameCode, username }: LeaveRoomPayload) => {
    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game) return;

    // If game is in progress or finished, mark as disconnected instead of removing
    // This allows the player to rejoin and continue
    if (isInProgress(game.gameState) || game.gameState === 'finished') {
      if (game.users[username]) {
        game.users[username].disconnected = true;
        game.users[username].disconnectedAt = Date.now();

        // Clear socket mappings to prevent stale socket ID issues on rejoin
        // User data remains in game.users for score preservation
        clearSocketMappingsForLeave(socket.id, gameCode, username);

        logger.info('SOCKET', `${username} left room ${gameCode} (game in progress - marked as disconnected, can rejoin)`);

        broadcastToRoom(io, getGameRoom(gameCode), 'playerLeft', {
          username,
          message: `${username} left the room`
        });

        // Update spectator list in case slot opened
        broadcastToRoom(io, getGameRoom(gameCode), 'spectatorList', {
          spectators: getGameSpectators(gameCode)
        });
      }
    } else {
      // Game not started yet - fully remove user
      removeUserFromGame(gameCode, username);
      logger.info('SOCKET', `${username} left room ${gameCode} (waiting state - fully removed)`);
    }

    leaveRoom(socket, getGameRoom(gameCode));
    socket.emit('leftRoom', { success: true });

    // Check if room is now empty and close it immediately
    if (isRoomEmpty(gameCode)) {
      logger.info('SOCKET', `Room ${gameCode} is empty after ${username} left - closing immediately`);
      timerManager.clearGameTimer(gameCode);
      botManager.stopAllBots(gameCode);
      deleteGame(gameCode);
      io.emit('activeRooms', { rooms: getActiveRooms() });
      return;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
      users: getGameUsers(gameCode)
    });
    io.emit('activeRooms', { rooms: getActiveRooms() });
  });

  // Handle spectator upgrade to player
  socket.on('upgradeToPlayer', ({ gameCode }: UpgradeToPlayerPayload) => {
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    // Find spectator by socket ID
    const spectators: Spectator[] = getGameSpectators(gameCode);
    const spectator = spectators.find(s => s.socketId === socket.id);

    if (!spectator) {
      emitError(socket, 'You are not a spectator in this game');
      return;
    }

    const username = spectator.username;

    // Check if room has space
    if (Object.keys(game.users).length >= MAX_PLAYERS_PER_ROOM) {
      emitError(socket, 'Room is still full. Please wait for a slot to open.');
      return;
    }

    // Upgrade spectator to player
    const success = upgradeSpectatorToPlayer(gameCode, username);

    if (!success) {
      emitError(socket, 'Failed to join game');
      return;
    }

    logger.info('SOCKET', `Spectator ${username} upgraded to player in game ${gameCode}`);

    // Notify the upgraded player
    const isLateJoin = isInProgress(game.gameState);
    socket.emit('spectatorUpgraded', {
      success: true,
      username,
      users: getGameUsers(gameCode),
      isHost: false,
      lateJoin: isLateJoin
    });

    // If game is in progress, send current state
    if (isLateJoin) {
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

// ==========================================
// Helper Functions
// ==========================================

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
        oldSocket.data = oldSocket.data || {};
        oldSocket.data.migrating = true;
        safeEmit(oldSocket, 'sessionTakenOver', {
          message: 'Your session was moved to another tab',
          gameCode
        });
        setTimeout(() => {
          if (oldSocket.connected) disconnectSocket(oldSocket, true);
        }, 100);
      }
    }
    // Return existing username to prevent creating duplicate user
    logger.info('SOCKET', `Auth user ${authUserId} reconnecting to same game ${gameCode}, using existing username: ${existingConnection.username}`);
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
      timerManager.clearGameTimer(existingConnection.gameCode);
      deleteGame(existingConnection.gameCode);
      io.emit('activeRooms', { rooms: getActiveRooms() });
    }
  } else {
    removeUserFromGame(existingConnection.gameCode, existingConnection.username);

    // Check if the old room is now empty and close it immediately
    if (isRoomEmpty(existingConnection.gameCode)) {
      logger.info('SOCKET', `Room ${existingConnection.gameCode} is empty after ${existingConnection.username} left to join ${gameCode} - closing immediately`);
      timerManager.clearGameTimer(existingConnection.gameCode);
      botManager.stopAllBots(existingConnection.gameCode);
      deleteGame(existingConnection.gameCode);
      io.emit('activeRooms', { rooms: getActiveRooms() });
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
  logger.info('SOCKET', `Reconnection detected for ${username}`);

  if (game.users[username]) {
    game.users[username].disconnected = false;
    delete game.users[username].disconnectedAt;

    if ((game.users[username] as GameUser & { reconnectionTimeout?: ReturnType<typeof setTimeout> }).reconnectionTimeout) {
      clearTimeout((game.users[username] as GameUser & { reconnectionTimeout?: ReturnType<typeof setTimeout> }).reconnectionTimeout);
      delete (game.users[username] as GameUser & { reconnectionTimeout?: ReturnType<typeof setTimeout> }).reconnectionTimeout;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'playerReconnected', { username });
  }

  updateUserSocketId(gameCode, username, socket.id, {
    authUserId: authUserId || null,
    guestTokenHash: guestTokenHash || null
  });

  if (game.hostUsername === username) {
    updateHostSocketId(gameCode, socket.id);
    if (game.reconnectionTimeout) {
      clearTimeout(game.reconnectionTimeout);
      game.reconnectionTimeout = null;
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
    socket.emit('startGame', {
      letterGrid: game.letterGrid,
      timerSeconds: game.remainingTime || game.timerSeconds,
      language: game.language,
      minWordLength: game.minWordLength || 2,
      messageId: 'reconnect-' + Date.now(),
      reconnect: true,
      skipAck: true,
      boardTheme: (game as Game & { boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null }).boardTheme || null
    });
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

  socket.emit('startGame', {
    letterGrid: game.letterGrid,
    timerSeconds: game.remainingTime || game.timerSeconds,
    language: game.language,
    minWordLength: game.minWordLength || 2,
    messageId: 'late-join-' + Date.now(),
    lateJoin: true,
    skipAck: true,
    boardTheme: (game as Game & { boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null }).boardTheme || null
  });

  const leaderboard: LeaderboardEntry[] = getLeaderboard(gameCode);
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
function handleTournamentJoin(io: Server, socket: Socket, gameCode: string, username: string, userAvatar: Avatar, profilePictureUrl?: string): void {
  const tournamentId = getTournamentIdFromGame(gameCode);
  if (!tournamentId) return;

  try {
    const tournamentAvatar = { ...userAvatar, profilePictureUrl: profilePictureUrl || null };
    tournamentManager.addPlayerMidTournament(tournamentId, socket.id, username, tournamentAvatar);

    const tournament = tournamentManager.getTournament(tournamentId);
    const standings: TournamentStanding[] = tournamentManager.getTournamentStandings(tournamentId);

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

module.exports = {
  registerPlayerJoinHandlers,
  handleReconnection,
  handleLateJoin,
  handleTournamentJoin,
  handleExistingAuthConnectionJoin
};

export {
  registerPlayerJoinHandlers,
  handleReconnection,
  handleLateJoin,
  handleTournamentJoin,
  handleExistingAuthConnectionJoin
};

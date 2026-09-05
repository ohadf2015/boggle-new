/**
 * Player Reconnect Handler
 * Handles reconnection, late join, tournament join, and auth connection management
 */

import type { Server, Socket } from 'socket.io';
import type { GameUser, Avatar } from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';

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
  disconnectSocket,
  LOBBY_ROOM
} from '../utils/socketHelpers.js';

import timerManager, { clearGameTimer } from '../utils/timerManager.js';
import { cleanupGameBots } from '../modules/botManager.js';
import { addPlayerMidTournament, getTournament, getTournamentStandings } from '../modules/tournamentManager.js';
import { ACHIEVEMENT_ICONS } from '../modules/achievementManager.js';
import logger from '../utils/logger.js';
import { isInProgress } from '../utils/gameStateMachine.js';
import { HUNT_INITIAL_LIFE } from '@/shared/constants/wordHuntMultiplayerConstants';
import { getOrInitPlayerBoard } from '../modules/blastModeManager.js';

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
        // Clear any existing migration timeout to prevent leak from rapid reconnects
        if (oldSocket.data.migrationTimeout) {
          clearTimeout(oldSocket.data.migrationTimeout);
        }
        // Auto-clear migration flag after 10 seconds (safety net for crashed tabs)
        oldSocket.data.migrationTimeout = setTimeout(() => {
          if (oldSocket.data) {
            oldSocket.data.migrating = false;
            oldSocket.data.migrationTimeout = null;
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
        message: 'Host joined a different game. Room is closing.',
        i18nKey: 'multiplayerFlow.hostLeftReason.hostSwitchedRoom',
        i18nParams: { host: existingConnection.username },
        reason: 'host_switched_room'
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
function handleReconnection(io: Server, socket: Socket, game: GameState, gameCode: string, username: string, authUserId?: string, guestTokenHash?: string): void {
  const existingAuthUserId = game.users[username]?.authUserId;
  logger.info('SOCKET', `Reconnection detected for ${username}: existingAuthUserId=${existingAuthUserId || 'NONE'}, newAuthUserId=${authUserId || 'NONE'}`);

  // Clear reconnection timer FIRST to prevent race where timer fires
  // between reading user data and updating it
  timerManager.clearTimer(`reconnect:${gameCode}:${username}`);

  if (game.users[username]) {
    game.users[username].disconnected = false;
    delete game.users[username].disconnectedAt;

    // Enforce host-status truth on rejoin — protects against stale isHost
    // when transferHost ran during the disconnect window. Without this, an
    // ex-host who rejoins can momentarily appear as host on the client.
    game.users[username].isHost = game.hostUsername === username;

    broadcastToRoom(io, getGameRoom(gameCode), 'playerReconnected', { username });
  } else {
    // User entry missing (e.g., Redis restore didn't include user data)
    // Log and continue — updateUserSocketId will re-register the socket mapping
    logger.warn('SOCKET', `Reconnection for ${username} in ${gameCode} but user entry missing in game.users`);
  }

  // Pass auth context - use undefined (not null) to preserve existing values
  // The updateUserSocketId function will only overwrite if new values are truthy
  updateUserSocketId(gameCode, username, socket.id, {
    authUserId: authUserId,
    guestTokenHash: guestTokenHash
  });

  if (game.hostUsername === username) {
    updateHostSocketId(gameCode, socket.id);
    timerManager.clearTimer(`hostReconnect:${gameCode}`);
  }

  joinRoom(socket, getGameRoom(gameCode));
  leaveRoom(socket, LOBBY_ROOM); // Stop receiving lobby broadcasts while in-game

  socket.emit('joined', {
    success: true,
    gameCode,
    isHost: game.hostUsername === username,
    username,
    roomName: game.roomName,
    language: game.language,
    isPrivate: game.isPrivate || false,
    reconnected: true,
    users: getGameUsers(gameCode)
  });

  // Send game state on reconnection if game is in progress (use state machine helper)
  if (isInProgress(game.gameState)) {
    const reconnectPayload: Record<string, any> = {
      letterGrid: game.letterGrid,
      timerSeconds: game.remainingTime ?? game.timerSeconds,
      language: game.language,
      minWordLength: game.minWordLength || 2,
      messageId: 'reconnect-' + Date.now(),
      reconnect: true,
      skipAck: true,
      boardTheme: game.boardTheme || null,
      gameMode: game.gameMode || 'classic',
      gameSessionId: game.gameSessionId,
      // Teacher pause: land the reconnecting student ON the pause. Mirrors the
      // `requestGameState` recovery payload field-for-field (pitfall 3).
      isPaused: !!game.isPaused,
      remainingTime: game.remainingTime ?? game.timerSeconds,
      // Replay player's own found words so the in-game word panel isn't blank
      // after reconnect. Score totals come via updateLeaderboard below.
      myFoundWords: game.playerWords?.[username] || [],
      // Carry the authoritative leaderboard INSIDE startGame too, so the client
      // restores the score in the same batched setState as the board — robust if
      // the separate updateLeaderboard below is dropped, raced, or reset away.
      leaderboard: getLeaderboard(gameCode),
    };

    // Include blast mode state for reconnecting players. Each player evolves an
    // INDEPENDENT board (playerBoards[username]); the reconnecting player must get
    // THEIR evolved board, not the pristine shared template (state.grid/tileStates).
    // overlay/seed also diverge from the template after a board regen, so read them
    // off the per-player board too.
    if (game.gameMode === 'blast' && game.blastModeState) {
      const board = getOrInitPlayerBoard(game.blastModeState, username);
      reconnectPayload.blastTileOverlay = board.overlay || [];
      reconnectPayload.blastSeed = board.seed ?? null;
      reconnectPayload.blastWave = game.blastModeState.wave ?? 1;
      // Send player's moves-used count so client can restore correct state
      reconnectPayload.blastPlayerMoves = game.blastModeState.playerMoves || {};
      // Send the player's own server-authoritative evolved board for MP sync.
      if (board.grid) {
        reconnectPayload.blastGrid = board.grid;
      }
      if (board.tileStates) {
        reconnectPayload.blastTileStates = board.tileStates;
      }
    }

    // Include word hunt state for reconnecting players
    if (game.gameMode === 'word-hunt' && game.wordHuntState) {
      reconnectPayload.wordHuntTargetLength = game.wordHuntState.targetWordLength ?? 0;
      // Keep this block field-for-field identical to the late-join one below:
      // both restore the SAME round state, and the category (the "hunt an
      // animal" hint) was the one field only late-joiners received.
      reconnectPayload.wordHuntTargetCategory = game.wordHuntState.targetCategory ?? null;
      reconnectPayload.wordHuntEliminatedPlayers = game.wordHuntState.eliminatedPlayers || [];
      reconnectPayload.wordHuntPlayerLives = game.wordHuntState.playerLives || {};
    }

    // Replay golden letters so star tiles aren't lost on reconnect.
    if (game.goldenLetters?.length) {
      reconnectPayload.goldenLetters = game.goldenLetters;
    }

    socket.emit('startGame', reconnectPayload);

    // Send current leaderboard and player's achievements so UI is fully restored
    const leaderboard = getLeaderboard(gameCode);
    socket.emit('updateLeaderboard', { leaderboard });

    const playerAchievementKeys = (game.playerAchievements?.[username] || []) as unknown as string[];
    if (playerAchievementKeys.length > 0) {
      const achievements = playerAchievementKeys
        .map((key: string) => ({ key, icon: ACHIEVEMENT_ICONS[key] }))
        .filter((a: { key: string; icon: string | undefined }) => a.icon);
      if (achievements.length > 0) {
        socket.emit('liveAchievementUnlocked', { achievements });
      }
    }
  } else if (game.gameState === 'finished' && game.cachedResultsPayload) {
    // Deploy recovery: a player who reconnects AFTER the game ended sees a blank
    // results page because the server restart wiped their socket→game mapping,
    // so their `requestResults` (gated on that mapping) silently no-ops. Now
    // that the mapping is rebuilt above, re-deliver the cached results here so
    // reconnect is self-contained — one rejoin restores in-progress board OR
    // finished results. Mirrors the `requestResults` finished-game path.
    socket.emit('validatedScores', game.cachedResultsPayload);
    socket.emit('validationComplete', game.cachedResultsPayload);
  }

  broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
    users: getGameUsers(gameCode)
  });
}

/**
 * Handle late join to an in-progress game
 */
function handleLateJoin(socket: Socket, game: GameState, gameCode: string, username: string): void {
  logger.info('SOCKET', `${username} joining game ${gameCode} in progress`);

  const lateJoinPayload: Record<string, any> = {
    letterGrid: game.letterGrid,
    timerSeconds: game.remainingTime ?? game.timerSeconds,
    language: game.language,
    minWordLength: game.minWordLength || 2,
    messageId: 'late-join-' + Date.now(),
    lateJoin: true,
    skipAck: true,
    boardTheme: game.boardTheme || null,
    gameMode: game.gameMode || 'classic',
    gameSessionId: game.gameSessionId,
    // Teacher pause — same fields as the reconnect payload above.
    isPaused: !!game.isPaused,
    remainingTime: game.remainingTime ?? game.timerSeconds,
  };

  // Include blast mode state for late joiners. getOrInitPlayerBoard lazily clones
  // the template into a fresh independent board for this never-seen player, so the
  // late joiner starts clean AND the server now tracks their board for cascades.
  if (game.gameMode === 'blast' && game.blastModeState) {
    const board = getOrInitPlayerBoard(game.blastModeState, username);
    lateJoinPayload.blastTileOverlay = board.overlay || [];
    lateJoinPayload.blastSeed = board.seed ?? null;
    lateJoinPayload.blastWave = game.blastModeState.wave ?? 1;
    lateJoinPayload.blastPlayerMoves = game.blastModeState.playerMoves || {};
    if (board.grid) {
      lateJoinPayload.blastGrid = board.grid;
    }
    if (board.tileStates) {
      lateJoinPayload.blastTileStates = board.tileStates;
    }
  }

  // Include word hunt state for late joiners — also initialize their lives
  if (game.gameMode === 'word-hunt' && game.wordHuntState) {
    // Add late-joiner to playerLives if not already present
    if (!(username in game.wordHuntState.playerLives)) {
      game.wordHuntState.playerLives[username] = HUNT_INITIAL_LIFE;
    }
    lateJoinPayload.wordHuntTargetLength = game.wordHuntState.targetWordLength ?? 0;
    lateJoinPayload.wordHuntTargetCategory = game.wordHuntState.targetCategory ?? null;
    lateJoinPayload.wordHuntEliminatedPlayers = game.wordHuntState.eliminatedPlayers || [];
    lateJoinPayload.wordHuntPlayerLives = game.wordHuntState.playerLives || {};
  }

  // Include golden letters for late joiners so they see the star tiles too.
  if (game.goldenLetters?.length) {
    lateJoinPayload.goldenLetters = game.goldenLetters;
  }

  socket.emit('startGame', lateJoinPayload);

  const leaderboard = getLeaderboard(gameCode);
  socket.emit('updateLeaderboard', { leaderboard });

  const playerAchievementKeys = (game.playerAchievements?.[username] || []) as unknown as string[];
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
function handleTournamentJoin(_io: Server, socket: Socket, gameCode: string, username: string, userAvatar: Avatar): void {
  const tournamentId = getTournamentIdFromGame(gameCode);
  if (!tournamentId) return;

  try {
    const tournamentAvatar = { ...userAvatar };
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

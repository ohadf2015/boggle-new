/**
 * Game Lifecycle Handler
 * Handles game lifecycle events: create, end, reset, ready state
 */

import type { Server, Socket } from 'socket.io';
import type { Game, Language, Avatar } from '@/shared/types';

import {
  createGame,
  getGame,
  deleteGame,
  gameExists,
  addUserToGame,
  getGameBySocketId,
  getUsernameBySocketId,
  getGameUsers,
  getActiveRooms,
  resetGameForNewRound,
  getAuthUserConnection,
  isRoomEmpty,
  markPlayerReadyForNextGame,
  getPlayersReadyCount,
  removeUserFromGame,
  updateUsernameMapping
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
  joinRoom,
  leaveRoom,
  safeEmit,
  getSocketById,
  disconnectSocket
} from '../utils/socketHelpers.js';

import { emitError, ErrorMessages } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { saveGameState } from '../redisClient.js';
import { inc, ensureGame } from '../utils/metrics.js';
import { generateRandomAvatar } from '../utils/gameUtils.js';
import { getRandomLongWordsWithTheme, ensureLanguageLoaded } from '../dictionary.js';
import logger from '../utils/logger.js';
import { startGameTimer, endGame } from './shared.js';
import { validatePayload, createGameSchema } from '../utils/socketValidation.js';
import { stopAllBots } from '../modules/botManager.js';
import { spamDetector } from '../modules/spamDetector.js';
import { notifyRoomCreated } from '../modules/notificationService.js';
import { isInProgress } from '../utils/gameStateMachine.js';
import { registerStartGameHandler } from './gameStartHandler.js';

// Types for payloads
interface CreateGamePayload {
  gameCode: string;
  roomName?: string;
  language?: Language;
  hostUsername?: string;
  playerId?: string;
  avatar?: Avatar;
  authUserId?: string;
  guestTokenHash?: string;
  guestSessionId?: string;
  isRanked?: boolean;
  profilePictureUrl?: string;
}

interface StartGameAckPayload {
  messageId: string;
}

interface GetWordsForBoardPayload {
  language: Language;
  boardSize?: { rows: number; cols: number };
}

interface ResetGameCallback {
  (result: { success: boolean; error?: string; gameState?: string }): void;
}

interface AuthConnection {
  socketId: string;
  gameCode: string;
  username: string;
  isHost: boolean;
}

/**
 * Register game lifecycle socket event handlers
 */
function registerGameLifecycleHandlers(io: Server, socket: Socket): void {

  // Handle game creation
  socket.on('createGame', async (data: CreateGamePayload) => {
    try {
      if (!checkRateLimit(socket.id)) {
        inc('rateLimited');
        socket.emit('rateLimited');
        return;
      }

      const validation = validatePayload(createGameSchema, data);
      if (!validation.success) {
        logger.warn('SOCKET', `Create game validation failed: ${validation.error}`, { data });
        emitError(socket, `Invalid request: ${validation.error}`);
        return;
      }

      const { gameCode, roomName, language, hostUsername, playerId, avatar, authUserId, guestTokenHash, guestSessionId, isRanked, profilePictureUrl } = validation.data as CreateGamePayload;

      logger.info('SOCKET', `Create game request: ${gameCode} by ${hostUsername}${isRanked ? ' (RANKED)' : ''}`, {
        socketId: socket.id,
        hasAvatar: !!avatar,
        hasAuth: !!authUserId
      });

      const sanitizedPlayerId = playerId || undefined;

      if (gameExists(gameCode)) {
        logger.warn('SOCKET', `Game code already exists: ${gameCode}`);
        emitError(socket, 'Game code already in use');
        return;
      }

      if (authUserId) {
        await handleExistingAuthConnection(io, socket, authUserId, gameCode);
      }

      const game = createGame(gameCode, {
        hostSocketId: socket.id,
        hostUsername: hostUsername || 'Host',
        hostPlayerId: sanitizedPlayerId,
        roomName: roomName || gameCode,
        language: language || 'en',
        isRanked: isRanked || false,
        allowLateJoin: isRanked ? false : true
      });

      const gameLang = language || 'en';
      try {
        await ensureLanguageLoaded(gameLang);
        logger.debug('DICT', `Language ${gameLang} preloaded for game ${gameCode}`);
      } catch (error) {
        logger.error('DICT', `Failed to preload language ${gameLang} for game ${gameCode}: ${error}`);
      }

      const hostAvatar = avatar || generateRandomAvatar();
      logger.info('HOST_JOIN', `Adding host ${hostUsername || 'Host'} to game ${gameCode} with authUserId=${authUserId || 'NONE'}, guestHash=${guestTokenHash ? 'yes' : 'no'}`);
      addUserToGame(gameCode, hostUsername || 'Host', socket.id, {
        avatar: { ...hostAvatar, profilePictureUrl: profilePictureUrl || null },
        isHost: true,
        playerId: sanitizedPlayerId,
        authUserId: authUserId || null,
        guestTokenHash: guestTokenHash || null,
        guestSessionId: guestSessionId || null
      });

      joinRoom(socket, getGameRoom(gameCode));

      socket.emit('joined', {
        success: true,
        gameCode,
        isHost: true,
        username: hostUsername || 'Host',
        roomName: roomName || gameCode,
        language: language || 'en',
        users: getGameUsers(gameCode)
      });

      logger.info('SOCKET', `Game ${gameCode} created successfully by ${hostUsername}`);

      ensureGame(gameCode);
      broadcastActiveRooms(io, getActiveRooms());

      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode)
      });

      try {
        await saveGameState(gameCode, game as unknown as Parameters<typeof saveGameState>[1]);
      } catch (err: unknown) {
        const error = err as Error;
        logger.error('REDIS', 'Failed to save game state', error);
        safeEmit(socket, 'warning', {
          type: 'persistence',
          message: 'Game state could not be saved.'
        });
      }

      notifyRoomCreated({
        gameCode,
        roomName: roomName || gameCode,
        language: language || 'en',
        hostUsername: hostUsername || 'Host',
        isAuthenticated: !!authUserId,
        isRanked: isRanked || false
      }).catch(() => {});
    } catch (error: unknown) {
      const err = error as Error;
      logger.error('SOCKET', `Unhandled error in createGame handler: ${err.message}`, {
        stack: err.stack,
        socketId: socket.id,
        data
      });
      emitError(socket, 'Failed to create game. Please try again.');
    }
  });

  // Handle request for words to embed in board
  socket.on('getWordsForBoard', (data: GetWordsForBoardPayload) => {
    const { language, boardSize } = data;
    const rows = boardSize?.rows || 5;
    const cols = boardSize?.cols || 5;
    const totalCells = rows * cols;
    const wordCount = Math.min(35, Math.max(5, Math.floor(totalCells / 3)));
    const maxWordLen = Math.min(12, Math.max(rows, cols));
    const result = getRandomLongWordsWithTheme(language || 'en', wordCount, 3, maxWordLen);
    socket.emit('wordsForBoard', {
      words: result.words,
      theme: result.theme
    });
  });

  // Register startGame handler from extracted module
  registerStartGameHandler(io, socket);

  // Handle start game acknowledgment
  socket.on('startGameAck', (data: StartGameAckPayload) => {
    const { messageId } = data;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const result = gameStartCoordinator.recordAcknowledgment(gameCode, username, messageId);

    if (result.valid && result.allReady) {
      const game = getGame(gameCode);
      // Use game.gameDuration (validated timer set during startGame) rather than
      // game.timerSeconds which could be stale or fall back to a wrong default
      startGameTimer(io, gameCode, game?.gameDuration || game?.timerSeconds || 180);
    }
  });

  // Handle end game
  socket.on('endGame', () => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) {
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      return;
    }

    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorMessages.ONLY_HOST_CAN_END);
      return;
    }

    endGame(io, gameCode);
  });

  // Debug: Get current game state
  socket.on('debugGameState', () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const game = gameCode ? getGame(gameCode) : null;
    socket.emit('debugGameStateResponse', {
      gameCode,
      gameState: game?.gameState || 'NO_GAME',
      hostSocketId: game?.hostSocketId,
      mySocketId: socket.id,
      playerCount: game ? Object.keys(game.users || {}).length : 0,
      timestamp: Date.now()
    });
    logger.info('DEBUG', `Game state query for ${gameCode}: ${game?.gameState || 'NO_GAME'}`);
  });

  // Handle requestGameState - recovery for players who missed startGame
  socket.on('requestGameState', () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    if (isInProgress(game.gameState)) {
      logger.info('SOCKET', `Sending game state to player who requested it in game ${gameCode}`);
      const recoveryGameMode = game.gameMode || 'classic';
      safeEmit(socket, 'startGame', {
        letterGrid: game.letterGrid,
        timerSeconds: game.remainingTime || game.timerSeconds,
        language: game.language,
        minWordLength: game.minWordLength || 2,
        messageId: 'recovery-' + Date.now(),
        reconnect: true,
        skipAck: true,
        boardTheme: (game as unknown as Game & { boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null }).boardTheme || null,
        gameMode: recoveryGameMode,
        ...(recoveryGameMode === 'blast' && game.blastModeState ? {
          blastTileOverlay: game.blastModeState.overlay || [],
          blastSeed: game.blastModeState.seed ?? null,
        } : {}),
        ...(recoveryGameMode === 'word-hunt' && game.wordHuntState ? {
          wordHuntTargetLength: game.wordHuntState.targetWordLength ?? 0,
          wordHuntEliminatedPlayers: game.wordHuntState.eliminatedPlayers || [],
          wordHuntPlayerLives: game.wordHuntState.playerLives || {},
        } : {}),
      });
    }
  });

  // Handle reset game
  socket.on('resetGame', (_data: unknown, callback?: ResetGameCallback) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      if (typeof callback === 'function') callback({ success: false, error: 'Rate limited' });
      return;
    }

    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) {
      emitError(socket, ErrorMessages.NOT_IN_GAME);
      if (typeof callback === 'function') callback({ success: false, error: 'Not in game' });
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorMessages.GAME_NOT_FOUND);
      if (typeof callback === 'function') callback({ success: false, error: 'Game not found' });
      return;
    }

    if (game.hostSocketId !== socket.id) {
      emitError(socket, 'Only host can reset the game');
      if (typeof callback === 'function') callback({ success: false, error: 'Only host can reset' });
      return;
    }

    const stateBeforeReset = game.gameState;
    clearGameTimer(gameCode);
    gameStartCoordinator.cleanupSequence(gameCode);
    stopAllBots(gameCode);

    const resetSuccess = resetGameForNewRound(gameCode);
    const gameAfterReset = getGame(gameCode);
    const stateAfterReset = gameAfterReset?.gameState;

    logger.info('SOCKET', `Game ${gameCode} reset: ${stateBeforeReset} -> ${stateAfterReset} (success: ${resetSuccess})`);

    if (!resetSuccess) {
      logger.error('SOCKET', `Failed to reset game ${gameCode} from state ${stateBeforeReset}`);
      if (typeof callback === 'function') callback({ success: false, error: 'Reset failed' });
      return;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'resetGame', {
      users: getGameUsers(gameCode),
      gameSessionId: gameAfterReset?.gameSessionId
    });

    if (typeof callback === 'function') {
      callback({ success: true, gameState: stateAfterReset });
    }
  });

  // Handle player confirming ready for next game
  socket.on('confirmReadyForNextGame', () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game || game.gameState !== 'finished') return;

    const result = markPlayerReadyForNextGame(gameCode, username);
    if (!result) return;

    logger.info('SOCKET', `Player ${username} confirmed ready for next game in ${gameCode} (${result.readyCount}/${result.totalPlayers})`);

    broadcastToRoom(io, getGameRoom(gameCode), 'playersReadyUpdate', {
      readyCount: result.readyCount,
      totalPlayers: result.totalPlayers,
      readyUsernames: result.readyUsernames
    });
  });

  // Handle player toggling lobby ready state
  socket.on('lobbyReady', (data: { ready: boolean }) => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game || game.gameState !== 'waiting') return;

    if (data?.ready) {
      markPlayerReadyForNextGame(gameCode, username);
    } else {
      delete game.playersReadyForNextGame[username];
    }

    const result = getPlayersReadyCount(gameCode);
    if (result) {
      broadcastToRoom(io, getGameRoom(gameCode), 'playersReadyUpdate', {
        readyCount: result.readyCount,
        totalPlayers: result.totalPlayers,
        readyUsernames: result.readyUsernames,
      });
    }
  });

  // Handle guest name update in lobby
  socket.on('updateGuestName', (data: { newName: string }) => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username || !data?.newName) return;

    const game = getGame(gameCode);
    if (!game || game.gameState !== 'waiting') return;

    const trimmedName = data.newName.trim().slice(0, 20);
    if (!trimmedName || !/^[\p{L}\p{N}\p{Emoji} _-]{1,30}$/u.test(trimmedName)) return;

    const user = game.users[username];
    if (!user || user.isHost) return;

    if (trimmedName !== username && game.users[trimmedName]) {
      socket.emit('error', { error: 'NAME_TAKEN', message: 'That name is already in use' });
      return;
    }

    game.users[trimmedName] = { ...user, username: trimmedName };
    if (trimmedName !== username) {
      delete game.users[username];
      updateUsernameMapping(gameCode, username, trimmedName, socket.id);
    }

    socket.emit('guestNameUpdated', { oldName: username, newName: trimmedName });

    broadcastToRoom(io, getGameRoom(gameCode), 'playerListUpdate', {
      users: getGameUsers(gameCode),
    });

    logger.info('SOCKET', `Guest ${username} changed name to ${trimmedName} in ${gameCode}`);
  });

  // Handle request to get current ready count
  socket.on('getPlayersReadyCount', () => {
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const result = getPlayersReadyCount(gameCode);
    if (result) {
      socket.emit('playersReadyUpdate', {
        readyCount: result.readyCount,
        totalPlayers: result.totalPlayers,
        readyUsernames: result.readyUsernames
      });
    }
  });
}

/**
 * Handle existing authenticated connection when creating a game
 */
async function handleExistingAuthConnection(io: Server, socket: Socket, authUserId: string, _gameCode: string): Promise<void> {
  const existingConnection: AuthConnection | null = getAuthUserConnection(authUserId);
  if (!existingConnection) return;

  const isSameSocket = existingConnection.socketId === socket.id;

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
        message: 'Host started a new game. Room is closing.'
      });
      clearGameTimer(existingConnection.gameCode);
      deleteGame(existingConnection.gameCode);
      broadcastActiveRooms(io, getActiveRooms());
    }
  } else {
    removeUserFromGame(existingConnection.gameCode, existingConnection.username);

    if (isRoomEmpty(existingConnection.gameCode)) {
      logger.info('SOCKET', `Old room ${existingConnection.gameCode} is empty after player switch - closing immediately`);
      clearGameTimer(existingConnection.gameCode);
      stopAllBots(existingConnection.gameCode);
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
}

/**
 * Initialize player data structures for a new game
 */
function initializePlayerData(_game: Game, gameCode: string): void {
  const users = getGameUsers(gameCode);
  const playerUsernames = users.map(u => u.username);
  const gameForInit = getGame(gameCode);

  spamDetector.clearGame(gameCode);

  if (gameForInit) {
    if (!gameForInit.playerWordDetails) gameForInit.playerWordDetails = {};
    if (!gameForInit.playerAchievements) gameForInit.playerAchievements = {};
    if (!gameForInit.playerScores) gameForInit.playerScores = {};
    if (!gameForInit.playerWords) gameForInit.playerWords = {};

    playerUsernames.forEach((username: string) => {
      gameForInit.playerWordDetails![username] = [];
      gameForInit.playerWords[username] = [];
      gameForInit.playerScores[username] = 0;
      gameForInit.playerAchievements[username] = [];
    });

    gameForInit.firstWordFound = false;
    gameForInit.startTime = Date.now();
  }
}

export {
  registerGameLifecycleHandlers,
  handleExistingAuthConnection,
  initializePlayerData
};

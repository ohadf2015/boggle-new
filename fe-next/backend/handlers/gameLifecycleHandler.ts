/**
 * Game Lifecycle Handler
 * Handles game lifecycle events: create, start, end, reset
 */

import type { Server, Socket } from 'socket.io';
import type { Game, LetterGrid, Language, DifficultyLevel, Avatar, GameMode } from '@/shared/types';

import {
  createGame,
  getGame,
  updateGame,
  deleteGame,
  gameExists,
  addUserToGame,
  getGameBySocketId,
  getUsernameBySocketId,
  getSocketIdByUsername,
  getGameUsers,
  getActiveRooms,
  resetGameForNewRound,
  getAuthUserConnection,
  transitionGameState,
  canTransitionGameState,
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

import { makePositionsMap } from '../modules/wordValidator.js';
import { emitError, ErrorMessages } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { saveGameState } from '../redisClient.js';
import { inc, ensureGame } from '../utils/metrics.js';
import { generateRandomAvatar, generateRandomTable } from '../utils/gameUtils.js';
import { getRandomLongWordsWithTheme, ensureLanguageLoaded } from '../dictionary.js';
import logger from '../utils/logger.js';
import { startGameTimer, endGame } from './shared.js';
import { findAllWords, getCachedTrie } from '../modules/boggleSolver.js';
import { validatePayload, createGameSchema } from '../utils/socketValidation.js';
import { stopAllBots } from '../modules/botManager.js';
import { spamDetector } from '../modules/spamDetector.js';
import { notifyRoomCreated, notifyGameStarted } from '../modules/notificationService.js';
import { isInProgress } from '../utils/gameStateMachine.js';
import { selectNextGameMode, ALL_GAME_MODES } from '../modules/gameModeSelector.js';

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

interface StartGamePayload {
  letterGrid: LetterGrid;
  timerSeconds: number;
  language?: Language;
  minWordLength?: number;
  difficulty?: DifficultyLevel;
  boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null;
  gameMode?: GameMode | 'random';
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
 * @param io - Socket.IO server instance
 * @param socket - Socket.IO socket instance
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

      // Validate payload
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

      // playerId is already validated by schema (UUID v4 format) - use as is
      const sanitizedPlayerId = playerId || undefined;

      // Check if game already exists
      if (gameExists(gameCode)) {
        logger.warn('SOCKET', `Game code already exists: ${gameCode}`);
        emitError(socket, 'Game code already in use');
        return;
      }

      // Handle multi-tab detection for authenticated users
      if (authUserId) {
        await handleExistingAuthConnection(io, socket, authUserId, gameCode);
      }

      // Create the game
      const game = createGame(gameCode, {
        hostSocketId: socket.id,
        hostUsername: hostUsername || 'Host',
        hostPlayerId: sanitizedPlayerId,
        roomName: roomName || gameCode,
        language: language || 'en',
        isRanked: isRanked || false,
        allowLateJoin: isRanked ? false : true
      });

      // Preload the language dictionary for this game
      const gameLang = language || 'en';
      try {
        await ensureLanguageLoaded(gameLang);
        logger.debug('DICT', `Language ${gameLang} preloaded for game ${gameCode}`);
      } catch (error) {
        logger.error('DICT', `Failed to preload language ${gameLang} for game ${gameCode}: ${error}`);
        // Continue anyway - will try again when game starts
      }

      // Add host as first user
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

      // Join socket to game room
      joinRoom(socket, getGameRoom(gameCode));

      // Confirm game creation - CRITICAL: Always emit this before async operations
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

      // Broadcast updated room list
      broadcastActiveRooms(io, getActiveRooms());

      // Broadcast user list update
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode)
      });

      // Save to Redis
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

      // Fire-and-forget notification
      notifyRoomCreated({
        gameCode,
        roomName: roomName || gameCode,
        language: language || 'en',
        hostUsername: hostUsername || 'Host',
        isAuthenticated: !!authUserId,
        isRanked: isRanked || false
      }).catch(() => {}); // Swallow errors - never block game flow
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
  // Returns themed words (50%) mixed with regular dictionary words (50%)
  // Theme is based on current date (holidays, special events, or day-of-week)
  socket.on('getWordsForBoard', (data: GetWordsForBoardPayload) => {
    const { language, boardSize } = data;
    const rows = boardSize?.rows || 5;
    const cols = boardSize?.cols || 5;
    const totalCells = rows * cols;
    const wordCount = Math.min(35, Math.max(5, Math.floor(totalCells / 3)));
    // Increased max word length from 8 to 12 to support longer themed words
    const maxWordLen = Math.min(12, Math.max(rows, cols));
    const result = getRandomLongWordsWithTheme(language || 'en', wordCount, 3, maxWordLen);
    socket.emit('wordsForBoard', {
      words: result.words,
      theme: result.theme // { nameKey, emoji, isHoliday }
    });
  });

  // Handle game start
  socket.on('startGame', async (data: StartGamePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    let { letterGrid } = data;
    const { timerSeconds, language, minWordLength, difficulty, boardTheme, gameMode } = data;
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
      emitError(socket, ErrorMessages.ONLY_HOST_CAN_START);
      return;
    }

    // Check if game can be started (must be in 'waiting' state)
    const currentGameState = game.gameState;
    logger.info('SOCKET', `Starting game ${gameCode} - current state: ${currentGameState}`);

    // Self-healing: if not in 'waiting' state, force a reset first
    // This handles race conditions between async endGame and rapid reset/start clicks
    if (!canTransitionGameState(gameCode, 'START')) {
      logger.info('SOCKET', `Game ${gameCode} in unexpected state ${currentGameState}, auto-resetting before start`);

      // Clear any lingering timers/state from previous game
      clearGameTimer(gameCode);
      gameStartCoordinator.cleanupSequence(gameCode);
      stopAllBots(gameCode);

      // Force reset to 'waiting' state - try proper reset first, fallback to direct state change
      const resetSuccess = resetGameForNewRound(gameCode);
      if (!resetSuccess) {
        // Fallback: directly force state to 'waiting'
        logger.warn('SOCKET', `resetGameForNewRound failed for ${gameCode}, forcing state to waiting`);
        game.gameState = 'waiting';
      }

      logger.info('SOCKET', `Game ${gameCode} auto-reset successful, state now: ${game.gameState}`);
    }

    const validTimer = Math.max(30, Math.min(600, parseInt(String(timerSeconds), 10) || 180));

    // Ensure the language dictionary is loaded before starting the game
    const gameLang = language || game.language || 'en';
    try {
      await ensureLanguageLoaded(gameLang);
      logger.debug('DICT', `Language ${gameLang} loaded for game ${gameCode}`);
    } catch (error) {
      logger.error('DICT', `Failed to load language ${gameLang} for game ${gameCode}: ${error}`);
      // Continue anyway - word validation will use community validation as fallback
    }

    // Check if this is a classroom game and fetch vocabulary
    const { getClassroomGame } = await import('../modules/classroomGameManager.js');
    const classroomGame = await getClassroomGame(gameCode);
    const lessonVocabulary = classroomGame?.vocabularyWords
      ? new Set(classroomGame.vocabularyWords.map(w => w.toUpperCase()))
      : undefined;

    // Resolve game mode: if 'random' or missing, use weighted random selection
    const resolvedMode: GameMode = (!gameMode || gameMode === 'random')
      ? selectNextGameMode(game.modeHistory || [], ALL_GAME_MODES)
      : gameMode as GameMode;

    // If random resolved to blast and grid isn't 6x6, regenerate
    if (resolvedMode === 'blast' && (letterGrid.length !== 6 || letterGrid[0]?.length !== 6)) {
      letterGrid = generateRandomTable(6, 6, gameLang);
    }

    // Update game settings first
    updateGame(gameCode, {
      letterGrid,
      timerSeconds: validTimer,
      remainingTime: validTimer,
      gameDuration: validTimer,
      language: gameLang,
      minWordLength: minWordLength || 2,
      difficulty: difficulty || 'MEDIUM',
      gameStartedAt: Date.now(),
      boardTheme: boardTheme || null, // Store theme for late joiners
      lessonVocabulary: lessonVocabulary,
      gameMode: resolvedMode,
      modeHistory: [...(game.modeHistory || []), resolvedMode]
    });

    // Transition state using state machine
    const transitionResult = transitionGameState(gameCode, 'START');
    if (!transitionResult.success) {
      logger.error('SOCKET', `Failed to start game ${gameCode}: ${transitionResult.error}`);
      emitError(socket, 'Failed to start game');
      return;
    }

    // Precompute letter positions
    const positions = makePositionsMap(letterGrid);
    const current = getGame(gameCode);
    if (current) {
      current.letterPositions = positions;
    }
    ensureGame(gameCode);

    // Initialize player data
    initializePlayerData(game as unknown as Game, gameCode);

    // Initialize game start coordination
    const users = getGameUsers(gameCode);
    const playerUsernames = users.map(u => u.username);

    // Initialize blast mode state if needed
    if (resolvedMode === 'blast') {
      const { initBlastModeState } = await import('../modules/blastModeManager.js');
      // Multiplayer blast starts at wave 3 for richer tile variety
      // (unlocks prism, mirror, etc. that normally require SP progression)
      const mpBlastWave = playerUsernames.length >= 2 ? 3 : 1;
      const blastState = initBlastModeState(letterGrid, playerUsernames, mpBlastWave);
      const currentGame = getGame(gameCode);
      if (currentGame) {
        (currentGame as any).blastModeState = blastState;
      }
    }

    // Initialize word hunt mode state if needed
    if (resolvedMode === 'word-hunt') {
      const { initWordHuntState, selectTargetWordWithFallback } = await import('../modules/wordHuntManager.js');
      const trie = getCachedTrie(gameLang);
      // Search broadly (minLength:3) so fallback can find shorter words
      const allValidWords = findAllWords(letterGrid, gameLang, { minLength: 3, maxLength: 8, maxWords: 10000, trie });
      const targetWord = selectTargetWordWithFallback(allValidWords, 5, 8);
      if (targetWord) {
        const huntState = initWordHuntState(targetWord, playerUsernames);
        const currentGame = getGame(gameCode);
        if (currentGame) {
          (currentGame as any).wordHuntState = huntState;
        }
      }
    }

    const messageId = gameStartCoordinator.initializeSequence(gameCode, playerUsernames, timerSeconds);

    // Broadcast start
    broadcastToRoom(io, getGameRoom(gameCode), 'startGame', {
      letterGrid,
      timerSeconds: validTimer,
      language: gameLang,
      minWordLength: minWordLength || 2,
      messageId,
      gameSessionId: game.gameSessionId,
      boardTheme: boardTheme || null,
      gameMode: resolvedMode,
      ...(resolvedMode === 'blast' ? {
        blastTileOverlay: (getGame(gameCode) as any)?.blastModeState?.overlay || [],
        blastSeed: (getGame(gameCode) as any)?.blastModeState?.seed ?? null,
      } : {}),
      ...(resolvedMode === 'word-hunt' ? { wordHuntTargetLength: (getGame(gameCode) as any)?.wordHuntState?.targetWordLength ?? 0 } : {}),
    });

    // Calculate and emit total words on board (async, non-blocking)
    setImmediate(() => {
      try {
        const trie = getCachedTrie(gameLang);
        const allWords = findAllWords(letterGrid, gameLang, {
          minLength: minWordLength || 2,
          maxLength: 15,
          maxWords: 10000, // No practical limit - trie makes this fast
          trie
        });
        // Only count 5+ letter words for "Words Remaining" display
        // This prevents overwhelming numbers and focuses on meaningful words
        const MIN_DISPLAY_WORD_LENGTH = 5;
        const totalBoardWords = allWords.filter((word: string) => word.length >= MIN_DISPLAY_WORD_LENGTH).length;

        // Store in game state for late joiners
        const currentGame = getGame(gameCode);
        if (currentGame) {
          currentGame.totalBoardWords = totalBoardWords;
        }

        broadcastToRoom(io, getGameRoom(gameCode), 'totalBoardWords', {
          count: totalBoardWords
        });

        logger.debug('SOCKET', `Game ${gameCode} has ${totalBoardWords} possible words on board`);
      } catch (err: unknown) {
        const error = err as Error;
        logger.error('SOCKET', `Failed to calculate total board words for ${gameCode}`, error);
      }
    });

    // Schedule retries for players who don't acknowledge quickly
    // Uses exponential backoff (100ms, 200ms, 400ms, 800ms) to re-emit startGame
    // to individual players who haven't acknowledged yet
    gameStartCoordinator.scheduleRetries(gameCode, playerUsernames, (username: string) => {
      const targetSocketId = getSocketIdByUsername(gameCode, username);
      if (!targetSocketId) return false;
      const targetSocket = getSocketById(io, targetSocketId);
      if (!targetSocket) return false;
      return safeEmit(targetSocket, 'startGame', {
        letterGrid,
        timerSeconds: validTimer,
        language: gameLang,
        minWordLength: minWordLength || 2,
        messageId,
        gameSessionId: game.gameSessionId,
        boardTheme: boardTheme || null,
        gameMode: resolvedMode,
        ...(resolvedMode === 'blast' ? {
          blastTileOverlay: (getGame(gameCode) as any)?.blastModeState?.overlay || [],
          blastSeed: (getGame(gameCode) as any)?.blastModeState?.seed ?? null,
        } : {}),
        retry: true
      });
    });

    // Set acknowledgment timeout - start timer even if not all players acknowledged
    gameStartCoordinator.setAcknowledgmentTimeout(gameCode, 3000, () => {
      startGameTimer(io, gameCode, validTimer);
    });

    logger.info('SOCKET', `Game ${gameCode} starting with ${playerUsernames.length} players`);

    // Fire-and-forget notification
    notifyGameStarted({
      gameCode,
      roomName: game.roomName,
      language: language || game.language,
      playerCount: playerUsernames.length,
      timerSeconds: validTimer,
      isRanked: game.isRanked || false
    }).catch(() => {}); // Swallow errors - never block game flow
  });

  // Handle start game acknowledgment
  socket.on('startGameAck', (data: StartGameAckPayload) => {
    const { messageId } = data;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const result = gameStartCoordinator.recordAcknowledgment(gameCode, username, messageId);

    if (result.valid && result.allReady) {
      const game = getGame(gameCode);
      startGameTimer(io, gameCode, game?.timerSeconds || 180);
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

  // Debug: Get current game state (for debugging sync issues)
  socket.on('debugGameState', () => {
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

  // Handle requestGameState - allows players who missed startGame to recover
  // This is a safety net: if a player reconnects or their socket briefly drops
  // during the startGame broadcast, they can request current game state
  socket.on('requestGameState', () => {
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
        ...(recoveryGameMode === 'blast' && (game as any).blastModeState ? {
          blastTileOverlay: (game as any).blastModeState.overlay || [],
          blastSeed: (game as any).blastModeState.seed ?? null,
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

    // Clean up game start coordinator to prevent stale acknowledgment state
    gameStartCoordinator.cleanupSequence(gameCode);

    // Stop bots but keep them in the game - they will be restarted when new game begins
    // Note: cleanupGameBots would delete all bots, causing them to not play in subsequent games
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

    // Acknowledge successful reset to the host
    if (typeof callback === 'function') {
      callback({ success: true, gameState: stateAfterReset });
    }
  });

  // Handle player confirming they want to play again
  socket.on('confirmReadyForNextGame', () => {
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) {
      logger.warn('SOCKET', `confirmReadyForNextGame: player not in game`, { socketId: socket.id });
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      logger.warn('SOCKET', `confirmReadyForNextGame: game not found`, { gameCode });
      return;
    }

    // Only allow confirmation when game is in 'finished' state
    if (game.gameState !== 'finished') {
      logger.debug('SOCKET', `confirmReadyForNextGame: game not in finished state`, { gameCode, state: game.gameState });
      return;
    }

    // Mark player as ready
    const result = markPlayerReadyForNextGame(gameCode, username);
    if (!result) {
      return;
    }

    logger.info('SOCKET', `Player ${username} confirmed ready for next game in ${gameCode} (${result.readyCount}/${result.totalPlayers})`);

    // Broadcast the updated ready count to all players in the room
    broadcastToRoom(io, getGameRoom(gameCode), 'playersReadyUpdate', {
      readyCount: result.readyCount,
      totalPlayers: result.totalPlayers,
      readyUsernames: result.readyUsernames
    });
  });

  // Handle player toggling lobby ready state (before game starts)
  socket.on('lobbyReady', (data: { ready: boolean }) => {
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Only allow during waiting state (lobby)
    if (game.gameState !== 'waiting') return;

    if (data?.ready) {
      markPlayerReadyForNextGame(gameCode, username);
    } else {
      // Unready: remove from ready list using the game object directly
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
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username || !data?.newName) return;

    const game = getGame(gameCode);
    if (!game || game.gameState !== 'waiting') return;

    const trimmedName = data.newName.trim().slice(0, 20);
    if (!trimmedName) return;

    const user = game.users[username];
    if (!user || user.isHost) return;

    // Re-register under new username
    game.users[trimmedName] = { ...user, username: trimmedName };
    if (trimmedName !== username) {
      delete game.users[username];

      // Update socket-username mappings so subsequent events use the new name
      updateUsernameMapping(gameCode, username, trimmedName, socket.id);
    }

    // Confirm name change to the requesting client
    socket.emit('guestNameUpdated', { oldName: username, newName: trimmedName });

    // Broadcast updated player list to all clients in room
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

// ==========================================
// Helper Functions
// ==========================================

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

    // Check if old room is now empty and close it immediately
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

  // Clear spam detection data from previous game
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

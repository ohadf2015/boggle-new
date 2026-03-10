/**
 * Game Start Handler
 * Handles startGame event logic: mode initialization, dictionary loading,
 * board word counting, and start coordination
 */

import type { Server, Socket } from 'socket.io';
import type { Game, LetterGrid, Language, DifficultyLevel, GameMode } from '@/shared/types';

import {
  getGame,
  updateGame,
  getGameBySocketId,
  getGameUsers,
  getSocketIdByUsername,
  canTransitionGameState,
  transitionGameState,
  resetGameForNewRound,
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  getGameRoom,
  safeEmit,
  getSocketById,
} from '../utils/socketHelpers.js';

import { makePositionsMap } from '../modules/wordValidator.js';
import { emitError, ErrorMessages } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { ensureGame } from '../utils/metrics.js';
import { generateRandomTable } from '../utils/gameUtils.js';
import { ensureLanguageLoaded } from '../dictionary.js';
import logger from '../utils/logger.js';
import { startGameTimer } from './shared.js';
import { findAllWords, getCachedTrie } from '../modules/boggleSolver.js';
import { stopAllBots } from '../modules/botManager.js';
import { notifyGameStarted } from '../modules/notificationService.js';
import { selectNextGameMode, ALL_GAME_MODES } from '../modules/gameModeSelector.js';
import { initializePlayerData } from './gameLifecycleHandler.js';
import { HUNT_TARGET_MIN_LENGTH, HUNT_TARGET_MAX_LENGTH } from '@/shared/constants/wordHuntMultiplayerConstants';

interface StartGamePayload {
  letterGrid: LetterGrid;
  timerSeconds: number;
  language?: Language;
  minWordLength?: number;
  difficulty?: DifficultyLevel;
  boardTheme?: { nameKey: string; emoji: string; isHoliday: boolean } | null;
  gameMode?: GameMode | 'random';
}

/**
 * Build the startGame broadcast payload
 */
function buildStartGamePayload(
  gameCode: string,
  letterGrid: LetterGrid,
  validTimer: number,
  gameLang: Language,
  minWordLength: number,
  messageId: string,
  gameSessionId: string | number | undefined,
  boardTheme: StartGamePayload['boardTheme'],
  resolvedMode: GameMode,
  isRetry: boolean = false
): Record<string, unknown> {
  const game = getGame(gameCode);
  const payload: Record<string, unknown> = {
    letterGrid,
    timerSeconds: validTimer,
    language: gameLang,
    minWordLength,
    messageId,
    gameSessionId,
    boardTheme: boardTheme || null,
    gameMode: resolvedMode,
  };

  if (resolvedMode === 'blast') {
    payload.blastTileOverlay = (game as any)?.blastModeState?.overlay || [];
    payload.blastSeed = (game as any)?.blastModeState?.seed ?? null;
  }

  if (resolvedMode === 'word-hunt') {
    payload.wordHuntTargetLength = (game as any)?.wordHuntState?.targetWordLength ?? 0;
  }

  if (isRetry) {
    payload.retry = true;
  }

  return payload;
}

/**
 * Calculate and broadcast total words on board (async, non-blocking)
 */
function emitTotalBoardWords(
  io: Server,
  gameCode: string,
  letterGrid: LetterGrid,
  gameLang: Language,
  minWordLength: number
): void {
  setImmediate(() => {
    try {
      const trie = getCachedTrie(gameLang);
      const allWords = findAllWords(letterGrid, gameLang, {
        minLength: minWordLength,
        maxLength: 15,
        maxWords: 10000,
        trie
      });
      const MIN_DISPLAY_WORD_LENGTH = 5;
      const totalBoardWords = allWords.filter((word: string) => word.length >= MIN_DISPLAY_WORD_LENGTH).length;

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
}

/**
 * Register startGame socket event handler
 */
export function registerStartGameHandler(io: Server, socket: Socket): void {
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

    const currentGameState = game.gameState;
    logger.info('SOCKET', `Starting game ${gameCode} - current state: ${currentGameState}`);

    // Self-healing: if not in 'waiting' state, force a reset first
    if (!canTransitionGameState(gameCode, 'START')) {
      logger.info('SOCKET', `Game ${gameCode} in unexpected state ${currentGameState}, auto-resetting before start`);

      clearGameTimer(gameCode);
      gameStartCoordinator.cleanupSequence(gameCode);
      stopAllBots(gameCode);

      const resetSuccess = resetGameForNewRound(gameCode);
      if (!resetSuccess) {
        logger.warn('SOCKET', `resetGameForNewRound failed for ${gameCode}, forcing state to waiting`);
        game.gameState = 'waiting';
      }

      logger.info('SOCKET', `Game ${gameCode} auto-reset successful, state now: ${game.gameState}`);
    }

    let validTimer = Math.max(30, Math.min(600, parseInt(String(timerSeconds), 10) || 180));

    const resolvedMode: GameMode = (!gameMode || gameMode === 'random')
      ? selectNextGameMode(game.modeHistory || [], ALL_GAME_MODES)
      : gameMode as GameMode;

    // Default blast MP to 90s when host didn't set an explicit timer (fell back to 180s)
    if (resolvedMode === 'blast' && (!timerSeconds || validTimer === 180)) {
      const { BLAST_MP_DEFAULT_TIMER } = await import('@/shared/constants/gameConstants');
      validTimer = BLAST_MP_DEFAULT_TIMER;
    }

    broadcastToRoom(io, getGameRoom(gameCode), 'gameStarting', {
      gameMode: resolvedMode,
    });

    // Ensure the language dictionary is loaded
    const gameLang = language || game.language || 'en';
    try {
      await ensureLanguageLoaded(gameLang);
      logger.debug('DICT', `Language ${gameLang} loaded for game ${gameCode}`);
    } catch (error) {
      logger.error('DICT', `Failed to load language ${gameLang} for game ${gameCode}: ${error}`);
      try {
        await ensureLanguageLoaded(gameLang);
        logger.info('DICT', `Language ${gameLang} loaded on retry for game ${gameCode}`);
      } catch (retryError) {
        logger.error('DICT', `Dictionary load failed on retry for ${gameLang} in game ${gameCode}: ${retryError}`);
      }
    }

    // Check if this is a classroom game
    const { getClassroomGame } = await import('../modules/classroomGameManager.js');
    const classroomGame = await getClassroomGame(gameCode);
    const lessonVocabulary = classroomGame?.vocabularyWords
      ? new Set(classroomGame.vocabularyWords.map(w => w.toUpperCase()))
      : undefined;

    // Blast mode: ALWAYS regenerate grid server-side
    if (resolvedMode === 'blast') {
      letterGrid = generateRandomTable(6, 6, gameLang);
    }

    updateGame(gameCode, {
      letterGrid,
      timerSeconds: validTimer,
      remainingTime: validTimer,
      gameDuration: validTimer,
      language: gameLang,
      minWordLength: minWordLength || 2,
      difficulty: difficulty || 'MEDIUM',
      gameStartedAt: Date.now(),
      boardTheme: boardTheme || null,
      lessonVocabulary: lessonVocabulary,
      gameMode: resolvedMode,
      modeHistory: [...(game.modeHistory || []), resolvedMode]
    });

    const transitionResult = transitionGameState(gameCode, 'START');
    if (!transitionResult.success) {
      logger.error('SOCKET', `Failed to start game ${gameCode}: ${transitionResult.error}`);
      emitError(socket, 'Failed to start game');
      return;
    }

    const positions = makePositionsMap(letterGrid);
    const current = getGame(gameCode);
    if (current) {
      current.letterPositions = positions;
    }
    ensureGame(gameCode);

    initializePlayerData(game as unknown as Game, gameCode);

    const users = getGameUsers(gameCode);
    const playerUsernames = users.map(u => u.username);

    // Initialize blast mode state if needed
    if (resolvedMode === 'blast') {
      const { initBlastModeState } = await import('../modules/blastModeManager.js');
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
      const allValidWords = findAllWords(letterGrid, gameLang, { minLength: 3, maxLength: 8, maxWords: 10000, trie });
      const targetWord = selectTargetWordWithFallback(allValidWords, HUNT_TARGET_MIN_LENGTH, HUNT_TARGET_MAX_LENGTH);
      if (targetWord) {
        const huntState = initWordHuntState(targetWord, playerUsernames);
        const currentGame = getGame(gameCode);
        if (currentGame) {
          (currentGame as any).wordHuntState = huntState;
        }
      } else {
        logger.error('WORD_HUNT', `No target word found for game ${gameCode} - falling back to classic mode`);
        updateGame(gameCode, { gameMode: 'classic' });
      }
    }

    const messageId = gameStartCoordinator.initializeSequence(gameCode, playerUsernames, timerSeconds);
    const effectiveMinWordLength = minWordLength || 2;

    // Broadcast start
    broadcastToRoom(io, getGameRoom(gameCode), 'startGame',
      buildStartGamePayload(gameCode, letterGrid, validTimer, gameLang, effectiveMinWordLength, messageId, game.gameSessionId, boardTheme, resolvedMode)
    );

    // Calculate and emit total words on board
    emitTotalBoardWords(io, gameCode, letterGrid, gameLang, effectiveMinWordLength);

    // Schedule retries for players who don't acknowledge quickly
    gameStartCoordinator.scheduleRetries(gameCode, playerUsernames, (username: string) => {
      const targetSocketId = getSocketIdByUsername(gameCode, username);
      if (!targetSocketId) return false;
      const targetSocket = getSocketById(io, targetSocketId);
      if (!targetSocket) return false;
      return safeEmit(targetSocket, 'startGame',
        buildStartGamePayload(gameCode, letterGrid, validTimer, gameLang, effectiveMinWordLength, messageId, game.gameSessionId, boardTheme, resolvedMode, true)
      );
    });

    // Set acknowledgment timeout
    gameStartCoordinator.setAcknowledgmentTimeout(gameCode, 3000, () => {
      startGameTimer(io, gameCode, validTimer);
    });

    logger.info('SOCKET', `Game ${gameCode} starting with ${playerUsernames.length} players`);

    notifyGameStarted({
      gameCode,
      roomName: game.roomName,
      language: language || game.language,
      playerCount: playerUsernames.length,
      timerSeconds: validTimer,
      isRanked: game.isRanked || false
    }).catch(() => {});
  });
}

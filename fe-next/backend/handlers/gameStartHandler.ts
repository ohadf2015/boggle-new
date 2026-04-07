/**
 * Game Start Handler
 * Handles startGame event logic: mode initialization, dictionary loading,
 * board word counting, and start coordination
 */

import type { Server, Socket } from 'socket.io';
import type { LetterGrid, Language, DifficultyLevel, GameMode } from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';

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
import { validatePayload, startGameSchema } from '../utils/socketValidation.js';
import { startGameTimer } from './shared.js';
import { getCachedTrie } from '../modules/boggleSolver.js';
import { findAllWordsAsync } from '../modules/wordValidatorPool.js';
import { stopAllBots } from '../modules/botManager.js';
import { notifyGameStarted } from '../modules/notificationService.js';
import { selectNextGameMode, ALL_GAME_MODES } from '../modules/gameModeSelector.js';
import { initializePlayerData } from './playerDataInit.js';
import { HUNT_TARGET_MIN_LENGTH, HUNT_TARGET_MAX_LENGTH } from '@/shared/constants/wordHuntMultiplayerConstants';
import { BLAST_MP_DEFAULT_TIMER } from '@/shared/constants/gameConstants';
import { getClassroomGame } from '../modules/classroomGameManager.js';
import { initBlastModeState, hashStringToSeed } from '../modules/blastModeManager.js';
import { initWordHuntState, selectTargetWordWithFallback } from '../modules/wordHuntManager.js';
import { getSupabase } from '../modules/supabase/client.js';
import { autoAddBotsForSoloPlayer } from '../services/gameLifecycle/autoAddBots.js';
import { scheduleRoundEvent } from '../modules/roundEventsManager.js';

// In-memory mutex to prevent concurrent startGame flows for the same game.
// The state machine transition is synchronous, but async work before it
// (dictionary load, classroom game fetch) creates a window for duplicates.
const gamesStarting = new Set<string>();

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
    payload.blastTileOverlay = game?.blastModeState?.overlay || [];
    payload.blastSeed = game?.blastModeState?.seed ?? null;
  }

  if (resolvedMode === 'word-hunt') {
    payload.wordHuntTargetLength = game?.wordHuntState?.targetWordLength ?? 0;
    payload.wordHuntTargetCategory = game?.wordHuntState?.targetCategory ?? null;
    payload.wordHuntPlayerLives = game?.wordHuntState?.playerLives ?? {};
  }

  if (game?.goldenLetters?.length) {
    payload.goldenLetters = game.goldenLetters;
  }

  if (isRetry) {
    payload.retry = true;
  }

  return payload;
}

/**
 * Calculate and broadcast total words on board.
 *
 * PERF-012: Previously called findAllWords() directly inside setImmediate(),
 * which deferred the start of the computation but still blocked the event loop
 * for 50-100 ms once running (synchronous DFS over a 6×6 grid + 275k-word trie).
 *
 * Now delegates to findAllWordsAsync() which routes through the worker pool
 * when workers are available, or wraps the sync call in a setImmediate-deferred
 * Promise when running in sync-only mode — ensuring at minimum that any I/O
 * callbacks queued before game-start can flush before the blocking work begins.
 *
 * TODO(PERF-012): ship wordValidatorWorker.mjs with a 'findAllWords' action
 * to get full worker-thread offloading for all deployments.
 */
async function emitTotalBoardWords(
  io: Server,
  gameCode: string,
  letterGrid: LetterGrid,
  gameLang: Language,
  minWordLength: number
): Promise<void> {
  try {
    const trie = getCachedTrie(gameLang);
    const allWords = await findAllWordsAsync(letterGrid, gameLang, {
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
}

/**
 * Exported for unit testing only — not part of public API.
 * @internal
 */
export const emitTotalBoardWordsForTest = emitTotalBoardWords;

/**
 * Register startGame socket event handler
 */
export function registerStartGameHandler(io: Server, socket: Socket): void {
  socket.on('startGame', async (data: StartGamePayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    // Validate payload to prevent arbitrary gameMode/boardTheme injection
    const validation = validatePayload(startGameSchema, data);
    if (!validation.success) {
      emitError(socket, `Invalid start game request: ${validation.error}`);
      return;
    }

    const validatedData = validation.data as StartGamePayload;
    let { letterGrid } = validatedData;
    const { timerSeconds, language, minWordLength, difficulty, boardTheme, gameMode } = validatedData;
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

    // Mutex: prevent concurrent startGame flows for the same game
    if (gamesStarting.has(gameCode)) {
      logger.warn('SOCKET', `Rejected duplicate startGame for ${gameCode} (mutex held)`);
      emitError(socket, 'Game is already starting');
      return;
    }
    gamesStarting.add(gameCode);

    const currentGameState = game.gameState;
    logger.info('SOCKET', `Starting game ${gameCode} - current state: ${currentGameState}`);

    // Self-healing: if game is not in 'waiting' state, force-reset before starting.
    // This handles 'finished', 'validating', and stale 'in-progress' states
    // (e.g., when endGame failed to transition properly but results were shown).
    if (!canTransitionGameState(gameCode, 'START')) {
      logger.info('SOCKET', `Game ${gameCode} in state ${currentGameState}, auto-resetting before start`);

      clearGameTimer(gameCode);
      gameStartCoordinator.cleanupSequence(gameCode);
      stopAllBots(gameCode);

      const resetSuccess = resetGameForNewRound(gameCode);
      if (!resetSuccess) {
        // Last-resort self-heal: bypass state machine intentionally.
        // resetGameForNewRound clears player data; if it failed, ensure
        // at minimum the state allows a fresh start. Timer and bots are
        // already stopped above (clearGameTimer + stopAllBots).
        logger.warn('SOCKET', `resetGameForNewRound failed for ${gameCode}, forcing state to waiting`);
        game.gameState = 'waiting';
      }

      logger.info('SOCKET', `Game ${gameCode} auto-reset successful, state now: ${game.gameState}`);
    }

    let validTimer = Math.max(30, Math.min(120, parseInt(String(timerSeconds), 10) || 120));

    let resolvedMode: GameMode = (!gameMode || gameMode === 'random')
      ? selectNextGameMode(game.modeHistory || [], ALL_GAME_MODES)
      : gameMode as GameMode;

    // Default blast MP to 90s when host didn't set an explicit timer
    if (resolvedMode === 'blast' && !timerSeconds) {
      validTimer = BLAST_MP_DEFAULT_TIMER;
    }

    // Server-side blast access enforcement — only admin or blast_access users can start blast games
    if (resolvedMode === 'blast') {
      const hostUser = Object.values(game.users).find((u) => u.isHost);
      const hostAuthId = hostUser?.authUserId || (socket.data?.verifiedUserId as string | undefined);
      const supabase = getSupabase();
      // If Supabase is not configured (dev/test), allow blast access by default.
      // In production with Supabase available, require admin or blast_access on the profile.
      let blastAllowed = !supabase;

      if (hostAuthId && supabase) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin, blast_access')
          .eq('id', hostAuthId)
          .single();
        blastAllowed = !!(profile?.is_admin || profile?.blast_access);
      }

      if (!blastAllowed) {
        gamesStarting.delete(gameCode);
        logger.warn('SOCKET', `Rejected blast mode for ${gameCode}: host lacks blast_access`);
        emitError(socket, 'Blast mode requires special access');
        return;
      }
    }

    // CRITICAL: Transition state FIRST to guard against concurrent startGame calls.
    // Only the first caller wins; all others bail out before any side effects.
    const transitionResult = transitionGameState(gameCode, 'START');
    if (!transitionResult.success) {
      gamesStarting.delete(gameCode);
      logger.warn('SOCKET', `Rejected concurrent startGame for ${gameCode}: ${transitionResult.error}`);
      emitError(socket, 'Failed to start game');
      return;
    }

    // State machine now guards against concurrent starts — release the mutex
    gamesStarting.delete(gameCode);

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
    const classroomGame = await getClassroomGame(gameCode);
    const lessonVocabulary = classroomGame?.vocabularyWords
      ? new Set(classroomGame.vocabularyWords.map(w => w.toUpperCase()))
      : undefined;

    // SECURITY: Regenerate grid server-side for ALL multiplayer games (2+ players).
    // A client-supplied grid lets the host craft favorable boards — never trust it
    // in competitive play. Solo games (1 player before bots are added) may use the
    // client grid; bots are appended after this block so the count is accurate.
    // For classroom games, embed lesson vocabulary words into the grid so students
    // can actually find them during gameplay.
    const vocabToEmbed = classroomGame?.vocabularyWords?.map(w => w.toUpperCase()) ?? [];
    const playerCount = Object.keys(game.users).length;
    if (playerCount >= 2) {
      if (resolvedMode === 'blast') {
        letterGrid = vocabToEmbed.length > 0
          ? generateRandomTable(6, 6, gameLang, vocabToEmbed)
          : generateRandomTable(6, 6, gameLang);
      } else {
        // Multiplayer always uses 6x6 grid for classic/word-hunt
        letterGrid = vocabToEmbed.length > 0
          ? generateRandomTable(6, 6, gameLang, vocabToEmbed)
          : generateRandomTable(6, 6, gameLang);
      }
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

    const positions = makePositionsMap(letterGrid);
    const current = getGame(gameCode);
    if (current) {
      current.letterPositions = positions;
    }
    ensureGame(gameCode);

    initializePlayerData(gameCode);

    // ---- Golden Letters ----
    // Pick 2-3 random grid positions to be "golden" (worth +25% bonus)
    {
      const gridRows = letterGrid.length;
      const gridCols = (letterGrid[0] as unknown[])?.length || 0;
      const totalCells = gridRows * gridCols;
      const goldenCount = Math.min(gridRows >= 6 ? 3 : 2, totalCells);
      const goldenLetters: Array<{ row: number; col: number }> = [];
      const usedPositions = new Set<string>();
      while (goldenLetters.length < goldenCount) {
        const row = Math.floor(Math.random() * gridRows);
        const col = Math.floor(Math.random() * gridCols);
        const key = `${row},${col}`;
        if (!usedPositions.has(key)) {
          usedPositions.add(key);
          goldenLetters.push({ row, col });
        }
      }
      updateGame(gameCode, { goldenLetters });
      const currentGame = getGame(gameCode);
      if (currentGame) currentGame.goldenLetters = goldenLetters;
    }

    // Auto-add bots if solo player started the game
    const autoAddResult = await autoAddBotsForSoloPlayer(gameCode, game);
    if (autoAddResult.botsAdded > 0) {
      // Re-initialize player data to include bots
      initializePlayerData(gameCode);
      // Broadcast updated user list so clients see the bots
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode),
      });
      logger.info('BOT', `Auto-added ${autoAddResult.botsAdded} bots for solo player in ${gameCode}`);
    }

    const users = getGameUsers(gameCode);
    const playerUsernames = users.map(u => u.username);

    // Initialize blast mode state if needed
    if (resolvedMode === 'blast') {
      const mpBlastWave = playerUsernames.length >= 2 ? 3 : 1;
      const overlaySeed = hashStringToSeed(gameCode);
      const blastState = initBlastModeState(letterGrid, playerUsernames, mpBlastWave, overlaySeed);
      const currentGame = getGame(gameCode);
      if (currentGame) {
        currentGame.blastModeState = blastState;
      }
    }

    // Initialize word hunt mode state if needed
    // Also reuse the solve result for totalBoardWords to avoid double graph traversal
    let wordHuntSolveReused = false;
    if (resolvedMode === 'word-hunt') {
      const trie = getCachedTrie(gameLang);
      const allValidWords = await findAllWordsAsync(letterGrid, gameLang, { minLength: 3, maxLength: 8, maxWords: 10000, trie });
      const targetWord = selectTargetWordWithFallback(allValidWords, HUNT_TARGET_MIN_LENGTH, HUNT_TARGET_MAX_LENGTH, gameLang);
      if (targetWord) {
        const huntState = initWordHuntState(targetWord, playerUsernames);
        const currentGame = getGame(gameCode);
        if (currentGame) {
          currentGame.wordHuntState = huntState;
          // Reuse solve result for totalBoardWords (avoids second findAllWords call)
          const MIN_DISPLAY_WORD_LENGTH = 5;
          currentGame.totalBoardWords = allValidWords.filter((w: string) => w.length >= MIN_DISPLAY_WORD_LENGTH).length;
          wordHuntSolveReused = true;
        }
      } else {
        logger.error('WORD_HUNT', `No target word found for game ${gameCode} - falling back to classic mode`);
        updateGame(gameCode, { gameMode: 'classic' });
        resolvedMode = 'classic' as GameMode;
      }
    }

    const messageId = gameStartCoordinator.initializeSequence(gameCode, playerUsernames, timerSeconds);
    const effectiveMinWordLength = minWordLength || 2;

    // Broadcast start
    broadcastToRoom(io, getGameRoom(gameCode), 'startGame',
      buildStartGamePayload(gameCode, letterGrid, validTimer, gameLang, effectiveMinWordLength, messageId, game.gameSessionId, boardTheme, resolvedMode)
    );

    // Calculate and emit total words on board (skip if word-hunt already computed it)
    if (wordHuntSolveReused) {
      const currentGame = getGame(gameCode);
      broadcastToRoom(io, getGameRoom(gameCode), 'totalBoardWords', {
        count: currentGame?.totalBoardWords || 0
      });
    } else {
      emitTotalBoardWords(io, gameCode, letterGrid, gameLang, effectiveMinWordLength);
    }

    // ---- Special Words ----
    // After emitTotalBoardWords we do a best-effort async pick of 1-2 longest words
    // that become "special" (not revealed to clients until found).
    (async () => {
      try {
        const trie = getCachedTrie(gameLang);
        const allWords = await findAllWordsAsync(letterGrid, gameLang, {
          minLength: 4,
          maxLength: 12,
          maxWords: 5000,
          trie,
        });
        if (allWords.length > 0) {
          const sorted = [...allWords].sort((a: string, b: string) => b.length - a.length);
          const pickCount = Math.min(2, sorted.length);
          const specialWords = sorted.slice(0, pickCount).map((word: string) => ({ word }));
          const cg = getGame(gameCode);
          if (cg) {
            cg.specialWords = specialWords;
            updateGame(gameCode, { specialWords });
          }
          logger.debug('ROUND_EVENT', `Game ${gameCode}: special words set: ${specialWords.map((w: { word: string }) => w.word).join(', ')}`);
        }
      } catch (err: unknown) {
        const error = err as Error;
        logger.error('ROUND_EVENT', `Failed to compute special words for ${gameCode}: ${error.message}`);
      }
    })();

    // ---- Round Event Schedule ----
    // Only schedule for multiplayer classic games (not blast/word-hunt to keep events simple)
    if (resolvedMode === 'classic' && playerUsernames.length >= 2) {
      scheduleRoundEvent(io, gameCode, game, validTimer);
    }

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
    }).catch((err: Error) => {
      logger.error('SOCKET', `Failed to notify game started for ${gameCode}: ${err.message}`);
    });
  });
}

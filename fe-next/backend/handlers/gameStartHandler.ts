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
import { clearAutoStartState } from '../modules/lobbyAutoStart.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { ensureGame } from '../utils/metrics.js';
import { generateRandomTable } from '../utils/gameUtils.js';
import { generateRichBoard } from '../utils/boardSelection.js';
import { ensureLanguageLoaded } from '../dictionary.js';
import logger from '../utils/logger.js';
import { validatePayload, startGameSchema } from '../utils/socketValidation.js';
import { startGameTimer } from './shared.js';
import { scheduleGameStartSafetyNet } from '../services/gameLifecycle/gameTimer.js';
import { getCachedTrie } from '../modules/boggleSolver.js';
import { findAllWordsAsync } from '../modules/wordValidatorPool.js';
import { stopAllBots } from '../modules/botManager.js';
import { notifyGameStarted } from '../modules/notificationService.js';
import { selectNextGameMode, ALL_GAME_MODES } from '../modules/gameModeSelector.js';
import { initializePlayerData } from './playerDataInit.js';
import { HUNT_TARGET_MIN_LENGTH, HUNT_TARGET_MAX_LENGTH } from '@/shared/constants/wordHuntMultiplayerConstants';
import { BLAST_MP_DEFAULT_TIMER, DEFAULT_TIMER, DIFFICULTIES, DEFAULT_DIFFICULTY } from '@/shared/constants/gameConstants';
import { WHEEL_RUSH_DURATION_SEC } from '@/shared/constants/wheelRushConstants';
import { getClassroomGame } from '../modules/classroomGameManager.js';
import { initBlastModeState, hashStringToSeed } from '../modules/blastModeManager.js';
import { initWordHuntState, selectTargetWordWithFallback } from '../modules/wordHuntManager.js';
import { initWheelRushState, generateWheelPuzzle } from '../modules/wheelRushManager.js';
import { initVersusMatch } from '@/lib/wordTower/versusMatch';
import { initShiritoriState } from '../modules/shiritoriManager.js';
import { getSupabase } from '../modules/supabase/client.js';
import { autoAddBotsForSoloPlayer } from '../services/gameLifecycle/autoAddBots.js';
import { scheduleRoundEvent } from '../modules/roundEventsManager.js';
import { verifyBoostToken } from '../utils/boostToken.js';

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
  tvMode?: boolean;
  /**
   * Optional boost token bundled with startGame so the boost is registered
   * atomically with state transition — eliminates the race where a separate
   * `boost:apply` emit could arrive after the first submitWord.
   */
  boostToken?: string;
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
    payload.blastWave = game?.blastModeState?.wave ?? 1;
  }

  if (resolvedMode === 'word-hunt') {
    payload.wordHuntTargetLength = game?.wordHuntState?.targetWordLength ?? 0;
    payload.wordHuntTargetCategory = game?.wordHuntState?.targetCategory ?? null;
    payload.wordHuntPlayerLives = game?.wordHuntState?.playerLives ?? {};
  }

  // Always include goldenLetters (even as []) on the fresh startGame payload so
  // the client can distinguish "no goldens this round" from "reconnect with
  // missing field". Reconnect / late-join / recovery emits add the field only
  // when populated and the client treats omitted as "don't touch".
  payload.goldenLetters = game?.goldenLetters ?? [];

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
    const { timerSeconds, language, minWordLength, difficulty, boardTheme, gameMode, tvMode } = validatedData;
    const gameCode = getGameBySocketId(socket.id);

    if (!gameCode) {
      emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
      return;
    }

    const game = getGame(gameCode);
    if (!game) {
      emitError(socket, ErrorCodes.GAME_NOT_FOUND);
      return;
    }

    if (game.hostSocketId !== socket.id) {
      emitError(socket, ErrorCodes.PLAYER_NOT_HOST);
      return;
    }

    // The game is starting (manually or via the lobby auto-start firing) — tear
    // down any in-flight lobby auto-start countdown so it can't fire again.
    clearAutoStartState(gameCode);

    // Rematch preservation: a rematch (ResultsPage) omits these fields, and
    // resetGameForNewRound below wipes game.minWordLength — so snapshot the
    // prior round's settings now and use them as fallbacks when the payload
    // doesn't specify them. Keeps the host's chosen timer/difficulty/min-word
    // across rounds instead of silently reverting to defaults.
    const priorTimerSeconds = game.timerSeconds;
    const priorDifficulty = game.difficulty;
    const priorMinWordLength = game.minWordLength;
    const effectiveDifficulty = difficulty ?? priorDifficulty ?? DEFAULT_DIFFICULTY;
    const effectiveMinWordLength = minWordLength ?? priorMinWordLength ?? 2;

    // Mutex: prevent concurrent startGame flows for the same game
    if (gamesStarting.has(gameCode)) {
      logger.debug('SOCKET', `Rejected duplicate startGame for ${gameCode} (mutex held)`);
      emitError(socket, ErrorCodes.GAME_ALREADY_STARTED, { message: 'Game is already starting' });
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

      // Broadcast 'resetGame' so clients clear stale Zustand state before the
      // next round's gameStarted arrives. Without this, prev-round state like
      // wordHuntMyLife=0 / eliminatedPlayers leaks into the new round and
      // immediately triggers WordHuntGameOverOverlay ("Watch the remaining
      // players") for any player who didn't fire confirmReadyForNextGame.
      broadcastToRoom(io, getGameRoom(gameCode), 'resetGame', {
        users: getGameUsers(gameCode),
        gameSessionId: game.gameSessionId,
      });

      logger.info('SOCKET', `Game ${gameCode} auto-reset successful, state now: ${game.gameState}`);
    }

    const rawTimer = parseInt(String(timerSeconds), 10);

    // Blast is now enabled for all players (the prior is_admin/blast_access gate
    // was removed once MP blast reached parity: shared-board clear ends the room,
    // bots play the live board, and a blast-specific results screen ships). It
    // stays in the random rotation pool and any host can pick it explicitly.
    const isRandomRoll = !gameMode || gameMode === 'random';

    const enabledModes = ALL_GAME_MODES;

    let resolvedMode: GameMode = isRandomRoll
      ? selectNextGameMode(game.modeHistory || [], enabledModes)
      : gameMode as GameMode;

    // Timer: clamp host choice to the safe range. Blast falls back to its own
    // 90s default (not the generic 120) when the host supplied nothing — but a
    // host-chosen 1/2/3 min is now respected (was force-overridden, audit SRV-M4;
    // override accepted by product 2026-05-14 — waves removed, fixed-window
    // balance argument no longer holds).
    const timerFallback =
      resolvedMode === 'blast' ? BLAST_MP_DEFAULT_TIMER :
      resolvedMode === 'wheel-rush' ? WHEEL_RUSH_DURATION_SEC :
      DEFAULT_TIMER;
    let validTimer = Math.max(30, Math.min(600, rawTimer || priorTimerSeconds || timerFallback));

    // Word Tower is admin-only during development. UI hides it from non-admins;
    // this server gate enforces it even if a client crafts the startGame emit
    // directly. Never reachable via random roll (not in ALL_GAME_MODES).
    if (resolvedMode === 'word-tower') {
      const wtHostUser = Object.values(game.users).find((u) => u.isHost);
      const wtHostAuthId = wtHostUser?.authUserId || (socket.data?.verifiedUserId as string | undefined);
      const wtSupabase = getSupabase();
      let wordTowerAllowed = false;
      if (!wtSupabase) {
        wordTowerAllowed = true; // dev/test (no Supabase) → allow
      } else if (wtHostAuthId) {
        const { data: wtProfile } = await wtSupabase
          .from('profiles')
          .select('is_admin')
          .eq('id', wtHostAuthId)
          .single();
        wordTowerAllowed = !!wtProfile?.is_admin;
      }
      if (!wordTowerAllowed) {
        gamesStarting.delete(gameCode);
        logger.debug('SOCKET', `Rejected word-tower for ${gameCode}: host not admin`);
        emitError(socket, ErrorCodes.AUTH_FORBIDDEN, { message: 'Word Tower is admin-only' });
        return;
      }
    }

    // CRITICAL: Transition state FIRST to guard against concurrent startGame calls.
    // Only the first caller wins; all others bail out before any side effects.
    const transitionResult = transitionGameState(gameCode, 'START');
    if (!transitionResult.success) {
      gamesStarting.delete(gameCode);
      logger.warn('SOCKET', `Rejected concurrent startGame for ${gameCode}: ${transitionResult.error}`);
      emitError(socket, ErrorCodes.INTERNAL_ERROR, { message: 'Failed to start game' });
      return;
    }

    // Apply boost token bundled with startGame (atomic with state transition).
    // Replaces the prior separate `boost:apply` emit that raced submitWord —
    // boost now lands in game.playerBoosts before any gameplay broadcast.
    const boostToken = (validatedData as StartGamePayload).boostToken;
    if (boostToken && game.hostUsername) {
      try {
        const verification = verifyBoostToken(boostToken, gameCode);
        if (verification.valid) {
          if (!game.playerBoosts) game.playerBoosts = {};
          const existing = game.playerBoosts[game.hostUsername];
          if (!existing || existing.sessionId !== gameCode) {
            game.playerBoosts[game.hostUsername] = { sessionId: gameCode, token: boostToken };
            socket.emit('boost:applied', {
              success: true,
              boostType: verification.boostType,
            });
            logger.info('BOOST', `Applied ${verification.boostType} for ${game.hostUsername} via startGame`);
          }
        } else {
          logger.warn('BOOST', `Invalid boost token in startGame for ${gameCode}: ${verification.reason}`);
        }
      } catch (err) {
        logger.warn('BOOST', `Boost apply error in startGame: ${(err as Error).message}`);
      }
    }

    // Hold the mutex through the entire game-setup async chain. If we released
    // here (right after the state transition) and a duplicate `startGame`
    // arrived during the awaits below (dict load, classroom lookup, board solve),
    // the duplicate would pass the mutex check, hit the state-machine guard
    // (state is now 'in-progress', not 'waiting'), and fall into the self-heal
    // branch which force-resets the in-flight game. Holding the mutex until the
    // setup chain finishes prevents that race (audit SRV-H4).
    try {

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
    // Grid size honors host difficulty (EASY=5x5, MEDIUM=6x6, HARD=7x7).
    // Blast mode forces 6x6 regardless to keep its tile economy balanced.
    // Regenerate server-side for MP (anti-cheat) or when client sent no grid.
    const dim = DIFFICULTIES[effectiveDifficulty];
    const gridRows = resolvedMode === 'blast' ? 6 : dim.rows;
    const gridCols = resolvedMode === 'blast' ? 6 : dim.cols;
    if (playerCount >= 2 || !letterGrid || letterGrid.length === 0) {
      letterGrid = generateRichBoard(
        () => vocabToEmbed.length > 0
          ? generateRandomTable(gridRows, gridCols, gameLang, vocabToEmbed)
          : generateRandomTable(gridRows, gridCols, gameLang),
        gameLang,
        gridRows,
        gridCols
      ) as LetterGrid;
    }

    updateGame(gameCode, {
      letterGrid,
      timerSeconds: validTimer,
      remainingTime: validTimer,
      gameDuration: validTimer,
      language: gameLang,
      minWordLength: effectiveMinWordLength,
      difficulty: effectiveDifficulty,
      gameStartedAt: Date.now(),
      boardTheme: boardTheme || null,
      lessonVocabulary: lessonVocabulary,
      gameMode: resolvedMode,
      modeHistory: [...(game.modeHistory || []), resolvedMode],
      tvMode: tvMode ?? false,
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
      // SECURITY: solo→multiplayer grid regen (audit SRV-CRIT-4).
      // The earlier line-334 regen check let solo (1 player) games keep the
      // client-supplied grid. Auto-adding bots converts that into a competitive
      // multiplayer game — without this regen, the host's rigged board would
      // ride into the bot match. Drop the rigged grid here.
      letterGrid = generateRichBoard(
        () => vocabToEmbed.length > 0
          ? generateRandomTable(6, 6, gameLang, vocabToEmbed)
          : generateRandomTable(6, 6, gameLang),
        gameLang,
        6,
        6
      ) as LetterGrid;
      const newPositions = makePositionsMap(letterGrid);
      updateGame(gameCode, { letterGrid });
      const regenGame = getGame(gameCode);
      if (regenGame) regenGame.letterPositions = newPositions;

      // Re-initialize player data to include bots
      initializePlayerData(gameCode);
      // Broadcast updated user list so clients see the bots
      broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', {
        users: getGameUsers(gameCode),
      });
      logger.info('BOT', `Auto-added ${autoAddResult.botsAdded} bots for solo player in ${gameCode} (grid regenerated)`);
    }

    const users = getGameUsers(gameCode);
    const playerUsernames = users.map(u => u.username);
    const humanUsernames = users.filter(u => !u.isBot).map(u => u.username);

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

    // Initialize wheel rush mode state if needed
    // NOTE: Do NOT broadcast wheelRushInit here — client hasn't mounted WheelRushView yet
    // (it only mounts after receiving startGame). Broadcast happens after startGame below.
    if (resolvedMode === 'wheel-rush') {
      const currentGame = getGame(gameCode);
      // Salt the puzzle with gameSessionId (increments each round) so a rematch
      // in the same room produces a fresh wheel instead of the same letters.
      const puzzle = generateWheelPuzzle(gameCode, gameLang, currentGame?.gameSessionId ?? '');
      const wheelState = initWheelRushState(puzzle, playerUsernames);
      if (currentGame) {
        currentGame.wheelRushState = wheelState;
      }
    }

    // Initialize shiritori (しりとり) word-chain state if needed.
    if (resolvedMode === 'shiritori') {
      const shiritoriState = initShiritoriState(playerUsernames);
      const currentGame = getGame(gameCode);
      if (currentGame) {
        currentGame.shiritoriState = shiritoriState;
      }
    }

    // Initialize Word Tower versus match state if needed (per-player towers).
    if (resolvedMode === 'word-tower') {
      const match = initVersusMatch(
        gameCode,
        gameLang,
        playerUsernames.map((u) => ({ id: u, username: u })),
        Date.now(),
      );
      const currentGame = getGame(gameCode);
      if (currentGame) {
        currentGame.wordTowerVersusState = match;
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
        logger.info('WORD_HUNT', `No target word found for game ${gameCode} - falling back to classic mode`);
        updateGame(gameCode, { gameMode: 'classic' });
        resolvedMode = 'classic' as GameMode;
      }
    }

    const messageId = gameStartCoordinator.initializeSequence(gameCode, humanUsernames, timerSeconds);

    // Broadcast start
    broadcastToRoom(io, getGameRoom(gameCode), 'startGame',
      buildStartGamePayload(gameCode, letterGrid, validTimer, gameLang, effectiveMinWordLength, messageId, game.gameSessionId, boardTheme, resolvedMode)
    );

    // Tell word-tower clients the per-player match is initialized so they can
    // (re)pull their tower. Beats the requestTowerState race: the versus hook
    // polls on mount during the countdown, before the match exists.
    if (resolvedMode === 'word-tower') {
      broadcastToRoom(io, getGameRoom(gameCode), 'towerMatchReady', {});
    }

    // Broadcast wheel-rush init AFTER startGame so client has time to mount WheelRushView
    // and subscribe. Also handles late joiners via requestWheelRushState (see wheelRushHandler).
    if (resolvedMode === 'wheel-rush') {
      const cg = getGame(gameCode);
      if (cg?.wheelRushState) {
        broadcastToRoom(io, getGameRoom(gameCode), 'wheelRushInit', {
          puzzle: cg.wheelRushState.puzzle,
          startedAt: cg.wheelRushState.startedAt,
        });
      }
    }

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
    gameStartCoordinator.scheduleRetries(gameCode, humanUsernames, (username: string) => {
      const targetSocketId = getSocketIdByUsername(gameCode, username);
      if (!targetSocketId) return false;
      const targetSocket = getSocketById(io, targetSocketId);
      if (!targetSocket) return false;
      return safeEmit(targetSocket, 'startGame',
        buildStartGamePayload(gameCode, letterGrid, validTimer, gameLang, effectiveMinWordLength, messageId, game.gameSessionId, boardTheme, resolvedMode, true)
      );
    });

    // Bot-only rooms have no human countdown to wait for — start immediately.
    // Otherwise, wait for every human client to emit `countdownComplete`
    // (post-animation), with an 8s fallback in case a client never reports.
    if (humanUsernames.length === 0) {
      startGameTimer(io, gameCode, validTimer);
    } else {
      gameStartCoordinator.setCountdownCompleteTimeout(gameCode, 8000, (stats) => {
        startGameTimer(io, gameCode, validTimer);
        // "Host starts while others still loading": the fallback fired because
        // some players never reported countdownComplete (slow load / dropped
        // event). Force-sync each still-missing player into the NOW-RUNNING game
        // so they land on the board immediately instead of waiting for their own
        // timer-stall watchdog. reconnect:true → the client resumes silently (no
        // 3-2-1 replay; see usePlayerGameEvents). Does not change WHEN the timer
        // starts — purely a catch-up resend.
        for (const missingUser of stats.missing) {
          const sid = getSocketIdByUsername(gameCode, missingUser);
          if (!sid) continue;
          const missingSock = getSocketById(io, sid);
          if (!missingSock) continue;
          const payload = buildStartGamePayload(gameCode, letterGrid, validTimer, gameLang, effectiveMinWordLength, messageId, game.gameSessionId, boardTheme, resolvedMode, true);
          safeEmit(missingSock, 'startGame', { ...payload, reconnect: true });
        }
      });

      // Server-side launch guarantee: the coordinator fallback above relies on a
      // healthy client/coordinator handshake. If the only human's tab is frozen
      // from before start, neither `countdownComplete` nor that fallback starts
      // the timer — the round runs with no clock and bots score 0 until a client
      // reconnects (requestGameState orphan recovery). Arm a proactive server-side
      // recovery so launch never depends on a client signal. No-op once started.
      scheduleGameStartSafetyNet(io, gameCode, 10000);
    }

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
    } finally {
      // Mutex released only after all setup completes (or throws). See SRV-H4 above.
      gamesStarting.delete(gameCode);
    }
  });
}

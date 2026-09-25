/**
 * Game Start Handler
 *
 * The startGame event, as a sequence of mode-agnostic steps: guard → self-heal
 * → resolve mode + timer → beta gate → transition → deal the board → let the
 * MODE set up its round (backend/modes) → broadcast ONE start payload
 * (backend/modes/roundPayload) → arm the countdown. Per-mode differences live
 * in backend/modes; this file never branches on a specific mode.
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
import { broadcastToRoom, getGameRoom, safeEmit, getSocketById } from '../utils/socketHelpers.js';
import { clearAutoStartState } from '../modules/lobbyAutoStart.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { clearGameTimer } from '../utils/timerManager.js';
import { ensureGame } from '../utils/metrics.js';
import { ensureLanguageLoaded } from '../dictionary.js';
import logger from '../utils/logger.js';
import { validatePayload, startGameSchema } from '../utils/socketValidation.js';
import { startGameTimer } from './shared.js';
import { scheduleGameStartSafetyNet, resolveGameStartSafetyNetDelayMs } from '../services/gameLifecycle/gameTimer.js';
import { stopAllBots } from '../modules/botManager.js';
import { notifyGameStarted } from '../modules/notificationService.js';
import { selectNextGameMode, ALL_GAME_MODES } from '../modules/gameModeSelector.js';
import { initializePlayerData } from './playerDataInit.js';
import { startVocabQuizForClassroom } from './vocabQuizHandler.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '@/shared/constants/gameConstants';
import { beginClassroomRound } from '../modules/classroomGameManager.js';
import { autoAddBotsForSoloPlayer } from '../services/gameLifecycle/autoAddBots.js';
import { scheduleRoundEvent } from '../modules/roundEventsManager.js';
import { startRushTiles } from '../modules/rushTiles/rushTilesManager.js';
import { buildLessonVocabulary } from '../utils/lessonVocabulary.js';
import { getGameModeModule, getGameModeRules } from '../modes/index.js';
import { buildRoundPayload } from '../modes/roundPayload.js';
import {
  applyStartBoostToken,
  buildClassroomStartExtras,
  checkInWorkModeAccess,
  dealBoard,
  emitTotalBoardWords,
  installBoard,
  pickGoldenLetters,
  recordClassroomWordBank,
  scheduleSpecialWords,
} from './gameStartRound.js';

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
  /** Boost token bundled with startGame — registered atomically with the transition. */
  boostToken?: string;
}

/**
 * Exported for unit testing only — not part of public API.
 * @internal
 */
export const emitTotalBoardWordsForTest = emitTotalBoardWords;

/** Self-heal: a room not in 'waiting' (finished / validating / stale in-progress) is reset first. */
function selfHealBeforeStart(io: Server, gameCode: string, game: GameState): void {
  logger.info('SOCKET', `Game ${gameCode} in state ${game.gameState}, auto-resetting before start`);
  clearGameTimer(gameCode);
  gameStartCoordinator.cleanupSequence(gameCode);
  stopAllBots(gameCode);
  if (!resetGameForNewRound(gameCode)) {
    // Last-resort self-heal: bypass the state machine (timer + bots already stopped).
    logger.warn('SOCKET', `resetGameForNewRound failed for ${gameCode}, forcing state to waiting`);
    game.gameState = 'waiting';
  }
  // Clients clear stale round state (e.g. word-hunt life 0 → game-over overlay)
  // before the next round's start arrives.
  broadcastToRoom(io, getGameRoom(gameCode), 'resetGame', {
    users: getGameUsers(gameCode),
    gameSessionId: game.gameSessionId,
  });
  logger.info('SOCKET', `Game ${gameCode} auto-reset successful, state now: ${game.gameState}`);
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

    // The game is starting (manually or via the lobby auto-start) — tear down
    // any in-flight lobby auto-start countdown so it can't fire again.
    clearAutoStartState(gameCode);

    // Rematch preservation: a rematch omits these fields and the reset below
    // wipes game.minWordLength — keep the host's prior choices as fallbacks.
    const priorTimerSeconds = game.timerSeconds;
    const effectiveDifficulty = difficulty ?? game.difficulty ?? DEFAULT_DIFFICULTY;
    const effectiveMinWordLength = minWordLength ?? game.minWordLength ?? 2;

    if (gamesStarting.has(gameCode)) {
      logger.debug('SOCKET', `Rejected duplicate startGame for ${gameCode} (mutex held)`);
      emitError(socket, ErrorCodes.GAME_ALREADY_STARTED, { message: 'Game is already starting' });
      return;
    }
    gamesStarting.add(gameCode);
    logger.info('SOCKET', `Starting game ${gameCode} - current state: ${game.gameState}`);

    if (!canTransitionGameState(gameCode, 'START')) selfHealBeforeStart(io, gameCode, game);

    // Random roll from the auto-rotated pool, or the host's explicit pick.
    let resolvedMode: GameMode = !gameMode || gameMode === 'random'
      ? selectNextGameMode(game.modeHistory || [], ALL_GAME_MODES)
      : gameMode as GameMode;
    const rules = getGameModeRules(resolvedMode);

    // Host timer clamped to 30..600s (mode default when none given). Event-driven
    // modes run on a fixed backstop sized to their natural length instead.
    const rawTimer = parseInt(String(timerSeconds), 10);
    const validTimer = rules.fixedTimerSec
      ?? Math.max(30, Math.min(600, rawTimer || priorTimerSeconds || rules.defaultTimerSec));

    // Beta modes: enforced server-side even if a client crafts the emit.
    const refusal = await checkInWorkModeAccess(socket, game, resolvedMode, language || game.language || 'en');
    if (refusal) {
      gamesStarting.delete(gameCode);
      logger.debug('SOCKET', `Rejected in-work mode ${resolvedMode} for ${gameCode}: host lacks access or wrong language`);
      emitError(socket, ErrorCodes.AUTH_FORBIDDEN, { message: refusal });
      return;
    }

    // CRITICAL: Transition state FIRST to guard against concurrent startGame calls.
    const transitionResult = transitionGameState(gameCode, 'START');
    if (!transitionResult.success) {
      gamesStarting.delete(gameCode);
      logger.warn('SOCKET', `Rejected concurrent startGame for ${gameCode}: ${transitionResult.error}`);
      emitError(socket, ErrorCodes.INTERNAL_ERROR, { message: 'Failed to start game' });
      return;
    }

    // ---- Live Vocab Quiz ----
    // DO NOT MOVE THIS BLOCK: it must stay AFTER the START transition (so
    // concurrent starts still lose) and BEFORE board dealing, bot seeding and
    // startGameTimer — any of which would run a board game underneath the quiz
    // and fire its own endGame mid-round. Returns false for every non-quiz room.
    try {
      if (await startVocabQuizForClassroom(io, gameCode)) {
        gamesStarting.delete(gameCode);
        logger.info('SOCKET', `Game ${gameCode} started as a live vocab quiz`);
        return;
      }
    } catch (err) {
      // Never strand the room on a quiz-start failure — fall through to the board game.
      logger.error('SOCKET', `Vocab quiz start failed for ${gameCode}, falling back to board game: ${(err as Error).message}`);
    }

    applyStartBoostToken(socket, game, gameCode, validatedData.boostToken);

    // Hold the mutex through the whole async setup chain (audit SRV-H4): a
    // duplicate arriving mid-setup would otherwise self-heal-reset this round.
    try {
      broadcastToRoom(io, getGameRoom(gameCode), 'gameStarting', { gameMode: resolvedMode });

      const gameLang = language || game.language || 'en';
      try {
        await ensureLanguageLoaded(gameLang);
      } catch (error) {
        logger.error('DICT', `Failed to load language ${gameLang} for game ${gameCode}: ${error}`);
        try {
          await ensureLanguageLoaded(gameLang);
        } catch (retryError) {
          logger.error('DICT', `Dictionary load failed on retry for ${gameLang} in game ${gameCode}: ${retryError}`);
        }
      }

      // Classroom game? Reads the record AND marks the code live for this round.
      const classroomGame = await beginClassroomRound(gameCode);
      // Normalized per language so the live lesson-word match can actually hit.
      const lessonVocabulary = classroomGame?.vocabularyWords
        ? buildLessonVocabulary(classroomGame.vocabularyWords, gameLang)
        : undefined;
      const vocabToEmbed = classroomGame?.vocabularyWords?.map((w) => w.toUpperCase()) ?? [];

      // SECURITY: the server deals the board for every competitive (2+) game —
      // a client grid would let the host rig it. Solo keeps the client grid,
      // except a classroom game, whose board must carry the teacher's words.
      const dim = rules.gridSize ?? DIFFICULTIES[effectiveDifficulty];
      const playerCount = Object.keys(game.users).length;
      if (playerCount >= 2 || vocabToEmbed.length > 0 || !letterGrid || letterGrid.length === 0) {
        letterGrid = dealBoard(dim.rows, dim.cols, gameLang, vocabToEmbed);
      }

      const roundSettings: Partial<GameState> = {
        letterGrid,
        timerSeconds: validTimer,
        remainingTime: validTimer,
        gameDuration: validTimer,
        language: gameLang,
        minWordLength: effectiveMinWordLength,
        difficulty: effectiveDifficulty,
        gameStartedAt: Date.now(),
        boardTheme: boardTheme || null,
        lessonVocabulary,
        gameMode: resolvedMode,
        modeHistory: [...(game.modeHistory || []), resolvedMode],
        tvMode: tvMode ?? false,
      };
      Object.assign(game, roundSettings);
      updateGame(gameCode, roundSettings);
      installBoard(gameCode, game, letterGrid);
      ensureGame(gameCode);
      initializePlayerData(gameCode);

      const goldenLetters = pickGoldenLetters(letterGrid);
      game.goldenLetters = goldenLetters;
      updateGame(gameCode, { goldenLetters });

      // Solo host → auto-fill bots (never for human-only invite modes: bots
      // have no move logic there). Bots make it competitive, so the client's
      // grid is dropped and a fresh 6x6 dealt (audit SRV-CRIT-4).
      const autoAddResult = rules.humanOnly ? { botsAdded: 0 } : await autoAddBotsForSoloPlayer(gameCode, game);
      if (autoAddResult.botsAdded > 0) {
        letterGrid = dealBoard(6, 6, gameLang, vocabToEmbed);
        installBoard(gameCode, game, letterGrid);
        initializePlayerData(gameCode);
        broadcastToRoom(io, getGameRoom(gameCode), 'updateUsers', { users: getGameUsers(gameCode) });
        logger.info('BOT', `Auto-added ${autoAddResult.botsAdded} bots for solo player in ${gameCode} (grid regenerated)`);
      }

      const users = getGameUsers(gameCode);
      // A projector/classroom host watches, they do not play.
      const hostWatches = !!tvMode || !!classroomGame;
      const playerUsernames = users.filter((u) => !(hostWatches && u.isHost)).map((u) => u.username);
      const humanUsernames = users.filter((u) => !u.isBot).map((u) => u.username);

      // ---- The mode sets up its round (may rebuild the board or downgrade) ----
      const roundResult = await getGameModeModule(resolvedMode).initRound?.({
        io, gameCode, game, language: gameLang, letterGrid,
        gridRows: dim.rows, gridCols: dim.cols,
        playerUsernames, humanUsernames, vocabToEmbed, classroomGame,
      }) || {};
      if (roundResult.letterGrid && roundResult.letterGrid !== letterGrid) {
        letterGrid = roundResult.letterGrid;
        installBoard(gameCode, game, letterGrid);
      }
      if (roundResult.downgradeTo) {
        resolvedMode = roundResult.downgradeTo;
        game.gameMode = resolvedMode;
        updateGame(gameCode, { gameMode: resolvedMode });
      }
      if (roundResult.totalBoardWords !== undefined) game.totalBoardWords = roundResult.totalBoardWords;

      // Lesson words the FINAL board carries — only now is the grid the one the class sees.
      if (classroomGame && vocabToEmbed.length > 0) {
        recordClassroomWordBank(io, gameCode, game, letterGrid, gameLang, vocabToEmbed);
      }

      const messageId = gameStartCoordinator.initializeSequence(gameCode, humanUsernames, timerSeconds);
      // Classroom fields ride every start-shaped payload of this round (retries too).
      const extras = buildClassroomStartExtras(gameCode, classroomGame, humanUsernames);
      broadcastToRoom(io, getGameRoom(gameCode), 'startGame',
        buildRoundPayload(gameCode, game, { kind: 'start', messageId, extras }));
      getGameModeModule(resolvedMode).afterStart?.(io, gameCode, game);

      if (roundResult.totalBoardWords !== undefined) {
        broadcastToRoom(io, getGameRoom(gameCode), 'totalBoardWords', { count: roundResult.totalBoardWords });
      } else {
        void emitTotalBoardWords(io, gameCode, letterGrid, gameLang, effectiveMinWordLength);
      }
      scheduleSpecialWords(gameCode, letterGrid, gameLang);

      // Round events + recurring rush tiles (modes that opt in, 2+ players).
      if (getGameModeRules(resolvedMode).roundEvents && playerUsernames.length >= 2) {
        scheduleRoundEvent(io, gameCode, game, validTimer);
        startRushTiles(io, gameCode);
      }

      // Re-send the start to players who don't acknowledge quickly.
      gameStartCoordinator.scheduleRetries(gameCode, humanUsernames, (username: string) => {
        const targetSocket = getSocketById(io, getSocketIdByUsername(gameCode, username) ?? '');
        if (!targetSocket) return false;
        return safeEmit(targetSocket, 'startGame', buildRoundPayload(gameCode, game, { kind: 'retry', username, messageId, extras }));
      });

      // Bot-only rooms have no human countdown to wait for — start immediately.
      // Otherwise wait for every human's `countdownComplete` (8s fallback).
      if (humanUsernames.length === 0) {
        startGameTimer(io, gameCode, validTimer);
      } else {
        gameStartCoordinator.setCountdownCompleteTimeout(gameCode, 8000, (stats) => {
          startGameTimer(io, gameCode, validTimer);
          // "Host starts while others still loading": force-sync each player who
          // never reported into the NOW-RUNNING round — the same payload as a
          // reconnect (silent resume, no 3-2-1 replay; see usePlayerGameEvents).
          for (const missingUser of stats.missing) {
            const missingSock = getSocketById(io, getSocketIdByUsername(gameCode, missingUser) ?? '');
            if (!missingSock) continue;
            safeEmit(missingSock, 'startGame', buildRoundPayload(gameCode, game, { kind: 'reconnect', username: missingUser, messageId, extras }));
          }
        });
        // Server-side launch guarantee: never depend on a client signal to start the clock.
        scheduleGameStartSafetyNet(io, gameCode, resolveGameStartSafetyNetDelayMs(humanUsernames.length));
      }

      logger.info('SOCKET', `Game ${gameCode} starting with ${playerUsernames.length} players`);
      notifyGameStarted({
        gameCode,
        roomName: game.roomName,
        language: language || game.language,
        playerCount: playerUsernames.length,
        timerSeconds: validTimer,
        isRanked: game.isRanked || false,
      }).catch((err: Error) => {
        logger.error('SOCKET', `Failed to notify game started for ${gameCode}: ${err.message}`);
      });
    } finally {
      // Mutex released only after all setup completes (or throws). See SRV-H4 above.
      gamesStarting.delete(gameCode);
    }
  });
}

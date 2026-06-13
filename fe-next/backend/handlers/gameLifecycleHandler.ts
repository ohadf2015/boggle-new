/**
 * Game Lifecycle Handler
 * Handles game lifecycle events: create, end, reset, ready state
 */

import type { Server, Socket } from 'socket.io';
import type { Language, Avatar } from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';

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
  unmarkPlayerReady,
  getPlayersReadyCount,
  removeUserFromGame,
  updateUsernameMapping,
  getLeaderboard
} from '../modules/gameStateManager.js';

import {
  broadcastToRoom,
  broadcastActiveRooms,
  getGameRoom,
  joinRoom,
  leaveRoom,
  safeEmit,
  getSocketById,
  disconnectSocket,
  LOBBY_ROOM
} from '../utils/socketHelpers.js';

import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import {
  shouldTriggerAutoStart,
  startAutoStartCountdown,
  cancelAutoStartCountdown,
  clearAutoStartState,
} from '../modules/lobbyAutoStart.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { checkSocketRateLimit } from '../middleware/rateLimiterRedis.js';
import gameStartCoordinator from '../utils/gameStartCoordinator.js';
import { clearGameTimer, hasGameTimer } from '../utils/timerManager.js';
import * as Sentry from '@sentry/nextjs';
import { saveGameState } from '../redisClient.js';
import { inc, ensureGame } from '../utils/metrics.js';
import { generateRandomAvatar } from '../utils/gameUtils.js';
import { getRandomLongWordsWithTheme, ensureLanguageLoaded } from '../dictionary.js';
import logger from '../utils/logger.js';
import { startGameTimer, endGame } from './shared.js';
import { validatePayload, createGameSchema, getWordsForBoardSchema } from '../utils/socketValidation.js';
import { stopAllBots } from '../modules/botManager.js';
import { notifyRoomCreated } from '../modules/notificationService.js';
import { isInProgress } from '../utils/gameStateMachine.js';
import { registerStartGameHandler } from './gameStartHandler.js';
import { renamePlayerInGame } from '../modules/playerRename.js';

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
  isPrivate?: boolean;
  isClassroom?: boolean;
}

interface StartGameAckPayload {
  messageId: string;
}

interface CountdownCompletePayload {
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

// Guards against TOCTOU race in createGame: tracks game codes whose creation
// is in-flight (between gameExists check and createGame call across async yields).
const gamesBeingCreated = new Set<string>();

/**
 * Begin the server-owned lobby auto-start countdown for a game. Ticks are
 * broadcast to the whole room (one synced clock for host + guests); at zero the
 * host socket is told to fire its normal `startGame` path. Re-resolves the host
 * socket at fire time so a host reconnect mid-countdown still receives it.
 */
function beginLobbyAutoStart(io: Server, gameCode: string): void {
  startAutoStartCountdown(gameCode, {
    onTick: (secondsLeft) =>
      broadcastToRoom(io, getGameRoom(gameCode), 'lobbyAutoStartTick', { secondsLeft }),
    onFire: () => {
      const game = getGame(gameCode);
      if (!game || game.gameState !== 'waiting' || !game.hostSocketId) return;
      io.to(game.hostSocketId).emit('lobbyAutoStartFire', {});
    },
  });
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

      // Per-action rate limit for room creation
      const rl = await checkSocketRateLimit(socket.id, 'roomCreate');
      if (!rl.allowed) {
        logger.warn('RATE_LIMIT', 'Rate limited', { socketId: socket.id, action: 'roomCreate' });
        socket.emit('rate-limited', { action: 'roomCreate', retryAfterMs: rl.retryAfterMs });
        return;
      }

      const validation = validatePayload(createGameSchema, data);
      if (!validation.success) {
        logger.warn('SOCKET', `Create game validation failed: ${validation.error}`, { data });
        emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, { message: `Invalid request: ${validation.error}` });
        return;
      }

      const { gameCode, roomName, language, hostUsername, playerId, avatar, authUserId, guestTokenHash, guestSessionId, isRanked, isPrivate, isClassroom } = validation.data as CreateGamePayload;

      // Ranked rooms must be hosted by an authenticated user — guests can't
      // submit results that update the ranked MMR leaderboard, so allowing
      // them to flag their room as ranked would silently waste matchmaking
      // intent and pollute lobby filters (audit SRV-CRIT-2).
      if (isRanked && !authUserId) {
        logger.warn('SOCKET', `Rejected ranked room ${gameCode}: host not authenticated`);
        emitError(socket, ErrorCodes.AUTH_FORBIDDEN, {
          message: 'Ranked rooms require a signed-in host',
        });
        return;
      }

      logger.info('SOCKET', `Create game request: ${gameCode} by ${hostUsername}${isRanked ? ' (RANKED)' : ''}`, {
        socketId: socket.id,
        hasAvatar: !!avatar,
        hasAuth: !!authUserId
      });

      const sanitizedPlayerId = playerId || undefined;

      if (gameExists(gameCode) || gamesBeingCreated.has(gameCode)) {
        // Expected dedup: client double-tapped Create or stale request retry.
        // Server rejects via emitError; no need to ship to Sentry.
        logger.info('SOCKET', `Game code already exists or in-flight: ${gameCode}`);
        emitError(socket, ErrorCodes.GAME_ALREADY_EXISTS);
        return;
      }

      // Lock the game code during async work to prevent TOCTOU races
      gamesBeingCreated.add(gameCode);
      try {

      if (authUserId) {
        await handleExistingAuthConnection(io, socket, authUserId, gameCode);
      }

      // Re-check after async yield — another socket may have created it
      if (gameExists(gameCode)) {
        // Expected TOCTOU race; rejecting cleanly. Info-only.
        logger.info('SOCKET', `Game code created by another socket during async: ${gameCode}`);
        emitError(socket, ErrorCodes.GAME_ALREADY_EXISTS);
        return;
      }

      const game = createGame(gameCode, {
        hostSocketId: socket.id,
        hostUsername: hostUsername || 'Host',
        hostPlayerId: sanitizedPlayerId,
        roomName: roomName || gameCode,
        language: language || 'en',
        isRanked: isRanked || false,
        isPrivate: isPrivate || false,
        isClassroom: isClassroom || false,
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
        avatar: hostAvatar,
        isHost: true,
        playerId: sanitizedPlayerId,
        authUserId: authUserId || null,
        guestTokenHash: guestTokenHash || null,
        guestSessionId: guestSessionId || null
      });

      joinRoom(socket, getGameRoom(gameCode));
      leaveRoom(socket, LOBBY_ROOM); // Stop receiving lobby broadcasts while in-game

      socket.emit('joined', {
        success: true,
        gameCode,
        isHost: true,
        username: hostUsername || 'Host',
        roomName: roomName || gameCode,
        language: language || 'en',
        isPrivate: isPrivate || false,
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
      }).catch((err: Error) => {
        logger.error('SOCKET', `Failed to notify room created for ${gameCode}: ${err.message}`);
      });

      } finally {
        gamesBeingCreated.delete(gameCode);
      }
    } catch (error: unknown) {
      gamesBeingCreated.delete((data as CreateGamePayload)?.gameCode);
      const err = error as Error;
      logger.error('SOCKET', `Unhandled error in createGame handler: ${err.message}`, {
        stack: err.stack,
        socketId: socket.id,
        data
      });
      emitError(socket, ErrorCodes.INTERNAL_ERROR, { message: 'Failed to create game. Please try again.' });
    }
  });

  // Handle request for words to embed in board
  socket.on('getWordsForBoard', (data: GetWordsForBoardPayload) => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return;
    }

    const validation = validatePayload(getWordsForBoardSchema, data);
    if (!validation.success) {
      logger.warn('SOCKET', `getWordsForBoard validation failed: ${validation.error}`, { data });
      emitError(socket, ErrorCodes.VALIDATION_INVALID_PAYLOAD, { message: `Invalid request: ${validation.error}` });
      return;
    }

    const { language, boardSize } = validation.data as GetWordsForBoardPayload;
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

  // Handle start game acknowledgment — confirms delivery only.
  // Timer start is now gated on `countdownComplete` (post-animation),
  // not on ack (post-receipt), so the round timer doesn't tick down
  // while players are still watching the 3-2-1-GO countdown.
  socket.on('startGameAck', (data: StartGameAckPayload) => {
    const { messageId } = data;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    gameStartCoordinator.recordAcknowledgment(gameCode, username, messageId);
  });

  // Handle countdown completion — fires after client's pre-game animation
  // finishes. When all expected players report, start the authoritative timer.
  socket.on('countdownComplete', (data: CountdownCompletePayload) => {
    const { messageId } = data;
    const gameCode = getGameBySocketId(socket.id);
    const username = getUsernameBySocketId(socket.id);

    if (!gameCode || !username) return;

    const result = gameStartCoordinator.recordCountdownComplete(gameCode, username, messageId);

    if (result.valid && result.allReady) {
      const game = getGame(gameCode);
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

    endGame(io, gameCode);
  });

  // Blast dead-end: client detected no valid moves remain, Sugar Crush played — end game now.
  // Multiple players may emit this concurrently; endGame is idempotent.
  socket.on('blastDeadEnd', () => {
    if (!checkRateLimit(socket.id)) { socket.emit('rateLimited'); return; }
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;
    const game = getGame(gameCode);
    if (!game || game.gameMode !== 'blast') return;
    endGame(io, gameCode);
  });

  // Debug: Get current game state (development only)
  socket.on('debugGameState', () => {
    if (process.env.NODE_ENV === 'production') return;
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    const game = gameCode ? getGame(gameCode) : null;
    const isHost = game?.hostSocketId === socket.id;
    const isDev = process.env.NODE_ENV === 'development';
    socket.emit('debugGameStateResponse', {
      gameCode,
      gameState: game?.gameState || 'NO_GAME',
      // Only expose hostSocketId to the host or in dev mode
      ...(isHost || isDev ? { hostSocketId: game?.hostSocketId } : {}),
      mySocketId: socket.id,
      playerCount: game ? Object.keys(game.users || {}).length : 0,
      timestamp: Date.now()
    });
    logger.debug('SOCKET', `Game state query for ${gameCode}: ${game?.gameState || 'NO_GAME'}`);
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

      // Orphan-timer recovery: state says in-progress but no setInterval is
      // registered. Caused by a crash/race between `transitionGameState('START')`
      // and `startGameTimer()`. Without this branch the client watchdog loops
      // forever — server re-emits startGame with the same stale remainingTime
      // and never restarts the clock. Defense-in-depth: idempotent, safe to
      // call when timer is already running (`startGameTimer` clears first).
      if (!hasGameTimer(gameCode)) {
        const recoverySeconds = game.remainingTime ?? game.timerSeconds;
        if (recoverySeconds && recoverySeconds > 0) {
          logger.info('SOCKET', `Orphan timer recovery: restarting interval for ${gameCode} at ${recoverySeconds}s`);
          Sentry.addBreadcrumb({
            category: 'mp.timer',
            message: 'mp_server_timer_orphan_recovered',
            level: 'info',
            data: {
              gameCode,
              gameState: game.gameState,
              remainingTime: game.remainingTime,
              timerSeconds: game.timerSeconds,
              gameSessionId: game.gameSessionId,
            },
          });
          startGameTimer(io, gameCode, recoverySeconds);
        }
      }


      safeEmit(socket, 'startGame', {
        letterGrid: game.letterGrid,
        timerSeconds: game.remainingTime ?? game.timerSeconds,
        language: game.language,
        minWordLength: game.minWordLength || 2,
        messageId: 'recovery-' + Date.now(),
        reconnect: true,
        skipAck: true,
        boardTheme: game.boardTheme || null,
        gameMode: recoveryGameMode,
        gameSessionId: game.gameSessionId,
        ...(recoveryGameMode === 'blast' && game.blastModeState ? {
          blastTileOverlay: game.blastModeState.overlay || [],
          blastSeed: game.blastModeState.seed ?? null,
          blastWave: game.blastModeState.wave ?? 1,
          blastPlayerMoves: game.blastModeState.playerMoves || {},
          ...(game.blastModeState.grid ? { blastGrid: game.blastModeState.grid } : {}),
          ...(game.blastModeState.tileStates ? { blastTileStates: game.blastModeState.tileStates } : {}),
        } : {}),
        ...(recoveryGameMode === 'word-hunt' && game.wordHuntState ? {
          wordHuntTargetLength: game.wordHuntState.targetWordLength ?? 0,
          wordHuntTargetCategory: game.wordHuntState.targetCategory ?? null,
          wordHuntEliminatedPlayers: game.wordHuntState.eliminatedPlayers || [],
          wordHuntPlayerLives: game.wordHuntState.playerLives || {},
        } : {}),
        ...(game.goldenLetters?.length ? { goldenLetters: game.goldenLetters } : {}),
        // Carry the leaderboard in-payload so the score restores atomically with
        // the board (see updateLeaderboard belt below for the ordering rationale).
        leaderboard: getLeaderboard(gameCode),
      });

      // Restore the player's live score. The board/timer ride on `startGame`,
      // but the score lives ONLY in the client `leaderboard[]` (fed by
      // `updateLeaderboard`). Without this emit, a player who recovers via this
      // watchdog path — rather than the primary `join` reconnect, which already
      // re-sends the leaderboard — sees "0 PUNTOS" until their next word. Mirror
      // playerReconnectHandler so both reconnect paths restore score identically.
      safeEmit(socket, 'updateLeaderboard', { leaderboard: getLeaderboard(gameCode) });
    } else if (game.gameState === 'finished') {
      // Reconnecting to a finished game — resend results so the player sees the results screen
      logger.info('SOCKET', `Resending results to reconnecting player in finished game ${gameCode}`);
      const leaderboard = getLeaderboard(gameCode);
      safeEmit(socket, 'validatedScores', {
        leaderboard,
        gameMode: game.gameMode || 'classic',
        reconnect: true,
      });
    }
  });

  // Handle reset game
  socket.on('resetGame', (data: unknown, callback?: ResetGameCallback) => {
    try {
      if (!checkRateLimit(socket.id)) {
        socket.emit('rateLimited');
        if (typeof callback === 'function') callback({ success: false, error: 'Rate limited' });
        return;
      }

      // Only use server-side socket mapping — never trust client-supplied gameCode
      const gameCode = getGameBySocketId(socket.id);
      if (!gameCode) {
        emitError(socket, ErrorCodes.PLAYER_NOT_IN_GAME);
        if (typeof callback === 'function') callback({ success: false, error: 'Not in game' });
        return;
      }

      const game = getGame(gameCode);
      if (!game) {
        emitError(socket, ErrorCodes.GAME_NOT_FOUND);
        if (typeof callback === 'function') callback({ success: false, error: 'Game not found' });
        return;
      }

      // Verify host identity: primary check via hostSocketId; secondary check via auth ID
      // for the legitimate case where a host reconnected and hostSocketId was restored but
      // the in-memory pointer hasn't been updated yet.
      const isHostBySocketId = game.hostSocketId === socket.id;
      const verifiedUserId = socket.data?.verifiedUserId as string | undefined;
      const hostUser = Object.values(game.users).find((u) => u.isHost);
      const isHostByAuthId =
        !!verifiedUserId &&
        !!hostUser?.authUserId &&
        hostUser.authUserId === verifiedUserId;
      if (!isHostBySocketId && !isHostByAuthId) {
        emitError(socket, ErrorCodes.PLAYER_NOT_HOST, { message: 'Only host can reset the game' });
        if (typeof callback === 'function') callback({ success: false, error: 'Only host can reset' });
        return;
      }

      const stateBeforeReset = game.gameState;
      clearGameTimer(gameCode);
      gameStartCoordinator.cleanupSequence(gameCode);
      clearAutoStartState(gameCode);
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
    } catch (err) {
      logger.error('SOCKET', `resetGame error: ${(err as Error).message}`);
      if (typeof callback === 'function') callback({ success: false, error: 'Reset failed unexpectedly' });
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

    // Auto-advance: when ALL non-host players are ready, notify the host
    if (result.readyCount >= result.totalPlayers && result.totalPlayers > 0) {
      logger.info('SOCKET', `All non-host players ready in ${gameCode} — notifying host to auto-advance`);
      broadcastToRoom(io, getGameRoom(gameCode), 'allPlayersReady', {
        readyCount: result.readyCount,
        totalPlayers: result.totalPlayers,
      });
    }
  });

  // Handle client requesting results after reconnection
  // If the client missed 'validatedScores'/'validationComplete' due to a brief disconnect,
  // this lets them retrieve the cached payload.
  socket.on('requestResults', () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    if (game.gameState === 'finished') {
      const cached = game.cachedResultsPayload;
      if (cached) {
        logger.info('SOCKET', `Re-sending cached results to reconnected client in ${gameCode}`);
        safeEmit(socket, 'validatedScores', cached);
        safeEmit(socket, 'validationComplete', cached);
      }
      return;
    }

    // The client only asks for results once it believes the game ended (its
    // 15s "waiting for results" watchdog fired). If the game is still
    // in-progress but its server clock has genuinely run out, the end-trigger
    // was lost (dropped in-memory timer / transition race). Force-finalize so
    // the player isn't stuck on an empty "Calculating results" screen forever.
    // Only 'in-progress' games are eligible: a 'waiting' (between-rounds lobby)
    // game keeps a stale gameStartedAt from the prior round and must never be
    // force-ended by a reconnecting client. Clock-expiry guard prevents ending
    // a genuinely live game early.
    if (game.gameState !== 'in-progress') return;
    const durationSec = game.gameDuration || game.timerSeconds || 180;
    const startedAt = game.gameStartedAt;
    const clockExpired = !!startedAt && Date.now() - startedAt >= durationSec * 1000;
    // A Redis-rehydrated game can lose gameStartedAt (persisted as `?? ''`,
    // restored as `undefined`). With a falsy startedAt the clock-expiry check
    // above can never recover it — yet if the game ALSO has no in-memory timer
    // the round is genuinely orphaned (nothing will ever end it). The client
    // only asks after its 15s end-watchdog fired, so force-finalize rather than
    // leave it stuck on "Calculating results" forever. Requiring !hasGameTimer
    // ensures a live game (timer ticking, merely missing a stamp) is never
    // ended early.
    const orphanedNoTimer = !startedAt && !hasGameTimer(gameCode);
    if (clockExpired || orphanedNoTimer) {
      logger.warn('SOCKET', `requestResults on ${clockExpired ? 'overdue' : 'orphaned (no start stamp + no timer)'} in-progress game ${gameCode} — forcing endGame`);
      endGame(io, gameCode);
    }
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
      unmarkPlayerReady(gameCode, username);
    }

    const result = getPlayersReadyCount(gameCode);
    if (result) {
      broadcastToRoom(io, getGameRoom(gameCode), 'playersReadyUpdate', {
        readyCount: result.readyCount,
        totalPlayers: result.totalPlayers,
        readyUsernames: result.readyUsernames,
      });

      // Everyone (non-host humans) is ready in the *waiting* lobby: nudge the
      // host AND begin a short server-owned countdown so a stalled host no
      // longer blocks the game. Any un-ready cancels it.
      if (data?.ready && shouldTriggerAutoStart(result.readyCount, result.totalPlayers)) {
        broadcastToRoom(io, getGameRoom(gameCode), 'allPlayersReady', {
          readyCount: result.readyCount,
          totalPlayers: result.totalPlayers,
        });
        beginLobbyAutoStart(io, gameCode);
      } else if (!data?.ready) {
        cancelAutoStartCountdown(gameCode, () =>
          broadcastToRoom(io, getGameRoom(gameCode), 'lobbyAutoStartCancelled', {})
        );
      }
    }
  });

  // Host cancelled the auto-start countdown (wants to keep waiting / tweak settings).
  socket.on('lobbyAutoStartCancel', () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;
    const game = getGame(gameCode);
    // Only the host may cancel the lobby auto-start.
    if (!game || game.hostSocketId !== socket.id) return;
    cancelAutoStartCountdown(gameCode, () =>
      broadcastToRoom(io, getGameRoom(gameCode), 'lobbyAutoStartCancelled', {})
    );
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
    if (!user) return;

    if (trimmedName !== username && game.users[trimmedName]) {
      socket.emit('error', { error: 'NAME_TAKEN', message: 'That name is already in use' });
      return;
    }

    if (trimmedName !== username) {
      // Re-key every username-keyed structure (users record, host identity,
      // ready state, lobby chat, …) atomically — hosts included. Pre-fix this
      // path rejected hosts (`user.isHost` guard) and migrated only a couple of
      // maps, so a host's rename never broadcast and only applied on the next
      // reconnect ("name not changed on the spot, takes multiple tries").
      renamePlayerInGame(game, username, trimmedName);
      updateUsernameMapping(gameCode, username, trimmedName, socket.id);
    }

    socket.emit('guestNameUpdated', { oldName: username, newName: trimmedName });

    broadcastToRoom(io, getGameRoom(gameCode), 'playerListUpdate', {
      users: getGameUsers(gameCode),
    });

    logger.info('SOCKET', `Guest ${username} changed name to ${trimmedName} in ${gameCode}`);
  });

  // Relay resultsRevealed from TV host to all players in room
  socket.on('resultsRevealed', () => {
    if (!checkRateLimit(socket.id)) return;
    const gameCode = getGameBySocketId(socket.id);
    if (!gameCode) return;

    const game = getGame(gameCode);
    if (!game) return;

    // Only the host (TV) can trigger reveal
    if (game.hostSocketId !== socket.id) return;

    broadcastToRoom(io, getGameRoom(gameCode), 'resultsRevealed', {});
    logger.info('SOCKET', `TV host revealed results in ${gameCode}`);
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
        message: 'Host started a new game. Room is closing.',
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
// Re-export from playerDataInit (extracted to break circular dep with gameStartHandler)
export { initializePlayerData, ensurePlayerState } from './playerDataInit.js';

export {
  registerGameLifecycleHandlers,
  handleExistingAuthConnection,
};

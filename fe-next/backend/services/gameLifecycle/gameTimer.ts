/**
 * Game Timer Service
 *
 * Manages game timer with timestamp-based timing to prevent drift.
 * Fixes the 7-10 second timer drift issue in multiplayer games.
 */

import type { Server } from 'socket.io';
import { getGame, updateGame } from '../../modules/gameStateManager';
import { resetGameAIValidationCount } from '../../modules/communityWordManager';
import { broadcastToRoom, getGameRoom } from '../../utils/socketHelpers';
import { clearGameTimer, setGameTimer, hasGameTimer } from '../../utils/timerManager';
import { drainLife, areAllPlayersEliminated } from '../../modules/wordHuntManager';
import { isInProgress } from '../../utils/gameStateMachine';
import { startBotsForGame, restoreBotsForGame } from './botGame';
import { endGame } from './gameEnd';
import logger from '../../utils/logger';

/**
 * Consecutive ticks a word-hunt round may run with a NULL wordHuntState before
 * we force-end it to recover. >1 so a transient init race (state appears a tick
 * late) never trips the early-end; ~3s of confirmed-missing state means the
 * round is genuinely un-runnable (no drain / elimination / round-end will ever
 * fire) and players are better served by their accumulated scores than a freeze.
 */
const WORD_HUNT_NULL_STATE_RECOVERY_TICKS = 3;

/**
 * Start the game timer
 *
 * Uses timestamp-based timing to prevent drift:
 * - Stores startTimestamp and calculates endTimestamp
 * - Each interval calculates remaining time from actual elapsed time
 * - Prevents the 7-10 second drift issue in multiplayer games
 */
export function startGameTimer(
  io: Server,
  gameCode: string,
  timerSeconds: number
): void {
  const game = getGame(gameCode);
  if (!game) return;

  // Reset AI validation count for this game (hybrid cost-saving)
  resetGameAIValidationCount(gameCode);

  const intervalMs = parseInt(process.env.TIME_UPDATE_INTERVAL_MS || '1000', 10);

  // TIMESTAMP-BASED TIMING: Use actual elapsed time to prevent drift
  const startTimestamp = Date.now();
  const endTimestamp = startTimestamp + timerSeconds * 1000;

  // Store timing info in game state for late joiners
  // Note: Using any to allow dynamic properties that may not be in strict GameState type
   
  updateGame(gameCode, {
    timerSeconds: timerSeconds,
  });

  // Clear any existing timer
  clearGameTimer(gameCode);

  // Track last broadcast second to avoid duplicate broadcasts
  let lastBroadcastSecond = timerSeconds;

  // Consecutive ticks observed with gameMode='word-hunt' but wordHuntState NULL.
  // Reset to 0 on any healthy tick so a late init cancels the self-heal.
  let nullWordHuntTicks = 0;

  // Create interval for time updates
  const timerId = setInterval(() => {
    // Calculate remaining time based on actual elapsed time (prevents drift)
    const now = Date.now();
    const remainingMs = Math.max(0, endTimestamp - now);
    const remainingTime = Math.ceil(remainingMs / 1000);

    // Only update game state when the second actually changed (avoids no-op Redis persist debounces)
    const secondChanged = remainingTime !== lastBroadcastSecond;
    if (secondChanged) {
      updateGame(gameCode, { remainingTime });
    }

    // Broadcast every second for accurate client timer display
    // Previous "smart broadcasting" (every 10s) caused player timers to stutter
    if (secondChanged) {
      // Read gameSessionId fresh — `game` was captured at startGameTimer call
      // and `updateGame` mutates in place so the closure is currently safe, but
      // reading via getGame() defends against any future immutable-update
      // refactor that would silently start broadcasting stale session ids and
      // make clients filter all `timeUpdate`s as stale.
      const liveGame = getGame(gameCode);
      broadcastToRoom(io, getGameRoom(gameCode), 'timeUpdate', {
        remainingTime,
        gameSessionId: liveGame?.gameSessionId ?? game.gameSessionId,
      });
    }
    lastBroadcastSecond = remainingTime;

    // Word Hunt: drain life from all non-eliminated players each tick
    const currentGame = getGame(gameCode);
    if (currentGame?.gameMode === 'word-hunt' && !currentGame.wordHuntState) {
      // Canary: gameMode says word-hunt but the state object is missing, so the
      // drain branch below is skipped (life frozen). A silent gate like this hid a
      // real production freeze for a long time — never let it be invisible again.
      // (Not the restart-timer-drop case, where wordHuntState IS restored from
      // Redis; this guards the orthogonal "state never initialised" class, e.g. a
      // round-start path that forgets initWordHuntState.)
      //
      // Self-heal: with no state there is no drain, no elimination, and no
      // round-end — the board freezes forever. Word scores live on game.users
      // independently of wordHuntState, so after a few confirmed-NULL ticks we
      // force-end (idempotent endGame) and players keep their accumulated scores
      // instead of a stuck screen. Log once on first NULL + once on recovery
      // (not per-tick) so a frozen game can't spam Sentry every second.
      nullWordHuntTicks += 1;
      if (nullWordHuntTicks === 1) {
        logger.error('HUNT_DRAIN', `${gameCode}: gameMode='word-hunt' but wordHuntState is NULL — life-drain skipped (state never initialised); will self-heal if it persists`);
      }
      if (nullWordHuntTicks >= WORD_HUNT_NULL_STATE_RECOVERY_TICKS) {
        logger.error('HUNT_DRAIN', `${gameCode}: wordHuntState NULL for ${nullWordHuntTicks} consecutive ticks — force-ending round to recover (players keep accumulated word scores instead of a frozen board)`);
        clearGameTimer(gameCode);
        endGame(io, gameCode).catch(err => {
          logger.error('TIMER', `endGame failed (word-hunt null-state recovery) for ${gameCode}: ${(err as Error).message}`);
        });
        return;
      }
    }
    if (currentGame?.gameMode === 'word-hunt' && currentGame.wordHuntState) {
      nullWordHuntTicks = 0; // healthy tick — cancel any pending self-heal (late init)
      const huntState = currentGame.wordHuntState;
      const elapsedSeconds = Math.floor((now - startTimestamp) / 1000);
      const { updatedLives, newlyEliminated } = drainLife(huntState, elapsedSeconds);

      // Update game state with drained lives
      huntState.playerLives = updatedLives;

      // Push newly eliminated before broadcasting so the full list is included
      for (const username of newlyEliminated) {
        huntState.eliminatedPlayers.push(username);
        broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntEliminated', {
          username,
        });
      }

      // Skip broadcast if wordHandler already sent one within the last 500ms (prevents double updates)
      const recentlyBroadcast = huntState.lastLifeUpdateAt && (Date.now() - huntState.lastLifeUpdateAt < 500);
      if (secondChanged && !recentlyBroadcast) {
        broadcastToRoom(io, getGameRoom(gameCode), 'wordHuntLifeUpdate', {
          playerLives: updatedLives,
          eliminatedPlayers: huntState.eliminatedPlayers,
        });
      }

      // End game early if all players are eliminated
      if (areAllPlayersEliminated(huntState)) {
        clearGameTimer(gameCode);
        endGame(io, gameCode).catch(err => {
          logger.error('TIMER', `endGame failed (word-hunt elimination) for ${gameCode}: ${(err as Error).message}`);
        });
        return;
      }
    }

    if (remainingTime <= 0) {
      clearGameTimer(gameCode);
      endGame(io, gameCode).catch(err => {
        logger.error('TIMER', `endGame failed (timer expired) for ${gameCode}: ${(err as Error).message}`);
      });
    }
  }, intervalMs);

  setGameTimer(gameCode, timerId);

  // Start bots if any are in the game
  startBotsForGame(io, gameCode, game.letterGrid, game.language, timerSeconds);

  // NOTE: We do NOT broadcast 'startGame' here anymore.
  // The game start has already been broadcast from gameLifecycleHandler with all necessary data.
  // A second broadcast was causing issues with the second game in the same room getting stuck.
}

/**
 * Resume the per-second game timer for an in-progress game whose in-memory
 * interval was lost.
 *
 * The game clock (round countdown + word-hunt life drain) and bot loops are
 * plain in-memory `setInterval`s — a server restart / redeploy destroys them
 * while Redis still holds the game state. When such a game is rehydrated from
 * Redis (on player reconnect, `restoreGameFromRedis`), nothing restarts its
 * timer, so the round is frozen forever: word-hunt life never drains, the round
 * never ends, and (because `gameMode === 'word-hunt' && wordHuntState` is still
 * TRUE) no diagnostic fires. Players still see the board and can submit words
 * (event-driven), which is exactly the "stuck at full life for everyone" report.
 *
 * Guarded by `hasGameTimer` so a NORMAL live reconnect (timer still ticking)
 * never restarts/resets the running clock — this only fires for genuinely
 * orphaned, rehydrated games.
 *
 * @returns true if a timer was resumed, false on no-op.
 */
export function resumeGameTimerIfMissing(io: Server, gameCode: string): boolean {
  const game = getGame(gameCode);
  if (!game) return false;
  if (!isInProgress(game.gameState)) return false;
  if (hasGameTimer(gameCode)) return false;

  // Re-register bot AI instances lost on restart. The Bot objects are in-memory
  // only; their identity survived on game.users. Reconstruct them (preserving
  // username/id/avatar) BEFORE startGameTimer → startBotsForGame, which reads
  // botManager and would otherwise find an empty registry and skip every bot,
  // leaving them frozen at 0. No-op for any bot already registered.
  let restoredBots = 0;
  try {
    restoredBots = restoreBotsForGame(gameCode);
  } catch (err) {
    logger.error('TIMER', `bot restore failed for ${gameCode}: ${(err as Error).message}`);
  }

  const duration = game.gameDuration || game.timerSeconds || 180;
  logger.info(
    'TIMER',
    `Resuming timer for rehydrated in-progress game ${gameCode} (mode=${game.gameMode ?? 'classic'}, ${restoredBots} bots restored) — server-restart recovery`,
  );
  startGameTimer(io, gameCode, duration);
  return true;
}

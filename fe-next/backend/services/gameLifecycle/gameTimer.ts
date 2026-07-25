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
import timerManager, { clearGameTimer, setGameTimer, hasGameTimer } from '../../utils/timerManager';
import { drainLife, areAllPlayersEliminated } from '../../modules/wordHuntManager';
import { isInProgress } from '../../utils/gameStateMachine';
import { startBotsForGame, restoreBotsForGame } from './botGame';
import { endGame } from './gameEnd';
import { ensureLanguageLoaded } from '../../dictionary';
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
    // Phantom-tick guard: if the game was deleted (cleanup path, host-left,
    // abandonment sweep) while this interval was still registered, the tick
    // would otherwise keep firing against a dead game until the original
    // endTimestamp — broadcasting to an empty room and eventually calling
    // endGame on a non-existent game. Kill ourselves immediately; deleteGame
    // also clears this timer, this is the belt-and-braces half.
    if (!getGame(gameCode)) {
      clearGameTimer(gameCode);
      logger.warn('TIMER', `${gameCode}: tick fired for deleted game — interval self-cleared`);
      return;
    }

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
export async function resumeGameTimerIfMissing(io: Server, gameCode: string): Promise<boolean> {
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

  // Warm the dictionary trie BEFORE launching the timer/bots. On restart recovery
  // the in-memory dict is COLD (only the fresh-start path in gameStartHandler
  // loads it). The classic/word-hunt bot drivers (botManager.startBot) do NOT
  // self-load — only wheel-rush/blast do — so without this, a rehydrated
  // classic/word-hunt game runs cold: bot solvers find nothing (score 0) and
  // human word validation at endGame rejects valid words. Mirrors gameStartHandler.
  const gameLang = game.language || 'en';
  try {
    await ensureLanguageLoaded(gameLang);
  } catch (err) {
    logger.error('TIMER', `dictionary warm failed for ${gameLang} during resume of ${gameCode}: ${(err as Error).message}`);
  }

  const duration = game.gameDuration || game.timerSeconds || 180;
  logger.info(
    'TIMER',
    `Resuming timer for rehydrated in-progress game ${gameCode} (mode=${game.gameMode ?? 'classic'}, ${restoredBots} bots restored) — server-restart recovery`,
  );
  startGameTimer(io, gameCode, duration);
  return true;
}

/**
 * Safety-net recovery windows (ms). The server force-launches the round (timer +
 * bots) this long after start if the normal path stalled.
 *
 * Solo-human games (one human + bots — the common Blast quick-start) recover on a
 * tight window: there's no cross-client 3-2-1 animation to keep in sync, so when
 * that single human's `countdownComplete` never arrives (frozen/backgrounded tab)
 * AND the 8s coordinator fallback also fails to start the timer (its sequence is
 * torn down when the frozen tab disconnects), the round otherwise runs with no
 * clock and bots sit VISIBLY at 0 for the whole window. 5s is comfortably past
 * the ~3.3s GO animation (3×1000ms) + fade + render + network, so a HEALTHY solo
 * launch is never force-started a beat early.
 */
export const SAFETY_NET_DELAY_SOLO_MS = 5000;
/** Longer window for multi-human games, so a slow second client isn't force-started early. */
export const SAFETY_NET_DELAY_MULTI_HUMAN_MS = 10000;

/**
 * Pick the safety-net recovery window based on how many humans are in the game.
 * Solo / bot-only (≤1 human) → tight window; 2+ humans → longer window.
 */
export function resolveGameStartSafetyNetDelayMs(humanCount: number): number {
  return humanCount <= 1 ? SAFETY_NET_DELAY_SOLO_MS : SAFETY_NET_DELAY_MULTI_HUMAN_MS;
}

/**
 * Server-side safety net guaranteeing the round timer (and thus bot launch)
 * starts even when no client signal arrives.
 *
 * The authoritative timer is normally started when human clients report
 * `countdownComplete`, with an 8s coordinator fallback (see gameStartHandler).
 * But when the only human's tab is frozen/backgrounded from before the round
 * begins, no `countdownComplete` ever arrives AND the coordinator fallback can
 * miss — the round then runs with NO server timer and the bots never launch
 * (observed in prod: the FIRST MP game after a deploy, bots stuck at 0). Nothing
 * recovers it until a client happens to reconnect and trigger the
 * `requestGameState` orphan-recovery path (which is exactly what rescued the
 * 2nd/3rd games in the same room).
 *
 * This arms a short timeout that proactively runs that SAME idempotent recovery
 * server-side, so launch never depends on a client signal. Keyed per game so a
 * rematch in the same room re-arms (cancelling the prior one). No-op if the
 * timer already started by the time it fires — `resumeGameTimerIfMissing` guards
 * on `isInProgress` + `hasGameTimer`.
 *
 * @param delayMs how long after start to check (default 10s — just past the 8s
 *        coordinator fallback, so the normal path always gets first chance).
 */
export function scheduleGameStartSafetyNet(io: Server, gameCode: string, delayMs = 10000): void {
  timerManager.setTimeout(`gameStartSafety:${gameCode}`, async () => {
    const resumed = await resumeGameTimerIfMissing(io, gameCode);
    if (resumed) {
      // info (not warn) — this backstop firing is recovery working as designed,
      // not an error. warn routes to Sentry (logger.ts) and spammed it with
      // per-game noise; keep the operational signal in pino logs only.
      logger.info(
        'GAME_START',
        `Safety net started timer+bots for ${gameCode} ${delayMs}ms after start — client countdownComplete and the coordinator fallback both missed (stale/backgrounded host?). Bots would otherwise have scored 0 for the whole round.`,
      );
    }
  }, delayMs);
}

/**
 * The third door to "restore this player's results", made identical to the other two.
 *
 * `requestResults` (in `gameLifecycleHandler`) and `playerReconnectHandler` both
 * resend `game.cachedResultsPayload`. The `requestGameState` recovery path used
 * to hand-build its own `{ leaderboard, gameMode, reconnect }` instead — no
 * `scores`, no `gameSessionId`, no `classroomSummary`. Recurring pitfall class 3:
 * two routes to one outcome, one of them quietly thinner.
 *
 * The client cannot tell the stub apart from real results. `usePlayerGameEvents`
 * marks the session displayed, `ResultsPage` renders its empty "Calculating
 * results" state, and the dedup guard then swallows the genuine broadcast for
 * the rest of the round — while the server log read "Resending results to
 * reconnecting player in finished game" and looked like success (class 4). A
 * classroom student reached the results screen with no podium and no lesson
 * recap.
 *
 * A leaf on purpose: `socket.emit` and a log line, nothing else. It lives in its
 * own file rather than in `gameLifecycleHandler` because that handler is already
 * over the 500-line ceiling and may not grow.
 */

import type { Socket } from 'socket.io';

import { safeEmit } from '../utils/socketHelpers';
import logger from '../utils/logger';

/** The one field of the game record this rule reads. */
export interface FinishedGameResultsSource {
  cachedResultsPayload?: Record<string, unknown> | null;
}

/**
 * Resend a finished game's results to one reconnecting socket.
 *
 * Emits both `validatedScores` and `validationComplete` with the cached payload,
 * exactly as `requestResults` does, so neither door leaves the client in a
 * different state than the other.
 *
 * With no cached payload the round has not finished scoring yet. Say nothing:
 * the client's own 15s `requestResults` watchdog is the retry, and a stub would
 * poison it for the rest of the session. Logged as a warning rather than
 * returning in silence, so the case is visible if it ever becomes common.
 *
 * @returns true when a payload was sent.
 */
export function resendFinishedResults(
  socket: Socket,
  gameCode: string,
  game: FinishedGameResultsSource
): boolean {
  const cached = game.cachedResultsPayload;
  if (!cached) {
    logger.warn(
      'SOCKET',
      `Finished game ${gameCode} has no cached results to resend — leaving the client's requestResults watchdog to retry`
    );
    return false;
  }

  logger.info('SOCKET', `Resending results to reconnecting player in finished game ${gameCode}`);
  safeEmit(socket, 'validatedScores', cached);
  safeEmit(socket, 'validationComplete', cached);
  return true;
}

export default resendFinishedResults;

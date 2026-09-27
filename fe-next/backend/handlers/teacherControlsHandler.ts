/**
 * Teacher Live Controls Handler
 *
 * Mid-round controls for classroom rooms: pause / resume the clock, add time,
 * end the round early, and (word-hunt) swap a problematic target word.
 *
 * Authorization is deliberately strict and SILENT toward the caller: the socket
 * must be the game's host AND the room must be a classroom room. Anything else
 * is dropped with a logged warning — no error emit, so a curious student gets
 * nothing to probe. Authorized calls that cannot be applied (already paused,
 * target already found, …) get a small `teacherControlRejected` so the teacher
 * UI can say "couldn't do that" instead of silently doing nothing (pitfall 4).
 */

import type { Server, Socket } from 'socket.io';
import type { GameState } from '../modules/gameState/types.js';

import { getGame, getGameBySocketId } from '../modules/gameStateManager.js';
import { hasQuizSession } from '../modules/vocabQuizStore.js';
import { pauseGameTimer, resumeGameTimer, extendGameTimer } from '../services/gameLifecycle/gameTimer.js';
import { endGame } from '../services/gameLifecycle/gameEnd.js';
import { skipWordHuntTarget } from './wordHuntHandler.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import logger from '../utils/logger.js';

type TeacherAction = 'pauseGame' | 'resumeGame' | 'extendTime' | 'endRoundNow' | 'skipTargetWord';

/** Default "+time" when the client sends no / malformed seconds. */
const DEFAULT_EXTEND_SECONDS = 30;

interface ExtendTimePayload {
  seconds?: unknown;
}

/**
 * Resolve the classroom game this socket may control, or null (logged).
 *
 * Host identity: `hostSocketId` first; falls back to the verified auth id so a
 * teacher whose socket just reconnected (hostSocketId momentarily stale — same
 * case `resetGame` handles) is not locked out of their own room mid-pause.
 */
function resolveTeacherGame(socket: Socket, action: TeacherAction): { gameCode: string; game: GameState } | null {
  const gameCode = getGameBySocketId(socket.id);
  const game = gameCode ? getGame(gameCode) : null;
  if (!gameCode || !game) {
    logger.warn('TEACHER', `${action} ignored: socket not in a game`, { socketId: socket.id });
    return null;
  }

  // A live Vocab Quiz owns this room's clock and its end path. Nothing else
  // here would stop us: a quiz room is a real 'in-progress' classroom room
  // hosted by the teacher, so every check below passes — but there is no board
  // timer to pause, and running the board's endGame would take the
  // once-per-game `classroom_game_persisted:<code>` key with EMPTY board
  // results, silently discarding the quiz's own per-student word progress.
  // vocabQuizHandler listens on these same events and applies them to the quiz.
  if (hasQuizSession(gameCode)) {
    logger.debug('TEACHER', `${action} deferred to the live vocab quiz for ${gameCode}`, { socketId: socket.id });
    return null;
  }

  const verifiedUserId = socket.data?.verifiedUserId as string | undefined;
  const hostUser = Object.values(game.users || {}).find((u) => u.isHost);
  const isHost =
    game.hostSocketId === socket.id ||
    (!!verifiedUserId && !!hostUser?.authUserId && hostUser.authUserId === verifiedUserId);
  if (!isHost) {
    logger.warn('TEACHER', `${action} ignored: socket is not host of ${gameCode}`, { socketId: socket.id, gameCode });
    return null;
  }

  if (!game.isClassroom) {
    logger.warn('TEACHER', `${action} ignored: ${gameCode} is not a classroom room`, { socketId: socket.id, gameCode });
    return null;
  }

  return { gameCode, game };
}

function rejected(socket: Socket, action: TeacherAction): void {
  socket.emit('teacherControlRejected', { action });
}

export function registerTeacherControlsHandlers(io: Server, socket: Socket): void {
  const guard = (action: TeacherAction): { gameCode: string; game: GameState } | null => {
    if (!checkRateLimit(socket.id)) {
      socket.emit('rateLimited');
      return null;
    }
    return resolveTeacherGame(socket, action);
  };

  socket.on('pauseGame', () => {
    const ctx = guard('pauseGame');
    if (!ctx) return;
    if (!pauseGameTimer(io, ctx.gameCode)) rejected(socket, 'pauseGame');
  });

  socket.on('resumeGame', () => {
    const ctx = guard('resumeGame');
    if (!ctx) return;
    if (!resumeGameTimer(io, ctx.gameCode)) rejected(socket, 'resumeGame');
  });

  socket.on('extendTime', (data?: ExtendTimePayload) => {
    const ctx = guard('extendTime');
    if (!ctx) return;
    // Clamping to 10..120 lives in the service; only shape-check here.
    const raw = data?.seconds;
    const seconds = typeof raw === 'number' && Number.isFinite(raw) ? raw : DEFAULT_EXTEND_SECONDS;
    if (!extendGameTimer(io, ctx.gameCode, seconds)) rejected(socket, 'extendTime');
  });

  socket.on('endRoundNow', () => {
    const ctx = guard('endRoundNow');
    if (!ctx) return;
    // endGame is idempotent (state-machine guarded) — a double tap is harmless.
    endGame(io, ctx.gameCode).catch((err: unknown) => {
      logger.error('TEACHER', `endRoundNow failed for ${ctx.gameCode}: ${(err as Error).message}`);
    });
  });

  socket.on('skipTargetWord', async () => {
    const ctx = guard('skipTargetWord');
    if (!ctx) return;
    try {
      const result = await skipWordHuntTarget(io, ctx.gameCode);
      if (!result) rejected(socket, 'skipTargetWord');
    } catch (err: unknown) {
      logger.error('TEACHER', `skipTargetWord failed for ${ctx.gameCode}: ${(err as Error).message}`);
      rejected(socket, 'skipTargetWord');
    }
  });
}

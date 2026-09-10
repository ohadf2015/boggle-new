/**
 * The ONE gate every seating path passes through before a player takes a seat.
 *
 * `classroomGameSessionState.isClassroomSessionEnded` is the rule; this is the
 * gate that applies it wherever someone is about to be seated. It exists as a
 * module rather than a check-per-handler because the last three rounds fixed
 * this bug one door at a time and each fix missed the next door:
 *
 *   round 1-2  the three HTTP doors (`lib/education/classroomGameLookup`)
 *   round 3    the enrolment socket door (`classroomGameJoinGate`)
 *   round 4    the base multiplayer door, `playerJoinHandler`'s `socket.on('join')`
 *
 * The base door is the one the multiplayer page and every reconnect actually
 * use, so it was the one that mattered most. Verified live in round 3 with
 * socket.io-client: a fresh socket emitting `join` with an ended classroom code
 * got `{ success: true }` and walked into a dead session. Kahoot's bar is that
 * an ended PIN is refused everywhere, instantly, with one message — so from
 * here on a new seating path calls THIS, and does not grow a fourth copy of the
 * rule that can drift (recurring pitfall class 3).
 *
 * Three deliberate properties:
 *
 *   - ORDINARY MULTIPLAYER IS UNTOUCHED. A non-classroom code has no record in
 *     `classroomGames:*`, so the gate returns "open" and the caller behaves
 *     exactly as before. The only cost is one Redis GET — and on the `join`
 *     path not even that, because `emitClassroomContext` was already making
 *     that same read a few lines later. The gate hands its record over so the
 *     read happens once, not twice.
 *
 *   - IT FAILS OPEN. A Redis error, or a record with no session marker, is
 *     treated as live. Locking a whole class out of a running round because a
 *     read blipped is strictly worse than the bug this closes (pitfall 4).
 *
 *   - THE REFUSAL IS INDISTINGUISHABLE FROM "no such code", in whichever
 *     dialect the caller's client already understands. An ended PIN and a wrong
 *     PIN are one state to a student, so there is no new copy and nothing new
 *     to translate. The `code: 'GAME_ENDED'` field is for our logs.
 *
 * Note this gate is the BELT, not the fix. The fix is that ending a session now
 * tears the room down (`classroomGameEndHandler`), which deletes the game's
 * Redis key and makes the ordinary GAME_NOT_FOUND branch answer. The gate
 * covers what teardown structurally cannot: `gameStateManager.deleteGame`
 * early-returns when the room is not in THIS instance's memory, so on any other
 * instance the room stands and the code is a door again.
 */

import type { Socket } from 'socket.io';

import logger from '../utils/logger.js';
import { emitError, ErrorCodes } from '../utils/errorHandler.js';
import { getClassroomGame, type ClassroomGame } from '../modules/classroomGameManager.js';
import { isClassroomSessionEnded } from '../modules/classroomGameSessionState.js';

/**
 * Which error vocabulary the calling client speaks.
 *
 * `multiplayer` — `socket.on('join')`, answered by the multiplayer page's
 * `onError` branch, which already renders a line for `GAME_NOT_FOUND`.
 * `classroom`   — `joinClassroomGame`, answered by `ClassroomGameBanner`'s own
 * `classroomGameError` listener.
 */
export type SeatDialect = 'multiplayer' | 'classroom';

/** Why a seating path must stop. Both look identical to the student. */
export type SeatRefusal = 'unknown' | 'ended';

export interface ClassroomSeat {
  /** The Redis classroom record, or null for an ordinary multiplayer room. */
  game: ClassroomGame | null;
  /** True when the caller must return NOW — the socket has already been told. */
  refused: boolean;
}

/**
 * Tell one socket its code is not a door, in its own dialect.
 *
 * Exported so `classroomGameJoinGate` (which already holds the record and has
 * no reason to re-read it) refuses through the same words as everyone else.
 */
export function refuseSeat(
  socket: Socket,
  gameCode: string,
  dialect: SeatDialect,
  refusal: SeatRefusal
): void {
  if (refusal === 'ended') {
    logger.info('CLASSROOM_GAME', `Rejected join of ended game ${gameCode}`);
  }

  if (dialect === 'multiplayer') {
    emitError(socket, ErrorCodes.GAME_NOT_FOUND);
    return;
  }

  socket.emit('classroomGameError', {
    error: 'Game not found',
    // For our logs only — the student's screen says the same thing either way.
    ...(refusal === 'ended' ? { code: 'GAME_ENDED' } : {}),
    gameCode,
  });
}

/**
 * May this socket be seated in this code, and what is the classroom record?
 *
 * Call this BEFORE seating and before any classroom-membership probe — F-03 /
 * F-11: answering an unknown or ended code without touching Supabase is what
 * stops the membership check becoming an oracle for valid classroom ids.
 */
export async function checkClassroomSeat(
  socket: Socket,
  gameCode: string,
  dialect: SeatDialect
): Promise<ClassroomSeat> {
  let game: ClassroomGame | null = null;

  try {
    game = await getClassroomGame(gameCode);
  } catch (err) {
    // Fail OPEN, loudly. Silence here would be pitfall 4 twice over: a class
    // locked out AND no trace of why.
    logger.warn(
      'CLASSROOM_GAME',
      `Seat gate could not read ${gameCode}, treating as live: ${(err as Error)?.message ?? err}`
    );
    return { game: null, refused: false };
  }

  // Not a classroom code at all. An ordinary multiplayer room reaches here and
  // leaves unchanged.
  if (!game) return { game: null, refused: false };

  if (!isClassroomSessionEnded(game)) return { game, refused: false };

  refuseSeat(socket, gameCode, dialect, 'ended');
  return { game, refused: true };
}

export default checkClassroomSeat;

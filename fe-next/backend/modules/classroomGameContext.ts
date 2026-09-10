/**
 * The per-socket classroom context: a student's differentiation level and the
 * lesson word bank for the room they are in.
 *
 * Its own module because TWO paths have to send it and they must send exactly
 * the same thing. `join` (`playerJoinHandler`) is the front door;
 * `requestGameState` (`gameLifecycleHandler`) is the recovery door a client
 * falls back to when `startGame` never arrived — and it used to restore the
 * board, the clock, the pause state and the leaderboard while saying nothing
 * about the classroom, so the student it silently downgraded to `core` with an
 * empty word bank was precisely the support student the bank exists for.
 * Recurring pitfall class 3: two routes to one state, one of them thinner.
 *
 * Per-socket and never a room broadcast: `classroomLevel` differs per student
 * and a broadcast would flatten it.
 */

import type { Socket } from 'socket.io';

import { safeEmit } from '../utils/socketHelpers.js';
import logger from '../utils/logger.js';
import { getClassroomGame, type ClassroomGame } from './classroomGameManager.js';
import { getClassroomMembershipLevel } from './supabase/classroomMembership.js';

/**
 * A classroom record a caller has ALREADY loaded.
 *
 * `playerJoinHandler` runs `classroomSeatGate` a few lines earlier and that
 * gate reads the very same Redis key — it has to, because whether the session
 * ended decides whether this socket is seated at all. Handing the record over
 * keeps the join path at one read instead of two. `game: null` is a real
 * answer ("not a classroom room"), so the wrapper object is what distinguishes
 * "preloaded, and it is nothing" from "not preloaded".
 */
export interface PreloadedClassroomGame {
  game: ClassroomGame | null;
}

/**
 * Tell this socket its differentiation level and the lesson word bank, if the
 * room is a classroom game. Guests and non-members are 'core'. Non-classroom
 * rooms get nothing (the client resets to core/[] on every `joined`).
 */
export async function emitClassroomContext(
  socket: Socket,
  gameCode: string,
  authUserId: string | undefined,
  preloaded?: PreloadedClassroomGame
): Promise<void> {
  try {
    const classroomGame = preloaded ? preloaded.game : await getClassroomGame(gameCode);
    if (!classroomGame) return;
    const classroomLevel = authUserId
      ? await getClassroomMembershipLevel(authUserId, classroomGame.classroomId)
      : 'core';
    // Prefer the words the board ACTUALLY carries. Embedding is best-effort, so
    // the full lesson list sent a support student hunting for words that are not
    // there — the opposite of scaffolding. `placedVocabulary` is written at game
    // start; before that (lobby / waiting room) there is no board yet and the
    // lesson list is the honest answer. An empty ARRAY is meaningful and must
    // not fall back — it means the board carries none of them.
    const wordBank = Array.isArray(classroomGame.placedVocabulary)
      ? classroomGame.placedVocabulary
      : (Array.isArray(classroomGame.vocabularyWords) ? classroomGame.vocabularyWords : []);
    // Cache the resolved level on the socket. Game start re-sends this context
    // once the board exists (the word bank is only knowable then), and it must
    // not have to re-query Supabase per student — nor guess, which would quietly
    // demote a support student to core mid-round.
    (socket.data as Record<string, unknown>).classroomLevel = classroomLevel;
    safeEmit(socket, 'classroomContext', {
      classroomLevel,
      classroomWordBank: wordBank,
    });
  } catch (err) {
    logger.warn('CLASSROOM_GAME', `classroomContext lookup failed for ${gameCode}: ${(err as Error)?.message ?? err}`);
  }
}

export default emitClassroomContext;

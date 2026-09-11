/**
 * Is this classroom game code still a door, or just a number on a whiteboard?
 *
 * Lives outside `classroomGameHandler.ts` because that file is already over the
 * 500-line limit and may not grow — but it earns its own module anyway: this is
 * the socket half of a rule the HTTP half states in
 * `lib/education/classroomGameLookup.ts`, and the two must say the same thing.
 *
 * The rule: a game whose SESSION has ended is not joinable. Ending a round is
 * not that — `status: 'finished'` is written at the end of every round and
 * re-arms the record's four-hour TTL, and the teacher presses "next round"
 * seconds to minutes later — so the marker is `endedAt`, written once when the
 * teacher ends the game or its room is torn down
 * (`backend/modules/classroomGameSession.ts`).
 *
 * Both halves of that were a dead end. Reading nothing at all left this door —
 * the one `components/student/ClassroomGameBanner.tsx:117` taps — wide open
 * long after the playable room (`gameStateManager`, an entirely separate
 * lifecycle) was gone; the banner polls every 15 seconds, so a student tapping
 * JOIN on a stale card walked into a dead room. Reading `'finished'` instead
 * slammed it shut during the results screen, so a latecomer was refused a game
 * their whole class was still in.
 *
 * The rejection is deliberately INDISTINGUISHABLE from "no such game". An ended
 * PIN and a wrong PIN are one state to the student — Kahoot answers both with
 * "We didn't recognize that game PIN" — so there is no new copy and nothing new
 * to translate. The `code` field is for our logs; `ClassroomGameBanner` renders
 * its own localized line either way.
 *
 * Two guard rails inside the rule:
 *   - Callers must run this BEFORE any classroom-membership probe, so it cannot
 *     become the classroom-id oracle that ordering exists to prevent.
 *   - A record with NO session marker stays joinable. Failing closed on a
 *     missing field would lock a whole class out of a live round — strictly
 *     worse than the bug this fixes (recurring pitfall class 4).
 *
 * Unlike the round clock, this one is permanent: `markRoundLive` refuses to
 * reopen an ended session, so no later `startGame` can resurrect a dead code.
 */

import type { Socket } from 'socket.io';
import {
  isClassroomSessionEnded,
  type ClassroomSessionState,
} from '../modules/classroomGameSessionState.js';
import { refuseSeat } from './classroomSeatGate.js';

/** The fields of the Redis record this rule reads. */
export type ClassroomGameJoinability = ClassroomSessionState;

/** False for a game that never existed and for one whose session the teacher ended. */
export function isClassroomGameJoinable(game: ClassroomGameJoinability | null | undefined): boolean {
  if (!game) return false;
  return !isClassroomSessionEnded(game);
}

/**
 * Both rejections, in the order that keeps them safe, as one gate.
 *
 * F-03 + F-11: load the game FIRST, and answer an unknown or ended code without
 * ever probing Supabase for classroom membership — otherwise the membership
 * check becomes an oracle for discovering valid classroom ids.
 *
 * Returns false (and has already told the socket) when the caller must stop;
 * narrows the game to non-null when the caller may continue.
 */
export function ensureJoinableClassroomGame<T extends ClassroomGameJoinability>(
  socket: Socket,
  game: T | null | undefined,
  gameCode: string
): game is T {
  if (isClassroomGameJoinable(game)) return true;

  // The words come from `classroomSeatGate`, which every other seating path
  // also refuses through — so the enrolment door and the base multiplayer door
  // cannot drift into saying two different things.
  refuseSeat(socket, gameCode, 'classroom', game ? 'ended' : 'unknown');
  return false;
}

export default ensureJoinableClassroomGame;

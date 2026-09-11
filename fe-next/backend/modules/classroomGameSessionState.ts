/**
 * The one-line rule every classroom-code gate asks, and nothing else.
 *
 * A leaf on purpose: it imports nothing. `classroomGameManager` needs it (to
 * refuse to reopen a dead code, and to prune the classroom index),
 * `classroomGameSession` needs it, and `classroomGameJoinGate` needs it — and
 * the manager and the session module already import each other's work, so the
 * rule cannot live in either without a cycle. Its HTTP twin is restated inside
 * `lib/education/classroomGameLookup.ts`, which webpack must be able to bundle
 * and therefore cannot import anything under `backend/` that uses Node-ESM
 * `.js` specifiers; `__tests__/classroomGameLookup.test.ts` pins the two
 * against drift.
 *
 * See `classroomGameSession.ts` for why the round clock (`status: 'finished'`,
 * written at every round end) and the session clock (`endedAt`, written once
 * when the teacher ends the game) must never be read as the same thing.
 */

/** The two fields of the Redis record the session rule reads. */
export interface ClassroomSessionState {
  status?: string;
  endedAt?: string;
}

/**
 * Has the teacher ended this game?
 *
 * `endedAt` is the marker; `status: 'ended'` is checked too so a record written
 * by a partially-applied path cannot read as live. `'finished'` is explicitly
 * NOT ended — that is a round boundary, and the code stays a door.
 *
 * A record with neither field is treated as LIVE. Failing closed on a missing
 * field would lock a whole class out of a running round, strictly worse than
 * the bug this exists to fix (pitfall class 4).
 */
export function isClassroomSessionEnded(
  game: ClassroomSessionState | null | undefined
): boolean {
  if (!game) return false;
  return game.status === 'ended' || Boolean(game.endedAt);
}

export default isClassroomSessionEnded;

/**
 * Who the SERVER saw take a seat in a classroom room.
 *
 * `endClassroomGame` carries `playerScores` from the teacher's client, and XP
 * and `practice_sessions` rows are written behind those ids, so the list must
 * be filtered against ids the server itself observed. That part was never in
 * doubt. The set it was filtered AGAINST is what broke.
 *
 * TWO ROSTERS, AND THE OBVIOUS ONE IS USUALLY EMPTY:
 *
 *   `game.players` — the CLASSROOM roster, appended only by the
 *   `joinClassroomGame` socket event. A student who reaches the room the
 *   ordinary way (the join page, the projector code, `playerJoinHandler`)
 *   never emits it. `classroomGamePersistence` says the same thing in its own
 *   words: that list is "routinely EMPTY while a full class is playing".
 *
 *   `getGame(code).users` — the LIVE MP room, keyed by username, one entry per
 *   socket the server actually seated. Its `authUserId` is not client-supplied:
 *   `playerJoinHandler` takes it from `socket.data.verifiedUserId`, which
 *   `socketSetup` fills by verifying the handshake JWT. An anonymous guest
 *   student carries a real (anonymous) Supabase identity, so this is where a
 *   guest is — and, for a guest, the ONLY place they are.
 *
 * Filtering on the first alone meant an empty set, which meant every score
 * dropped, which meant no rows, which meant a teacher's report resolved a class
 * of thirty to nobody. The union is still built exclusively from
 * server-verified ids, so the anti-fabrication property is unchanged: this
 * narrows what counts as proof of a seat, it does not stop requiring one.
 *
 * Pure and dependency-free on purpose — the security-relevant predicate is
 * worth testing without a socket, a Redis or a room.
 */

/** One entry of the classroom roster (`ClassroomGame['players']`). */
export interface ClassroomRosterEntry {
  userId?: string | null;
}

/** One entry of the live MP room's `users` map, reduced to what this reads. */
export interface SeatedLiveUser {
  authUserId?: string | null;
  isBot?: boolean;
}

/**
 * Every auth id this server verified into `gameCode`, from both rosters.
 *
 * Bots are excluded — they have no `auth.users` row to award anything to, and
 * a bot id in the set would let a crafted payload write XP to one. So is the
 * teacher when `teacherId` is given: they host, they do not compete, and a
 * teacher row shows up in the report's word × student grid as a student.
 *
 * Empty in, empty out. Never permissive on missing input: a room we cannot see
 * is not a room where everyone played.
 */
export function seatedAuthUserIds(
  classroomRoster: ReadonlyArray<ClassroomRosterEntry> | undefined | null,
  liveUsers: Record<string, SeatedLiveUser | undefined> | undefined | null,
  teacherId?: string | null
): Set<string> {
  const seated = new Set<string>();

  const add = (id: unknown): void => {
    if (typeof id !== 'string' || id === '') return;
    if (teacherId && id === teacherId) return;
    seated.add(id);
  };

  for (const player of classroomRoster ?? []) add(player?.userId);
  for (const user of Object.values(liveUsers ?? {})) {
    if (!user || user.isBot) continue;
    add(user.authUserId);
  }

  return seated;
}

export default seatedAuthUserIds;

type RosterEntry =
  | string
  | { username: string; isHost?: boolean; isBot?: boolean; isPractice?: boolean; playerId?: string | null; socketId?: string | null };

/** Real students in the room, by stable id: the teacher, bots and the teacher's practice seat do not count. */
export function countClassStudents(players: ReadonlyArray<RosterEntry> | undefined): number {
  const ids = new Set<string>();
  for (const p of players ?? []) {
    if (typeof p === 'string') ids.add(`name:${p}`);
    else if (!p.isHost && !p.isBot && !p.isPractice) ids.add(p.playerId ?? p.socketId ?? `name:${p.username}`);
  }
  return ids.size;
}

/** Leave without the confirm only when the server has told us who is here and nobody is a student. */
export function classroomLobbyExitSkipsConfirm(args: {
  classroom: boolean;
  rosterKnown: boolean;
  players: ReadonlyArray<RosterEntry> | undefined;
}): boolean {
  return args.classroom && args.rosterKnown && countClassStudents(args.players) === 0;
}

export type ClassroomExitPhase = 'lobby' | 'round' | 'game';

/** Mid-round, a teacher pressing exit means "stop the round"; only the lobby and results ask about closing the room. */
export function classroomExitPhase(args: { inLobby: boolean; roundRunning: boolean }): ClassroomExitPhase {
  if (args.inLobby) return 'lobby';
  return args.roundRunning ? 'round' : 'game';
}

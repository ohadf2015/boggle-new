type RosterEntry = string | { username: string; isHost?: boolean; isBot?: boolean; isPractice?: boolean };

/** Real students in the room: the teacher, bots and the teacher's practice seat do not count. */
export function countClassStudents(players: ReadonlyArray<RosterEntry> | undefined, hostUsername: string): number {
  return (players ?? []).filter((p) =>
    typeof p === 'string' ? p !== hostUsername : !p.isHost && !p.isBot && !p.isPractice && p.username !== hostUsername,
  ).length;
}

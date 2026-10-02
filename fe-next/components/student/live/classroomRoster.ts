interface Named {
  username: string;
  isHost?: boolean;
}

/** In a teacher's class the host runs the room; ranking them among students reads "Tied with Ms Levy". */
export function withoutClassroomHost<S extends Named, U extends Named | string>(
  leaderboard: readonly S[],
  users: readonly U[]
): { leaderboard: S[]; users: U[] } {
  const hosts = new Set<string>();
  for (const u of users) if (typeof u !== 'string' && u.isHost) hosts.add(u.username);
  for (const s of leaderboard) if (s.isHost) hosts.add(s.username);
  if (hosts.size === 0) return { leaderboard: [...leaderboard], users: [...users] };
  return {
    leaderboard: leaderboard.filter((s) => !hosts.has(s.username)),
    users: users.filter((u) => typeof u === 'string' || !hosts.has(u.username)),
  };
}

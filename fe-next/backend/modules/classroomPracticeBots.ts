interface PracticeRoomUser {
  isBot?: boolean;
  isHost?: boolean;
  isPractice?: boolean;
}

/** Bots a teacher seated for a practice round must not play the real class game. */
export function practiceBotsToDrop(game: {
  isClassroom?: boolean;
  users: Record<string, PracticeRoomUser>;
}): string[] {
  if (!game.isClassroom) return [];
  const entries = Object.entries(game.users);
  const hasStudent = entries.some(([, u]) => !u.isBot && !u.isHost && !u.isPractice);
  if (!hasStudent) return [];
  return entries.filter(([, u]) => u.isBot).map(([name]) => name);
}

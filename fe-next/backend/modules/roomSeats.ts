export interface SeatedRoom {
  users: Record<string, { isHost?: boolean }>;
  isClassroom?: boolean;
}

/** A classroom teacher hosts and watches, so they never hold one of the room's seats. */
export function seatedPlayerCount(game: SeatedRoom): number {
  const users = Object.values(game.users);
  return game.isClassroom ? users.filter((u) => !u.isHost).length : users.length;
}

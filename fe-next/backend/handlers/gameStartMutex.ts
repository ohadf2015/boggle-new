// In-memory per-room start lock shared by every path that starts a round (startGame, tournament rounds).
const gamesStarting = new Set<string>();

export function tryAcquireGameStart(gameCode: string): boolean {
  if (gamesStarting.has(gameCode)) return false;
  gamesStarting.add(gameCode);
  return true;
}

export function releaseGameStart(gameCode: string): void {
  gamesStarting.delete(gameCode);
}

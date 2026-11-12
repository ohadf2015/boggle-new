// In-memory per-room start lock shared by every path that starts a round (startGame, tournament rounds).
const gamesStarting = new Set<string>();
const startWaiters = new Map<string, Array<() => void>>();

export function tryAcquireGameStart(gameCode: string): boolean {
  if (gamesStarting.has(gameCode)) return false;
  gamesStarting.add(gameCode);
  return true;
}

export function releaseGameStart(gameCode: string): void {
  gamesStarting.delete(gameCode);
  const waiters = startWaiters.get(gameCode);
  startWaiters.delete(gameCode);
  waiters?.forEach((wake) => wake());
}

export function isGameStarting(gameCode: string): boolean {
  return gamesStarting.has(gameCode);
}

/** Resolves once an in-flight start has dealt its board (true), or false when it outlives `timeoutMs`. */
export function waitForGameStart(gameCode: string, timeoutMs = 10000): Promise<boolean> {
  if (!gamesStarting.has(gameCode)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const list = startWaiters.get(gameCode);
      if (list) startWaiters.set(gameCode, list.filter((w) => w !== wake));
      resolve(false);
    }, timeoutMs);
    const wake = () => {
      clearTimeout(timer);
      resolve(true);
    };
    startWaiters.set(gameCode, [...(startWaiters.get(gameCode) ?? []), wake]);
  });
}

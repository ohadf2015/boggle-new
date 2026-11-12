// In-memory per-room start lock shared by every path that starts a round (startGame, tournament rounds).
const gamesStarting = new Map<string, number>();
const startWaiters = new Map<string, Array<() => void>>();

/** How long a join or state request waits for a start to deal its board before answering anyway. */
export const START_WAIT_CAP_MS = 10_000;
/** A start flag held longer than this is wedged; restart recovery stops deferring to it. */
export const STALE_START_MS = START_WAIT_CAP_MS + 5_000;

export function tryAcquireGameStart(gameCode: string): boolean {
  if (gamesStarting.has(gameCode)) return false;
  gamesStarting.set(gameCode, Date.now());
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

export function isGameStartStale(gameCode: string, now = Date.now()): boolean {
  const since = gamesStarting.get(gameCode);
  return since !== undefined && now - since > STALE_START_MS;
}

export function startWaiterCount(gameCode: string): number {
  return startWaiters.get(gameCode)?.length ?? 0;
}

/** Resolves once an in-flight start has dealt its board (true), or false when it outlives `timeoutMs`. */
export function waitForGameStart(gameCode: string, timeoutMs = START_WAIT_CAP_MS): Promise<boolean> {
  if (!gamesStarting.has(gameCode)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const rest = (startWaiters.get(gameCode) ?? []).filter((w) => w !== wake);
      if (rest.length > 0) startWaiters.set(gameCode, rest);
      else startWaiters.delete(gameCode);
      resolve(false);
    }, timeoutMs);
    const wake = () => {
      clearTimeout(timer);
      resolve(true);
    };
    startWaiters.set(gameCode, [...(startWaiters.get(gameCode) ?? []), wake]);
  });
}

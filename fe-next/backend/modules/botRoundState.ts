/**
 * Per-round bot bookkeeping that lives OUTSIDE the Bot objects.
 *
 * Every entry is keyed by gameCode (and bot where needed) and is dropped by
 * `clearBotRoundState(gameCode)`, which `botManager.resetBotsForNewRound` — the
 * ONE per-round bot reset — calls for every mode. Nothing here may survive a
 * round boundary: a stale grace-window start, variance draw or anti-grief window
 * is exactly the stale-mutable-state class that froze blast bots at 0.
 */

/** When the current round's bot scoring started (grace-window anchor). */
const scoringStart = new Map<string, number>();
/** Memoized ±10% variance on the relative score target, per (game, bot). */
const variance = new Map<string, number>();
/** Last blast word-pool resync per game (throttle). */
const lastResyncAt = new Map<string, number>();
/** Anti-grief clear windows per (game, bot) — never keyed by bot name alone. */
const clearWindows = new Map<string, { count: number; resetAt: number }>();

const botKey = (gameCode: string, botUsername: string): string => `${gameCode}:${botUsername}`;

/** Anchor the grace window once per round; a mid-round bot relaunch keeps it. */
export function markBotScoringStart(gameCode: string, now: number = Date.now()): void {
  if (!scoringStart.has(gameCode)) scoringStart.set(gameCode, now);
}

export function getBotScoringStart(gameCode: string): number | undefined {
  return scoringStart.get(gameCode);
}

export function clearBotScoringStart(gameCode: string): void {
  scoringStart.delete(gameCode);
}

export function getOrSeedBotVariance(gameCode: string, botUsername: string, rng: () => number = Math.random): number {
  const key = botKey(gameCode, botUsername);
  const cached = variance.get(key);
  if (cached !== undefined) return cached;
  const v = 0.9 + rng() * 0.2; // 0.9 to 1.1
  variance.set(key, v);
  return v;
}

export function clearBotVariance(gameCode: string): void {
  const prefix = `${gameCode}:`;
  for (const key of variance.keys()) if (key.startsWith(prefix)) variance.delete(key);
}

/** True (and records the time) when a resync is due for this game. */
export function takeBotResyncSlot(gameCode: string, minIntervalMs: number, now: number = Date.now()): boolean {
  if (now - (lastResyncAt.get(gameCode) ?? 0) < minIntervalMs) return false;
  lastResyncAt.set(gameCode, now);
  return true;
}

export function noteBotResync(gameCode: string, now: number = Date.now()): void {
  lastResyncAt.set(gameCode, now);
}

/** The bot's current one-minute anti-grief window (rolled over when expired). */
export function getBotClearWindow(gameCode: string, botUsername: string, now: number = Date.now()): { count: number; resetAt: number } {
  const key = botKey(gameCode, botUsername);
  const existing = clearWindows.get(key);
  if (existing && existing.resetAt > now) return existing;
  const window = { count: 0, resetAt: now + 60_000 };
  clearWindows.set(key, window);
  return window;
}

/** Drop every per-round entry for a game. */
export function clearBotRoundState(gameCode: string): void {
  clearBotScoringStart(gameCode);
  clearBotVariance(gameCode);
  lastResyncAt.delete(gameCode);
  const prefix = `${gameCode}:`;
  for (const key of clearWindows.keys()) if (key.startsWith(prefix)) clearWindows.delete(key);
}

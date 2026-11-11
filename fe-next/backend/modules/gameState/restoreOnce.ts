import type { GameState } from './types.js';

const inFlight = new Map<string, Promise<GameState | null>>();

/** Concurrent restores of one game share a single Redis read. */
export function restoreGameOnce(
  gameCode: string,
  games: Record<string, GameState>,
  restore: (gameCode: string, games: Record<string, GameState>) => Promise<GameState | null>,
): Promise<GameState | null> {
  if (games[gameCode]) return Promise.resolve(games[gameCode]);
  const existing = inFlight.get(gameCode);
  if (existing) return existing;
  const promise = restore(gameCode, games).finally(() => inFlight.delete(gameCode));
  inFlight.set(gameCode, promise);
  return promise;
}

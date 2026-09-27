/**
 * Two per-round decisions for a solo game, kept pure so they are testable
 * without mounting the 600-line core hook.
 */

/**
 * Earthquake / fire round replace or reprice the board mid-round. For a player
 * still learning what a word on this board looks like, that is noise — their
 * first game has none. Practice never has them.
 */
export function roundEventsEnabled(mode: string, isFirstGame: boolean): boolean {
  return mode !== 'practice' && !isFirstGame;
}

/** Timed rounds deal the board, then wait for a Start tap before the clock runs. */
export function startsBehindGate(mode: string): boolean {
  return mode !== 'practice';
}

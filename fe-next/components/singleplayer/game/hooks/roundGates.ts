/**
 * Two per-round decisions for a solo game, kept pure so they are testable
 * without mounting the 600-line core hook.
 */

/**
 * Earthquake / fire round replace or reprice the board mid-round. For a player
 * still learning what a word on this board looks like, that is noise — their
 * first game has none. Practice never has them.
 */
export function roundEventsEnabled(mode: string, isFirstGame: boolean, coach = false): boolean {
  return mode !== 'practice' && !isFirstGame && !coach;
}

/** Timed rounds deal the board, then wait for a Start tap before the clock runs.
 *  A coached first round is playable immediately; the clock stays held instead. */
export function startsBehindGate(mode: string, coach = false): boolean {
  return mode !== 'practice' && !coach;
}

/** Hold the 60s clock until the player has one real word. Searching does not burn time. */
export function coachClockHeld(coach: boolean, validWordCount: number): boolean {
  return coach && validWordCount < 1;
}

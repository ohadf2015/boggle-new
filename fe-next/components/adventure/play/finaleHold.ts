/**
 * Flow order at the end of a fight: the kill banner (or defeat beat) plays FIRST, then the
 * result screen (level up → chest → draft). The level is settled with the server right away
 * (the kill banner needs the granted trophy/stars), so only the result screen waits. Pure.
 */
export function resultHeld(combat: { defeated: boolean; dead: boolean } | null, finaleDone: boolean): boolean {
  return !!combat && (combat.defeated || combat.dead) && !finaleDone;
}

/** Safety net: the result comes up even if the finale never reports back. */
export const FINALE_HOLD_MAX_MS = 9000;

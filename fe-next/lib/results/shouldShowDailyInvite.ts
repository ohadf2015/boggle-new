/**
 * Should the D1 "play the Daily Challenge" invite appear on multiplayer results?
 *
 * Only once the rematch loop is over. Between live rounds the screen has exactly
 * one ask — play again — and a card offering a *different* mode above the sticky
 * rematch bar competes with it for the same tap.
 *
 * Classroom results never show it: students (and hosts in class) stay in the
 * lesson. Guests DO see it — finish-today / countdown only; the card itself
 * never invents a streak number.
 *
 * Pure so both the mobile and desktop mount sites can share one answer; two
 * hand-written conditions on two paths is how they drift (rules/60 Class 3).
 */
export function shouldShowDailyInvite({
  isGuest: _isGuest,
  gameCode,
  isBotsOnlyGame,
  isSeriesComplete,
  isClassroom = false,
}: {
  isGuest: boolean;
  /** Room code — absent means there is nothing to rematch into. */
  gameCode?: string;
  isBotsOnlyGame: boolean;
  isSeriesComplete: boolean;
  /** Classroom / edu results — leave the lesson for daily would yank students. */
  isClassroom?: boolean;
}): boolean {
  if (isClassroom) return false;
  return !gameCode || isBotsOnlyGame || isSeriesComplete;
}

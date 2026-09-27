/**
 * Should the D1 "play the Daily Challenge" invite appear on multiplayer results?
 *
 * Only once the rematch loop is over. Between live rounds the screen has exactly
 * one ask — play again — and a card offering a *different* mode above the sticky
 * rematch bar competes with it for the same tap.
 *
 * Pure so both the mobile and desktop mount sites can share one answer; two
 * hand-written conditions on two paths is how they drift (rules/60 Class 3).
 */
export function shouldShowDailyInvite({
  isGuest,
  gameCode,
  isBotsOnlyGame,
  isSeriesComplete,
}: {
  isGuest: boolean;
  /** Room code — absent means there is nothing to rematch into. */
  gameCode?: string;
  isBotsOnlyGame: boolean;
  isSeriesComplete: boolean;
}): boolean {
  // Guests get exactly one CTA on this screen: the signup card.
  if (isGuest) return false;
  return !gameCode || isBotsOnlyGame || isSeriesComplete;
}

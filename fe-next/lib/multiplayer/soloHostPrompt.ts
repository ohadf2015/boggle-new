/**
 * Pure decision for the solo-host "play vs bots now" prompt.
 *
 * The dominant MP pre-game drop is a solo host alone in the lobby (no human
 * guest) leaving before any game starts. This prompt surfaces an immediate,
 * explicit "play vs bots" CTA in place of the silent dead-air window. Kept pure
 * + injectable so the show/hide logic is unit-tested without the 686-line view.
 */

export interface SoloHostPromptInput {
  /** Non-host human guests currently in the room (excludes the host and bots). */
  humanGuestCount: number;
  /** Lobby state — the prompt only applies while waiting to start. */
  gameState: string;
  /** True once a bot-fill countdown is already counting down (its banner then
   *  owns the messaging, so the prompt stands down to avoid double CTAs). */
  botCountdownActive: boolean;
  /** Invite / classroom room. Excluded — matching the existing passive alone-timer
   *  rescue (HostPreGameView): that host is waiting on SPECIFIC humans (e.g. a
   *  teacher gathering students), so a prominent "play vs bots" nudge would risk
   *  starting a bot game instead of their class. They can still Start on demand. */
  isPrivate: boolean;
}

export function shouldShowSoloPlayPrompt({
  humanGuestCount,
  gameState,
  botCountdownActive,
  isPrivate,
}: SoloHostPromptInput): boolean {
  return humanGuestCount === 0 && gameState === 'waiting' && !botCountdownActive && !isPrivate;
}

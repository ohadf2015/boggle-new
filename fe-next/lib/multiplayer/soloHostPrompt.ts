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

/**
 * Grace window after a PUBLIC room's lobby auto-fills with bots, before the game
 * starts on its own. Stacked on the existing 15s alone-timer + 20s visible
 * countdown, so a host gets ~55s of total silence — long enough that someone
 * mid-share is not yanked into a bot game, short enough to rescue the session.
 */
export const PUBLIC_ROOM_BOT_START_GRACE_SECONDS = 20;

export interface AutoStartAfterBotFillInput {
  /** Quick Play already starts the instant bots land — it must not fire twice. */
  isQuickPlay: boolean;
  isPrivate: boolean;
  humanGuestCount: number;
  gameState: string;
}

/**
 * Whether a bot-filled PUBLIC lobby should start itself.
 *
 * Filling a lobby with bots and then waiting for a Start button the host does
 * not know is theirs stranded 35% of the sessions that got that far. Adding the
 * bots was already the decision that this host is playing alone; not starting is
 * the incoherent half of it. Private rooms keep the old behaviour — that host is
 * waiting on specific humans.
 */
export function shouldAutoStartAfterBotFill({
  isQuickPlay,
  isPrivate,
  humanGuestCount,
  gameState,
}: AutoStartAfterBotFillInput): boolean {
  if (isQuickPlay || isPrivate) return false;
  return humanGuestCount === 0 && gameState === 'waiting';
}

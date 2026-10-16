export interface RoundActivationInput {
  showModeReveal: boolean;
  showStartAnimation: boolean;
  hasBoard: boolean;
  remainingTime: number | null | undefined;
  gameActive: boolean;
  waitingForResults: boolean;
  /** A fresh start is in: its splash and 3-2-1 must play before the clock runs. */
  freshStartPending: boolean;
  /** The splash or the 3-2-1 has been on screen for this start. */
  countdownSeen: boolean;
}

/** The board and clock land a render before the splash mounts; activating then ran the clock through the countdown. */
export function shouldActivateRound(s: RoundActivationInput): boolean {
  if (s.showModeReveal || s.showStartAnimation || s.gameActive || s.waitingForResults) return false;
  if (!s.hasBoard || !s.remainingTime || s.remainingTime <= 0) return false;
  return !s.freshStartPending || s.countdownSeen;
}

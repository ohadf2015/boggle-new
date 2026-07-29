/**
 * Word Wheel post-game signup-offer selector (pure).
 *
 * Word Wheel daily completions are invisible to the generic SP/MP signup gate
 * (`useSignupPrompt` reads guest game/win counts that the wheel never writes).
 * This selector restores a conversion decision for the wheel flow, mirroring the
 * priorities of Word Hunt's `getConversionTrigger` but framed value-first for a
 * kids-inclusive audience (Google Families): we surface the player's own streak /
 * board spot as the reason to sign up — never loss-aversion pressure.
 *
 * Pure + deterministic so it is unit-testable and the resulting `offerType`
 * can be logged as a PostHog property for the nightly A/B-reading job. The
 * experiment decides whether to render the CTA at all; this decides the framing.
 */

export type WheelSignupOfferType = 'first-completion' | 'streak-value' | 'board-spot';

export interface WheelSignupOfferInput {
  /** Authenticated users have nothing to convert. */
  isAuthenticated: boolean;
  /** Practice mode has no real stakes (no streak, no leaderboard) to save. */
  isPractice: boolean;
  /** Current daily-streak length (from getDailyStreak().currentStreak). */
  streakDays: number;
  /** True on the player's first-ever daily completion (onboarding moment). */
  isFirstCompletion: boolean;
  /** True if the signup modal was dismissed within the cooldown window. */
  dismissedRecently: boolean;
  /** This run's score — gates the "decent run, claim your board spot" framing. */
  score: number;
}

/** Minimum score for the board-spot framing — a run worth bragging about. */
const BOARD_SPOT_MIN_SCORE = 25;

/**
 * Decide which value-led signup offer (if any) to show after a Word Wheel game.
 * Returns null to stay silent (already converted, practice, recently dismissed,
 * or a weak streak-less run not worth interrupting).
 */
export function selectWheelSignupOffer(input: WheelSignupOfferInput): WheelSignupOfferType | null {
  const { isAuthenticated, isPractice, streakDays, isFirstCompletion, dismissedRecently, score } = input;

  if (isAuthenticated || isPractice || dismissedRecently) return null;

  // Priority 1: first completion — welcome them, save today's result.
  if (isFirstCompletion) return 'first-completion';

  // Priority 2: an active streak is the strongest honest hook — keep it safe across devices.
  if (streakDays >= 2) return 'streak-value';

  // Priority 3: a solid run earns the "claim your spot on the board" framing.
  if (score >= BOARD_SPOT_MIN_SCORE) return 'board-spot';

  // Otherwise stay silent — no pestering after a weak, streak-less run.
  return null;
}

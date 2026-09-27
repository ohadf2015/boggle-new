/**
 * Pure selector that decides whether — and how — to pitch the Daily Challenge
 * at the post-multiplayer-game results screen. No React, no I/O: fully testable.
 *
 * Priority ladder (first match wins). Higher lanes are stronger conversion levers:
 *   1. streak_at_risk  — loss aversion on an alive daily streak
 *   2. catchup         — loss aversion + concrete recovery (a recent day was missed)
 *   3. win_momentum    — ride the win
 *   4. close_loss      — redirect a near-miss competitive sting to a fresh board
 *   5. loss_redirect   — default fresh-slate pitch for any other loss
 */

export type DailyPitchVariant =
  | 'streak_at_risk'
  | 'catchup'
  | 'win_momentum'
  | 'close_loss'
  | 'loss_redirect';

export interface DailyPitchInput {
  /** Completed today's daily already → suppress entirely. */
  hasPlayedToday: boolean;
  /** Canonical daily-challenge consecutive-day streak. */
  currentStreak: number;
  /** Count of recent missed days inside the catch-up window (0 if none/unknown). */
  missedDays: number;
  /** Won the just-finished MP match (top placement). */
  isWinner: boolean;
  /** Points behind the player ranked immediately above; null if 1st/unknown. */
  marginToNext: number | null;
  /** On the CrazyGames platform — swap body copy for the come-back message. */
  isOnCrazyGames: boolean;
}

export interface DailyPitch {
  variant: DailyPitchVariant;
  accent: 'orange' | 'yellow' | 'cyan';
  /** i18n keys only — never English strings. */
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
  /** Render a live reset countdown only where urgency has a payoff. */
  showCountdown: boolean;
}

/** A loss within this many points reads as a near-miss ("close_loss"). Tunable. */
export const CLOSE_LOSS_POINTS = 15;

const CTA_KEY = 'dailyInvite.playNow';

export function selectDailyConversionPitch(input: DailyPitchInput): DailyPitch | null {
  const { hasPlayedToday, currentStreak, missedDays, isWinner, marginToNext, isOnCrazyGames } = input;

  // Already played today → never pitch.
  if (hasPlayedToday) return null;

  // On CrazyGames every body collapses to the come-back message (preserves D1 behavior).
  const body = (key: string): string => (isOnCrazyGames ? 'dailyInvite.bodyCgComeBack' : key);

  // 1. Streak at risk — strongest lever.
  if (currentStreak >= 1) {
    return {
      variant: 'streak_at_risk',
      accent: 'orange',
      titleKey: 'dailyInvite.streakAtRiskTitle',
      bodyKey: body('dailyInvite.streakAtRiskBody'),
      ctaKey: CTA_KEY,
      showCountdown: true,
    };
  }

  // 2. Catch-up available (streak already 0, a recent puzzle was missed).
  if (missedDays > 0) {
    return {
      variant: 'catchup',
      accent: 'orange',
      titleKey: 'dailyInvite.catchupTitle',
      bodyKey: body('dailyInvite.catchupBody'),
      ctaKey: CTA_KEY,
      showCountdown: true,
    };
  }

  // 3. Win momentum.
  if (isWinner) {
    return {
      variant: 'win_momentum',
      accent: 'yellow',
      titleKey: 'dailyInvite.winMomentumTitle',
      bodyKey: body('dailyInvite.winMomentumBody'),
      ctaKey: CTA_KEY,
      showCountdown: false,
    };
  }

  // 4. Close loss — near miss.
  if (marginToNext !== null && marginToNext <= CLOSE_LOSS_POINTS) {
    return {
      variant: 'close_loss',
      accent: 'cyan',
      titleKey: 'dailyInvite.closeLossTitle',
      bodyKey: body('dailyInvite.closeLossBody'),
      ctaKey: CTA_KEY,
      showCountdown: false,
    };
  }

  // 5. Default loss redirect.
  return {
    variant: 'loss_redirect',
    accent: 'cyan',
    titleKey: 'dailyInvite.lossRedirectTitle',
    bodyKey: body('dailyInvite.lossRedirectBody'),
    ctaKey: CTA_KEY,
    showCountdown: false,
  };
}

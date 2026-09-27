/**
 * Pure selector for the post-practice Daily CTA.
 *
 * First-session players currently land on PracticeResults after FTUE
 * auto-start. The old button said "Play Word Hunt Daily" and routed to
 * /practice/wordHunt — more practice, no scarcity, no tomorrow hook.
 * Daily Word Hunt is the habit that actually drives D1.
 *
 * No React, no I/O: fully unit-testable.
 */

export const FIRST_SESSION_DAILY_PATH = '/daily/word-hunt';

export type FirstSessionDailyCtaVariant = 'first_session' | 'daily_open' | 'already_played';

export interface FirstSessionDailyCtaInput {
  /** Player already completed today's Word Hunt Daily. */
  alreadyPlayedToday: boolean;
  /** First completed session today (FTUE `firstGame=1` or practice streak ≤ 1). */
  isFirstSession: boolean;
}

export interface FirstSessionDailyCta {
  variant: FirstSessionDailyCtaVariant;
  /** Locale-free path + attribution query. Null when today's Daily is done. */
  href: string | null;
  titleKey: string;
  bodyKey: string;
  ctaKey: string;
  comeBackKey: string;
  showComeBackHook: boolean;
}

const COME_BACK_KEY = 'practiceResults.firstSessionComeBack';

export function selectFirstSessionDailyCta(
  input: FirstSessionDailyCtaInput,
): FirstSessionDailyCta {
  if (input.alreadyPlayedToday) {
    return {
      variant: 'already_played',
      href: null,
      titleKey: 'practiceResults.wordHuntAlreadyPlayed',
      bodyKey: 'practiceResults.wordHuntAlreadyPlayedDesc',
      ctaKey: 'practiceResults.wordHuntAlreadyPlayed',
      comeBackKey: COME_BACK_KEY,
      showComeBackHook: true,
    };
  }

  if (input.isFirstSession) {
    return {
      variant: 'first_session',
      href: `${FIRST_SESSION_DAILY_PATH}?from=first_game`,
      titleKey: 'practiceResults.firstSessionDailyTitle',
      bodyKey: 'practiceResults.firstSessionDailyBody',
      ctaKey: 'practiceResults.firstSessionDailyCta',
      comeBackKey: COME_BACK_KEY,
      showComeBackHook: true,
    };
  }

  return {
    variant: 'daily_open',
    href: `${FIRST_SESSION_DAILY_PATH}?from=practice_results`,
    titleKey: 'practiceResults.wordHuntCta',
    bodyKey: 'practiceResults.wordHuntCtaDesc',
    ctaKey: 'practiceResults.wordHuntCta',
    comeBackKey: COME_BACK_KEY,
    showComeBackHook: false,
  };
}

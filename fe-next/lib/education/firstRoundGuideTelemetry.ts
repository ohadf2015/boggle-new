/**
 * First-round guide funnel (approved teacher → first live round).
 *
 * Production Oct 2026: 99 approved teachers, 48 created a class, 12 ran a round.
 * The guide sits on class-ready and on Home; these events say which step a
 * teacher saw and which one they pressed, so the class→round drop is visible.
 *
 *  - `edu_first_round_guide_shown`   { surface, locale, step? }   once per mount
 *  - `edu_first_round_guide_clicked` { surface, locale, step }
 *
 * Client-only. Never throws (safeCapture).
 */
import { safeCapture } from './telemetryCore';

export type FirstRoundGuideSurface = 'class_ready' | 'home';
export type FirstRoundGuideStep =
  | 'practice_bots'
  | 'start_round'
  | 'createClass'
  | 'shareCode'
  | 'tryDemo';

export const FIRST_ROUND_GUIDE_EVENTS = {
  shown: 'edu_first_round_guide_shown',
  clicked: 'edu_first_round_guide_clicked',
} as const;

export function trackFirstRoundGuideShown(args: {
  surface: FirstRoundGuideSurface;
  locale: string;
  step?: FirstRoundGuideStep;
}): void {
  safeCapture(FIRST_ROUND_GUIDE_EVENTS.shown, {
    surface: args.surface,
    locale: args.locale,
    ...(args.step ? { step: args.step } : {}),
  });
}

export function trackFirstRoundGuideClicked(args: {
  surface: FirstRoundGuideSurface;
  locale: string;
  step: FirstRoundGuideStep;
}): void {
  safeCapture(FIRST_ROUND_GUIDE_EVENTS.clicked, {
    surface: args.surface,
    locale: args.locale,
    step: args.step,
  });
}

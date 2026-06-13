/**
 * Connections-landing telemetry — thin PostHog `capture` wrapper for the
 * Word Bridge / rosh-zanav landing surface. Mirrors lib/practice/telemetry.ts.
 * Never throws.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[connectionsLanding] capture failed', { event, err });
    }
  }
};

export function trackLandingView(locale: string): void {
  safeCapture('landing_view', { surface: 'connections', locale });
}

export function trackLandingSampleRevealed(args: {
  locale: string;
  position: 'hero' | 'strip-easy' | 'strip-medium' | 'strip-hard';
}): void {
  safeCapture('landing_sample_revealed', {
    surface: 'connections',
    locale: args.locale,
    position: args.position,
  });
}

export function trackLandingCtaClick(args: {
  locale: string;
  position: 'hero' | 'footer' | 'sticky' | 'compare';
}): void {
  safeCapture('landing_cta_click', {
    surface: 'connections',
    locale: args.locale,
    position: args.position,
  });
}

export function trackLandingFaqOpen(args: {
  locale: string;
  questionIndex: number;
}): void {
  safeCapture('landing_faq_open', {
    surface: 'connections',
    locale: args.locale,
    question_index: args.questionIndex,
  });
}

export function trackLandingCrossPromoClick(args: {
  locale: string;
  from: string;
}): void {
  safeCapture('cross_promo_click', {
    locale: args.locale,
    from: args.from,
    to: 'connections',
  });
}

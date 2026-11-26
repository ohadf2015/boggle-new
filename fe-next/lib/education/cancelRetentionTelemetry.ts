/**
 * Client steps for the Teacher Pro pre-cancel interstitial.
 * The Polar result is a server event (`teacher_cancel_offer_applied`); these
 * only say the teacher saw the door and which way they walked.
 */
import posthog from '@/lib/analytics/lazyPosthog';
import { trackGrowthEvent, type GrowthEvent } from '@/utils/growthTracking';
import { beaconProFunnelEvent, hasClientPostHogKey, reportMissingClientKey } from '@/lib/education/proFunnelBeacon';

export type CancelInterceptSurface =
  | 'trial_lifecycle'
  | 'trial_expiring'
  | 'trial_charge_soon'
  | 'profile_plan'
  | 'manage_link';

export type CancelInterceptChoice = 'pause' | 'discount' | 'continue' | 'keep' | 'dismiss';

function capture(event: GrowthEvent, props: Record<string, unknown>): void {
  if (!hasClientPostHogKey()) {
    reportMissingClientKey('cancelRetention');
    beaconProFunnelEvent(event, props);
  } else {
    try {
      (posthog.capture as (name: string, properties?: Record<string, unknown>) => void)(event, props);
    } catch {
      /* analytics must never block the keep */
    }
  }
  try {
    trackGrowthEvent(event, { ...props });
  } catch {
    /* analytics must never block the keep */
  }
}

export function trackCancelInterceptShown(args: { surface: CancelInterceptSurface; phase: 'trial' | 'paid' }): void {
  capture('teacher_cancel_intercept_shown', { ...args, product: 'teacher_pro' });
}

export function trackCancelInterceptChosen(args: {
  surface: CancelInterceptSurface;
  phase: 'trial' | 'paid';
  offer: CancelInterceptChoice;
}): void {
  capture('teacher_cancel_intercept_chosen', { ...args, product: 'teacher_pro' });
}

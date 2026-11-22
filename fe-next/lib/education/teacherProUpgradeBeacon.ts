/**
 * Same-origin beacon for Teacher Pro upgrade demonstrated-value CTAs.
 * School Chromebooks and ad-blockers block direct third-party posthog;
 * this route re-emits through captureEduServerEvents so $host is stamped.
 * Never throws.
 */
import { trackGrowthEvent } from '@/utils/growthTracking';

export const TEACHER_UPGRADE_EVENT_PATH = '/api/education/teacher/upgrade-event';

export interface TeacherProUpgradeBeaconArgs {
  placement: string;
  reason?: string;
  count?: number;
  limit?: number | null;
  locale?: string | null;
}

function sendBeaconOrFetch(body: Record<string, unknown>): void {
  try {
    const payload = JSON.stringify(body);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon(TEACHER_UPGRADE_EVENT_PATH, blob)) return;
    }
    if (typeof fetch === 'function') {
      void fetch(TEACHER_UPGRADE_EVENT_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    }
  } catch {
    /* best effort */
  }
}

export function beaconTeacherProUpgradeShown(args: TeacherProUpgradeBeaconArgs): void {
  try {
    trackGrowthEvent('iap_viewed', {
      product: 'teacher_pro',
      placement: args.placement,
      source: args.placement,
      reason: args.reason,
      count: args.count,
      limit: args.limit,
    });
  } catch {
    /* analytics must never fail */
  }
  sendBeaconOrFetch({
    event: 'teacher_pro_upgrade_shown',
    ...args,
  });
}

export function beaconTeacherProUpgradeClicked(args: TeacherProUpgradeBeaconArgs): void {
  try {
    trackGrowthEvent('landing_cta_clicked', {
      cta: 'teacher_pro',
      placement: args.placement,
      source: args.placement,
      reason: args.reason,
      count: args.count,
      limit: args.limit,
    });
  } catch {
    /* analytics must never fail */
  }
  sendBeaconOrFetch({
    event: 'teacher_pro_upgrade_clicked',
    ...args,
  });
}

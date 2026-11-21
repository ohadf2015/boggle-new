/**
 * Same-origin beacon for the two teacher-funnel steps that have no server
 * write. School networks block posthog.com; they do not block this origin.
 * The route re-emits through captureEduServerEvents. Never throws.
 */
import { type ClientTeacherFunnelStep } from './teacherFunnelStep';

export const TEACHER_FUNNEL_BEACON_PATH = '/api/education/teacher/funnel-step';

export function beaconTeacherFunnelStep(step: ClientTeacherFunnelStep): void {
  try {
    if (typeof fetch !== 'function') return;
    void fetch(TEACHER_FUNNEL_BEACON_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step }),
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => {
      /* best effort */
    });
  } catch {
    /* best effort */
  }
}

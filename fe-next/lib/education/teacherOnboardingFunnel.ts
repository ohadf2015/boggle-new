/**
 * Teacher onboarding funnel — the client-side events the 65-teacher re-invite
 * measures against. Before this module existed the teacher surface
 * (app/[locale]/teacher/*) carried ZERO capture() calls: every education event
 * was student-side or server-side, so "approved teacher → onboarded → first
 * class → first assignment → first student" had no measurable drop-off step.
 *
 * Names are the card-pinned snake_case strings. `assignment_created` is NOT a
 * new event — assignmentEvents.ts already emits it on lesson and word-goal
 * publish, and those captures now also carry locale + plan. This module
 * reuses the exact same string; the template-gallery path is the only
 * first-publish path that previously missed the event entirely.
 *
 * The upgrade steps (`trial_started` / `teacher_pro_upgraded`) are NOT emitted
 * here on purpose: /teacher/upgrade redirects to Polar and never observes the
 * outcome — a click-time capture would count intent as conversion. Those two
 * names are emitted by the Polar webhook (lib/education/proFunnelServer.ts)
 * the moment Polar actually grants the trial / activates the paid plan, with
 * plan + locale on the event.
 *
 * Properties are minimal by design: locale + plan only. Never throws —
 * telemetry must never break a teacher flow.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';

export const TEACHER_ONBOARDING_FUNNEL_EVENTS = {
  /** Teacher dashboard first view (once per browser). */
  teacherOnboardingViewed: 'teacher_onboarding_viewed',
  /** classroom/new submit success. */
  classroomCreated: 'classroom_created',
  /** First assignment published. Same string assignmentEvents.ts emits. */
  assignmentCreated: 'assignment_created',
  /** First student joined (teacher HQ roster 0 → 1). */
  studentJoined: 'student_joined',
  /** Server-only: Polar granted the 14-day Teacher Pro trial. */
  trialStarted: 'trial_started',
  /** Server-only: Polar activated the paid Teacher Pro subscription. */
  teacherProUpgraded: 'teacher_pro_upgraded',
} as const;

export type TeacherOnboardingFunnelEvent =
  (typeof TEACHER_ONBOARDING_FUNNEL_EVENTS)[keyof typeof TEACHER_ONBOARDING_FUNNEL_EVENTS];

/** `unknown` = the entitlement read had not settled when the event fired. */
export type TeacherPlan = 'free' | 'trial' | 'pro' | 'unknown';

export interface TeacherFunnelProps {
  locale: string;
  plan: TeacherPlan;
}

/** Maps the useTeacherPro state onto the plan the funnel slices by. */
export function teacherFunnelPlan(args: {
  hasPro: boolean;
  status?: string | null;
  loading?: boolean;
}): TeacherPlan {
  if (args.loading) return 'unknown';
  if (!args.hasPro) return 'free';
  return args.status === 'trialing' ? 'trial' : 'pro';
}

export function captureTeacherOnboardingFunnel(
  event: TeacherOnboardingFunnelEvent,
  props: TeacherFunnelProps
): void {
  try {
    posthog.capture(event, { locale: props.locale, plan: props.plan });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[teacherOnboardingFunnel] capture failed', { event, err });
    }
  }
}

const ONBOARDING_VIEWED_STORAGE_KEY = 'lexi_edu_teacher_onboarding_viewed_at';

/**
 * Fire `teacher_onboarding_viewed` at most once per browser. "First view" is
 * a once-ever step, not a pageview; without the flag every dashboard visit
 * would count as an onboarding. A blocked storage still fires — a rare double
 * beats a silent zero.
 */
export function captureTeacherOnboardingViewedOnce(props: TeacherFunnelProps): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(ONBOARDING_VIEWED_STORAGE_KEY)) {
      return false;
    }
  } catch {
    /* storage blocked — count it */
  }
  captureTeacherOnboardingFunnel(TEACHER_ONBOARDING_FUNNEL_EVENTS.teacherOnboardingViewed, props);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_VIEWED_STORAGE_KEY, String(Date.now()));
    }
  } catch {
    /* best effort */
  }
  return true;
}

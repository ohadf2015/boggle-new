/**
 * Teacher ACTIVATION funnel — the ordered steps between teacher approval and a
 * class that is actually running: onboarding viewed → first classroom created →
 * first assignment created, with `teacher_activation_funnel_completed` marking
 * the terminal state (first assignment created while the teacher already has a
 * classroom).
 *
 * WHY NEW NAMES: `classroom_created` / `assignment_created` fire on EVERY
 * create, so PostHog cannot order them into an activation funnel, and nothing
 * marked completion. These events carry a stable `step_index` and fire at most
 * once per teacher — DB-counted on the create paths, storage-keyed per teacher
 * id for onboarding — so a PostHog funnel + Growth Radar run_funnel can measure
 * where approved teachers stall before the Teacher Pro ask.
 *
 * Mechanics mirror captureActivation in telemetry.ts: the bare posthog.capture
 * is canonical, then trackGrowthEvent mirrors the same name + props into
 * Growth Radar's growth:* stream. Deliberately NOT in CANONICAL_DUAL_EMIT in
 * growthTracking.ts — the bare capture here is the only PostHog emission, a
 * dual-emit would double-count. Never throws.
 *
 * CLIENT-ONLY MODULE: do not import @/lib/posthog (posthog-node), anything
 * under backend/, or @/lib/subscriptions here — this file is reachable from
 * webpack client bundles and node builtins break CI build.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';
import { trackGrowthEvent, type GrowthEvent } from '@/utils/growthTracking';
import type { TeacherPlan } from './teacherOnboardingFunnel';
import {
  TEACHER_ACTIVATION_FUNNEL_EVENTS,
  TEACHER_ACTIVATION_STEP_INDEX,
  type TeacherActivationFunnelEventName,
  type TeacherActivationStep,
} from './teacherActivationFunnelEvents';

export {
  TEACHER_ACTIVATION_FUNNEL_EVENTS,
  TEACHER_ACTIVATION_STEP_INDEX,
} from './teacherActivationFunnelEvents';
export type {
  TeacherActivationFunnelEventName,
  TeacherActivationStep,
} from './teacherActivationFunnelEvents';

export interface TeacherActivationFunnelProps {
  /** UI locale. Omitted rather than faked when the caller has no locale read. */
  locale?: string;
  /** Entitlement slice. Omitted rather than faked — a missing key is not plan=free. */
  plan?: TeacherPlan;
}

function funnelProps(props: TeacherActivationFunnelProps): Record<string, unknown> {
  return {
    ...(props.locale !== undefined ? { locale: props.locale } : {}),
    ...(props.plan !== undefined ? { plan: props.plan } : {}),
  };
}

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[teacherActivationFunnel] capture failed', { event, err });
    }
  }
};

/** Same event, same props, into Growth Radar's growth:* stream. Never throws. */
function mirrorToGrowth(event: GrowthEvent, props: Record<string, unknown>): void {
  try {
    trackGrowthEvent(event, { ...props });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[teacherActivationFunnel] growth mirror failed', { event, err });
    }
  }
}

/** Bare PostHog capture + growth:* twin, same as captureActivation in telemetry.ts. */
function captureFunnelEvent(event: TeacherActivationFunnelEventName, props: Record<string, unknown>): void {
  safeCapture(event, props);
  mirrorToGrowth(event, props);
}

/**
 * Fire one ordered funnel step. Every step rides the SAME event name with a
 * `step` / `step_index` discriminator so PostHog's funnel view can order them.
 */
export function captureTeacherActivationFunnelStep(
  step: TeacherActivationStep,
  props: TeacherActivationFunnelProps,
): void {
  captureFunnelEvent(TEACHER_ACTIVATION_FUNNEL_EVENTS.step, {
    step,
    step_index: TEACHER_ACTIVATION_STEP_INDEX[step],
    ...funnelProps(props),
  });
}

/** Fire the funnel's terminal event (first assignment while owning a classroom). */
export function captureTeacherActivationFunnelCompleted(props: TeacherActivationFunnelProps): void {
  captureFunnelEvent(TEACHER_ACTIVATION_FUNNEL_EVENTS.completed, funnelProps(props));
}

/**
 * Storage prefix for the onboarding step's once-per-teacher latch. The FULL key
 * includes the teacher id — one key per teacher — so a different teacher signing
 * into the same browser fires again. Deliberately distinct from
 * `lexi_edu_teacher_onboarding_viewed_at`, which stays once-per-browser and
 * remains owned by teacherOnboardingFunnel.ts.
 */
export const TEACHER_ACTIVATION_ONBOARDING_KEY_PREFIX = 'lexi_edu_teacher_activation_onboarding_';

export function teacherActivationOnboardingStorageKey(teacherId: string): string {
  return `${TEACHER_ACTIVATION_ONBOARDING_KEY_PREFIX}${teacherId}`;
}

/**
 * Fire the onboarding step (step_index 1) at most once per teacher id. A blocked
 * storage still fires — a rare double beats a silent zero. Without a teacher id
 * there is nothing to dedupe against, so nothing fires (the dashboard gates on
 * the id before calling).
 */
export function captureTeacherActivationOnboardingOnce(
  teacherId: string | null | undefined,
  props: TeacherActivationFunnelProps,
): boolean {
  if (!teacherId) return false;
  const key = teacherActivationOnboardingStorageKey(teacherId);
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(key)) {
      return false;
    }
  } catch {
    /* storage blocked — count it */
  }
  captureTeacherActivationFunnelStep('onboarding', props);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, String(Date.now()));
    }
  } catch {
    /* best effort */
  }
  return true;
}

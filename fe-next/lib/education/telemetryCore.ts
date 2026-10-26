/** Capture plumbing shared by the education telemetry modules. Never throws. */
import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';
import { trackGrowthEvent, type GrowthEvent } from '@/utils/growthTracking';

type Capture = (event: string, props?: Record<string, unknown>) => void;
type Register = (props: Record<string, unknown>) => void;

export const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[eduTelemetry] capture failed', { event, err });
    }
  }
};

/**
 * Teacher classroom ACTIVATION funnel (t_44f87dd2) — the steps before every
 * Teacher Pro ask: class created → join code shown/copied → first student →
 * live game. These already reach PostHog as bare `edu_*` names, but Growth
 * Radar's ingest accepts only `growth:*` (plus a small bare-game allowlist),
 * so run_funnel was blind to exactly where activation stalls. Mirroring the
 * allowlist below through trackGrowthEvent lands them as `growth:<name>` with
 * identical props. Deliberately NOT added to CANONICAL_DUAL_EMIT in
 * growthTracking.ts — the bare PostHog capture right here is the canonical
 * one, dual-emit would double-count.
 */
const ACTIVATION_GROWTH_MIRROR = new Set<GrowthEvent>([
  'edu_classroom_create_ui_done',
  'edu_join_code_shown',
  'edu_join_code_copied',
  'edu_join_code_shared',
  'edu_first_student_seen',
  'edu_classroom_join',
  'edu_live_game_started',
  'edu_teacher_onboarding_step',
  'edu_first_assignment_cta_shown',
  'edu_first_assignment_cta_clicked',
  'edu_digest_viewed',
  'edu_digest_upgrade_cta_clicked',
]);

/** Same event, same props, into Growth Radar's growth:* stream. Never throws. */
function mirrorToGrowth(event: GrowthEvent, props: Record<string, unknown>): void {
  try {
    trackGrowthEvent(event, { ...props });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[eduTelemetry] growth mirror failed', { event, err });
    }
  }
}

/**
 * Student JOIN funnel — opened the invite → join POST → membership written.
 * Same mirror mechanics as the activation allowlist above: the bare PostHog
 * capture in this file is the canonical one and the growth:* twin is what
 * Growth Radar ingests. Deliberately NOT in CANONICAL_DUAL_EMIT (that would
 * double-count PostHog). Privacy: classroom_id only — the join code never
 * rides either event.
 */
const JOIN_FUNNEL_GROWTH_MIRROR = new Set<GrowthEvent>([
  'student_join_started',
  'student_join_completed',
]);

/** Capture a student-join funnel event: the bare PostHog name plus the growth:* twin. */
export const captureStudentJoin = (event: GrowthEvent, props: Record<string, unknown>): void => {
  safeCapture(event, props);
  if (JOIN_FUNNEL_GROWTH_MIRROR.has(event)) {
    mirrorToGrowth(event, props);
  }
};

/**
 * Capture an activation-funnel event: the bare PostHog name (unchanged — every
 * existing dashboard keeps working) plus the growth:* twin when the event is
 * on the activation allowlist. A failure in either channel never reaches the
 * caller and never blocks the other.
 */
export const captureActivation = (event: GrowthEvent, props: Record<string, unknown>): void => {
  safeCapture(event, props);
  if (ACTIVATION_GROWTH_MIRROR.has(event)) {
    mirrorToGrowth(event, props);
  }
};

export const safeRegister: Register = (props) => {
  try {
    (posthog.register as unknown as Register)(props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[eduTelemetry] register failed', { err });
    }
  }
};

// Every copy/launch surface reports here, so the activation checklist is saved here too.
export function persistTeacherActivation(patch: { inviteCopied?: true; liveStarted?: true }): void {
  if (typeof fetch !== 'function') return;
  fetch('/api/education/teacher/activation', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).catch(() => {});
}

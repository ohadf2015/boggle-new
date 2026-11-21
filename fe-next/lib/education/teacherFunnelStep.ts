/**
 * Names for the Teacher Pro paying-teacher funnel.
 *
 * One event, `teacher_funnel_step`, with `step` in this order. Server emission
 * is canonical (captureEduServerEvents + growth: twin). The two client steps
 * have no server write of their own; the real gate beacons them and the
 * funnel-step route emits. The other four steps are emitted by the write that
 * makes them true — never by a declared client capture.
 */

export const TEACHER_FUNNEL_STEP_EVENT = 'teacher_funnel_step';

export const TEACHER_FUNNEL_STEPS = [
  'teacher_approved',
  'onboarding_completed',
  'classroom_created',
  'first_assignment_created',
  'students_joined',
  'trial_started',
] as const;

export type TeacherFunnelStep = (typeof TEACHER_FUNNEL_STEPS)[number];

export const TEACHER_FUNNEL_STEP_INDEX: Record<TeacherFunnelStep, number> = {
  teacher_approved: 1,
  onboarding_completed: 2,
  classroom_created: 3,
  first_assignment_created: 4,
  students_joined: 5,
  trial_started: 6,
};

/** Steps a signed-in teacher may beacon. Approval, class, join and trial are server writes. */
export const CLIENT_TEACHER_FUNNEL_STEPS = ['onboarding_completed', 'first_assignment_created'] as const;

export type ClientTeacherFunnelStep = (typeof CLIENT_TEACHER_FUNNEL_STEPS)[number];

export function isClientTeacherFunnelStep(step: unknown): step is ClientTeacherFunnelStep {
  return step === 'onboarding_completed' || step === 'first_assignment_created';
}

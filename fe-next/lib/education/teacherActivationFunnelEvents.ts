/**
 * Zero-dependency names for the teacher activation funnel.
 *
 * Lives in its own file so the classroom-create route's server builder can
 * import the strings without pulling teacherActivationFunnel.ts (posthog-js,
 * growthTracking, and the rest of the client graph) into the API route bundle.
 * A posthog-js / client-only import on that route breaks the CI server build
 * the same way posthog-node in a client module does.
 */

export const TEACHER_ACTIVATION_FUNNEL_EVENTS = {
  /** Ordered funnel step. Props: step, step_index, locale?, plan? */
  step: 'teacher_activation_funnel_step',
  /** Terminal state: first assignment created while owning >= 1 classroom. */
  completed: 'teacher_activation_funnel_completed',
} as const;

export type TeacherActivationFunnelEventName =
  (typeof TEACHER_ACTIVATION_FUNNEL_EVENTS)[keyof typeof TEACHER_ACTIVATION_FUNNEL_EVENTS];

/** The three activation steps, in funnel order. */
export type TeacherActivationStep = 'onboarding' | 'first_classroom' | 'first_assignment';

export const TEACHER_ACTIVATION_STEP_INDEX: Record<TeacherActivationStep, number> = {
  onboarding: 1,
  first_classroom: 2,
  first_assignment: 3,
};

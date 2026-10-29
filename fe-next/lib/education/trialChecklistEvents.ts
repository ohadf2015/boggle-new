/**
 * Zero-dependency names and step indices for the Teacher Pro Day-0 trial
 * activation checklist.
 *
 * Lives in its own file so server routes and tests can import the strings
 * without pulling posthog-js or growthTracking into the server bundle.
 */

export const TRIAL_CHECKLIST_SHOWN = 'trial_checklist_shown' as const;
export const TRIAL_CHECKLIST_STEP_COMPLETED = 'trial_checklist_step_completed' as const;
export const TRIAL_CHECKLIST_ALL_COMPLETED = 'trial_checklist_all_completed' as const;

export const TRIAL_CHECKLIST_EVENTS = {
  /** Fired once per teacher id when the banner becomes visible. Props: locale?, plan: 'trial', done_count. */
  shown: TRIAL_CHECKLIST_SHOWN,
  /** Fired once per step per teacher id when a step transitions to done. Props: step, step_index, locale?, plan: 'trial'. */
  stepCompleted: TRIAL_CHECKLIST_STEP_COMPLETED,
  /** Fired once when all three steps are done. Props: locale?, plan: 'trial'. */
  allCompleted: TRIAL_CHECKLIST_ALL_COMPLETED,
} as const;

export type TrialChecklistEventName =
  (typeof TRIAL_CHECKLIST_EVENTS)[keyof typeof TRIAL_CHECKLIST_EVENTS];

export type TrialChecklistStepId =
  | 'create_classroom'
  | 'invite_students'
  | 'first_assignment';

export const TRIAL_CHECKLIST_STEP_ORDER: readonly TrialChecklistStepId[] = [
  'create_classroom',
  'invite_students',
  'first_assignment',
] as const;

export const TRIAL_CHECKLIST_STEP_INDEX: Record<TrialChecklistStepId, 1 | 2 | 3> = {
  create_classroom: 1,
  invite_students: 2,
  first_assignment: 3,
};

/**
 * Server-persisted Teacher Pro Day-0 trial activation checklist progress
 * and pure step/visibility derivation.
 *
 * Timestamps on `public.profiles` are the source of truth for dismiss and
 * completion. A missing column (migration not applied) must look like
 * "nothing persisted", never a crash that hides the checklist.
 *
 * Zero client-only dependencies so API routes can import this module safely.
 */

import {
  TRIAL_CHECKLIST_ALL_COMPLETED,
  TRIAL_CHECKLIST_EVENTS,
  TRIAL_CHECKLIST_SHOWN,
  TRIAL_CHECKLIST_STEP_COMPLETED,
  TRIAL_CHECKLIST_STEP_INDEX,
  TRIAL_CHECKLIST_STEP_ORDER,
  type TrialChecklistEventName,
  type TrialChecklistStepId,
} from './trialChecklistEvents';

export {
  TRIAL_CHECKLIST_ALL_COMPLETED,
  TRIAL_CHECKLIST_EVENTS,
  TRIAL_CHECKLIST_SHOWN,
  TRIAL_CHECKLIST_STEP_COMPLETED,
  TRIAL_CHECKLIST_STEP_INDEX,
  TRIAL_CHECKLIST_STEP_ORDER,
} from './trialChecklistEvents';
export type {
  TrialChecklistEventName,
  TrialChecklistStepId,
} from './trialChecklistEvents';

export type TrialChecklistStatus = 'done' | 'current' | 'todo';

export interface TrialChecklistProgress {
  dismissed: boolean;
  completed: boolean;
}

export const EMPTY_TRIAL_CHECKLIST_PROGRESS: TrialChecklistProgress = {
  dismissed: false,
  completed: false,
};

export const TRIAL_CHECKLIST_PROFILE_COLUMNS = [
  'teacher_trial_checklist_dismissed_at',
  'teacher_trial_checklist_completed_at',
] as const;

export type TrialChecklistProfileRow = {
  teacher_trial_checklist_dismissed_at?: string | null;
  teacher_trial_checklist_completed_at?: string | null;
};

export function progressFromProfileRow(
  row: TrialChecklistProfileRow | null | undefined,
): TrialChecklistProgress {
  if (!row) return { ...EMPTY_TRIAL_CHECKLIST_PROGRESS };
  return {
    dismissed: Boolean(row.teacher_trial_checklist_dismissed_at),
    completed: Boolean(row.teacher_trial_checklist_completed_at),
  };
}

export const trialProgressFromProfileRow = progressFromProfileRow;

export type TrialChecklistPatch = {
  dismissed?: boolean;
  completed?: boolean;
};

/** Merge a patch onto existing progress. Flags only turn on, never off. */
export function applyTrialChecklistPatch(
  current: TrialChecklistProgress,
  patch: TrialChecklistPatch,
): TrialChecklistProgress {
  return {
    dismissed: patch.dismissed === true ? true : current.dismissed,
    completed: patch.completed === true ? true : current.completed,
  };
}

export function profileUpdateFromPatch(
  patch: TrialChecklistPatch,
  nowIso: string,
): Partial<TrialChecklistProfileRow> {
  const update: Partial<TrialChecklistProfileRow> = {};
  if (patch.dismissed === true) {
    update.teacher_trial_checklist_dismissed_at = nowIso;
  }
  if (patch.completed === true) {
    update.teacher_trial_checklist_completed_at = nowIso;
  }
  return update;
}

export const trialProfileUpdateFromPatch = profileUpdateFromPatch;

export interface TrialChecklistInput {
  /** Provider status from useTeacherPro(). Only 'trialing' (Polar trial) qualifies. */
  status?: string | null;
  /** True only after a successful status read in useTeacherPro(). */
  known?: boolean;
  /** True while useTeacherPro() is still loading. */
  loading?: boolean;
  /** Access trial expiration (different product moment; never qualifies on its own). */
  accessTrialExpires?: string | null;
  /** Number of classrooms owned by the teacher. */
  classroomCount?: number;
  /** Optional classroom list (used to derive classroomCount and member_count > 0 if passed). */
  classrooms?: readonly { member_count?: number | null }[];
  /** Existing activation flag from teacher_activation_invite_copied_at. */
  inviteCopied?: boolean;
  /** Optional per-classroom student counts. */
  memberCounts?: readonly (number | null | undefined)[];
  /** Optional explicit flag when any classroom has member_count > 0. */
  hasStudents?: boolean;
  /**
   * Head count of lesson_assignments for the teacher's classroom ids.
   * Null or undefined when still loading or when the read failed (never a false complete).
   */
  assignmentCount?: number | null;
  /** True while the lesson_assignments count read is still in flight. */
  assignmentsLoading?: boolean;
  /** True when the lesson_assignments count read failed. */
  assignmentsError?: boolean;
  /** Persisted teacher_trial_checklist_dismissed_at flag. */
  dismissed?: boolean;
  /** Persisted teacher_trial_checklist_completed_at flag. */
  completed?: boolean;
}

export interface TrialChecklistStep {
  id: TrialChecklistStepId;
  index: 1 | 2 | 3;
  status: TrialChecklistStatus;
  done: boolean;
}

export interface TrialChecklistState {
  steps: TrialChecklistStep[];
  current: TrialChecklistStepId | null;
  doneCount: number;
  /** True when all 3 steps are currently done in this session. */
  allStepsDone: boolean;
  /** True when all 3 steps are done OR completed_at was already persisted on load. */
  complete: boolean;
  /** Show banner only for known, non-loading Polar trialing teachers who haven't dismissed or completed it. */
  visible: boolean;
}

export type TrialChecklist = TrialChecklistState;

export function deriveTrialChecklist(input: TrialChecklistInput): TrialChecklistState {
  // A passed classroom list is evidence of classrooms. Callers often spread a
  // zero classroomCount default and then pass `classrooms` — an explicit 0 must
  // not hide that list, or create_classroom stays current while students exist.
  const listedClassroomCount = input.classrooms?.length ?? 0;
  const explicitClassroomCount =
    typeof input.classroomCount === 'number' ? input.classroomCount : 0;
  const classroomCount = Math.max(explicitClassroomCount, listedClassroomCount);

  const anyMemberFromClassrooms =
    input.classrooms?.some((c) => (c.member_count ?? 0) > 0) ?? false;
  const anyMemberFromCounts =
    input.memberCounts?.some((n) => (n ?? 0) > 0) ?? false;
  const hasAnyStudents =
    input.hasStudents === true || anyMemberFromClassrooms || anyMemberFromCounts;

  const assignmentsReady =
    !input.assignmentsLoading &&
    !input.assignmentsError &&
    typeof input.assignmentCount === 'number';

  const done: Record<TrialChecklistStepId, boolean> = {
    create_classroom: classroomCount >= 1,
    invite_students: Boolean(input.inviteCopied) || hasAnyStudents,
    first_assignment: assignmentsReady && (input.assignmentCount as number) >= 1,
  };

  const current = TRIAL_CHECKLIST_STEP_ORDER.find((id) => !done[id]) ?? null;
  const steps: TrialChecklistStep[] = TRIAL_CHECKLIST_STEP_ORDER.map((id) => ({
    id,
    index: TRIAL_CHECKLIST_STEP_INDEX[id],
    status: (done[id] ? 'done' : id === current ? 'current' : 'todo') as TrialChecklistStatus,
    done: done[id],
  }));

  const doneCount = TRIAL_CHECKLIST_STEP_ORDER.filter((id) => done[id]).length;
  const allStepsDone = current === null;
  const complete = allStepsDone || Boolean(input.completed);
  const isTrialing =
    input.status === 'trialing' &&
    input.known === true &&
    input.loading !== true;

  return {
    steps,
    current,
    doneCount,
    allStepsDone,
    complete,
    visible: isTrialing && !input.dismissed && !complete,
  };
}

export const trialChecklist = deriveTrialChecklist;

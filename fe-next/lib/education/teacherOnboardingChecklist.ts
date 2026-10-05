/**
 * Teacher onboarding checklist — which of the four activation steps is honest.
 *
 * Order is the product: create classroom → first assignment → copy invite
 * → start live class. Dogfooding showed teachers stall on the assignment
 * after creating a class, so assignment is second even with an empty roster
 * (unlike `teacherActivationStep`, which asks to share first).
 *
 * Pure on purpose. A failed assignment or last-game read must arrive as
 * `null`, never as `0` / `false` — otherwise a blip nags a teacher who already
 * did the work (pitfall class 4: a failure wearing a fact's clothes).
 *
 * `inviteCopied` / `liveStarted` are server-persisted completions. They never
 * un-tick a step that live data already proved (roster / a played game).
 */

export const TEACHER_ONBOARDING_STEPS = [
  'create_classroom',
  'create_first_assignment',
  'share_join_link',
  'start_live_class',
] as const;

export type TeacherOnboardingStepId = (typeof TEACHER_ONBOARDING_STEPS)[number];

export type TeacherOnboardingStepStatus = 'done' | 'todo' | 'unknown';

export interface TeacherOnboardingChecklistInput {
  classroomCount: number;
  /** `null` = unknown (loading or the read failed). Never coerce a failure to 0. */
  assignmentCount: number | null;
  rosterCount: number;
  /**
   * `null` = unknown last-game read. `false` = known empty. `true` = at least one live game.
   * Prefer this name; `hasProgressReport` is accepted as an alias for older call sites.
   */
  hasLiveClass?: boolean | null;
  /** @deprecated Use hasLiveClass. Kept so HQ tools wrappers compile during the rename. */
  hasProgressReport?: boolean | null;
  /** Server flag: teacher copied the student invite. */
  inviteCopied?: boolean;
  /** Server flag: teacher started a live class from the checklist. */
  liveStarted?: boolean;
}

export interface TeacherOnboardingStepState {
  id: TeacherOnboardingStepId;
  status: TeacherOnboardingStepStatus;
}

export interface TeacherOnboardingChecklist {
  steps: TeacherOnboardingStepState[];
  /** First `todo` step. An `unknown` step blocks later steps from becoming current. */
  current: TeacherOnboardingStepId | null;
  doneCount: number;
  complete: boolean;
}

function classroomStatus(classroomCount: number): TeacherOnboardingStepStatus {
  return classroomCount >= 1 ? 'done' : 'todo';
}

function assignmentStatus(
  classroomCount: number,
  assignmentCount: number | null,
): TeacherOnboardingStepStatus {
  if (classroomCount < 1) return 'todo';
  if (assignmentCount === null) return 'unknown';
  return assignmentCount >= 1 ? 'done' : 'todo';
}

function shareStatus(
  classroomCount: number,
  rosterCount: number,
  inviteCopied: boolean | undefined,
): TeacherOnboardingStepStatus {
  if (classroomCount < 1) return 'todo';
  if (inviteCopied === true || rosterCount >= 1) return 'done';
  return 'todo';
}

function liveStatus(
  classroomCount: number,
  hasLiveClass: boolean | null,
  liveStarted: boolean | undefined,
): TeacherOnboardingStepStatus {
  if (classroomCount < 1) return 'todo';
  if (liveStarted === true || hasLiveClass === true) return 'done';
  if (hasLiveClass === null) return 'unknown';
  return 'todo';
}

function resolveHasLiveClass(input: TeacherOnboardingChecklistInput): boolean | null {
  if (input.hasLiveClass !== undefined) return input.hasLiveClass;
  if (input.hasProgressReport !== undefined) return input.hasProgressReport;
  return false;
}

export function teacherOnboardingChecklist(
  input: TeacherOnboardingChecklistInput,
): TeacherOnboardingChecklist {
  const hasLiveClass = resolveHasLiveClass(input);
  const steps: TeacherOnboardingStepState[] = [
    { id: 'create_classroom', status: classroomStatus(input.classroomCount) },
    {
      id: 'create_first_assignment',
      status: assignmentStatus(input.classroomCount, input.assignmentCount),
    },
    {
      id: 'share_join_link',
      status: shareStatus(input.classroomCount, input.rosterCount, input.inviteCopied),
    },
    {
      id: 'start_live_class',
      status: liveStatus(input.classroomCount, hasLiveClass, input.liveStarted),
    },
  ];

  let current: TeacherOnboardingStepId | null = null;
  for (const step of steps) {
    if (step.status === 'unknown') break;
    if (step.status === 'todo') {
      current = step.id;
      break;
    }
  }

  const doneCount = steps.filter((step) => step.status === 'done').length;
  return {
    steps,
    current,
    doneCount,
    complete: doneCount === steps.length,
  };
}

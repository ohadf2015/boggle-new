/**
 * Teacher onboarding checklist — which of the four activation steps is honest.
 *
 * Order is the product: create classroom → first assignment → share join link
 * → first progress report. Dogfooding showed teachers stall on the assignment
 * after creating a class, so assignment is second even with an empty roster
 * (unlike `teacherActivationStep`, which asks to share first).
 *
 * Pure on purpose. A failed assignment or last-game read must arrive as
 * `null`, never as `0` / `false` — otherwise a blip nags a teacher who already
 * did the work (pitfall class 4: a failure wearing a fact's clothes).
 */

export const TEACHER_ONBOARDING_STEPS = [
  'create_classroom',
  'create_first_assignment',
  'share_join_link',
  'view_first_progress_report',
] as const;

export type TeacherOnboardingStepId = (typeof TEACHER_ONBOARDING_STEPS)[number];

export type TeacherOnboardingStepStatus = 'done' | 'todo' | 'unknown';

export interface TeacherOnboardingChecklistInput {
  classroomCount: number;
  /** `null` = unknown (loading or the read failed). Never coerce a failure to 0. */
  assignmentCount: number | null;
  rosterCount: number;
  /** `null` = unknown last-game read. `false` = known empty. `true` = at least one game. */
  hasProgressReport: boolean | null;
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

function shareStatus(classroomCount: number, rosterCount: number): TeacherOnboardingStepStatus {
  if (classroomCount < 1) return 'todo';
  return rosterCount >= 1 ? 'done' : 'todo';
}

function reportStatus(
  classroomCount: number,
  hasProgressReport: boolean | null,
): TeacherOnboardingStepStatus {
  if (classroomCount < 1) return 'todo';
  if (hasProgressReport === null) return 'unknown';
  return hasProgressReport ? 'done' : 'todo';
}

export function teacherOnboardingChecklist(
  input: TeacherOnboardingChecklistInput,
): TeacherOnboardingChecklist {
  const steps: TeacherOnboardingStepState[] = [
    { id: 'create_classroom', status: classroomStatus(input.classroomCount) },
    {
      id: 'create_first_assignment',
      status: assignmentStatus(input.classroomCount, input.assignmentCount),
    },
    { id: 'share_join_link', status: shareStatus(input.classroomCount, input.rosterCount) },
    {
      id: 'view_first_progress_report',
      status: reportStatus(input.classroomCount, input.hasProgressReport),
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

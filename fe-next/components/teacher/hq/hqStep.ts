export type HqStep = 'loading' | 'error' | 'createClass' | 'getStudents' | 'goLive';

export interface HqStepInput {
  classroomsLoading: boolean;
  classroomsError: boolean;
  classroomCount: number;
  /** A class was created on this visit: its fresh code stays the focus. */
  justCreatedClass: boolean;
  hasSelectedClass: boolean;
  /** From the class list (`member_count`), never the live roster read. */
  studentCount: number;
  /** Null while the read is open. */
  assignmentCount: number | null;
  hasActiveRoom: boolean;
}

export interface HqStepResult {
  step: HqStep;
  /** Students in, nothing assigned or live yet: homework is the quiet alternative to GO LIVE. */
  offerFirstAssignment: boolean;
}

/** Teacher HQ's one primary action, chosen by where the class is. */
export function pickHqStep(input: HqStepInput): HqStepResult {
  const none = (step: HqStep): HqStepResult => ({ step, offerFirstAssignment: false });
  if (input.classroomsLoading) return none('loading');
  if (input.classroomsError) return none('error');
  if (input.classroomCount === 0 || input.justCreatedClass) return none('createClass');
  if (!input.hasSelectedClass) return none('loading');
  if (input.studentCount < 1) return none('getStudents');
  return {
    step: 'goLive',
    offerFirstAssignment: input.assignmentCount === 0 && !input.hasActiveRoom,
  };
}

export function showLauncher(input: { armed: boolean; justCreatedClass: boolean }): boolean {
  return input.armed || input.justCreatedClass;
}

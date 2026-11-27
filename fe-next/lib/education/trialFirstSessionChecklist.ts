/**
 * First-session activation for a Polar Teacher Pro trial.
 *
 * Four steps, in order: create a classroom, add the first students, create
 * the first assignment, run or schedule the first live game. Pure so the
 * dashboard, the trial welcome, and starter packs share one answer.
 *
 * This is not a second onboarding. Teachers with no class already see Home's
 * first-run card, so the persistent checklist stays hidden until a class
 * exists. The welcome modal still points at the current step.
 *
 * Zero client dependencies. Do not import posthog-js here.
 */

import { teacherAssignHref } from '@/hooks/useTeacherDashboardDeepLink';
import { teacherHostHref } from './teacherHostHref';

export const TEACHER_ACTIVATION_STEP_COMPLETED = 'teacher_activation_step_completed' as const;

export type TrialFirstSessionStepId =
  | 'create_classroom'
  | 'add_students'
  | 'create_assignment'
  | 'first_live_game';

export const TRIAL_FIRST_SESSION_STEP_ORDER: readonly TrialFirstSessionStepId[] = [
  'create_classroom',
  'add_students',
  'create_assignment',
  'first_live_game',
] as const;

export const TRIAL_FIRST_SESSION_STEP_INDEX: Record<TrialFirstSessionStepId, 1 | 2 | 3 | 4> = {
  create_classroom: 1,
  add_students: 2,
  create_assignment: 3,
  first_live_game: 4,
};

/** HogQL fragment for reads of teacher_activation_step_completed. */
export const TEACHER_ACTIVATION_ANALYTICS_EXCLUSIONS = {
  cookielessPrefix: 'cookieless_',
  testUserPrefixes: ['14f10c13', '1f0715b5'],
} as const;

/**
 * Exclude cookieless captures and the two known test users from analytics
 * reads. Prefix match: those ids are stored as UUID prefixes.
 */
export function teacherActivationAnalyticsWhere(): string {
  const testUsers = TEACHER_ACTIVATION_ANALYTICS_EXCLUSIONS.testUserPrefixes
    .flatMap((id) => [
      `NOT startsWith(person_id, '${id}')`,
      `NOT startsWith(distinct_id, '${id}')`,
    ])
    .join(' AND ');
  return `NOT startsWith(distinct_id, 'cookieless_') AND ${testUsers}`;
}

export type TrialFirstSessionStatus = 'done' | 'current' | 'todo';

export interface TrialFirstSessionStep {
  id: TrialFirstSessionStepId;
  index: 1 | 2 | 3 | 4;
  status: TrialFirstSessionStatus;
  done: boolean;
}

export interface TrialFirstSessionInput {
  /** Provider status. Only Polar `trialing` qualifies. */
  status?: string | null;
  known?: boolean;
  loading?: boolean;
  classroomCount?: number;
  classrooms?: readonly { id?: string; member_count?: number | null }[];
  /**
   * Copied the join code. Does not complete add_students — a student has to
   * actually join. Accepted so callers can pass the activation flag without
   * it silently counting as progress.
   */
  inviteCopied?: boolean;
  hasStudents?: boolean;
  assignmentCount?: number | null;
  assignmentsLoading?: boolean;
  assignmentsError?: boolean;
  /** Server stamp: a real 2+ player round completed. */
  liveStarted?: boolean;
  gamesPlayed?: number;
  /** Teacher scheduled a live game through an existing class-day flow. */
  scheduledLive?: boolean;
  dismissed?: boolean;
}

export interface TrialFirstSessionState {
  steps: TrialFirstSessionStep[];
  current: TrialFirstSessionStepId | null;
  doneCount: number;
  allStepsDone: boolean;
  /**
   * Persistent checklist on the dashboard and in starter packs. Hidden until
   * a class exists so it does not sit beside Home's no-class onboarding card.
   */
  visible: boolean;
  /** Current step the trial welcome should deep-link, or null when it should not. */
  welcomePointsAt: TrialFirstSessionStepId | null;
}

export interface TrialFirstSessionHrefs {
  create_classroom: string;
  add_students: string;
  create_assignment: string;
  first_live_game: string;
  /** Class-ready screen: show the code, start when the class is in the room. */
  schedule_live_game: string;
}

function classroomCountOf(input: TrialFirstSessionInput): number {
  const listed = input.classrooms?.length ?? 0;
  const explicit = typeof input.classroomCount === 'number' ? input.classroomCount : 0;
  return Math.max(explicit, listed);
}

function hasStudentsOf(input: TrialFirstSessionInput): boolean {
  if (input.hasStudents === true) return true;
  return input.classrooms?.some((room) => (room.member_count ?? 0) > 0) ?? false;
}

export function deriveTrialFirstSession(input: TrialFirstSessionInput): TrialFirstSessionState {
  const classroomCount = classroomCountOf(input);
  const assignmentsReady =
    !input.assignmentsLoading &&
    !input.assignmentsError &&
    typeof input.assignmentCount === 'number';

  const done: Record<TrialFirstSessionStepId, boolean> = {
    create_classroom: classroomCount >= 1,
    add_students: hasStudentsOf(input),
    create_assignment: assignmentsReady && (input.assignmentCount as number) >= 1,
    first_live_game:
      input.liveStarted === true || (input.gamesPlayed ?? 0) > 0 || input.scheduledLive === true,
  };

  const current = TRIAL_FIRST_SESSION_STEP_ORDER.find((id) => !done[id]) ?? null;
  const steps: TrialFirstSessionStep[] = TRIAL_FIRST_SESSION_STEP_ORDER.map((id) => ({
    id,
    index: TRIAL_FIRST_SESSION_STEP_INDEX[id],
    status: (done[id] ? 'done' : id === current ? 'current' : 'todo') as TrialFirstSessionStatus,
    done: done[id],
  }));
  const allStepsDone = current === null;
  const isTrialing = input.status === 'trialing' && input.known === true && input.loading !== true;
  const open = isTrialing && !input.dismissed && !allStepsDone;

  return {
    steps,
    current,
    doneCount: TRIAL_FIRST_SESSION_STEP_ORDER.filter((id) => done[id]).length,
    allStepsDone,
    visible: open && classroomCount >= 1,
    welcomePointsAt: open ? current : null,
  };
}

/** Deep links into flows that already exist. No new routes. */
export function trialFirstSessionHrefs(
  locale: string,
  classroomId: string | null,
): TrialFirstSessionHrefs {
  const newClass = `/${locale}/teacher/classroom/new`;
  const classReady = classroomId
    ? `${newClass}?classroomId=${encodeURIComponent(classroomId)}`
    : newClass;
  return {
    create_classroom: newClass,
    add_students: classReady,
    create_assignment: classroomId ? teacherAssignHref(locale, classroomId) : newClass,
    first_live_game: teacherHostHref(locale, {
      ...(classroomId ? { classroomId } : {}),
      minutes: 2,
    }),
    schedule_live_game: classReady,
  };
}

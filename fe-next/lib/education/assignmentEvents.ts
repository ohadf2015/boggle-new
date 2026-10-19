/**
 * Funnel events the class progress report already keys off:
 * `assignment_created` (teacher) and `assignment_completed` (student).
 *
 * Keep the names bare — Growth Radar / HQ progress strip grep these exact
 * strings. Do not prefix with edu_ here.
 */

/**
 * Client-safe funnel events. Do not import `@/lib/posthog` (posthog-node)
 * from this file — teacher dashboard client components import it, and
 * webpack then fails on `node:` builtins. Server capture lives in
 * `assignmentEvents.server.ts`.
 */
import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';
import type { TeacherPlan } from './teacherOnboardingFunnel';

export const ASSIGNMENT_CREATED = 'assignment_created';
export const ASSIGNMENT_COMPLETED = 'assignment_completed';

export interface AssignmentCreatedProps {
  classroom_id: string;
  assignment_id?: string;
  kind: 'lesson' | 'word_count' | 'word_list';
  due_date?: string | null;
  word_count_target?: number | null;
  word_list_length?: number | null;
  /** UI locale. The onboarding funnel slices assignment_created by this. */
  locale?: string;
  /** Entitlement slice. Omit only when the caller has no entitlement read. */
  plan?: TeacherPlan;
}

export interface AssignmentCompletedProps {
  classroom_id?: string | null;
  assignment_id: string;
  student_id: string;
  kind?: 'lesson' | 'word_count' | 'word_list';
}

export function assignmentCreatedProperties(args: AssignmentCreatedProps): Record<string, unknown> {
  return {
    classroom_id: args.classroom_id,
    assignment_id: args.assignment_id ?? null,
    kind: args.kind,
    due_date: args.due_date ?? null,
    word_count_target: args.word_count_target ?? null,
    word_list_length: args.word_list_length ?? null,
    // Funnel slices. Omitted when the caller has no read — a missing key is
    // not plan=free, and a null would invent a fifth slice.
    ...(args.locale !== undefined ? { locale: args.locale } : {}),
    ...(args.plan !== undefined ? { plan: args.plan } : {}),
  };
}

export function assignmentCompletedProperties(args: AssignmentCompletedProps): Record<string, unknown> {
  return {
    classroom_id: args.classroom_id ?? null,
    assignment_id: args.assignment_id,
    student_id: args.student_id,
    kind: args.kind ?? 'lesson',
  };
}

/** Browser / teacher dashboard. Never throws. */
export function trackAssignmentCreated(args: AssignmentCreatedProps): void {
  try {
    posthog.capture(ASSIGNMENT_CREATED, assignmentCreatedProperties(args));
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[assignmentEvents] created capture failed', { err });
    }
  }
}

/** Browser. Never throws. */
export function trackAssignmentCompleted(args: AssignmentCompletedProps): void {
  try {
    posthog.capture(ASSIGNMENT_COMPLETED, assignmentCompletedProperties(args));
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[assignmentEvents] completed capture failed', { err });
    }
  }
}

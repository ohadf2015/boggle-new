/**
 * Funnel events the class progress report already keys off:
 * `assignment_created` (teacher) and `assignment_completed` (student).
 *
 * Keep the names bare — Growth Radar / HQ progress strip grep these exact
 * strings. Do not prefix with edu_ here.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import { getPostHogServer } from '@/lib/posthog';
import logger from '@/utils/logger';

function analyticsHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return 'www.lexiclash.live';
  try {
    return new URL(raw).hostname || 'www.lexiclash.live';
  } catch {
    return 'www.lexiclash.live';
  }
}

export const ASSIGNMENT_CREATED = 'assignment_created';
export const ASSIGNMENT_COMPLETED = 'assignment_completed';

export interface AssignmentCreatedProps {
  classroom_id: string;
  assignment_id?: string;
  kind: 'lesson' | 'word_count' | 'word_list';
  due_date?: string | null;
  word_count_target?: number | null;
  word_list_length?: number | null;
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

/**
 * Practice PATCH / server path. posthog-node does not set $host; dashboards
 * filter on www.lexiclash.live, so we stamp it here.
 */
export function captureAssignmentCompletedServer(args: AssignmentCompletedProps): void {
  try {
    const client = getPostHogServer();
    if (!client) return;
    client.capture({
      distinctId: args.student_id,
      event: ASSIGNMENT_COMPLETED,
      properties: {
        ...assignmentCompletedProperties(args),
        $host: analyticsHost(),
      },
    });
  } catch (err) {
    logger.error(
      'Failed to capture assignment_completed:',
      err instanceof Error ? err.message : 'unknown',
    );
  }
}

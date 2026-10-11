/**
 * Practice PATCH / server path. posthog-node does not set $host; dashboards
 * filter on www.lexiclash.live, so we stamp it here.
 *
 * Keep this file off the client graph — importing it from a 'use client'
 * module pulls node:async_hooks/fs/readline into webpack (CI `build` red).
 */
import { getPostHogServer } from '@/lib/posthog';
import logger from '@/utils/logger';
import {
  ASSIGNMENT_COMPLETED,
  assignmentCompletedProperties,
  type AssignmentCompletedProps,
} from './assignmentEvents';

function analyticsHost(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return 'www.lexiclash.live';
  try {
    return new URL(raw).hostname || 'www.lexiclash.live';
  } catch {
    return 'www.lexiclash.live';
  }
}

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

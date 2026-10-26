export const ASSIGNMENT_LIMIT_REACHED = 'ASSIGNMENT_LIMIT_REACHED';

/** True for the free-cap refusal raised by the lesson_assignments insert trigger. */
export function isAssignmentLimitError(error: unknown): boolean {
  if (typeof error === 'string') return error === ASSIGNMENT_LIMIT_REACHED;
  if (!error || typeof error !== 'object') return false;
  const { message, code } = error as { message?: unknown; code?: unknown };
  return message === ASSIGNMENT_LIMIT_REACHED || code === ASSIGNMENT_LIMIT_REACHED;
}

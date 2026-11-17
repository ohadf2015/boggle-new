/** How long a refused join stays on the teacher's lobby. Older tries stay on HQ for the 48h set. */
export const LATE_JOIN_NOTICE_MS = 10 * 60 * 1000;

export function endedCodeTriesAtKey(classroomId: string): string {
  return `classroom_ended_code_tries_at:${classroomId}`;
}

/** Students whose refusal stamp is still inside the window. A retry keeps one stamp. */
export function countStampsInWindow(stamps: readonly number[], now: number, windowMs = LATE_JOIN_NOTICE_MS): number {
  const cutoff = now - windowMs;
  return stamps.filter((at) => Number.isFinite(at) && at >= cutoff && at <= now).length;
}

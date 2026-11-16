/** How long after the teacher ended the game this student arrived. Null when the record has no end stamp. */
export function secondsSinceEnd(endedAt: string | null | undefined, now: Date): number | null {
  if (!endedAt) return null;
  const endedMs = new Date(endedAt).getTime();
  if (!Number.isFinite(endedMs)) return null;
  return Math.max(0, Math.round((now.getTime() - endedMs) / 1000));
}

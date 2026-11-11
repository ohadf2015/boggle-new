import type { LessonClaimSlot } from '@/shared/types/lessonClaims';

/** Fits the race to whole legible tiles: claimed first, then hidden ones, with one cell kept for "+N". */
export function raceTilesToShow(slots: readonly LessonClaimSlot[], capacity: number): { shown: LessonClaimSlot[]; hidden: number } {
  if (slots.length <= capacity) return { shown: [...slots], hidden: 0 };
  const room = Math.max(1, capacity - 1);
  const ordered = [...slots.filter((s) => s.claim), ...slots.filter((s) => !s.claim)];
  const shown = ordered.slice(0, room);
  return { shown, hidden: slots.length - shown.length };
}

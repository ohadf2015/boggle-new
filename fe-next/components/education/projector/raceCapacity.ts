import type { LessonClaimSlot } from '@/shared/types/lessonClaims';

/** Fits the race to whole legible tiles: every claimed tile, then hidden ones, with one cell kept for "+N" unclaimed. */
export function raceTilesToShow(slots: readonly LessonClaimSlot[], capacity: number): { shown: LessonClaimSlot[]; hidden: number } {
  if (slots.length <= capacity) return { shown: [...slots], hidden: 0 };
  const claimed = slots.filter((s) => s.claim);
  const open = slots.filter((s) => !s.claim);
  const room = Math.max(0, capacity - 1 - claimed.length);
  return { shown: [...claimed, ...open.slice(0, room)], hidden: open.length - Math.min(room, open.length) };
}

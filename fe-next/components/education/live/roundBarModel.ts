import type { StripSlot } from './lessonTargets';
import type { RivalStatus } from './useRival';

const TUG_REACH = 0.4;
const TUG_POINTS = 8;

/** Driven by the gap, not the ratio: a 4-point lead reads the same at 5-1 as at 41-37. */
export function tugShare(my: number, rival: number): number {
  return 0.5 + TUG_REACH * Math.tanh((my - rival) / TUG_POINTS);
}

export type Overtake = 'took' | 'lost';

export function overtakeOf(prev: RivalStatus | null, next: RivalStatus): Overtake | null {
  if (!prev || prev === next) return null;
  if (next === 'ahead') return 'took';
  if (prev === 'ahead' && next === 'behind') return 'lost';
  return null;
}

export interface RaceMiniView {
  done: number;
  total: number;
  chip: StripSlot | null;
  mine: StripSlot | null;
  mineCount: number;
}

/** Count, my latest claim (held all round), and one more chip: a fresh classmate claim, else the next clue. */
export function raceMiniView(slots: readonly StripSlot[], freshIndex: number | null): RaceMiniView {
  const done = slots.filter((s) => s.state !== 'hidden').length;
  const mineSlots = slots.filter((s) => s.state === 'mine');
  const fresh = freshIndex == null ? undefined : slots.find((s) => s.key === String(freshIndex) && s.state === 'taken');
  const next = slots.find((s) => s.state === 'hidden');
  const lastTaken = [...slots].reverse().find((s) => s.state === 'taken');
  return {
    done,
    total: slots.length,
    chip: fresh ?? next ?? lastTaken ?? null,
    mine: mineSlots[mineSlots.length - 1] ?? null,
    mineCount: mineSlots.length,
  };
}

export const DRAFT_EVERY_FLOORS = 5;

export function draftDue(prevPeakFloor: number, nextPeakFloor: number): number | null {
  if (nextPeakFloor <= prevPeakFloor) return null;
  const crossed = Math.floor(nextPeakFloor / DRAFT_EVERY_FLOORS) * DRAFT_EVERY_FLOORS;
  return crossed > 0 && crossed > prevPeakFloor ? crossed : null;
}

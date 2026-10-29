import { hasProAccess } from '@/lib/education/teacherPlanGate';
import type { ClassroomPressure } from '@/shared/types/classroom';

interface PressureEntitlement {
  hasPro: boolean;
  loading: boolean;
  accessTrialExpires: string | null;
}

/** Paid Pro or a live access trial, matching the server's gate on `updateClassroomGamePressure`. */
export function pressureDialsUnlocked(state: PressureEntitlement, nowMs: number): boolean {
  return !state.loading && hasProAccess(state, nowMs);
}

export function launchPressure(state: PressureEntitlement, pressure: ClassroomPressure, nowMs: number): ClassroomPressure | undefined {
  return pressureDialsUnlocked(state, nowMs) ? pressure : undefined;
}

import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

/** What the free teacher just tried to grow. */
export type TeacherPlanGateLimitType = 'classrooms' | 'students';

/** Where the paywall sheet opened. */
export type TeacherPlanGateSurface = 'classroom_create' | 'student_enroll';

/**
 * Hard usage wall for an approved teacher still on free / access-trial.
 * Polar Teacher Pro (`hasPro`) lifts it. Numbers come from FREE_TIER_LIMITS —
 * do not invent a second cap.
 */
export function isFreePlanUsageBlocked(hasPro: boolean, current: number, limit: number): boolean {
  if (hasPro) return false;
  return current >= limit;
}

export function freeClassroomCap(): number {
  return FREE_TIER_LIMITS.classes;
}

export function freeStudentCap(): number {
  return FREE_TIER_LIMITS.studentsPerClass;
}

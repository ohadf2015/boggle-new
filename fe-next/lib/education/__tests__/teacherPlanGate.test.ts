import { describe, it, expect } from 'vitest';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import {
  isFreePlanUsageBlocked,
  freeClassroomCap,
  freeStudentCap,
} from '@/lib/education/teacherPlanGate';

describe('isFreePlanUsageBlocked', () => {
  it('Given a Pro teacher, When they are over the advertised cap, Then the action is not blocked', () => {
    expect(isFreePlanUsageBlocked(true, 99, FREE_TIER_LIMITS.classes)).toBe(false);
  });

  it('Given a free teacher under the cap, When they create, Then the action is allowed', () => {
    expect(isFreePlanUsageBlocked(false, FREE_TIER_LIMITS.classes - 1, FREE_TIER_LIMITS.classes)).toBe(
      false,
    );
  });

  it('Given a free teacher at the classroom cap, When they create another, Then the action is blocked', () => {
    expect(isFreePlanUsageBlocked(false, FREE_TIER_LIMITS.classes, FREE_TIER_LIMITS.classes)).toBe(
      true,
    );
  });

  it('Given a free teacher at the student cap, When they enroll another, Then the action is blocked', () => {
    expect(
      isFreePlanUsageBlocked(false, FREE_TIER_LIMITS.studentsPerClass, FREE_TIER_LIMITS.studentsPerClass),
    ).toBe(true);
  });

  it('reuses FREE_TIER_LIMITS rather than inventing 1 class / 25 students', () => {
    expect(freeClassroomCap()).toBe(FREE_TIER_LIMITS.classes);
    expect(freeStudentCap()).toBe(FREE_TIER_LIMITS.studentsPerClass);
    expect(freeClassroomCap()).toBeGreaterThanOrEqual(1);
    expect(freeStudentCap()).toBeGreaterThanOrEqual(25);
  });
});

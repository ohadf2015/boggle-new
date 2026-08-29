/**
 * The free caps encode a deliberate split: be generous with the number of CLASSES,
 * stay strict on the number of STUDENTS per class.
 *
 * Why the class cap moved off 1 (2026-08-27):
 * measured production data showed 35 approved teachers and 2 classrooms in the module's
 * entire history. At `classes: 1` the very first classroom a teacher creates is also their
 * last — a teacher who makes a throwaway "Test" class while finding their feet is then
 * permanently blocked from creating the real one, on the free tier, with no way back except
 * deleting their own work or paying. That is a trap laid precisely at the moment of first
 * use, and first use is the only moment we get: no approved teacher has ever been active on
 * a second day.
 *
 * Why the student cap did NOT move:
 * `studentsPerClass` is the binding constraint that Teacher Pro actually sells against — a
 * real class is 25-30, so ten is felt by every genuine classroom. Raising class COUNT costs
 * nothing while each class stays capped; raising the per-class cap would remove the upsell.
 * This is a product decision, pinned here so a future "let's be generous" pass cannot quietly
 * take it out.
 */
import { describe, it, expect } from 'vitest';
import { FREE_TIER_LIMITS } from '../freeTierLimits';

describe('FREE_TIER_LIMITS', () => {
  it('lets a free teacher create a second class after their first', () => {
    // A throwaway first class must not permanently lock a teacher out of creating a real one.
    // `canCreateClass` allows iff currentCount < limit, so a limit of 1 blocks at the first class.
    expect(FREE_TIER_LIMITS.classes).toBeGreaterThan(1);
  });

  it('keeps the per-class student cap at 10 — this is the paywall, do not widen it', () => {
    // Pinned deliberately. If you are here because a test failed after "being generous",
    // the generosity belongs on `classes`, not here. See the file header.
    expect(FREE_TIER_LIMITS.studentsPerClass).toBe(10);
  });

  it('still leaves Teacher Pro something to sell', () => {
    // A real class is 25-30 students. The free tier must not be able to hold one.
    expect(FREE_TIER_LIMITS.studentsPerClass).toBeLessThan(25);
  });
});

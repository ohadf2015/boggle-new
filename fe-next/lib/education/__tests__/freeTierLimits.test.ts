/**
 * The free caps encode a deliberate split: give away the LESSON, sell the REPORTING.
 *
 * Why the class cap moved off 1 (2026-08-27):
 * measured production data showed 35 approved teachers and 2 classrooms in the module's
 * entire history. At `classes: 1` the very first classroom a teacher creates is also their
 * last — a teacher who makes a throwaway "Test" class while finding their feet is then
 * permanently blocked from creating the real one.
 *
 * Why the student cap moved off 10 (2026-08-31), reversing the 2026-08-23 decision:
 * the old cap was chosen precisely because it binds on a real class of 25-30. It did bind,
 * and it produced 2 classrooms and zero second-day activity. A paywall placed before the
 * first successful lesson does not convert a teacher, it removes them.
 * Competitors put the paywall after the lesson instead — Blooket gives 60 players free and
 * Gimkit gives unlimited on featured modes, both charging for reports. Teacher Pro still
 * sells analytics (ProGate) and unlimited classes; it no longer sells classroom attendance.
 *
 * These tests pin the INTENT, not a magic number, so the next "let's be generous" or
 * "let's tighten the funnel" pass has to argue with the reasoning rather than edit a literal.
 */
import { describe, it, expect } from 'vitest';
import { FREE_TIER_LIMITS } from '../freeTierLimits';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

describe('FREE_TIER_LIMITS', () => {
  it('lets a free teacher create a second class after their first', () => {
    // A throwaway first class must not permanently lock a teacher out of creating a real one.
    // `canCreateClass` allows iff currentCount < limit, so a limit of 1 blocks at the first class.
    expect(FREE_TIER_LIMITS.classes).toBeGreaterThan(1);
  });

  it('fits an ordinary class, so the free tier can deliver one complete lesson', () => {
    // An ordinary class is 25-30. The free tier existing to be tripped by that is what
    // produced 2 classrooms and no second-day activity. See the header.
    expect(FREE_TIER_LIMITS.studentsPerClass).toBeGreaterThanOrEqual(30);
  });

  it('does not promise more seats than a live game can actually hold', () => {
    // The advertised free cap must be a promise the engine can keep, or we have simply
    // moved the failure from a paywall to a runtime error mid-lesson.
    expect(FREE_TIER_LIMITS.studentsPerClass).toBeLessThanOrEqual(MAX_PLAYERS_PER_ROOM);
  });

  it('still leaves Teacher Pro something real to sell', () => {
    // Pro sells analytics/printable reports (components/teacher/ProGate.tsx) and unlimited
    // classes. The class cap is what makes "unlimited classes" mean anything, so it must
    // stay finite — a secondary teacher with five or six sections is the upsell.
    expect(FREE_TIER_LIMITS.classes).toBeLessThan(5);
  });
});

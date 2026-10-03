import { describe, it, expect } from 'vitest';
import { shouldShowStartLiveClassCta, liveClassroomHref } from '../startLiveClassCta';

describe('shouldShowStartLiveClassCta', () => {
  it('Given no students, Then the CTA is hidden (join panel owns that state)', () => {
    expect(
      shouldShowStartLiveClassCta({
        studentCount: 0,
        assignmentCount: 1,
      }),
    ).toBe(false);
  });

  it('Given students but 0 assignments, Then the CTA is hidden (first-assignment panel owns that state)', () => {
    expect(
      shouldShowStartLiveClassCta({
        studentCount: 2,
        assignmentCount: 0,
      }),
    ).toBe(false);
  });

  it('Given students and at least one assignment, Then the CTA is shown', () => {
    expect(
      shouldShowStartLiveClassCta({
        studentCount: 1,
        assignmentCount: 1,
      }),
    ).toBe(true);
  });

  it('Given assignment count is still unknown, Then the CTA stays hidden', () => {
    expect(
      shouldShowStartLiveClassCta({
        studentCount: 3,
        assignmentCount: null,
      }),
    ).toBe(false);
  });
});

describe('liveClassroomHref', () => {
  it('deep-links the existing classroom-game lobby with classroomId', () => {
    expect(liveClassroomHref('en', 'c1')).toBe('/en/education/classroom-game?classroomId=c1');
  });
});

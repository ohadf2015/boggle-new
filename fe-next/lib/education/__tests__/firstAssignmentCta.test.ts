import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  shouldShowFirstAssignmentCta,
  readHqLiveRoom,
} from '../firstAssignmentCta';

describe('shouldShowFirstAssignmentCta', () => {
  it('Given no students, Then the panel is hidden (join panel owns that state)', () => {
    expect(
      shouldShowFirstAssignmentCta({
        studentCount: 0,
        assignmentCount: 0,
        hasActiveRoom: false,
      }),
    ).toBe(false);
  });

  it('Given students and 0 assignments and no live room, Then the panel is shown', () => {
    expect(
      shouldShowFirstAssignmentCta({
        studentCount: 1,
        assignmentCount: 0,
        hasActiveRoom: false,
      }),
    ).toBe(true);
  });

  it('Given the class already has an assignment, Then the panel is hidden', () => {
    expect(
      shouldShowFirstAssignmentCta({
        studentCount: 4,
        assignmentCount: 1,
        hasActiveRoom: false,
      }),
    ).toBe(false);
  });

  it('Given an active live room, Then the panel is hidden even with 0 assignments', () => {
    expect(
      shouldShowFirstAssignmentCta({
        studentCount: 2,
        assignmentCount: 0,
        hasActiveRoom: true,
      }),
    ).toBe(false);
  });

  it('Given assignment count is still unknown, Then the panel stays hidden', () => {
    expect(
      shouldShowFirstAssignmentCta({
        studentCount: 3,
        assignmentCount: null,
        hasActiveRoom: false,
      }),
    ).toBe(false);
  });
});

describe('readHqLiveRoom', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it('Given this class has a live game code in session, Then it is an active room', () => {
    sessionStorage.setItem(
      'lessonGameData',
      JSON.stringify({ classroomId: 'c1', gameCode: 'AB12CD' }),
    );
    expect(readHqLiveRoom('c1')).toBe(true);
    expect(readHqLiveRoom('c2')).toBe(false);
  });

  it('Given no session payload, Then there is no active room', () => {
    expect(readHqLiveRoom('c1')).toBe(false);
  });
});

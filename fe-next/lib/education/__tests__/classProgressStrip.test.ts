import { describe, it, expect } from 'vitest';
import {
  shouldShowClassProgressStrip,
  sumAssignmentSubmissions,
} from '../classProgressStrip';

describe('shouldShowClassProgressStrip', () => {
  it('Given no students, Then the strip is hidden', () => {
    expect(
      shouldShowClassProgressStrip({
        studentCount: 0,
        assignmentCount: 1,
      }),
    ).toBe(false);
  });

  it('Given students but 0 assignments, Then the strip is hidden (first-assignment CTA owns that state)', () => {
    expect(
      shouldShowClassProgressStrip({
        studentCount: 2,
        assignmentCount: 0,
      }),
    ).toBe(false);
  });

  it('Given >=1 student and >=1 assignment, Then the strip is shown even when submissions are zero', () => {
    expect(
      shouldShowClassProgressStrip({
        studentCount: 1,
        assignmentCount: 1,
      }),
    ).toBe(true);
  });

  it('Given assignment count is still unknown, Then the strip stays hidden', () => {
    expect(
      shouldShowClassProgressStrip({
        studentCount: 3,
        assignmentCount: null,
      }),
    ).toBe(false);
  });
});

describe('sumAssignmentSubmissions', () => {
  it('Given no completions, Then the submitted count is 0', () => {
    expect(
      sumAssignmentSubmissions([
        { completion_count: 0 },
        { completion_count: 0 },
      ]),
    ).toBe(0);
  });

  it('Given mixed completion counts, Then they sum (0 is valid)', () => {
    expect(
      sumAssignmentSubmissions([
        { completion_count: 0 },
        { completion_count: 4 },
        { completion_count: 2 },
      ]),
    ).toBe(6);
  });

  it('Given missing completion_count, Then it counts as 0', () => {
    expect(sumAssignmentSubmissions([{}, { completion_count: null }])).toBe(0);
  });
});

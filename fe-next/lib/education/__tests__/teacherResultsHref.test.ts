import { describe, it, expect } from 'vitest';
import { teacherResultsHref } from '../teacherResultsHref';

describe('teacherResultsHref', () => {
  it('opens the one results hub on the class', () => {
    expect(teacherResultsHref('he', 'c 1')).toBe('/he/teacher/reports?classroomId=c%201');
  });

  it('opens the hub itself without a class', () => {
    expect(teacherResultsHref('en', '')).toBe('/en/teacher/reports');
    expect(teacherResultsHref('en')).toBe('/en/teacher/reports');
  });

  it('can open a section of the hub', () => {
    expect(teacherResultsHref('en', 'c1', 'homework')).toBe('/en/teacher/reports?classroomId=c1&section=homework');
  });
});

import { describe, it, expect } from 'vitest';
import { sampleClassroomSummary, sampleProjectorStudents } from '../previewFixtures';

describe('dev preview fixtures', () => {
  it('builds a summary whose podium is ranked 1..3 and excludes the teacher', () => {
    const s = sampleClassroomSummary();
    expect(s.podium?.map((p) => p.rank)).toEqual([1, 2, 3]);
    expect(s.podium?.some((p) => p.username === s.teacherName)).toBe(false);
  });

  it('keeps the class numbers consistent with the coverage list', () => {
    const s = sampleClassroomSummary();
    const found = s.coverage.filter((c) => c.foundBy.length > 0).length;
    expect(s.classFoundCount).toBe(found);
    expect(s.totalWords).toBe(s.coverage.length);
    expect(s.missedWords).toEqual(s.coverage.filter((c) => c.foundBy.length === 0).map((c) => c.word));
  });

  it('offers a class-sized roster for the projector preview', () => {
    expect(sampleProjectorStudents(12)).toHaveLength(12);
    expect(new Set(sampleProjectorStudents(30).map((s) => s.username)).size).toBe(30);
  });
});

describe('dev preview podium reads true', () => {
  it('stands the students in strictly descending score order', () => {
    const podium = sampleClassroomSummary().podium ?? [];
    for (let i = 1; i < podium.length; i++) {
      expect(podium[i - 1].score).toBeGreaterThan(podium[i].score);
    }
  });
});

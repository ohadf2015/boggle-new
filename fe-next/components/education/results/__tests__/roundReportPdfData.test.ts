import { describe, it, expect } from 'vitest';
import { buildRoundReportPdfData } from '../roundReportPdfData';

const now = new Date('2026-11-03T08:00:00Z');

describe('buildRoundReportPdfData', () => {
  it('maps one round onto the class-report PDF, skipping the host and bots', () => {
    const data = buildRoundReportPdfData(
      {
        teacherName: 'Ms Dana',
        lessonNames: ['Animals', 'Food'],
        totalWords: 10,
        classFoundCount: 6,
        masteryByPlayer: {
          Noa: { found: 8, total: 10 },
          Ido: { found: 3, total: 10 },
          Tal: { found: 0, total: 10 },
          'ms dana': { found: 10, total: 10 },
          Robo: { found: 9, total: 10 },
        },
      },
      [
        { username: 'Noa', score: 50 },
        { username: 'Ido', score: 20 },
        { username: 'Tal', score: 0 },
        { username: 'Robo', score: 99, isBot: true },
      ],
      { fallbackName: 'Classroom round', now },
    );
    expect(data.type).toBe('class');
    expect(data.classroomName).toBe('Animals · Food');
    expect(data.teacherName).toBe('Ms Dana');
    expect(data.generatedAt).toBe(now);
    expect(data.metrics).toEqual({
      totalStudents: 3,
      activeStudents: 2,
      classAverageAccuracy: 37,
      classAverageWordsLearned: 4,
      completionRate: 60,
      participationRate: 67,
    });
    expect(data.studentRankings.map((r) => [r.rank, r.studentName, r.score, r.accuracy, r.wordsLearned])).toEqual([
      [1, 'Noa', 50, 80, 8],
      [2, 'Ido', 20, 30, 3],
      [3, 'Tal', 0, 0, 0],
    ]);
    expect(data.topPerformers.map((p) => p.studentName)).toEqual(['Noa', 'Ido']);
    expect(data.studentsNeedingAttention).toEqual([
      { studentName: 'Tal', accuracy: 0, issue: 'inactive' },
      { studentName: 'Ido', accuracy: 30, issue: 'low_accuracy' },
    ]);
  });

  it('falls back to a plain name and survives an empty round', () => {
    const data = buildRoundReportPdfData(
      { teacherName: '', lessonNames: [], totalWords: 0, classFoundCount: 0, masteryByPlayer: {} },
      undefined,
      { fallbackName: 'Classroom round', now },
    );
    expect(data.classroomName).toBe('Classroom round');
    expect(data.metrics.totalStudents).toBe(0);
    expect(data.metrics.completionRate).toBe(0);
    expect(data.studentRankings).toEqual([]);
  });
});

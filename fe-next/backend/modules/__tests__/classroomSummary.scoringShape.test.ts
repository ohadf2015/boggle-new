import { describe, it, expect } from 'vitest';
import { buildClassroomSummary } from '../classroomSummary';

describe('buildClassroomSummary — words as the scoring engine reports them', () => {
  it('matches lowercase validated traces against a capitalised lesson list', () => {
    const summary = buildClassroomSummary({
      language: 'en',
      teacherName: 'Ms. T',
      lessonNames: ['Common English'],
      lessonIds: ['l1'],
      vocabularyWords: ['House', 'WATER', 'light'],
      players: [
        {
          username: 'Maya',
          wordDetails: [
            { word: 'house', validated: true, isDuplicate: false },
            { word: 'water', validated: true, isDuplicate: true },
            { word: 'stone', validated: true },
          ],
        },
      ],
    });

    expect(summary?.masteryByPlayer.Maya).toEqual({ found: 2, total: 3 });
    expect(summary?.classFoundCount).toBe(2);
    expect(summary?.missedWords).toEqual(['light']);
  });
});

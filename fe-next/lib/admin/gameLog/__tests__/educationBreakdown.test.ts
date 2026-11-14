import { describe, it, expect } from 'vitest';
import { summarizeEducation } from '../educationBreakdown';

describe('summarizeEducation', () => {
  it('splits class games and student practice, each with its modes by count', () => {
    const out = summarizeEducation(
      [
        { game_mode: 'classic', teacher_id: 't1' },
        { game_mode: 'vocab-quiz', teacher_id: 't1' },
        { game_mode: 'classic', teacher_id: 't2' },
      ],
      [
        { mode: 'blitz', practice_type: null, student_id: 's1' },
        { mode: null, practice_type: 'flashcard', student_id: 's1' },
        { mode: 'blitz', practice_type: null, student_id: 's2' },
      ],
      new Set(),
    );
    expect(out.classGames).toEqual({ total: 3, modes: [{ mode: 'classic', count: 2 }, { mode: 'vocab-quiz', count: 1 }] });
    expect(out.practice).toEqual({ total: 3, modes: [{ mode: 'blitz', count: 2 }, { mode: 'flashcard', count: 1 }] });
  });

  it('leaves out games run by test accounts', () => {
    const out = summarizeEducation(
      [{ game_mode: 'classic', teacher_id: 'qa' }, { game_mode: 'classic', teacher_id: 't1' }],
      [{ mode: 'blitz', practice_type: null, student_id: 'qa-kid' }],
      new Set(['qa', 'qa-kid']),
    );
    expect(out.classGames.total).toBe(1);
    expect(out.practice).toEqual({ total: 0, modes: [] });
  });

  it('files a game with no mode under "other"', () => {
    const out = summarizeEducation([{ game_mode: null, teacher_id: 't1' }], [], new Set());
    expect(out.classGames.modes).toEqual([{ mode: 'other', count: 1 }]);
  });
});

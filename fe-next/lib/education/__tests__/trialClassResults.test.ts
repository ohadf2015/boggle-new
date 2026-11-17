import { describe, it, expect } from 'vitest';
import { loadTrialClassResults, summarizeTrialClassResults } from '../trialClassResults';

const rows = {
  rounds: [
    { teacher_id: 't1', classroom_id: 'c1', game_code: 'AAA' },
    { teacher_id: 't1', classroom_id: 'c1', game_code: 'AAA' },
    { teacher_id: 't1', classroom_id: 'c2', game_code: 'BBB' },
    { teacher_id: 't2', classroom_id: 'c9', game_code: 'ZZZ' },
  ],
  classrooms: [{ id: 'c1', teacher_id: 't1' }, { id: 'c2', teacher_id: 't1' }, { id: 'c9', teacher_id: 't2' }],
  memberships: [
    { classroom_id: 'c1', student_id: 's1' },
    { classroom_id: 'c1', student_id: 's2' },
    { classroom_id: 'c2', student_id: 's2' },
    { classroom_id: 'c1', student_id: 'phone', is_rehearsal: true },
    { classroom_id: 'c9', student_id: 'x' },
  ],
  sessions: [
    { room_code: 'AAA', score: 120, words_found: [{ word: 'cat' }, { word: 'garden' }] },
    { room_code: 'BBB', score: 318, words_found: [{ word: 'dear' }] },
    { room_code: 'ZZZ', score: 999, words_found: [{ word: 'extraordinary' }] },
  ],
};

describe('summarizeTrialClassResults: the teacher\'s own class, aggregates only', () => {
  it('counts games, roster students (no rehearsal seat), words, best score and longest word', () => {
    expect(summarizeTrialClassResults('t1', rows)).toEqual({
      gamesRun: 2,
      students: 2,
      wordsFound: 3,
      topScore: 318,
      longestWord: 'GARDEN',
    });
  });
  it('a teacher with no class games gets zeros and nulls', () => {
    expect(summarizeTrialClassResults('t3', rows)).toEqual({ gamesRun: 0, students: 0, wordsFound: 0, topScore: null, longestWord: null });
  });
});

describe('loadTrialClassResults', () => {
  it('fails open to an empty map, so the email still goes out without the block', async () => {
    const db = { from: () => ({ select: () => ({ in: () => ({ gte: async () => ({ data: null, error: { message: 'boom' } }) }) }) }) };
    expect((await loadTrialClassResults(db as never, ['t1'])).size).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { classWordLists } from '../classWordLists';

const lesson = (id: string, name: string, n: number, classroom_id: string | null = null, updated_at = '2026-11-01T00:00:00Z') => ({
  id, name, classroom_id, updated_at, words: Array.from({ length: n }, (_, i) => ({ word: `w${i}` })),
});
const assignment = (lessonId: string, created_at: string, joined?: ReturnType<typeof lesson>) => ({ lesson_id: lessonId, created_at, vocabulary_lessons: joined });

describe('classWordLists', () => {
  it('Given lists assigned to the class and lists saved to it, Then each list shows once with its word count, newest first', () => {
    const out = classWordLists(
      [assignment('L1', '2026-11-05T00:00:00Z', lesson('L1', 'Starter animals', 12)), assignment('L2', '2026-11-09T00:00:00Z', lesson('L2', 'Physics', 8, 'c1'))],
      [lesson('L2', 'Physics', 8, 'c1', '2026-11-02T00:00:00Z'), lesson('L3', 'Own words', 5, 'c1', '2026-11-03T00:00:00Z'), lesson('L4', 'Other class', 9, 'c2')],
      'c1',
    );
    expect(out).toEqual([
      { id: 'L2', name: 'Physics', wordCount: 8 },
      { id: 'L1', name: 'Starter animals', wordCount: 12 },
      { id: 'L3', name: 'Own words', wordCount: 5 },
    ]);
  });

  it('Given an assignment whose list was not joined, Then it uses the teacher\'s own copy when there is one, else it is left out', () => {
    const out = classWordLists([assignment('L9', '2026-11-05T00:00:00Z'), assignment('L1', '2026-11-04T00:00:00Z')], [lesson('L1', 'Mine', 3)], 'c1');
    expect(out).toEqual([{ id: 'L1', name: 'Mine', wordCount: 3 }]);
  });

  it('Given nothing for this class, Then the list is empty', () => {
    expect(classWordLists([], [lesson('L4', 'Other class', 9, 'c2')], 'c1')).toEqual([]);
  });
});

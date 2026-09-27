/**
 * A student cannot read `vocabulary_lessons` directly: the only SELECT policy
 * open to them resolves through `lesson_assignments`, so every client-side
 * variant of the query returns ZERO rows with `error: null` — indistinguishable
 * from "this class has no lessons" (recurring-pitfalls Class 4). That emptied
 * the challenge dialog's picker and made SEND CHALLENGE unreachable.
 *
 * The duel list therefore comes from the same service-role route solo practice
 * already uses, rather than a second answer to the same question.
 */
import { getDuelLessons } from '@/lib/education/duelLessons';

describe('getDuelLessons', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('reads the lessons this student may play, from the practice route', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        lessons: [
          { id: 'lesson-1', name: 'Unit 3 verbs', words: [] },
          { id: 'lesson-2', name: 'Unit 4 nouns', words: [] },
        ],
      }),
    });

    await expect(getDuelLessons()).resolves.toEqual([
      { id: 'lesson-1', name: 'Unit 3 verbs' },
      { id: 'lesson-2', name: 'Unit 4 nouns' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith('/api/education/practice/lessons', {
      credentials: 'include',
    });
  });

  it('returns an empty list rather than throwing when the route fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(getDuelLessons()).resolves.toEqual([]);

    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(getDuelLessons()).resolves.toEqual([]);
  });

  it('drops rows with no id instead of offering an unplayable lesson', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ lessons: [{ name: 'ghost' }, { id: 'lesson-9' }] }),
    });

    await expect(getDuelLessons()).resolves.toEqual([{ id: 'lesson-9', name: '' }]);
  });
});

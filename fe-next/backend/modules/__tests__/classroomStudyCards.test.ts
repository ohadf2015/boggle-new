import { beforeEach, describe, expect, it, vi } from 'vitest';

const safeEmit = vi.fn();
const inQuery = vi.fn();

vi.mock('../../utils/socketHelpers.js', () => ({ safeEmit: (...args: unknown[]) => safeEmit(...args) }));
vi.mock('../classroomLevelCache.js', () => ({ getClassroomLevelCached: vi.fn(async () => 'core') }));
vi.mock('../classroomGameManager.js', () => ({ getClassroomGame: vi.fn() }));
vi.mock('../supabase/client.js', () => ({
  getSupabase: () => ({ from: () => ({ select: () => ({ in: (...args: unknown[]) => inQuery(...args) }) }) }),
}));

import { emitClassroomContext } from '../classroomGameContext';
import { loadStudyCards } from '../classroomStudyCards';
import type { ClassroomGame } from '../classroomGameManager';

const socket = () => ({ data: {} }) as never;
const game = (over: Partial<ClassroomGame> = {}) =>
  ({ gameCode: 'ABCD', classroomId: 'c1', teacherId: 'teacher', vocabularyWords: ['sun', 'moon'], ...over }) as ClassroomGame;

const studyEmits = () => safeEmit.mock.calls.filter((c) => c[1] === 'classroomStudyCards');

describe('emitClassroomContext study deck', () => {
  beforeEach(() => safeEmit.mockReset());

  it('sends a student the stored cards after their context', async () => {
    const cards = [{ word: 'sun', definition: 'Our star' }];
    await emitClassroomContext(socket(), 'ABCD', 'student', { game: game({ studyCards: cards }) });
    expect(safeEmit.mock.calls.map((c) => c[1])).toEqual(['classroomContext', 'classroomStudyCards']);
    expect(studyEmits()[0][2]).toEqual({ gameCode: 'ABCD', cards });
  });

  it('builds bare cards from the game words for a record made before cards existed', async () => {
    await emitClassroomContext(socket(), 'ABCD', undefined, { game: game() });
    expect(studyEmits()[0][2]).toEqual({ gameCode: 'ABCD', cards: [{ word: 'sun' }, { word: 'moon' }] });
  });

  it('never sends the deck to the teacher, nor an empty deck', async () => {
    await emitClassroomContext(socket(), 'ABCD', 'teacher', { game: game() });
    await emitClassroomContext(socket(), 'ABCD', 'student', { game: game({ vocabularyWords: [] }) });
    expect(studyEmits()).toHaveLength(0);
  });
});

describe('loadStudyCards', () => {
  beforeEach(() => inQuery.mockReset());

  it('joins the game words to the lesson definitions', async () => {
    inQuery.mockResolvedValue({ data: [{ words: [{ word: 'sun', definition: 'Our star' }] }], error: null });
    await expect(loadStudyCards(['l1'], ['sun'], 'ABCD')).resolves.toEqual([{ word: 'sun', definition: 'Our star' }]);
  });

  it('still returns word-only cards when the lookup fails', async () => {
    inQuery.mockResolvedValue({ data: null, error: { message: 'down' } });
    await expect(loadStudyCards(['l1'], ['sun'], 'ABCD')).resolves.toEqual([{ word: 'sun' }]);
  });

  it('skips the query when no lesson was picked', async () => {
    await expect(loadStudyCards([], ['sun'], 'ABCD')).resolves.toEqual([{ word: 'sun' }]);
    expect(inQuery).not.toHaveBeenCalled();
  });
});

import { advanceReteachForRound, narrowForReteach, restoreFullLesson } from '../classroomReteachRound';
import type { ClassroomGame } from '../classroomGameTypes';

const LESSON = ['Osmosis', 'enzyme', 'membrane', 'nucleus'];

function game(overrides: Partial<ClassroomGame> = {}): ClassroomGame {
  return {
    gameCode: 'ABC123',
    classroomId: 'class-1',
    teacherId: 'teacher-1',
    teacherName: 'Ms K',
    lessonIds: ['lesson-1'],
    lessonNames: ['Cells'],
    vocabularyWords: [...LESSON],
    players: [],
    status: 'finished',
    createdAt: '2026-10-21T10:00:00Z',
    settings: { gameMode: 'classic', timerMinutes: 3, targetWord: 'nucleus' } as ClassroomGame['settings'],
    ...overrides,
  };
}

describe('narrowForReteach', () => {
  it('given a full lesson, when narrowed, then the room keeps the full list and target to come back to', () => {
    const g = game();
    expect(narrowForReteach(g, ['enzyme'])).toEqual(['enzyme']);
    expect(g.vocabularyWords).toEqual(['enzyme']);
    expect(g.settings.targetWord).toBeUndefined();
    expect(g.reteach).toEqual({ fullVocabularyWords: LESSON, fullTargetWord: 'nucleus', pending: true });
  });

  it('given a room already narrowed, when narrowed again, then it picks from the full lesson and keeps the first original', () => {
    const g = game();
    narrowForReteach(g, ['enzyme']);
    expect(narrowForReteach(g, ['membrane', 'Osmosis'])).toEqual(['Osmosis', 'membrane']);
    expect(g.reteach?.fullVocabularyWords).toEqual(LESSON);
    expect(g.reteach?.fullTargetWord).toBe('nucleus');
  });

  it('given no lesson word in the request, when narrowed, then the room is untouched', () => {
    const g = game();
    expect(narrowForReteach(g, ['pizza'])).toBeNull();
    expect(g.vocabularyWords).toEqual(LESSON);
    expect(g.reteach).toBeUndefined();
  });
});

describe('advanceReteachForRound', () => {
  it('given a replay was just set, when its round starts, then that round keeps the narrowed words', () => {
    const g = game();
    narrowForReteach(g, ['enzyme']);
    expect(advanceReteachForRound(g)).toBe(true);
    expect(g.vocabularyWords).toEqual(['enzyme']);
    expect(g.reteach?.pending).toBe(false);
  });

  it('given the replay round was played, when Play again or the next mode starts, then the full lesson and its target come back', () => {
    const g = game();
    narrowForReteach(g, ['enzyme']);
    advanceReteachForRound(g);
    expect(advanceReteachForRound(g)).toBe(true);
    expect(g.vocabularyWords).toEqual(LESSON);
    expect(g.settings.targetWord).toBe('nucleus');
    expect(g.reteach).toBeUndefined();
  });

  it('given a record written before replays kept the full list, when a round starts, then nothing changes', () => {
    const g = game();
    expect(advanceReteachForRound(g)).toBe(false);
    expect(g.vocabularyWords).toEqual(LESSON);
    expect(g.settings.targetWord).toBe('nucleus');
  });
});

describe('restoreFullLesson', () => {
  it('given a narrowed room, when the teacher asks for the full list, then it comes back before any round runs', () => {
    const g = game();
    narrowForReteach(g, ['enzyme']);
    expect(restoreFullLesson(g)).toBe(true);
    expect(g.vocabularyWords).toEqual(LESSON);
    expect(g.settings.targetWord).toBe('nucleus');
    expect(g.reteach).toBeUndefined();
  });

  it('given a lesson with no pinned target, when restored, then no target is invented', () => {
    const g = game({ settings: { gameMode: 'classic' } as ClassroomGame['settings'] });
    narrowForReteach(g, ['enzyme']);
    restoreFullLesson(g);
    expect('targetWord' in g.settings).toBe(false);
  });

  it('given a room that was never narrowed, when restored, then it reports nothing to do', () => {
    expect(restoreFullLesson(game())).toBe(false);
  });
});

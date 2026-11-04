const { mockGetClassroomGame, mockLoadLesson, mockSetPlaced } = vi.hoisted(() => ({
  mockGetClassroomGame: vi.fn(),
  mockLoadLesson: vi.fn(),
  mockSetPlaced: vi.fn(() => Promise.resolve()),
}));

vi.mock('../classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
  setClassroomGamePlacedVocabulary: mockSetPlaced,
}));
vi.mock('../../services/vocabQuizLessonWords', () => ({ loadLessonVocabulary: mockLoadLesson }));
vi.mock('../../utils/socketHelpers', () => ({ getGameRoom: (c: string) => `room:${c}` }));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stageClassroomCrossword } from '../crosswordClassroomStart';
import { CROSSWORD_CLASSROOM_EVENTS } from '@/shared/types/crosswordClassroom';

const LESSON = [
  { word: 'planet', definition: 'A world that circles a star' },
  { word: 'orbit', definition: 'The path around a star' },
  { word: 'comet', definition: 'An icy visitor with a tail' },
  { word: 'star', example: 'The sun is a star.' },
  { word: 'moon', definition: 'It circles the Earth' },
  { word: 'galaxy' },
];

function record(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'CLS', classroomId: 'c1', teacherId: 't1', lessonIds: ['l1'], language: 'en',
    vocabularyWords: LESSON.map((w) => w.word), settings: { gameMode: 'crossword' }, ...overrides,
  };
}

function ioMock() {
  const emit = vi.fn();
  return { io: { to: vi.fn(() => ({ emit })) } as never, emit };
}

describe('stageClassroomCrossword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadLesson.mockResolvedValue({ words: LESSON, language: 'en' });
  });

  it('stages a grid of lesson words with their own clues and records which words it placed', async () => {
    mockGetClassroomGame.mockResolvedValue(record());
    const game: Record<string, unknown> = { isClassroom: true, language: 'en', gameSessionId: 's1' };
    const { io } = ioMock();

    expect(await stageClassroomCrossword(io, 'CLS', game as never)).toBe('staged');

    const staged = game.lessonCrossword as { puzzle: { slots: Array<{ id: string; clue: string }> }; lessonWordBySlot: Record<string, string> };
    const words = Object.values(staged.lessonWordBySlot);
    expect(words.length).toBeGreaterThanOrEqual(3);
    expect(words).not.toContain('galaxy');
    for (const slot of staged.puzzle.slots) {
      const word = staged.lessonWordBySlot[slot.id];
      const lesson = LESSON.find((w) => w.word === word)!;
      expect(slot.clue).toBe(lesson.definition ?? 'The sun is a ____.');
    }
    expect(mockSetPlaced).toHaveBeenCalledWith('CLS', words);
  });

  it('a replay narrowed to the missed words deals only those words', async () => {
    mockGetClassroomGame.mockResolvedValue(record({ vocabularyWords: ['planet', 'orbit', 'comet'] }));
    const game: Record<string, unknown> = { isClassroom: true, language: 'en' };

    expect(await stageClassroomCrossword(ioMock().io, 'CLS', game as never)).toBe('staged');

    const words = Object.values((game.lessonCrossword as { lessonWordBySlot: Record<string, string> }).lessonWordBySlot);
    expect(words.every((w) => ['planet', 'orbit', 'comet'].includes(w))).toBe(true);
  });

  it('refuses a lesson too small for a crossword and tells the teacher why', async () => {
    mockGetClassroomGame.mockResolvedValue(record());
    mockLoadLesson.mockResolvedValue({ words: LESSON.slice(0, 2), language: 'en' });
    const game: Record<string, unknown> = { isClassroom: true, language: 'en' };
    const { io, emit } = ioMock();

    expect(await stageClassroomCrossword(io, 'CLS', game as never)).toBe('refused');

    expect(game.lessonCrossword).toBeUndefined();
    expect(emit).toHaveBeenCalledWith(CROSSWORD_CLASSROOM_EVENTS.startRefused, { gameCode: 'CLS', reason: 'tooFewWords', usableWords: 2 });
  });

  it('refuses when the lesson words cannot be loaded at all', async () => {
    mockGetClassroomGame.mockResolvedValue(record());
    mockLoadLesson.mockResolvedValue({ words: [] });
    const { io, emit } = ioMock();

    expect(await stageClassroomCrossword(io, 'CLS', { isClassroom: true } as never)).toBe('refused');
    expect(emit).toHaveBeenCalledWith(CROSSWORD_CLASSROOM_EVENTS.startRefused, expect.objectContaining({ usableWords: 0 }));
  });

  it('leaves arcade rooms and other classroom modes alone', async () => {
    const { io } = ioMock();
    expect(await stageClassroomCrossword(io, 'CLS', { isClassroom: false } as never)).toBe(false);
    mockGetClassroomGame.mockResolvedValue(null);
    expect(await stageClassroomCrossword(io, 'CLS', { isClassroom: true } as never)).toBe(false);
    expect(mockLoadLesson).not.toHaveBeenCalled();
  });
});

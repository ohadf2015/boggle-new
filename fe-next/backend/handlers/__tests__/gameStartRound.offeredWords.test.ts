import { describe, it, expect, vi, beforeEach } from 'vitest';

const { setPlaced } = vi.hoisted(() => ({ setPlaced: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../../modules/gameStateManager.js', () => ({ getGame: vi.fn(), updateGame: vi.fn() }));
vi.mock('../../modules/classroomGameManager.js', () => ({
  setClassroomGamePlacedVocabulary: setPlaced,
  saveClassroomTeams: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: (code: string) => `game:${code}`,
  getSocketById: () => undefined,
  safeEmit: vi.fn(),
}));

import { settleClassroomRoundWords } from '../gameStartRound';
import type { GameState } from '../../modules/gameState/types.js';
import type { ClassroomGame } from '../../modules/classroomGameManager.js';
import type { GameMode, LetterGrid } from '@/shared/types';

const GRID = [
  ['S', 'T', 'O', 'R', 'M'],
  ['H', 'A', 'D', 'E', 'W'],
  ['I', 'N', 'L', 'S', 'A'],
  ['V', 'E', 'R', 'T', 'Y'],
  ['O', 'C', 'K', 'B', 'U'],
] as unknown as LetterGrid;

const classroomGame = { teacherId: 't1' } as unknown as ClassroomGame;

function start(round: GameState, mode: GameMode, vocabToEmbed: string[], overrides: { classroomGame?: ClassroomGame | null; stagedWords?: boolean } = {}) {
  return settleClassroomRoundWords({
    io: {} as never,
    gameCode: 'ABC123',
    game: round,
    letterGrid: GRID,
    language: 'en',
    mode,
    vocabToEmbed,
    classroomGame: overrides.classroomGame === undefined ? classroomGame : overrides.classroomGame,
    stagedWords: overrides.stagedWords ?? false,
  });
}

const newRoom = (extra: Record<string, unknown> = {}) => ({ users: {}, ...extra }) as unknown as GameState;

beforeEach(() => setPlaced.mockClear());

describe.each<GameMode>(['classic', 'word-hunt', 'blast'])('GIVEN a %s round on a shared board', (mode) => {
  it('WHEN only some lesson words fit THEN the round offers just those', () => {
    const round = newRoom();
    start(round, mode, ['storm', 'planet']);
    expect(round.classroomOfferedWords).toEqual(['storm']);
  });
});

describe.each<GameMode>(['wheel-rush', 'word-tower'])('GIVEN a %s round whose dealt grid nobody sees', (mode) => {
  it('WHEN the hidden grid happens to carry a lesson word THEN the round offers none', () => {
    const round = newRoom();
    start(round, mode, ['storm']);
    expect(round.classroomOfferedWords).toEqual([]);
  });
});

describe('GIVEN modes that deal lesson words off the shared board', () => {
  it('WHEN Wordcraft starts THEN its lesson targets are what the round offers', () => {
    const round = newRoom({ wordcraftState: { targets: ['PLANET', 'COMET'] } });
    start(round, 'wordcraft', ['storm']);
    expect(round.classroomOfferedWords).toEqual(['PLANET', 'COMET']);
  });

  it('WHEN a lesson crossword starts THEN its clue words are offered and its staged bank is left alone', () => {
    const round = newRoom({ crosswordMpState: { lessonWordBySlot: { A1: 'planet', D2: 'comet' } } });
    start(round, 'crossword', [], { stagedWords: true });
    expect(round.classroomOfferedWords).toEqual(['planet', 'comet']);
    expect(setPlaced).not.toHaveBeenCalled();
  });
});

describe('GIVEN a Classic round followed by another round in the same room', () => {
  it('WHEN the next round has nothing to place THEN the stored board list is replaced, not inherited', () => {
    const round = newRoom();
    start(round, 'classic', ['storm']);
    start(round, 'classic', []);
    expect(setPlaced).toHaveBeenLastCalledWith('ABC123', []);
    expect(round.classroomOfferedWords).toEqual([]);
  });

  it('WHEN the next round is Wheel Rush THEN the first round words are not offered', () => {
    const round = newRoom();
    start(round, 'classic', ['storm']);
    expect(round.classroomOfferedWords).toEqual(['storm']);
    start(round, 'wheel-rush', ['storm']);
    expect(round.classroomOfferedWords).toEqual([]);
  });
});

describe('GIVEN an ordinary multiplayer room', () => {
  it('WHEN a round starts THEN nothing is recorded', () => {
    const round = newRoom({ classroomOfferedWords: ['stale'] });
    expect(start(round, 'classic', [], { classroomGame: null })).toEqual([]);
    expect(round.classroomOfferedWords).toBeUndefined();
    expect(setPlaced).not.toHaveBeenCalled();
  });
});

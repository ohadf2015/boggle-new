vi.mock('../../modules/crosswordClassroomStart', () => ({ stageClassroomCrossword: vi.fn() }));
vi.mock('../../utils/socketHelpers', () => ({ broadcastToRoom: vi.fn(), getGameRoom: (c: string) => `room:${c}` }));

import { describe, it, expect, vi } from 'vitest';
import { crosswordMode } from '../crossword';
import { applyProgress, allSolved } from '../../modules/crosswordMpManager';
import { crosswordClassroomWords } from '../../modules/crosswordClassroomRound';
import { buildLessonCrossword } from '@/lib/crossword/lessonCrossword';
import type { GameState } from '../../modules/gameState/types';

const built = buildLessonCrossword({
  entries: [
    { word: 'planet', clue: 'A world' }, { word: 'orbit', clue: 'A path' },
    { word: 'comet', clue: 'Icy visitor' }, { word: 'moon', clue: 'Circles Earth' },
  ],
  locale: 'en', seed: 1, id: 'lesson-1',
});
if (!built.ok) throw new Error('fixture grid did not build');

function classroomRound(): GameState {
  const game = {
    gameSessionId: 's1', isClassroom: true,
    users: { teacher: { isHost: true }, ana: {}, ben: {} },
    lessonCrossword: { puzzle: built.ok ? built.puzzle : null, lessonWordBySlot: built.ok ? built.lessonWordBySlot : {} },
  } as unknown as GameState;
  crosswordMode.initRound!({ game, gameCode: 'CLS', language: 'en', playerUsernames: ['ana', 'ben'] } as never);
  return game;
}

describe('crossword mode in a classroom room', () => {
  it('races the lesson grid, not a pool puzzle, and only students race', () => {
    const game = classroomRound();
    expect((game.crosswordMpState!.puzzle as { id: string }).id).toBe('lesson-1');
    expect(game.crosswordMpState!.players).toEqual(['ana', 'ben']);
    expect(game.crosswordMpState!.lessonWordBySlot).toEqual(built.ok && built.lessonWordBySlot);
  });

  it('seats a late joiner who can still earn lesson words on the recap', () => {
    const game = classroomRound();
    crosswordMode.onLateJoin!(game, 'kim');
    const slotId = Object.keys(game.crosswordMpState!.lessonWordBySlot!)[0]!;
    game.crosswordMpState = applyProgress(game.crosswordMpState!, 'kim', { percent: 20, solved: false, elapsedMs: 5, score: 0, solvedSlotIds: [slotId] });
    const words = crosswordClassroomWords(game.crosswordMpState, []);
    expect(words!.wordDetailsFor('kim')).toEqual([{ word: game.crosswordMpState.lessonWordBySlot![slotId], validated: true }]);
  });

  it('a host who leaves never holds the round open: the teacher is not a racer', () => {
    const game = classroomRound();
    let state = game.crosswordMpState!;
    for (const name of ['ana', 'ben']) state = applyProgress(state, name, { percent: 100, solved: true, elapsedMs: 9, score: 10 });
    expect(allSolved(state, state.players)).toBe(true);
  });
});

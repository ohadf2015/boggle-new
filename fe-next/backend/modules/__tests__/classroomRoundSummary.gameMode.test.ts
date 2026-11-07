import { vi, describe, it, expect } from 'vitest';

vi.mock('../classroomGameManager', () => ({ saveClassroomSessionScores: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { buildClassroomRoundSummary } from '../classroomRoundSummary';
import type { ClassroomGame } from '../classroomGameTypes';

function classroomGame(over: Partial<ClassroomGame> = {}): ClassroomGame {
  return {
    gameCode: 'ROUND1', classroomId: 'class-1', teacherId: 't-1', teacherName: 'Ms Lee',
    lessonIds: ['l-1'], lessonNames: ['Unit 3'], vocabularyWords: ['cat', 'dog'],
    settings: {} as ClassroomGame['settings'], players: [], createdAt: '2026-11-07', status: 'playing',
    ...over,
  };
}

const players = [{ username: 'leo', totalScore: 10, isBot: false, wordDetails: [{ word: 'cat', validated: true }] }];

describe('buildClassroomRoundSummary gameMode', () => {
  it('Given a board round in a blast room, When summarized, Then the summary carries the room mode', async () => {
    const summary = await buildClassroomRoundSummary({ gameCode: 'ROUND1', language: 'en', classroomGame: classroomGame({ settings: { gameMode: 'blast' } as ClassroomGame['settings'] }), players, participationBonus: 0 });
    expect(summary?.gameMode).toBe('blast');
  });

  it('Given a room with no stored mode, When summarized, Then the summary reads classic', async () => {
    const summary = await buildClassroomRoundSummary({ gameCode: 'ROUND1', language: 'en', classroomGame: classroomGame(), players, participationBonus: 0 });
    expect(summary?.gameMode).toBe('classic');
  });

  it('Given the caller names the round mode, When summarized, Then that mode wins over the room setting', async () => {
    const summary = await buildClassroomRoundSummary({ gameCode: 'ROUND1', language: 'en', classroomGame: classroomGame({ settings: { gameMode: 'classic' } as ClassroomGame['settings'] }), players, participationBonus: 0, gameMode: 'vocab-quiz' });
    expect(summary?.gameMode).toBe('vocab-quiz');
  });
});

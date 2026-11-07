import { vi, describe, it, expect, beforeEach } from 'vitest';

const saveClassroomSessionScores = vi.fn().mockResolvedValue(undefined);
vi.mock('../../modules/classroomGameManager', () => ({
  saveClassroomSessionScores: (...args: unknown[]) => saveClassroomSessionScores(...args),
}));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { buildQuizResultsPayload } from '../vocabQuizResults';
import { createQuizSession, addQuizPlayer } from '../vocabQuizEngine';
import { armBoss } from '../vocabQuizBoss';
import type { ClassroomGame } from '../../modules/classroomGameTypes';

const WORDS = ['abandon', 'brittle', 'candid', 'dwindle', 'endure', 'fragile'];
const LESSON = WORDS.map((word) => ({ word, definition: `meaning of ${word}`, canIntegrate: true }));

function classroomGame(over: Partial<ClassroomGame> = {}): ClassroomGame {
  return {
    gameCode: 'QUIZ01', classroomId: 'class-1', teacherId: 't-1', teacherName: 'Ms Lee',
    lessonIds: ['l-1'], lessonNames: ['Unit 3'], vocabularyWords: WORDS,
    settings: {} as ClassroomGame['settings'], players: [], createdAt: '2026-11-03', status: 'playing',
    ...over,
  };
}

function session(questionCount = 4) {
  const s = createQuizSession({
    gameCode: 'QUIZ01', classroomId: 'class-1', words: LESSON, focus: 'any',
    questionCount, secondsPerQuestion: 20, seed: 'seed-1', now: Date.now(), language: 'en',
  });
  addQuizPlayer(s, { username: 'leo', userId: 'student-l' });
  addQuizPlayer(s, { username: 'maya', userId: null });
  const leo = s.players.get('leo')!;
  leo.score = 550;
  leo.correctWords = [s.questions[0].word, s.questions[1].word];
  const maya = s.players.get('maya')!;
  maya.score = 400;
  maya.correctWords = [s.questions[0].word];
  s.shellSessionId = 'QUIZ01:123';
  return s;
}

beforeEach(() => vi.clearAllMocks());

describe('buildQuizResultsPayload', () => {
  it('ends a quiz round on the same results payload a board round sends', async () => {
    const s = session();
    const payload = await buildQuizResultsPayload({ session: s, gameCode: 'QUIZ01', classroomGame: classroomGame(), room: { tvMode: true } });

    expect(payload).not.toBeNull();
    expect(payload!.gameMode).toBe('vocab-quiz');
    expect(payload!.gameSessionId).toBe('QUIZ01:123');
    expect(payload!.scores.map((r) => [r.username, r.totalScore, r.score])).toEqual([
      ['leo', 550, 550],
      ['maya', 400, 400],
    ]);
    const summary = payload!.classroomSummary;
    expect(summary.podium?.map((p) => p.username)).toEqual(['leo', 'maya']);
    expect(summary.roundsPlayed).toBe(1);
    expect(summary.classFoundCount).toBe(2);
    expect(summary.gameMode).toBe('vocab-quiz');
    expect(saveClassroomSessionScores).toHaveBeenCalledWith('QUIZ01', expect.any(Object), 1);
  });

  it('puts lesson words the quiz never asked under never-asked, not on the reteach list', async () => {
    const s = session(4);
    const asked = new Set(s.questions.map((q) => q.word));
    const payload = await buildQuizResultsPayload({ session: s, gameCode: 'QUIZ01', classroomGame: classroomGame(), room: {} });

    const never = payload!.classroomSummary.neverPlacedWords ?? [];
    expect(never.length).toBe(WORDS.length - asked.size);
    for (const word of never) expect(asked.has(word)).toBe(false);
  });

  it('counts a quiz round toward the period standings after earlier rounds', async () => {
    const s = session();
    const payload = await buildQuizResultsPayload({
      session: s,
      gameCode: 'QUIZ01',
      classroomGame: classroomGame({ roundsPlayed: 2, sessionScores: { leo: { name: 'leo', score: 100, rounds: 2 } } as ClassroomGame['sessionScores'] }),
      room: {},
    });

    expect(payload!.classroomSummary.roundsPlayed).toBe(3);
    expect(payload!.classroomSummary.sessionStandings?.[0]).toMatchObject({ username: 'leo', totalScore: 650 });
  });

  it('carries a Boss Battle verdict so the recap can tell it', async () => {
    const s = session();
    armBoss(s);
    const payload = await buildQuizResultsPayload({ session: s, gameCode: 'QUIZ01', classroomGame: classroomGame(), room: {} });

    expect(payload!.vocabQuizBoss).toMatchObject({ defeated: false });
  });

  it('keeps bots off the podium', async () => {
    const s = session();
    addQuizPlayer(s, { username: 'Botty', userId: null });
    s.players.get('Botty')!.score = 999;
    const payload = await buildQuizResultsPayload({
      session: s, gameCode: 'QUIZ01', classroomGame: classroomGame(), room: { users: { Botty: { isBot: true } } },
    });

    expect(payload!.classroomSummary.podium?.map((p) => p.username)).not.toContain('Botty');
  });

  it('returns null for a lesson with no words, so the quiz keeps its own ending', async () => {
    const payload = await buildQuizResultsPayload({
      session: session(), gameCode: 'QUIZ01', classroomGame: classroomGame({ vocabularyWords: [] }), room: {},
    });
    expect(payload).toBeNull();
  });
});

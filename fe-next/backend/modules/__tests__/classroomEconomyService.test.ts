import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, Record<string, unknown>>();
let config = { wrongAnswerCost: false, powerUps: true };

vi.mock('../classroomEconomyStore', () => ({
  loadConfig: async () => config,
  readAllEconomy: async (gameCode: string) => store.get(gameCode) ?? {},
  readEconomy: async () => null,
  mutateEconomy: async (_g: string, userId: string, roundId: string, fn: (s: any) => any) => {
    const game = store.get('ABC') ?? {};
    const current = (game[userId] as any) ?? { cash: 0, cashEarned: 0, streak: 0, roundId: null, doubleCashUntil: null, shieldHeld: false, hintsHeld: 0 };
    const applied = current.roundId === roundId ? current : { ...current, roundId, streak: 0, shieldHeld: false, doubleCashUntil: null };
    const next = fn(applied);
    store.set('ABC', { ...game, [userId]: next.state });
    return next.result;
  },
}));

vi.mock('../classroomGameManager', () => ({
  getClassroomGame: async () => ({
    gameCode: 'ABC',
    teacherId: 'teacher',
    players: [
      { userId: 'u1', username: 'Dana', socketId: 's1' },
      { userId: 'u2', username: 'Eli', socketId: 's2' },
    ],
  }),
}));

import {
  applyCorrectWord,
  applyWrongWord,
  buildBoard,
  buyPowerUpFor,
} from '../classroomEconomyService';

beforeEach(() => {
  store.clear();
  config = { wrongAnswerCost: false, powerUps: true };
});

describe('applyCorrectWord', () => {
  it('Given a correct lesson word, When applied, Then the snapshot shows the delta and multiplier', async () => {
    const snap = await applyCorrectWord({ gameCode: 'ABC', roundId: 'r1', userId: 'u1', wordLength: 5, fromLesson: true, now: 0 });
    expect(snap?.lastDelta).toEqual({ kind: 'correct', delta: 6, multiplier: 1, cost: 0 });
    expect(snap?.cash).toBe(6);
  });
});

describe('applyWrongWord', () => {
  it('Given cost is on, When a wrong word lands, Then the snapshot shows the cost', async () => {
    config = { wrongAnswerCost: true, powerUps: true };
    await applyCorrectWord({ gameCode: 'ABC', roundId: 'r1', userId: 'u1', wordLength: 6, fromLesson: false, now: 0 });
    const snap = await applyWrongWord({ gameCode: 'ABC', roundId: 'r1', userId: 'u1' });
    expect(snap?.lastDelta).toEqual({ kind: 'wrong', delta: 0, multiplier: 1, cost: 2 });
  });
});

describe('buyPowerUpFor', () => {
  it('Given the teacher turned power-ups off, When buying, Then it is refused', async () => {
    config = { wrongAnswerCost: false, powerUps: false };
    await applyCorrectWord({ gameCode: 'ABC', roundId: 'r1', userId: 'u1', wordLength: 9, fromLesson: true, now: 0 });
    const res = await buyPowerUpFor({ gameCode: 'ABC', roundId: 'r1', userId: 'u1', powerUpId: 'doubleCash', now: 0 });
    expect(res).toEqual({ ok: false, reason: 'power_ups_off' });
  });

  it('Given enough cash, When buying, Then the snapshot reflects the spend', async () => {
    await applyCorrectWord({ gameCode: 'ABC', roundId: 'r1', userId: 'u1', wordLength: 9, fromLesson: true, now: 0 });
    const res = await buyPowerUpFor({ gameCode: 'ABC', roundId: 'r1', userId: 'u1', powerUpId: 'hintReveal', now: 0 });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.snapshot.hintsHeld).toBe(1);
  });
});

describe('buildBoard', () => {
  it('Given two students, Then the top list is ordered by lifetime cash and carries names', async () => {
    store.set('ABC', {
      u1: { cash: 1, cashEarned: 5, streak: 0, roundId: 'r1', doubleCashUntil: null, shieldHeld: false, hintsHeld: 0 },
      u2: { cash: 1, cashEarned: 9, streak: 0, roundId: 'r1', doubleCashUntil: null, shieldHeld: false, hintsHeld: 0 },
    });
    const board = await buildBoard('ABC', 'u1');
    expect(board.top[0]).toEqual({ userId: 'u2', username: 'Eli', cashEarned: 9 });
    expect(board.you).toEqual({ rank: 2, cashEarned: 5 });
  });
});

/**
 * Treasure chest socket handler.
 *
 * The seams: the student picks a chest the moment their correct answer lands —
 * usually while the question is STILL running — so the pick must be accepted
 * in the question phase, not only during the 3s reveal. The actor's result is
 * private; the room gets a ticker event; a steal/swap victim is told their new
 * total.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../services/treasureChestResolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/treasureChestResolver')>();
  return { ...actual, resolveChestResult: vi.fn(actual.resolveChestResult) };
});

import * as gameStateManager from '../../modules/gameStateManager';
import * as resolver from '../../services/treasureChestResolver';
import { setQuizSession, clearAllQuizSessions } from '../../modules/vocabQuizStore';
import { createQuizSession, addQuizPlayer, submitQuizAnswer, type VocabQuizSession } from '../../services/vocabQuizEngine';
import { registerTreasureChestHandlers } from '../treasureChestHandler';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const LESSON: VocabularyWord[] = ['abandon', 'brittle', 'candid', 'dwindle', 'endure'].map((w, i) => ({
  word: w,
  definition: `definition number ${i} for ${w}`,
  canIntegrate: true,
}));

const GAME = 'CHEST1';

function makeIo() {
  const emits: Array<{ to: string; event: string; payload: unknown }> = [];
  const io = {
    to: vi.fn((to: string) => ({ emit: (event: string, payload: unknown) => emits.push({ to, event, payload }) })),
  };
  return { io: io as never, emits };
}

function makeSocket(id: string) {
  const listeners = new Map<string, (data: unknown) => void>();
  const socket = { id, on: vi.fn((e: string, fn: (d: unknown) => void) => listeners.set(e, fn)), emit: vi.fn() };
  return { socket: socket as never, listeners, emit: socket.emit };
}

function setup({ enabled = true, correct = true } = {}) {
  const session: VocabQuizSession = createQuizSession({
    gameCode: GAME,
    classroomId: 'room',
    words: LESSON,
    focus: 'definition',
    questionCount: 4,
    secondsPerQuestion: 20,
    seed: 'seed',
    now: Date.now(),
    treasureChestsEnabled: enabled,
  });
  addQuizPlayer(session, { username: 'ana', userId: null });
  addQuizPlayer(session, { username: 'ben', userId: null });
  session.players.get('ben')!.score = 500;
  setQuizSession(GAME, session);
  const q = session.questions[0];
  const choiceIndex = correct ? q.answerIndex : (q.answerIndex + 1) % q.choices.length;
  submitQuizAnswer(session, { username: 'ana', choiceIndex, index: 0, now: Date.now() });

  vi.mocked(gameStateManager.getGameBySocketId).mockReturnValue(GAME);
  vi.mocked(gameStateManager.getUsernameBySocketId).mockReturnValue('ana');
  vi.mocked(gameStateManager.getGame).mockReturnValue({
    users: { ana: { socketId: 'socket-ana' }, ben: { socketId: 'socket-ben' } },
  } as never);

  const { io, emits } = makeIo();
  const { socket, listeners, emit } = makeSocket('socket-ana');
  registerTreasureChestHandlers(io, socket);
  const open = (payload: unknown) => listeners.get(VOCAB_QUIZ_EVENTS.openChest)!(payload);
  return { session, emits, emit, open };
}

describe('treasureChestHandler', () => {
  beforeEach(() => {
    clearAllQuizSessions();
    vi.mocked(resolver.resolveChestResult).mockClear();
  });

  it('accepts a pick during the QUESTION phase and replies privately with the new score', () => {
    const { session, emit, open } = setup();
    expect(session.phase).toBe('question');
    open({ index: 0, chest: 1 });

    const own = emit.mock.calls.filter(([e]) => e === VOCAB_QUIZ_EVENTS.treasureChestResult);
    expect(own).toHaveLength(1);
    const result = own[0][1] as { actor: string; myScore: number };
    expect(result.actor).toBe('ana');
    expect(result.myScore).toBe(session.players.get('ana')!.score);
  });

  it('broadcasts a ticker event to the room — never the private result, and without myScore', () => {
    const { emits, open } = setup();
    open({ index: 0, chest: 0 });
    const roomEmits = emits.filter((e) => e.to === `game:${GAME}`);
    expect(roomEmits.map((e) => e.event)).toEqual([VOCAB_QUIZ_EVENTS.treasureChestEvent]);
    expect(roomEmits[0].payload).not.toHaveProperty('myScore');
  });

  it('ignores a pick after a wrong answer', () => {
    const { emit, emits, open } = setup({ correct: false });
    open({ index: 0, chest: 0 });
    expect(emit).not.toHaveBeenCalled();
    expect(emits).toHaveLength(0);
  });

  it('ignores picks when the teacher turned chests off', () => {
    const { emit, emits, open } = setup({ enabled: false });
    open({ index: 0, chest: 0 });
    expect(emit).not.toHaveBeenCalled();
    expect(emits).toHaveLength(0);
  });

  it('a second pick replays the cached result instead of opening another chest', () => {
    const { session, emit, open } = setup();
    open({ index: 0, chest: 0 });
    const scoreAfterFirst = session.players.get('ana')!.score;
    open({ index: 0, chest: 2 });
    expect(session.players.get('ana')!.score).toBe(scoreAfterFirst);
    expect(resolver.resolveChestResult).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls.filter(([e]) => e === VOCAB_QUIZ_EVENTS.treasureChestResult)).toHaveLength(2);
  });

  it('a steal moves points on the server and tells the victim their new total', () => {
    vi.mocked(resolver.resolveChestResult).mockImplementationOnce((i) =>
      resolver.applyChestOutcome({ outcome: 'steal', username: i.username, players: i.players, answerPoints: i.answerPoints, amountRand: 0 })
    );
    const { session, emits, open } = setup();
    const anaBefore = session.players.get('ana')!.score;
    open({ index: 0, chest: 1 });

    const ben = session.players.get('ben')!;
    expect(ben.score).toBeLessThan(500);
    expect(session.players.get('ana')!.score).toBe(anaBefore + (500 - ben.score));

    const hit = emits.find((e) => e.to === 'socket-ben' && e.event === VOCAB_QUIZ_EVENTS.chestHit);
    expect(hit?.payload).toEqual({ actor: 'ana', outcome: 'steal', amount: 500 - ben.score, score: ben.score });
  });

  it('drops a pick for a stale question index', () => {
    const { emit, open } = setup();
    open({ index: 3, chest: 0 });
    expect(emit).not.toHaveBeenCalled();
  });

  it('rejects a malformed chest number', () => {
    const { emit, open } = setup();
    open({ index: 0, chest: 7 });
    expect(emit).not.toHaveBeenCalled();
  });
});

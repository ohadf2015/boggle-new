/**
 * useVocabQuiz — Treasure Chest state tests.
 *
 * Verifies that the hook correctly tracks:
 * - chestPending: true when a correct answer awaits chest reveal
 * - myChest: the treasure chest result once server sends treasureChestResult
 */

import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useVocabQuiz } from '../useVocabQuiz';
import type { Socket } from 'socket.io-client';
import { VOCAB_QUIZ_EVENTS, type VocabQuizAnswerResult, type TreasureChestState } from '@/shared/types/vocabQuiz';

// Mock Socket.IO
const createMockSocket = () => {
  const listeners: Record<string, Function[]> = {};

  return {
    on: vi.fn((event: string, handler: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    off: vi.fn((event: string, handler: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((h) => h !== handler);
      }
    }),
    emit: vi.fn(),
    // Helper to trigger events in tests
    // Socket handlers run outside React; act() flushes the state they set.
    _trigger: (event: string, data: any) => {
      act(() => {
        (listeners[event] ?? []).forEach((h) => h(data));
      });
    },
  } as unknown as Socket & { _trigger: (event: string, data: unknown) => void };
};

describe('useVocabQuiz — Treasure Chest', () => {
  it('initializes myChest as null', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    expect(result.current.myChest).toBeNull();
    expect(result.current.chestPending).toBe(false);
  });

  it('sets chestPending=true when answer result indicates chestPending', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    const answerResult: VocabQuizAnswerResult = {
      index: 0,
      correct: true,
      choiceIndex: 0,
      points: 10,
      speedBonus: 2,
      streakBonus: 0,
      streak: 1,
      totalScore: 12,
      chestPending: true,
    };

    socket._trigger(VOCAB_QUIZ_EVENTS.answerResult, answerResult);

    // The hook should track that a chest is pending
    expect(result.current.chestPending).toBe(true);
  });

  it('stores myChest when treasureChestResult arrives', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    const chestResult: TreasureChestState = {
      actor: 'player1',
      outcome: 'gain',
      amount: 5,
      standings: [
        { username: 'player1', score: 15, streak: 1, bestStreak: 1, correctCount: 1 },
      ],
      myScore: 15,
    };

    socket._trigger(VOCAB_QUIZ_EVENTS.treasureChestResult, chestResult);

    expect(result.current.myChest).toEqual(chestResult);
    expect(result.current.myScore).toBe(15);
    expect(result.current.standings).toEqual(chestResult.standings);
  });

  it("another student's chest feeds the ticker and standings but never becomes myChest", () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));
    const theirs: TreasureChestState = {
      actor: 'ben',
      outcome: 'steal',
      amount: 40,
      targetUsername: 'ana',
      standings: [{ username: 'ben', score: 240, streak: 1, bestStreak: 1, correctCount: 1 }],
    };

    socket._trigger(VOCAB_QUIZ_EVENTS.treasureChestEvent, theirs);

    expect(result.current.myChest).toBeNull();
    expect(result.current.chestEvents).toEqual([theirs]);
    expect(result.current.standings).toEqual(theirs.standings);
  });

  it('a chestHit (someone stole from me) updates my score from the server and records the hit', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    socket._trigger(VOCAB_QUIZ_EVENTS.chestHit, { actor: 'ben', outcome: 'steal', amount: 40, score: 110 });

    expect(result.current.myScore).toBe(110);
    expect(result.current.chestHit).toEqual({ actor: 'ben', outcome: 'steal', amount: 40, score: 110 });
  });

  it('clears a pending chest when the quiz ends so the picker cannot cover the finale', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));
    socket._trigger(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 0, correct: true, choiceIndex: 0, points: 10, speedBonus: 0, streakBonus: 0, streak: 1, totalScore: 10, chestPending: true,
    });
    socket._trigger(VOCAB_QUIZ_EVENTS.ended, { gameCode: 'X', standings: [], totalQuestions: 1 });

    expect(result.current.chestPending).toBe(false);
  });

  it('clears myChest when moving to next question', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    // Set a chest result
    const chestResult: TreasureChestState = {
      actor: 'player1',
      outcome: 'gain',
      amount: 5,
      standings: [],
    };
    socket._trigger(VOCAB_QUIZ_EVENTS.treasureChestResult, chestResult);
    expect(result.current.myChest).toEqual(chestResult);

    // Simulate next question
    socket._trigger(VOCAB_QUIZ_EVENTS.question, {
      index: 1,
      total: 10,
      focus: 'definition',
      prompt: 'What is a cat?',
      choices: ['A', 'B', 'C', 'D'],
      limitMs: 20000,
      remainingMs: 20000,
      serverNow: Date.now(),
    });

    expect(result.current.myChest).toBeNull();
  });
});

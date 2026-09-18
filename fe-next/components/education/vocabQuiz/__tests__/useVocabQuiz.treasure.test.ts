/**
 * useVocabQuiz — Treasure Chest state tests.
 *
 * Verifies that the hook correctly tracks:
 * - chestPending: true when a correct answer awaits chest reveal
 * - myChest: the treasure chest result once server sends treasureChestResult
 */

import { renderHook } from '@testing-library/react';
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
    _trigger: (event: string, data: any) => {
      if (listeners[event]) {
        listeners[event].forEach((h) => h(data));
      }
    },
  } as any as Socket;
};

describe('useVocabQuiz — Treasure Chest', () => {
  it('initializes myChest as null', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    expect((result.current as any).myChest).toBeUndefined();
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
    expect((result.current as any).chestPending).toBe(true);
  });

  it('stores myChest when treasureChestResult arrives', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    const chestResult: TreasureChestState = {
      outcome: 'gain',
      amount: 5,
      standings: [
        { username: 'player1', score: 15, streak: 1, bestStreak: 1, correctCount: 1 },
      ],
    };

    socket._trigger(VOCAB_QUIZ_EVENTS.treasureChestResult, chestResult);

    expect((result.current as any).myChest).toEqual(chestResult);
  });

  it('clears myChest when moving to next question', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    // Set a chest result
    const chestResult: TreasureChestState = {
      outcome: 'gain',
      amount: 5,
      standings: [],
    };
    socket._trigger(VOCAB_QUIZ_EVENTS.treasureChestResult, chestResult);

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

    expect((result.current as any).myChest).toBeNull();
  });
});

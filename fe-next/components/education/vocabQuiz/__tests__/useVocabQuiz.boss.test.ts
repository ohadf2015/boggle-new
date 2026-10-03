import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { useVocabQuiz } from '../useVocabQuiz';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const createMockSocket = () => {
  const listeners: Record<string, Array<(data: unknown) => void>> = {};
  return {
    on: vi.fn((event: string, handler: (data: unknown) => void) => {
      (listeners[event] ??= []).push(handler);
    }),
    off: vi.fn((event: string, handler: (data: unknown) => void) => {
      listeners[event] = (listeners[event] ?? []).filter((h) => h !== handler);
    }),
    emit: vi.fn(),
    _trigger: (event: string, data: unknown) => {
      act(() => {
        (listeners[event] ?? []).forEach((h) => h(data));
      });
    },
  } as unknown as Socket & { _trigger: (event: string, data: unknown) => void };
};

const question = (index: number, boss?: object) => ({
  gameCode: 'BOSS01',
  index,
  total: 5,
  focus: 'meaning',
  prompt: 'honest and direct',
  choices: ['a', 'b', 'c', 'd'],
  limitMs: 10_000,
  remainingMs: 10_000,
  serverNow: Date.now(),
  ...(boss ? { boss } : {}),
});

describe('useVocabQuiz — Boss Battle', () => {
  it('has no boss on a plain quiz', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));
    socket._trigger(VOCAB_QUIZ_EVENTS.question, question(0));
    expect(result.current.boss).toBeNull();
  });

  it('follows the server boss through question, reveal, snapshot and finale', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));

    socket._trigger(VOCAB_QUIZ_EVENTS.question, question(0, { maxHp: 6, hp: 6, lastHits: 0, defeated: false }));
    expect(result.current.boss).toEqual({ maxHp: 6, hp: 6, lastHits: 0, defeated: false });

    socket._trigger(VOCAB_QUIZ_EVENTS.reveal, {
      gameCode: 'BOSS01', index: 0, total: 5, answerIndex: 1, answer: 'b', word: 'candid',
      distribution: [0, 2, 0, 0], standings: [], nextInMs: 3000, isLast: false,
      boss: { maxHp: 6, hp: 4, lastHits: 2, defeated: false },
    });
    expect(result.current.boss).toMatchObject({ hp: 4, lastHits: 2 });

    socket._trigger(VOCAB_QUIZ_EVENTS.state, {
      gameCode: 'BOSS01', active: true, phase: 'question', focus: 'any', paused: false, index: 1, total: 5,
      serverNow: Date.now(), question: question(1), myScore: 0, myStreak: 0, standings: [],
      boss: { maxHp: 6, hp: 4, lastHits: 0, defeated: false },
    });
    expect(result.current.boss).toMatchObject({ hp: 4, lastHits: 0 });

    socket._trigger(VOCAB_QUIZ_EVENTS.ended, {
      gameCode: 'BOSS01', standings: [], totalQuestions: 5,
      boss: { maxHp: 6, hp: 0, lastHits: 4, defeated: true },
    });
    expect(result.current.boss).toMatchObject({ hp: 0, defeated: true });
  });

  it('keeps the hit the server credited to this student', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useVocabQuiz(socket));
    socket._trigger(VOCAB_QUIZ_EVENTS.question, question(0, { maxHp: 6, hp: 6, lastHits: 0, defeated: false }));
    socket._trigger(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 0, correct: true, choiceIndex: 1, points: 100, speedBonus: 0, streakBonus: 0, streak: 3, totalScore: 300, bossHit: 2,
    });
    expect(result.current.myAnswer?.bossHit).toBe(2);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const standings = [
  { username: 'ana', score: 480, streak: 1, bestStreak: 2, correctCount: 3 },
  { username: 'bo', score: 460, streak: 0, bestStreak: 2, correctCount: 3 },
];
const QUIZ = {
  phase: 'reveal' as const, paused: false,
  question: { gameCode: 'H9M5YJ', index: 2, total: 8, focus: 'definition', prompt: 'brittle', choices: ['a', 'b', 'c', 'd'], limitMs: 20000, remainingMs: 0, serverNow: 0 },
  reveal: { gameCode: 'H9M5YJ', index: 2, total: 8, answerIndex: 0, answer: 'a', word: 'brittle', distribution: [1, 1, 0, 0], standings, nextInMs: 3000, isLast: false },
  standings, myAnswer: null, pendingChoice: null, myScore: 0, myStreak: 0, secondsLeft: 0, fractionLeft: 0,
  totalQuestions: 8, questionNumber: 3, finished: false, lockIn: null, chestPending: false, myChest: null, chestEvents: [],
  chestHit: null, answer: vi.fn(), isQuizRoom: true,
};
const pressure = vi.hoisted(() => ({ value: null as null | Record<string, unknown> }));

vi.mock('../useVocabQuiz', () => ({ useVocabQuiz: () => QUIZ }));
vi.mock('@/hooks/gameState/classroomPressureStore', () => ({ useClassroomPressure: () => pressure.value }));

const { VocabQuizHostView } = await import('../VocabQuizHostView');
const t = (key: string) => key;

describe('VocabQuizHostView — standings between questions', () => {
  beforeEach(() => {
    pressure.value = null;
  });

  it('puts the class standings on the wall at the reveal', () => {
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={2} t={t} />);
    expect(screen.getByTestId('vq-rank-rail')).toBeInTheDocument();
    expect(screen.getAllByTestId('vq-rail-row').map((r) => r.getAttribute('data-username'))).toEqual(['ana', 'bo']);
  });

  it('keeps the standings off the wall when the teacher hid the leaderboard', () => {
    pressure.value = { leaderboard: 'hidden' };
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={2} t={t} />);
    expect(screen.queryByTestId('vq-rank-rail')).toBeNull();
  });
});

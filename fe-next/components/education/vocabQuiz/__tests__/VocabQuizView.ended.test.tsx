/**
 * Live Vocab Quiz — the student's end-of-quiz moment.
 *
 * The projector already finishes on the same podium the board modes use
 * (VocabQuizHostView). The student's phone finished on a flat ranked list, so
 * the one mode built entirely around a phone had the weakest ending in the
 * product. It now gets the identical shape as a board round: my own placing
 * first, the room's top three underneath.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { VocabQuizView } from '../VocabQuizView';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

function makeSocket() {
  const handlers = new Map<string, Array<(payload: unknown) => void>>();
  const socket = {
    on(event: string, fn: (payload: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(fn);
    },
    off(event: string, fn: (payload: unknown) => void) {
      handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== fn));
    },
    emit() {},
  };
  const server = (event: string, payload: unknown) =>
    act(() => {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    });
  return { socket: socket as never, server };
}

const ENDED = {
  gameCode: 'ABC123',
  totalQuestions: 5,
  standings: [
    { username: 'ana', score: 480, streak: 2, bestStreak: 3, correctCount: 4 },
    { username: 'bo', score: 300, streak: 0, bestStreak: 2, correctCount: 3 },
    { username: 'cy', score: 120, streak: 0, bestStreak: 1, correctCount: 1 },
  ],
};

beforeEach(() => vi.useRealTimers());

describe('VocabQuizView — the quiz ends on a moment', () => {
  it('opens the end screen with this student\'s own placing', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    server(VOCAB_QUIZ_EVENTS.ended, ENDED);

    const hero = screen.getByTestId('student-round-outcome');
    expect(hero.dataset.rank).toBe('2');
    expect(hero).toHaveTextContent('300');
  });

  it('counts the student\'s correct answers against the questions asked', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    server(VOCAB_QUIZ_EVENTS.ended, ENDED);

    expect(screen.getByTestId('student-outcome-words')).toHaveTextContent('3,5');
  });

  it('stages the top three on plinths, the same podium the projector shows', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    server(VOCAB_QUIZ_EVENTS.ended, ENDED);

    expect(screen.getByTestId('podium-place-1')).toHaveTextContent('ana');
    expect(screen.getByTestId('podium-place-2')).toHaveTextContent('bo');
    expect(screen.getByTestId('podium-place-3')).toHaveTextContent('cy');
  });

  it('shows no podium mid-quiz — a lead that is still moving is not a result', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    server(VOCAB_QUIZ_EVENTS.reveal, {
      gameCode: 'ABC123', index: 0, total: 5, answerIndex: 0, answer: 'a', word: 'a',
      definition: 'd', distribution: [1, 0, 0, 0], standings: ENDED.standings,
      nextInMs: 3000, isLast: false,
    });
    expect(screen.queryByTestId('podium-place-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('student-round-outcome')).not.toBeInTheDocument();
  });
});

/**
 * The quiz student view honours the teacher's calm dials (RED first).
 *
 * Vocab Quiz is the lobby's preselected mode, and its student view ignored two
 * of the three dials: the per-question clock always ran orange+pulsing at the
 * end, and the standings reveal paid no attention to a hidden leaderboard.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { VocabQuizView } from '../VocabQuizView';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';
import { useClassroomPressureStore } from '@/hooks/gameState/classroomPressureStore';
import { DEFAULT_CLASSROOM_PRESSURE } from '@/shared/utils/classroomPressure';

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
    emit: vi.fn(),
  };
  const server = (event: string, payload: unknown) =>
    act(() => {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    });
  return { socket: socket as never, server };
}

const QUESTION = {
  gameCode: 'ABC123',
  index: 0,
  total: 5,
  focus: 'definition' as const,
  prompt: 'to leave behind for good',
  choices: ['abandon', 'brittle', 'candid', 'dwindle'],
  limitMs: 20_000,
  remainingMs: 4_000,
  serverNow: 1_700_000_000_000,
};

const REVEAL = {
  gameCode: 'ABC123',
  index: 0,
  total: 5,
  answerIndex: 0,
  answer: 'abandon',
  word: 'abandon',
  definition: 'to leave behind for good',
  distribution: [2, 1, 0, 0],
  standings: [
    { username: 'ana', score: 148, streak: 1, bestStreak: 1, correctCount: 1 },
    { username: 'bo', score: 90, streak: 0, bestStreak: 0, correctCount: 0 },
    { username: 'cy', score: 50, streak: 0, bestStreak: 0, correctCount: 0 },
    { username: 'di', score: 10, streak: 0, bestStreak: 0, correctCount: 0 },
  ],
  nextInMs: 3_000,
  isLast: false,
};

function setPressure(pressure: typeof DEFAULT_CLASSROOM_PRESSURE | null) {
  useClassroomPressureStore.getState().setClassroomPressure(pressure);
}

beforeEach(() => {
  vi.useRealTimers();
  setPressure(null);
});

describe('VocabQuizView — pressure dials', () => {
  it('timer=off: no question clock at all', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, timer: 'off' });
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    expect(screen.queryByRole('timer')).toBeNull();
  });

  it('timer=gentle: the last seconds keep the calm cyan, no pulse', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, timer: 'gentle' });
    const { socket, server } = makeSocket();
    const { container } = render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION); // remainingMs 4000 = urgent zone
    const bar = screen.getByRole('timer');
    expect(bar.className).not.toContain('animate-pulse');
    expect(container.querySelector('.bg-neo-orange')).toBeNull();
    expect(container.querySelector('.bg-neo-cyan')).not.toBeNull();
  });

  it('default (loud): the last seconds turn orange', () => {
    const { socket, server } = makeSocket();
    const { container } = render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    expect(container.querySelector('.bg-neo-orange')).not.toBeNull();
  });

  it('leaderboard=hidden: the reveal shows no rank in the header', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'hidden' });
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);
    expect(screen.queryByText(/vocabQuiz\.rank/)).toBeNull();
  });

  it('leaderboard=hidden: the end screen swaps standings for the reveal beat', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'hidden' });
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.reveal, { ...REVEAL, isLast: true });
    server(VOCAB_QUIZ_EVENTS.ended, {
      gameCode: 'ABC123',
      standings: REVEAL.standings,
      totalQuestions: 5,
    });
    expect(screen.getByText('education.classroomGame.pressure.revealAtEnd')).toBeInTheDocument();
  });

  it('leaderboard=hidden: the end outcome shows own score without class position', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'hidden' });
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.reveal, { ...REVEAL, isLast: true });
    server(VOCAB_QUIZ_EVENTS.ended, {
      gameCode: 'ABC123',
      standings: REVEAL.standings,
      totalQuestions: 5,
    });
    // ana leads the fixture standings — under hidden the card may not say so.
    const outcome = screen.getByTestId('student-round-outcome');
    expect(outcome.dataset.rank).toBeUndefined();
    expect(outcome).toHaveTextContent('education.results.you.roundComplete');
    expect(screen.queryByTestId('student-outcome-beat')).toBeNull();
    expect(screen.queryByText(/you\.won/)).toBeNull();
  });

  it('leaderboard=full: the end outcome keeps the placing (the reveal)', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'full' });
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.reveal, { ...REVEAL, isLast: true });
    server(VOCAB_QUIZ_EVENTS.ended, {
      gameCode: 'ABC123',
      standings: REVEAL.standings,
      totalQuestions: 5,
    });
    expect(screen.getByTestId('student-round-outcome').dataset.rank).toBe('1');
  });

  it('leaderboard=top3: the end standings trim to the podium', () => {
    setPressure({ ...DEFAULT_CLASSROOM_PRESSURE, leaderboard: 'top3' });
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="di" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.reveal, { ...REVEAL, isLast: true });
    server(VOCAB_QUIZ_EVENTS.ended, {
      gameCode: 'ABC123',
      standings: REVEAL.standings,
      totalQuestions: 5,
    });
    // di is 4th — trimmed off the podium view
    expect(screen.queryByText('di')).toBeNull();
    expect(screen.getByText('bo')).toBeInTheDocument();
  });
});

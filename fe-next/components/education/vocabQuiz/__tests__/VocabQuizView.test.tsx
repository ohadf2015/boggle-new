/**
 * Live Vocab Quiz — the student phone, driven through a fake socket.
 *
 * Exercises the four states a student passes through in a round (waiting,
 * answering, locked in, reveal, finished) plus the two that bite in a real
 * classroom: a refresh mid-question, and the teacher pausing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VocabQuizView } from '../VocabQuizView';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

/** Mirrors the real `t(path, params)` call shape used by these components. */
const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

/** Minimal socket double that lets a test push server events into the hook. */
function makeSocket() {
  const handlers = new Map<string, Array<(payload: unknown) => void>>();
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const socket = {
    on(event: string, fn: (payload: unknown) => void) {
      if (!handlers.has(event)) handlers.set(event, []);
      handlers.get(event)!.push(fn);
    },
    off(event: string, fn: (payload: unknown) => void) {
      handlers.set(event, (handlers.get(event) ?? []).filter((h) => h !== fn));
    },
    emit(event: string, payload?: unknown) {
      emitted.push({ event, payload });
    },
  };
  const server = (event: string, payload: unknown) =>
    act(() => {
      for (const fn of handlers.get(event) ?? []) fn(payload);
    });
  return { socket: socket as never, server, emitted };
}

const QUESTION = {
  gameCode: 'ABC123',
  index: 0,
  total: 5,
  focus: 'definition' as const,
  prompt: 'to leave behind for good',
  choices: ['abandon', 'brittle', 'candid', 'dwindle'],
  limitMs: 20_000,
  remainingMs: 20_000,
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
    { username: 'bo', score: 0, streak: 0, bestStreak: 0, correctCount: 0 },
  ],
  nextInMs: 3_000,
  isLast: false,
};

beforeEach(() => vi.useRealTimers());

describe('VocabQuizView', () => {
  it('asks the server for the current state on mount, so a refresh restores the round', () => {
    const { socket, emitted } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    expect(emitted.some((e) => e.event === VOCAB_QUIZ_EVENTS.requestState)).toBe(true);
  });

  it('shows a waiting message before the first question', () => {
    const { socket } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    expect(screen.getByText('vocabQuiz.waiting')).toBeInTheDocument();
  });

  it('renders the prompt, the progress and four answers when a question arrives', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);

    expect(screen.getByText('to leave behind for good')).toBeInTheDocument();
    expect(screen.getByText('vocabQuiz.progress:1,5')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('sends the answer with the question index and then locks the buttons', async () => {
    const { socket, server, emitted } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);

    await userEvent.click(screen.getByRole('button', { name: /abandon/ }));

    const answer = emitted.find((e) => e.event === VOCAB_QUIZ_EVENTS.answer);
    expect(answer?.payload).toEqual({ index: 0, choiceIndex: 0 });
    expect(screen.getByText('vocabQuiz.lockedIn')).toBeInTheDocument();
  });

  it('refuses a second answer on the same question', async () => {
    const { socket, server, emitted } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);

    await userEvent.click(screen.getByRole('button', { name: /abandon/ }));
    await userEvent.click(screen.getByRole('button', { name: /brittle/ }));

    expect(emitted.filter((e) => e.event === VOCAB_QUIZ_EVENTS.answer)).toHaveLength(1);
  });

  it('shows the score and streak the server reports, never one it computes itself', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 0, correct: true, choiceIndex: 0,
      points: 148, speedBonus: 48, streakBonus: 0, streak: 3, totalScore: 420,
    });

    expect(screen.getByText('420')).toBeInTheDocument();
    expect(screen.getByLabelText('vocabQuiz.streak.label:3')).toBeInTheDocument();
  });

  it('tells the student they were right, and breaks the points down', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 0, correct: true, choiceIndex: 0,
      points: 148, speedBonus: 48, streakBonus: 0, streak: 1, totalScore: 148,
    });
    server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);

    expect(screen.getByText('vocabQuiz.feedback.correct:148')).toBeInTheDocument();
    expect(screen.getByText('vocabQuiz.feedback.breakdown:100,48,0')).toBeInTheDocument();
  });

  it('names the right answer when the student never answered', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);

    expect(screen.getByText('vocabQuiz.feedback.noAnswer:abandon')).toBeInTheDocument();
  });

  it('shows standings between questions', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);

    expect(screen.getByText('ana')).toBeInTheDocument();
    expect(screen.getByText('148')).toBeInTheDocument();
  });

  it('clears the previous answer when the next question arrives', async () => {
    const { socket, server, emitted } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    await userEvent.click(screen.getByRole('button', { name: /abandon/ }));
    server(VOCAB_QUIZ_EVENTS.reveal, REVEAL);
    server(VOCAB_QUIZ_EVENTS.question, { ...QUESTION, index: 1, prompt: 'hard but easily broken' });

    // Without the reset the student would still be locked out of question 2.
    expect(screen.queryByText('vocabQuiz.lockedIn')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /abandon/ }));
    expect(emitted.filter((e) => e.event === VOCAB_QUIZ_EVENTS.answer)).toHaveLength(2);
  });

  it('restores a mid-question refresh with the time left and the answer already given', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.state, {
      gameCode: 'ABC123',
      active: true,
      phase: 'question',
      focus: 'definition',
      paused: false,
      index: 2,
      total: 5,
      serverNow: QUESTION.serverNow,
      question: { ...QUESTION, index: 2, remainingMs: 8_000 },
      myAnswer: {
        index: 2, correct: true, choiceIndex: 1,
        points: 130, speedBonus: 30, streakBonus: 0, streak: 2, totalScore: 260,
      },
      myScore: 260,
      myStreak: 2,
      standings: REVEAL.standings,
    });

    expect(screen.getByText('vocabQuiz.progress:3,5')).toBeInTheDocument();
    expect(screen.getByText('260')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /brittle/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('says the round is paused so a frozen clock is never mistaken for a bug', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.paused, { gameCode: 'ABC123', paused: true });

    expect(screen.getByText('vocabQuiz.paused')).toBeInTheDocument();
  });

  it('shows final standings when the round ends', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="ana" t={t} />);
    server(VOCAB_QUIZ_EVENTS.question, QUESTION);
    server(VOCAB_QUIZ_EVENTS.ended, {
      gameCode: 'ABC123',
      standings: REVEAL.standings,
      totalQuestions: 5,
    });

    expect(screen.getByText('vocabQuiz.finished.title')).toBeInTheDocument();
    expect(screen.getByText('ana')).toBeInTheDocument();
  });

  it('paints an explicit dark background rather than the cream/dark pair that flashes', () => {
    const { socket } = makeSocket();
    const { container } = render(<VocabQuizView socket={socket} username="ana" t={t} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-neo-navy');
    expect(root.className).not.toContain('bg-neo-cream');
  });
});

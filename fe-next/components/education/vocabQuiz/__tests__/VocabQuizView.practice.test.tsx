/**
 * "Practise these words" must not leave the live room.
 *
 * It used to `router.push('/<locale>/student/lessons')`, which unmounted the
 * multiplayer page and dropped the student out of the socket room — so the
 * teacher's one-tap Rematch went on without them. The practice now opens IN
 * PLACE over the finale, lists the words this student missed, and closes
 * itself the moment the rematch's first question arrives.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { VocabQuizView } from '../VocabQuizView';
import { VOCAB_QUIZ_EVENTS } from '@/shared/types/vocabQuiz';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  useParams: () => ({ locale: 'en' }),
}));

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

const question = (index: number) => ({
  gameCode: 'ABC123',
  index,
  total: 2,
  focus: 'definition',
  prompt: `prompt ${index}`,
  choices: ['a', 'b', 'c', 'd'],
  limitMs: 20_000,
  remainingMs: 20_000,
  serverNow: Date.now(),
});

const answer = (index: number, correct: boolean) => ({
  index, correct, choiceIndex: correct ? 0 : 1, points: correct ? 100 : 0,
  speedBonus: 0, streakBonus: 0, streak: correct ? 1 : 0, totalScore: correct ? 100 : 0,
});

const reveal = (index: number, word: string, definition: string) => ({
  gameCode: 'ABC123', index, total: 2, answerIndex: 0, answer: definition, word, definition,
  distribution: [1, 1, 0, 0], standings: [], nextInMs: 3000, isLast: index === 1,
});

const ENDED = {
  gameCode: 'ABC123',
  totalQuestions: 2,
  standings: [{ username: 'bo', score: 100, streak: 0, bestStreak: 1, correctCount: 1 }],
};

async function playQuiz(server: ReturnType<typeof makeSocket>['server'], results: boolean[]) {
  const words = [['brittle', 'easily broken'], ['candid', 'honest and direct']];
  for (let i = 0; i < results.length; i++) {
    server(VOCAB_QUIZ_EVENTS.question, question(i));
    server(VOCAB_QUIZ_EVENTS.answerResult, answer(i, results[i]));
    server(VOCAB_QUIZ_EVENTS.reveal, reveal(i, words[i][0], words[i][1]));
  }
  server(VOCAB_QUIZ_EVENTS.ended, ENDED);
}

beforeEach(() => push.mockClear());

describe('VocabQuizView — practice stays in the room', () => {
  it('given a missed word, when the student taps practice, then the missed words open in place (no navigation)', async () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    await playQuiz(server, [true, false]);

    fireEvent.click(screen.getByTestId('practice-missed-button'));

    const sheet = screen.getByTestId('vocab-quiz-missed-sheet');
    expect(sheet).toHaveTextContent('candid');
    expect(sheet).toHaveTextContent('honest and direct');
    expect(sheet).not.toHaveTextContent('brittle'); // answered right — not "missed"
    expect(push).not.toHaveBeenCalled();
  });

  it('closes the practice sheet by itself when the teacher starts the rematch', async () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    await playQuiz(server, [false, false]);
    fireEvent.click(screen.getByTestId('practice-missed-button'));
    expect(screen.getByTestId('vocab-quiz-missed-sheet')).toBeInTheDocument();

    server(VOCAB_QUIZ_EVENTS.question, question(0));

    expect(screen.queryByTestId('vocab-quiz-missed-sheet')).not.toBeInTheDocument();
    expect(screen.getByText('prompt 0')).toBeInTheDocument();
  });

  it('a rematch starts with a clean list, and its finale does not reopen the old sheet', async () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    await playQuiz(server, [false, false]);
    fireEvent.click(screen.getByTestId('practice-missed-button'));

    await playQuiz(server, [true, false]);

    expect(screen.queryByTestId('vocab-quiz-missed-sheet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('practice-missed-button'));
    expect(screen.getByTestId('vocab-quiz-missed-sheet')).not.toHaveTextContent('brittle');
  });

  it('a clean sheet offers no practice — the only action is staying for the teacher', async () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    await playQuiz(server, [true, true]);

    expect(screen.getByTestId('wait-for-teacher-message')).toBeInTheDocument();
    expect(screen.queryByTestId('practice-missed-button')).not.toBeInTheDocument();
  });
});

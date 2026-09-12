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

  it('stops counting questions once there are none left to answer', () => {
    // Captured live at the end of room RV4UN9: the phone read "Question 4 of
    // 10" above "That's a wrap!". A progress counter on a finished round is
    // chrome from a screen that no longer exists, and on a phone it is the
    // line a student reads first. The score and the flame stay — those are
    // theirs — the counter goes.
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    server(VOCAB_QUIZ_EVENTS.ended, ENDED);

    expect(screen.queryByText(/^vocabQuiz\.progress/)).toBeNull();
    expect(screen.getByTestId('vocab-quiz-score')).toBeInTheDocument();
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

  it('never loses the score it just showed, even when the standings miss this student', () => {
    // The round-2 disqualifier: a student watched their score climb to 502 and
    // was then shown a recap reading 0 POINTS. The standings row is the normal
    // source, but a late joiner, a renamed player, or a room the server scored
    // under a different display name all land in the same place — and the one
    // number the student earned must never be the casualty.
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="dee" t={t} />);
    server(VOCAB_QUIZ_EVENTS.answerResult, {
      index: 0, correct: true, choiceIndex: 1, points: 150,
      speedBonus: 30, streakBonus: 20, streak: 3, totalScore: 502,
    });
    server(VOCAB_QUIZ_EVENTS.ended, ENDED);

    expect(screen.queryByTestId('student-round-outcome')).not.toBeInTheDocument();
    expect(screen.getByTestId('vocab-quiz-own-score')).toHaveTextContent('502');
  });

  /**
   * Measured live at 390x844 (room H4XU9G, a perfect 10/10 round): the phone's
   * end screen rendered the recap and the podium in its top half and left the
   * bottom 40% as empty navy. The round's whole payoff — the streak the
   * student spent ten questions building — vanished at the whistle, which is
   * the cliff the round-3 critic called disqualifying one surface over.
   */
  it('keeps the streak the student built on the screen that celebrates it', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    server(VOCAB_QUIZ_EVENTS.ended, ENDED);

    expect(screen.getByTestId('vocab-quiz-own-finale')).toHaveTextContent('vocabQuiz.finished.bestStreak:2');
  });

  it('calls a clean sheet what it is, and only when it is one', () => {
    const { socket, server } = makeSocket();
    render(<VocabQuizView socket={socket} username="bo" t={t} />);
    server(VOCAB_QUIZ_EVENTS.ended, ENDED);
    expect(screen.queryByTestId('vocab-quiz-perfect')).toBeNull();

    const { socket: s2, server: srv2 } = makeSocket();
    render(<VocabQuizView socket={s2} username="ana" t={t} />);
    srv2(VOCAB_QUIZ_EVENTS.ended, {
      ...ENDED,
      totalQuestions: 4,
      standings: [{ username: 'ana', score: 800, streak: 4, bestStreak: 4, correctCount: 4 }],
    });
    expect(screen.getByTestId('vocab-quiz-perfect')).toBeInTheDocument();
  });
});

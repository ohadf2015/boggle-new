/**
 * Live Vocab Quiz — what the wall looks like once the round is over (RED first).
 *
 * Captured live at 1440x900 on room H9M5YJ: the finale renders, but the header
 * above it still counts "Question 10 of 10" and the podium floats in the top
 * third with the bottom half of the projector empty. Both are the same mistake
 * — the wall is still dressed as a live question after the question is gone —
 * and on a screen a whole class is looking at, dead space reads as "it broke".
 *
 * The header keeps the join code (a student rejoining mid-celebration is the
 * commonest reason a phone is stuck) and Lexi with the trophy. It drops the
 * progress counter and the lock-in chip, which are facts about a question that
 * no longer exists.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const ENDED = {
  phase: 'ended' as const,
  paused: false,
  question: null,
  reveal: null,
  standings: [
    { username: 'ana', score: 480, streak: 4, bestStreak: 5, correctCount: 4 },
    { username: 'bo', score: 300, streak: 0, bestStreak: 2, correctCount: 3 },
  ],
  myAnswer: null,
  pendingChoice: null,
  myScore: 0,
  myStreak: 0,
  secondsLeft: 0,
  fractionLeft: 0,
  totalQuestions: 10,
  questionNumber: 10,
  finished: true,
  lockIn: { gameCode: 'H9M5YJ', index: 9, locked: 2, total: 2, distribution: [2, 0, 0, 0] },
  answer: vi.fn(),
  isQuizRoom: true,
};

vi.mock('../useVocabQuiz', () => ({ useVocabQuiz: () => ENDED }));

const { VocabQuizHostView } = await import('../VocabQuizHostView');

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${Object.values(params).join(',')}` : key;

describe('VocabQuizHostView — the wall after the last question', () => {
  it('drops the question counter once there is no question', () => {
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={2} t={t} />);
    expect(screen.queryByText(/^vocabQuiz\.progress/)).toBeNull();
  });

  it('drops the live lock-in chip too — nobody is locking anything in', () => {
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={2} t={t} />);
    expect(screen.queryByText(/^vocabQuiz\.lockedInCount/)).toBeNull();
  });

  it('keeps the join code on the wall so a stuck phone can still get back in', () => {
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={2} t={t} />);
    expect(screen.getByText('H9M5YJ')).toBeInTheDocument();
  });

  it('still shows the finale', () => {
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={2} t={t} />);
    expect(screen.getByTestId('vocab-quiz-finale')).toBeInTheDocument();
  });

  it('centres the podium in the height it is given instead of pinning it to the top', () => {
    render(<VocabQuizHostView socket={null} joinCode="H9M5YJ" playerCount={2} t={t} />);
    const stage = screen.getByTestId('vocab-quiz-finale-stage');
    expect(stage.className).toContain('justify-center');
    expect(stage.className).toContain('flex-1');
  });
});

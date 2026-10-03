import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';

const fireVictoryConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: () => fireVictoryConfetti() }));
vi.mock('@/components/ui/InteractiveMascot', () => ({ InteractiveMascot: () => null }));
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));

import { VocabQuizFinale } from '../VocabQuizFinale';

const scored = [{ username: 'Noam', score: 280, correctCount: 2, bestStreak: 1 }] as never;
const blank = [{ username: 'Zoe', score: 0, correctCount: 0, bestStreak: 0 }] as never;

describe('VocabQuizFinale — a way out, and no party for a blank quiz', () => {
  afterEach(() => {
    cleanup();
    fireVictoryConfetti.mockClear();
  });

  it('Given an exit path, Then Back to class sits under Play again and calls it', () => {
    const onBackToClass = vi.fn();
    render(<VocabQuizFinale standings={scored} totalQuestions={10} onPlayAgain={() => {}} onBackToClass={onBackToClass} t={(k) => k} />);
    fireEvent.click(screen.getByTestId('quiz-finale-back-to-class'));
    expect(onBackToClass).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('quiz-finale-back-to-class')).toHaveTextContent('eduLive.results.backToClass');
  });

  it('Given nobody answered correctly, Then no confetti fires', () => {
    render(<VocabQuizFinale standings={blank} totalQuestions={10} t={(k) => k} />);
    expect(fireVictoryConfetti).not.toHaveBeenCalled();
  });

  it('Given real correct answers, Then the finale still celebrates once', () => {
    render(<VocabQuizFinale standings={scored} totalQuestions={10} t={(k) => k} />);
    expect(fireVictoryConfetti).toHaveBeenCalledTimes(1);
  });
});

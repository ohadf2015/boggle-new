import React from 'react';
import { render, screen } from '@testing-library/react';
import { VocabQuizRevealBanner } from '../VocabQuizRevealBanner';

const t = (k: string) => k;
const base = { answer: 'cow', word: 'cow', sweep: false, t };

describe('VocabQuizRevealBanner — answer feedback motion', () => {
  it('Given a right answer, Then a small burst plays inside the verdict card only', () => {
    render(<VocabQuizRevealBanner {...base} correct points={120} />);
    const verdict = screen.getByTestId('vocab-quiz-verdict');
    const burst = screen.getByTestId('vocab-quiz-verdict-burst');
    expect(verdict).toContainElement(burst);
    expect(verdict.className).toContain('overflow-hidden');
    expect(verdict.className).toContain('relative');
    expect(burst.children.length).toBeGreaterThanOrEqual(6);
  });

  it('Given a right answer, Then the burst is transform-only and skipped under reduced motion', () => {
    render(<VocabQuizRevealBanner {...base} correct points={120} />);
    const burst = screen.getByTestId('vocab-quiz-verdict-burst');
    expect(burst.className).toContain('motion-reduce:hidden');
    for (const spark of Array.from(burst.children) as HTMLElement[]) {
      expect(spark.className).toContain('animate-feedback-spark');
      expect(spark.className).not.toMatch(/opacity-0/);
    }
  });

  it('Given a wrong answer, Then the verdict card shakes once, with no burst', () => {
    render(<VocabQuizRevealBanner {...base} correct={false} />);
    const verdict = screen.getByTestId('vocab-quiz-verdict');
    expect(verdict.className).toContain('animate-neo-shake');
    expect(verdict.className).toContain('motion-reduce:animate-none');
    expect(screen.queryByTestId('vocab-quiz-verdict-burst')).toBeNull();
  });

  it('Given no answer in time, Then nothing celebrates and nothing shakes', () => {
    render(<VocabQuizRevealBanner {...base} correct={null} />);
    expect(screen.getByTestId('vocab-quiz-verdict').className).not.toContain('animate-neo-shake');
    expect(screen.queryByTestId('vocab-quiz-verdict-burst')).toBeNull();
  });
});

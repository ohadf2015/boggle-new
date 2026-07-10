/**
 * Practice-mode dead-end fix: after a practice run, the results screen must
 * offer a clear primary next action — "spin another wheel" — instead of only
 * the chain CTA (which, for wheelRush = last chain mode, points at the hub).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WordWheelResults from '../WordWheelResults';
import type { WordWheelGameResult } from '../WordWheelGame';

vi.mock('framer-motion', () => ({
  m: new Proxy(
    {},
    {
      get: () => ({ children, ...props }: React.ComponentProps<'div'>) => (
        <div {...props}>{children}</div>
      ),
    }
  ),
  animate: () => ({ stop: () => {} }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="leaderboard-stub" />,
}));

vi.mock('../DailyInsightStack', () => ({
  __esModule: true,
  default: () => <div data-testid="insight-stub" />,
}));

vi.mock('@/components/practice/PracticeChainCta', () => ({
  __esModule: true,
  default: () => <div data-testid="chain-cta-stub" />,
}));

vi.mock('@/hooks/usePracticeFlag', () => ({
  usePracticeFlag: () => true,
}));

describe('WordWheelResults — practice again CTA', () => {
  const baseResult: WordWheelGameResult = {
    score: 42,
    wordsFound: ['ABC'],
    timeSeconds: 60,
  } as WordWheelGameResult;

  const renderPractice = (onPracticeAgain?: () => void) =>
    render(
      <WordWheelResults
        result={baseResult}
        puzzleNumber={1}
        puzzleDate="2026-07-10"
        language="en"
        hasPlayedWordHunt={false}
        onPracticeAgain={onPracticeAgain}
      />
    );

  it('renders a primary "spin another wheel" button and fires the callback on tap', () => {
    const onPracticeAgain = vi.fn();
    renderPractice(onPracticeAgain);

    const btn = screen.getByTestId('wheel-practice-again');
    expect(btn).toHaveTextContent('wordWheel.practice.again');
    fireEvent.click(btn);
    expect(onPracticeAgain).toHaveBeenCalledTimes(1);

    // Chain CTA stays as the secondary next action.
    expect(screen.getByTestId('chain-cta-stub')).toBeInTheDocument();
  });

  it('omits the button when no handler is wired (prop optional — old callers safe)', () => {
    renderPractice(undefined);
    expect(screen.queryByTestId('wheel-practice-again')).not.toBeInTheDocument();
    expect(screen.getByTestId('chain-cta-stub')).toBeInTheDocument();
  });
});

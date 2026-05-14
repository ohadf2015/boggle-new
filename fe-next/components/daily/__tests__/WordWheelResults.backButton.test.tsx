/**
 * WordWheelResults must render a back button that links to the daily landing.
 * Navigation target: `/${language}/daily`.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('WordWheelResults — back button', () => {
  const baseResult: WordWheelGameResult = {
    score: 42,
    wordsFound: ['ABC'],
    timeSeconds: 60,
  } as WordWheelGameResult;

  it('renders a back link to the localized daily landing', () => {
    render(
      <WordWheelResults
        result={baseResult}
        puzzleNumber={1}
        puzzleDate="2026-04-21"
        language="en"
        hasPlayedWordHunt={false}
      />
    );

    const backLink = screen.getByRole('link', { name: /common\.back/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/en/daily');
  });
});

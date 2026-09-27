/**
 * WordWheelResults compact layout.
 *
 * Design asks:
 *  - The run timer is a FIXED 2:00 for every Word Wheel game, so surfacing it on
 *    the results page is noise — it never varies. The time stat must NOT render.
 *  - Words-found stays as the single performance stat (score lives in the circle).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import WordWheelResults from '../WordWheelResults';
import type { WordWheelGameResult } from '../WordWheelGame';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  }),
  animate: () => ({ stop: () => {} }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../TabbedDailyLeaderboard', () => ({
  __esModule: true,
  default: () => <div data-testid="leaderboard-stub" />,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: vi.fn() }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string) => (typeof fb === 'string' ? fb : k),
    language: 'en',
  }),
}));

vi.mock('@/hooks/usePracticeFlag', () => ({
  usePracticeFlag: () => false,
}));

vi.mock('../DailyInsightStack', () => ({
  __esModule: true,
  default: () => <div data-testid="insight-stack" />,
}));

const result: WordWheelGameResult = { score: 40, wordsFound: ['ABC', 'DEFGH'], timeSeconds: 120 };

const renderResults = () =>
  render(
    <WordWheelResults
      result={result}
      puzzleNumber={42}
      puzzleDate="2026-05-18"
      language="en"
      hasPlayedWordHunt={false}
    />,
  );

describe('WordWheelResults — compact layout', () => {
  it('does NOT render the fixed run timer stat', () => {
    renderResults();
    expect(screen.queryByText('wordWheel.results.time')).toBeNull();
    // 120s would format as 2:00 — must not appear as a stat.
    expect(screen.queryByText('2:00')).toBeNull();
  });

  it('still shows the words-found performance stat', () => {
    renderResults();
    expect(screen.getByTestId('word-wheel-words-stat')).toBeInTheDocument();
  });
});

/**
 * WordWheelResults exceptional-run banner.
 * Triggered when score ≥ 80 OR wordsFound.length ≥ 20 (i.e. "almost all words"
 * heuristic). Banner is the user-visible payoff for finding everything; it has
 * to stay tied to the same threshold the layered celebration sound uses.
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

const playSoundMock = vi.fn();
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({ playSound: playSoundMock }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fb?: string) => fb || k,
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

const mid: WordWheelGameResult = { score: 40, wordsFound: ['ABC', 'DEFGH'], timeSeconds: 60 };
const highScore: WordWheelGameResult = { score: 95, wordsFound: ['ABC'], timeSeconds: 60 };
const coverage: WordWheelGameResult = {
  score: 35,
  wordsFound: Array.from({ length: 22 }, (_, i) => `WRD${i}`),
  timeSeconds: 60,
};

const renderResults = (result: WordWheelGameResult) =>
  render(
    <WordWheelResults
      result={result}
      puzzleNumber={42}
      puzzleDate="2026-05-18"
      language="en"
      hasPlayedWordHunt={false}
    />,
  );

describe('WordWheelResults — exceptional banner gating', () => {
  beforeEach(() => playSoundMock.mockClear());

  it('does NOT render the perfect banner on a mid-tier run', () => {
    renderResults(mid);
    expect(screen.queryByTestId('word-wheel-perfect-banner')).toBeNull();
  });

  it('renders the perfect banner when score ≥ 80', () => {
    renderResults(highScore);
    expect(screen.getByTestId('word-wheel-perfect-banner')).toBeInTheDocument();
  });

  it('renders the perfect banner when wordsFound.length ≥ 20 (coverage win)', () => {
    renderResults(coverage);
    expect(screen.getByTestId('word-wheel-perfect-banner')).toBeInTheDocument();
  });
});

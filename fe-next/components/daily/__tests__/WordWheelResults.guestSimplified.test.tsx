/**
 * Guest-simplified Word Wheel results.
 *
 * Same rule as the Word Hunt results screen: an unregistered player keeps the
 * score, the one performance stat, the leaderboard and the signup CTA. The
 * analytics stack, the catch-up nudge, the MP cross-promo and the full
 * word-by-word list are recap for players who already have an account.
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

// Auth resolved — the guest layout is gated on resolution, not on the initial
// `isAuthenticated === false` that every session starts with.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: false, loading: false }),
}));

vi.mock('../DailyInsightStack', () => ({
  __esModule: true,
  default: () => <div data-testid="insight-stack" />,
}));

vi.mock('../CatchUpSuggestion', () => ({
  __esModule: true,
  default: () => <div data-testid="catch-up" />,
}));

vi.mock('../MpModeCrossPromo', () => ({
  __esModule: true,
  default: () => <div data-testid="mp-cross-promo" />,
}));

const result: WordWheelGameResult = { score: 40, wordsFound: ['ABC', 'DEFGH'], timeSeconds: 120 };

const renderResults = (isAuthenticated: boolean) =>
  render(
    <WordWheelResults
      result={result}
      puzzleNumber={42}
      puzzleDate="2026-05-18"
      language="en"
      hasPlayedWordHunt
      isAuthenticated={isAuthenticated}
    />,
  );

describe('WordWheelResults — guest simplification', () => {
  it('keeps score stat and leaderboard for a guest', () => {
    renderResults(false);
    expect(screen.getByTestId('word-wheel-words-stat')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-stub')).toBeInTheDocument();
  });

  it('drops the recap stack for a guest', () => {
    renderResults(false);
    expect(screen.queryByTestId('insight-stack')).toBeNull();
    expect(screen.queryByTestId('catch-up')).toBeNull();
    expect(screen.queryByTestId('mp-cross-promo')).toBeNull();
    expect(screen.queryByText('wordWheel.foundWords')).toBeNull();
  });

  it('keeps the full recap for a registered player', () => {
    renderResults(true);
    expect(screen.getByTestId('insight-stack')).toBeInTheDocument();
    expect(screen.getByTestId('catch-up')).toBeInTheDocument();
    expect(screen.getByText('wordWheel.foundWords')).toBeInTheDocument();
  });
});

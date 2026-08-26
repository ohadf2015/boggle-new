/**
 * WordWheelResults — "Full recap" progressive disclosure, and the shareable result.
 *
 * The daily results screen is meant to be simple and to the point on first paint:
 * verdict, the shareable artifact, ONE primary next step, the leaderboard. The long
 * tail of secondary cards (insights, replay nudge, catch-up, cross-promos, the word
 * list) is still REACHABLE — it moves behind a single tap rather than being deleted,
 * so no behaviour and no analytics event is lost.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

// Authenticated player — the long-tail blocks are gated behind !isGuest.
vi.mock('@/hooks/useIsGuest', () => ({
  useIsGuest: () => false,
}));

// Collapsed-by-default behaviour is what we assert; keep the desktop branch out of it.
vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: () => false,
  useMediaQuery: () => false,
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
      hasPlayedWordHunt
      isAuthenticated
    />,
  );

describe('WordWheelResults — full recap disclosure', () => {
  it('keeps the secondary cards out of the first paint', () => {
    renderResults();
    expect(screen.queryByTestId('insight-stack')).toBeNull();
  });

  it('offers a single toggle to reach them', () => {
    renderResults();
    expect(screen.getByRole('button', { name: /full recap/i })).toBeInTheDocument();
  });

  it('reveals the secondary cards once opened, so nothing is lost', () => {
    renderResults();
    fireEvent.click(screen.getByRole('button', { name: /full recap/i }));
    expect(screen.getByTestId('insight-stack')).toBeInTheDocument();
  });

  it('still shows the leaderboard up front — this game is competitive', () => {
    renderResults();
    expect(screen.getByTestId('leaderboard-stub')).toBeInTheDocument();
  });
});

/**
 * A blind reviewer comparing this screen against a well-known daily puzzle's
 * result card named the same gap twice: ours had no way to get the result OUT
 * of the app. The other screen's emoji grid is the whole reason its puzzles
 * spread. Word Hunt already had one; Word Wheel had nothing.
 *
 * Reusing the shared card the singleplayer results already ship rather than
 * inventing a second one — its `classic` shape (puzzle number, score, word list)
 * is exactly a wheel run.
 */
describe('WordWheelResults — the result can leave the app', () => {
  it('offers a shareable card once the player has found words', () => {
    renderResults();
    expect(screen.getByTestId('game-emoji-share-card')).toBeInTheDocument();
  });

  it('does not offer an empty card to a player who found nothing', () => {
    render(
      <WordWheelResults
        result={{ score: 0, wordsFound: [], timeSeconds: 120 }}
        puzzleNumber={42}
        puzzleDate="2026-05-18"
        language="en"
        hasPlayedWordHunt
        isAuthenticated
      />,
    );
    expect(screen.queryByTestId('game-emoji-share-card')).toBeNull();
  });
});

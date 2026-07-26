/**
 * Word Wheel results mirror the Word Hunt screen: the primary next-step CTA
 * ("finish today's challenge" / "back to the daily hub") is pinned to the
 * bottom of the results scrollport instead of sitting mid-recap.
 *
 * Sticky needs a real scrollport above it, so the results phase in
 * WordWheelChallenge owns the `overflow-y-auto` and this component's root no
 * longer sets `overflow-hidden` — an `overflow: hidden` ancestor captures
 * sticky and silently makes it a no-op.
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

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: null, isAuthenticated: true, loading: false }),
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

const renderResults = (hasPlayedWordHunt: boolean, isAuthenticated = true) =>
  render(
    <WordWheelResults
      result={result}
      puzzleNumber={42}
      puzzleDate="2026-05-18"
      language="en"
      hasPlayedWordHunt={hasPlayedWordHunt}
      isAuthenticated={isAuthenticated}
    />,
  );

describe('WordWheelResults — sticky primary CTA', () => {
  it('pins the "finish today\'s challenge" CTA when Word Hunt is unplayed', () => {
    renderResults(false);
    expect(screen.getByTestId('wordwheel-hunt-cta').className).toContain('sticky');
  });

  it('pins the back-to-daily-hub CTA once both challenges are done', () => {
    renderResults(true);
    expect(screen.getByTestId('wordwheel-back-to-daily-cta').className).toContain('sticky');
  });

  it('never renders both primary CTAs at once', () => {
    renderResults(true);
    expect(screen.queryByTestId('wordwheel-hunt-cta')).toBeNull();
  });

  /* Same rule the Word Hunt screen enforces via its guest early-return: an
     unregistered player's one CTA is the signup card, so neither primary CTA
     may pin over it. They still have the top-left Back link, so no dead end. */
  it('gives a guest no sticky CTA in either state', () => {
    const done = renderResults(true, false);
    expect(done.queryByTestId('wordwheel-back-to-daily-cta')).toBeNull();
    done.unmount();

    const unfinished = renderResults(false, false);
    expect(unfinished.queryByTestId('wordwheel-hunt-cta')).toBeNull();
  });

  it('leaves no overflow-hidden ancestor to swallow the sticky CTA', () => {
    const { container } = renderResults(true);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('overflow-hidden');
  });
});

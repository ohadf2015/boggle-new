import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingChallengeCards } from '../LandingChallengeCards';

/**
 * Hydration safety: the newbie "collapse extras" personalization reads
 * localStorage (isFirstTimer/isNewbie/hasPlayedMp) in useState initializers.
 * SSR has no localStorage → all false → collapseExtras=false → no <details>.
 * A newbie client reads localStorage → true → collapseExtras=true → <details landing-cubes-more>.
 * The element creation (none↔<details>) is a React #418 → tree regeneration.
 *
 * SSR always paints the expanded layout, so gating the flags until mount has the
 * SAME visual reflow for newbies but removes the hydration error. Contract: the
 * first render (renderToString = no effects = pre-mount) has NO <details>.
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/daily/DailyChallengeCube', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-challenge-cube" />,
}));

vi.mock('@/components/daily/DailyChallengeBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-banner">daily</div>,
}));

vi.mock('@/hooks/useIsPracticeVeteran', () => ({ useIsPracticeVeteran: () => false }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { email: undefined }, canSeeInWorkModes: false }) }));
vi.mock('@/hooks/useUserStats', () => ({ useUserStats: () => ({ userStats: null, isLoading: true }) }));
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));
vi.mock('@/utils/featureGates', () => ({ THRESHOLDS: { modeRoster: 3 } }));

// Force the strongest newbie signal so the code will collapse post-mount.
vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => true }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => false }));
vi.mock('@/utils/multiplayerProgressStorage', () => ({
  isNewPlayer: () => true,
  getGamesCompleted: () => 0,
}));

const baseProps: any = {
  language: 'en',
  activePlayers: 10,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: null,
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

describe('LandingChallengeCards - hydration safety', () => {
  it('SSR/first render has no <details> expander (even for a newbie)', () => {
    const html = renderToString(<LandingChallengeCards {...baseProps} />);
    // Pre-mount: no <details> with landing-cubes-more testid
    expect(html).not.toContain('landing-cubes-more');
  });

  it('collapses extras into <details> for a newbie after mount', () => {
    render(<LandingChallengeCards {...baseProps} />);
    // Post-mount (effects flushed) the real newbie state applies.
    expect(screen.getByTestId('landing-cubes-more')).toBeInTheDocument();
  });
});

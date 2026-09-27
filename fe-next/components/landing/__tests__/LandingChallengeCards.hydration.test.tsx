import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingChallengeCards } from '../LandingChallengeCards';

/**
 * Hydration safety: all game modes are surfaced directly — there is no newcomer
 * "collapse extras" expander anymore. So no <details> is ever rendered, on the
 * server or the client, for any player. This keeps the SSR/client trees identical
 * (no React #418 element-type flip from a localStorage-gated <details>).
 */

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/landing/home/HomeDailyHero', () => ({
  __esModule: true,
  HomeDailyHero: () => <div data-testid="home-daily-hero" />,
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
    expect(html).not.toContain('landing-cubes-more');
  });

  it('has no <details> expander after mount either — all modes surfaced directly', () => {
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    expect(container.querySelector('[data-testid="landing-cubes-more"]')).toBeNull();
  });
});

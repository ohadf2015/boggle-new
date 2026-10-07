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
  it('SSR already parks the extra modes in the same More disclosure the client renders', () => {
    const html = renderToString(<LandingChallengeCards {...baseProps} />);
    expect(html).toContain('landing-cubes-more');
    expect(html).toContain('data-cube-key="arena"');
    expect(html).toContain('data-cube-key="blast"');
  });

  it('keeps Adventure, Word Tower and Blast inside More after mount', () => {
    const { container } = render(<LandingChallengeCards {...baseProps} />);
    const more = container.querySelector('[data-testid="landing-cubes-more"]');
    expect(more).not.toBeNull();
    for (const key of ['blast', 'adventure', 'wordTowerV2']) {
      expect(more!.contains(container.querySelector(`[data-cube-key="${key}"]`))).toBe(true);
    }
  });
});

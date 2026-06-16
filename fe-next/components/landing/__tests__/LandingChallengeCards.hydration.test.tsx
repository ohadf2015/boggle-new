import React from 'react';
import { vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingChallengeCards } from '../LandingChallengeCards';

/**
 * Hydration safety: the newbie "collapse extras" personalization reads
 * localStorage (isFirstTimer/isNewbie/hasPlayedMp) in useState initializers.
 * SSR has no localStorage → all false → collapseExtras=false → expanded
 * <section landing-section-sp>. A newbie client reads localStorage → true →
 * collapseExtras=true → <details landing-section-more> with a filtered grid.
 * The element-type swap (section↔details) is a React #418 → tree regeneration.
 *
 * SSR always paints the expanded layout, so gating the flags until mount has the
 * SAME visual reflow for newbies but removes the hydration error. Contract: the
 * first render (renderToString = no effects = pre-mount) is the expanded layout
 * regardless of the newbie flags.
 */

vi.mock('framer-motion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap', 'whileInView', 'viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'Motion';
  const motionObj = new Proxy({}, { get: () => motionComponent });
  const AnimatePresence = ({ children }: any) => children;
  return { m: motionObj, AnimatePresence };
});
vi.mock('../ModeCard', () => ({
  __esModule: true,
  default: ({ title }: any) => <div data-testid="mode-card">{title}</div>,
}));
vi.mock('@/components/daily/DailyChallengeBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-banner">daily</div>,
}));
vi.mock('@/hooks/useIsPracticeVeteran', () => ({ useIsPracticeVeteran: () => false }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ canSeeInWorkModes: false }) }));
vi.mock('@/hooks/useUserStats', () => ({ useUserStats: () => ({ userStats: null }) }));
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }));

// Force the strongest newbie signal so the OLD code would collapse on first render.
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
  it('SSR/first render is the expanded layout even for a newbie (no section↔details swap)', () => {
    const html = renderToString(<LandingChallengeCards {...baseProps} />);
    expect(html).toContain('landing-section-sp');     // expanded solo section
    expect(html).not.toContain('landing-section-more'); // collapsed <details> must NOT appear pre-mount
  });

  it('still collapses extras into <details> for a newbie after mount', () => {
    render(<LandingChallengeCards {...baseProps} />);
    // Post-mount (effects flushed) the real newbie state applies.
    expect(screen.getByTestId('landing-section-more')).toBeInTheDocument();
  });
});

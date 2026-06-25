import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { LandingChallengeCards } from '../LandingChallengeCards';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/landing/home/HomeDailyHero', () => {
  const HomeDailyHero = () => <div data-testid="home-daily-hero" />;
  HomeDailyHero.displayName = 'HomeDailyHero';
  return { __esModule: true, HomeDailyHero };
});

vi.mock('@/utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => false,
}));
vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => true,
}));
vi.mock('@/components/daily/DailyChallengeBanner', () => {
  const DailyChallengeBanner = () => <div data-testid="daily-banner" />;
  DailyChallengeBanner.displayName = 'DailyChallengeBanner';
  return { __esModule: true, default: DailyChallengeBanner };
});

const mockIsVeteran = vi.fn(() => false);
vi.mock('@/hooks/useIsPracticeVeteran', () => ({
  useIsPracticeVeteran: () => mockIsVeteran(),
}));

const mockIsOnCG = vi.fn(() => false);
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: mockIsOnCG() }),
}));

// Default to "experienced" stats (≥ 3 games) so existing tests retain their
// "all modes visible" assertions. New newcomer-collapse cases override this.
const mockUserStats = vi.fn(() => ({ userStats: { totalGamesPlayed: 5 }, isLoading: false }));
vi.mock('@/hooks/useUserStats', () => ({
  useUserStats: () => mockUserStats(),
}));

const baseProps = {
  language: 'en',
  activePlayers: 10,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: null,
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

describe('LandingChallengeCards', () => {
  it('renders arena and practice cards', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByText('landing.arena')).toBeInTheDocument();
    expect(screen.getByText('landing.practice')).toBeInTheDocument();
  });

  it('shows blast mode for all players', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByText('landing.blastMode')).toBeInTheDocument();
  });

  it('surfaces every shippable mode (connections, brain gym) so players can discover them', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByText('landing.wordChainMode')).toBeInTheDocument();
    expect(screen.getByText('landing.brainTraining')).toBeInTheDocument();
  });

  it('renders daily challenge cube', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('home-daily-hero')).toBeInTheDocument();
  });

  describe('practice card emphasis for non-veterans', () => {
    afterEach(() => mockIsVeteran.mockReturnValue(false));

    it('practice cube is highlighted whenever player is not a veteran', () => {
      mockIsVeteran.mockReturnValue(false);
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      const practice = container.querySelector('[data-cube-key="practice"]');
      expect(practice).not.toBeNull();
      // The highlight is rendered as text content "onboarding.welcome.startHere"
      expect(practice?.textContent).toContain('onboarding.welcome.startHere');
    });

    it('practice cube renders above the SP grid (in visible set)', () => {
      mockIsVeteran.mockReturnValue(false);
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      const practice = container.querySelector('[data-cube-key="practice"]');
      expect(practice).not.toBeNull();
      expect(practice?.textContent).toContain('landing.practice');
    });

    it('veteran landing has no practice cube', () => {
      mockIsVeteran.mockReturnValue(true);
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      expect(container.querySelector('[data-cube-key="practice"]')).toBeNull();
    });
  });

  describe('CrazyGames bypass — practice gate disabled, every mode open', () => {
    afterEach(() => {
      mockIsVeteran.mockReturnValue(false);
      mockIsOnCG.mockReturnValue(false);
    });

    it('on CG: no featured-practice row even when player has not graduated', () => {
      mockIsVeteran.mockReturnValue(false);
      mockIsOnCG.mockReturnValue(true);
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      expect(container.querySelector('[data-testid="landing-section-practice-featured"]')).toBeNull();
    });

    it('on CG: arena/blast/adventure are not locked even for non-veterans', () => {
      mockIsVeteran.mockReturnValue(false);
      mockIsOnCG.mockReturnValue(true);
      render(<LandingChallengeCards {...baseProps} />);
      // quickPlay removed — practice now shows to all users
      expect(screen.queryByText('landing.quickPlay')).not.toBeInTheDocument();
    });
  });

  describe('practice visibility (quickPlay removed)', () => {
    afterEach(() => mockIsVeteran.mockReturnValue(false));

    it('veterans do not see the practice card', () => {
      mockIsVeteran.mockReturnValue(true);
      render(<LandingChallengeCards {...baseProps} />);
      expect(screen.queryByText('landing.practice')).not.toBeInTheDocument();
      expect(screen.queryByText('landing.quickPlay')).not.toBeInTheDocument();
    });

    it('newcomers see practice and no quickPlay', () => {
      mockIsVeteran.mockReturnValue(false);
      render(<LandingChallengeCards {...baseProps} />);
      expect(screen.getByText('landing.practice')).toBeInTheDocument();
      expect(screen.queryByText('landing.quickPlay')).not.toBeInTheDocument();
    });
  });

  describe('all modes always surfaced — no newcomer collapse', () => {
    afterEach(() => {
      mockIsVeteran.mockReturnValue(false);
    });

    it('brand-new player (0 games) sees every mode — no More-Game-Modes expander', () => {
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      expect(container.querySelector('[data-testid="landing-cubes-more"]')).toBeNull();
    });

    it('connections + brainGym render above the fold for a brand-new player', () => {
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      // No expander, so the discovery modes live directly in the grid.
      expect(container.querySelector('[data-testid="landing-cubes-more"]')).toBeNull();
      expect(container.textContent).toContain('landing.wordChainMode');
      expect(container.textContent).toContain('landing.brainTraining');
    });
  });
});

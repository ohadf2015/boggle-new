import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingChallengeCards } from '../LandingChallengeCards';

vi.mock('framer-motion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial','animate','exit','transition','variants','whileHover','whileTap','whileInView','viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'Motion';
  const motionObj = new Proxy({}, { get: (_, tag) => motionComponent });
  const AnimatePresence = ({ children }: any) => children;
  AnimatePresence.displayName = 'AnimatePresence';
  return { m: motionObj, AnimatePresence };
});

vi.mock('../ModeCard', () => {
  const ModeCard = ({ title, badge, highlighted, highlightLabel }: any) => (
    <div
      data-testid="mode-card"
      data-title={title}
      data-highlighted={highlighted ? 'true' : 'false'}
      data-highlight-label={highlightLabel || ''}
    >
      {title}{badge && <span data-testid="badge">{badge}</span>}
    </div>
  );
  ModeCard.displayName = 'ModeCard';
  return { __esModule: true, default: ModeCard };
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

  it('renders daily challenge banner', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('daily-banner')).toBeInTheDocument();
  });

  describe('practice card emphasis for non-veterans', () => {
    afterEach(() => mockIsVeteran.mockReturnValue(false));

    it('practice card is highlighted whenever player is not a veteran', () => {
      mockIsVeteran.mockReturnValue(false);
      render(<LandingChallengeCards {...baseProps} />);
      const practice = screen.getByText('landing.practice').closest('[data-testid="mode-card"]') as HTMLElement;
      expect(practice).not.toBeNull();
      expect(practice.getAttribute('data-highlighted')).toBe('true');
    });

    it('non-veteran practice card lives in its own featured row above the SP grid', () => {
      mockIsVeteran.mockReturnValue(false);
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      const featured = container.querySelector('[data-testid="landing-section-practice-featured"]');
      expect(featured).not.toBeNull();
      expect(featured?.textContent).toContain('landing.practice');
    });

    it('veteran landing has no featured practice row', () => {
      mockIsVeteran.mockReturnValue(true);
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      expect(container.querySelector('[data-testid="landing-section-practice-featured"]')).toBeNull();
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

    it('veterans still see the practice card (now a normal cube, just not featured)', () => {
      mockIsVeteran.mockReturnValue(true);
      render(<LandingChallengeCards {...baseProps} />);
      // Practice is always present as a mode; veterans simply don't get the
      // promoted featured row (asserted separately). No quickPlay either.
      expect(screen.getByText('landing.practice')).toBeInTheDocument();
      expect(screen.queryByText('landing.quickPlay')).not.toBeInTheDocument();
    });

    it('newcomers see practice and no quickPlay', () => {
      mockIsVeteran.mockReturnValue(false);
      render(<LandingChallengeCards {...baseProps} />);
      expect(screen.getByText('landing.practice')).toBeInTheDocument();
      expect(screen.queryByText('landing.quickPlay')).not.toBeInTheDocument();
    });
  });

  describe('newcomer collapse — modes hidden until 3 games played', () => {
    afterEach(() => {
      mockUserStats.mockReturnValue({ userStats: { totalGamesPlayed: 5 }, isLoading: false });
      mockIsVeteran.mockReturnValue(false);
    });

    it('player with 0 games sees the More-Game-Modes expander (extras hidden by default)', () => {
      mockUserStats.mockReturnValue({ userStats: { totalGamesPlayed: 0 }, isLoading: false });
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      // Expander is present
      expect(container.querySelector('[data-testid="landing-section-more"]')).not.toBeNull();
    });

    it('player with 0 games does NOT see connections/brainGym above the fold', () => {
      mockUserStats.mockReturnValue({ userStats: { totalGamesPlayed: 0 }, isLoading: false });
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      const moreSection = container.querySelector('[data-testid="landing-section-more"]');
      // The extras live INSIDE the expander, not above it
      expect(moreSection?.textContent).toContain('landing.wordChainMode');
      expect(moreSection?.textContent).toContain('landing.brainTraining');
    });

    it('player with 3 games sees all modes above the fold (no expander needed)', () => {
      mockUserStats.mockReturnValue({ userStats: { totalGamesPlayed: 3 }, isLoading: false });
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      expect(container.querySelector('[data-testid="landing-section-more"]')).toBeNull();
    });

    it('CrazyGames bypass overrides newcomer collapse', () => {
      mockUserStats.mockReturnValue({ userStats: { totalGamesPlayed: 0 }, isLoading: false });
      mockIsOnCG.mockReturnValue(true);
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      expect(container.querySelector('[data-testid="landing-section-more"]')).toBeNull();
      mockIsOnCG.mockReturnValue(false);
    });

    it('null userStats (auth still loading) does not collapse — default to open landing', () => {
      mockUserStats.mockReturnValue({ userStats: null, isLoading: true });
      const { container } = render(<LandingChallengeCards {...baseProps} />);
      expect(container.querySelector('[data-testid="landing-section-more"]')).toBeNull();
    });
  });
});

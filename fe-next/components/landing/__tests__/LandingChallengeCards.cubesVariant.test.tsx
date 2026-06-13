import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingChallengeCards } from '../LandingChallengeCards';

// Same harness mocks as LandingChallengeCards.test.tsx, plus a forced experiment.
vi.mock('framer-motion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial','animate','exit','transition','variants','whileHover','whileTap','whileInView','viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'Motion';
  const motionObj = new Proxy({}, { get: () => motionComponent });
  return { m: motionObj, AnimatePresence: ({ children }: any) => children };
});
vi.mock('../ModeCard', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="mode-card">{title}</div>,
}));
vi.mock('@/utils/contextualGuidanceStorage', () => ({ shouldShowGuidance: () => false }));
vi.mock('@/utils/onboardingStorage', () => ({ hasCompletedOnboarding: () => true }));
vi.mock('@/components/daily/DailyChallengeBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-banner" />,
}));
vi.mock('@/hooks/useIsPracticeVeteran', () => ({ useIsPracticeVeteran: () => false }));
vi.mock('@/components/CrazyGamesSDK', () => ({ useCrazyGames: () => ({ isOnCrazyGamesPlatform: false }) }));
vi.mock('@/hooks/useUserStats', () => ({ useUserStats: () => ({ userStats: { totalGamesPlayed: 5 }, isLoading: false }) }));

const trackExposure = vi.fn();
const mockVariant = vi.fn(() => 'cubes');
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: mockVariant(), trackExposure }),
}));

const trackModeSelected = vi.fn();
const trackLandingCtaClick = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackModeSelected: (...a: unknown[]) => trackModeSelected(...a),
  trackLandingCtaClick: (...a: unknown[]) => trackLandingCtaClick(...a),
}));

const baseProps = {
  language: 'en',
  activePlayers: 1234,
  openRooms: 2,
  totalPlayers: 100,
  playerAllTimeBest: { score: 800 }, // veteran-ish: practice shown as a normal cube (not featured), all SP modes shown
  t: (key: string) => key,
  dailyChallengeStats: { hasPlayed: false, hasSolved: null, currentStreak: 0, puzzleNumber: 1, loading: false },
};

beforeEach(() => {
  trackExposure.mockClear();
  trackModeSelected.mockClear();
  trackLandingCtaClick.mockClear();
  mockVariant.mockReturnValue('cubes');
});

describe('LandingChallengeCards — cubes A/B variant', () => {
  it('renders the bento cube layout (arena anchor) instead of the card grid', () => {
    render(<LandingChallengeCards {...baseProps} />);
    const anchor = screen.getByTestId('mode-cube-anchor');
    expect(anchor).toBeInTheDocument();
    // arena anchor links to multiplayer + shows the live pill from activePlayers
    expect(anchor).toHaveAttribute('href', '/en/multiplayer');
    expect(screen.getByText(/1,234 landing\.playingNow/)).toBeInTheDocument();
    // no control card wrappers
    expect(screen.queryByTestId('mode-card')).not.toBeInTheDocument();
  });

  it('keeps the daily banner as its own hero node (not a cube)', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.getByTestId('daily-banner')).toBeInTheDocument();
  });

  it('fires the exposure event when the cube layout renders', () => {
    render(<LandingChallengeCards {...baseProps} />);
    expect(trackExposure).toHaveBeenCalled();
  });

  it('preserves control analytics on cube tap (mode_selected + landing_cta_clicked)', () => {
    render(<LandingChallengeCards {...baseProps} />);
    const connections = screen.getByRole('link', { name: /landing\.wordChainMode/i });
    connections.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(trackModeSelected).toHaveBeenCalledWith('connections', 'home');
    expect(trackLandingCtaClick).toHaveBeenCalledWith('mode_card', { mode: 'connections', variant: 'blue' });
  });

  it('falls back to the control card grid when variant=control', () => {
    mockVariant.mockReturnValue('control');
    render(<LandingChallengeCards {...baseProps} />);
    expect(screen.queryByTestId('mode-cube-anchor')).not.toBeInTheDocument();
    expect(trackExposure).not.toHaveBeenCalled();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingHero } from '../LandingHero';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

let mockIsOnCG = false;
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: mockIsOnCG, isLoading: false }),
}));

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

vi.mock('@/components/ui/IdleMascot', () => {
  const IdleMascotWithEntrance = () => <div data-testid="mascot" />;
  IdleMascotWithEntrance.displayName = 'IdleMascotWithEntrance';
  return { IdleMascotWithEntrance };
});

vi.mock('../LandingLeaderboardPreview', () => {
  const LandingLeaderboardPreview = () => <div data-testid="leaderboard-preview" />;
  LandingLeaderboardPreview.displayName = 'LandingLeaderboardPreview';
  return { LandingLeaderboardPreview };
});

const player = { id: '1', username: 'alice', displayName: 'Alice', totalScore: 100, avatarImage: null, avatarConfig: null };

describe('LandingHero', () => {
  const baseProps = { players: [player], playersLoading: false, isMobilePortrait: false };

  beforeEach(() => {
    mockIsOnCG = false;
    vi.clearAllMocks();
  });

  it('renders mascot and classroom title on the web homepage', () => {
    render(<LandingHero {...baseProps} />);
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
    expect(screen.getByText('landing.classroomHeroTitle')).toBeInTheDocument();
    expect(screen.queryByText('landing.welcomeTitle')).not.toBeInTheDocument();
  });

  it('shows the classroom subtitle and For Teachers CTA on web', () => {
    render(<LandingHero {...baseProps} />);
    expect(screen.getByText('landing.classroomHeroSubtitle')).toBeInTheDocument();
    const teachers = screen.getByTestId('landing-for-teachers-cta');
    expect(teachers).toHaveAttribute('href', '/en/education');
    expect(screen.getByTestId('landing-play-cta')).toHaveAttribute('href', '/en/multiplayer');
  });

  it('keeps consumer copy on CrazyGames (no teacher CTA)', () => {
    mockIsOnCG = true;
    render(<LandingHero {...baseProps} />);
    expect(screen.getByText('landing.welcomeTitle')).toBeInTheDocument();
    expect(screen.queryByText('landing.classroomHeroTitle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('landing-for-teachers-cta')).not.toBeInTheDocument();
  });

  it('shows leaderboard preview on desktop', () => {
    render(<LandingHero {...baseProps} isMobilePortrait={false} />);
    // Desktop: leaderboard in sidebar + not in mobile section (but component renders once in sidebar)
    expect(screen.getAllByTestId('leaderboard-preview').length).toBeGreaterThanOrEqual(1);
  });

  it('hides leaderboard sidebar on mobile via CSS', () => {
    // Layout is CSS-driven for SSR/hydration parity: leaderboard renders in DOM
    // but its wrapper carries `hidden md:block` so it's invisible on mobile.
    render(<LandingHero {...baseProps} isMobilePortrait={true} />);
    const wrapper = screen.getByTestId('leaderboard-preview').parentElement;
    expect(wrapper?.className).toMatch(/\bhidden\b/);
    expect(wrapper?.className).toMatch(/md:block/);
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingHeroVariant } from '../LandingHeroVariant';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
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

vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: vi.fn(),
}));

const player = { id: '1', username: 'alice', displayName: 'Alice', totalScore: 100, avatarImage: null, avatarConfig: null };

describe('LandingHeroVariant', () => {
  const baseProps = {
    players: [player],
    playersLoading: false,
    isMobilePortrait: false,
    activePlayers: 42,
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders mascot and title (same as control)', () => {
    render(<LandingHeroVariant {...baseProps} />);
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
    expect(screen.getByText('landing.welcomeTitle')).toBeInTheDocument();
  });

  it('renders subtitle (value prop) — absent in control hero', () => {
    render(<LandingHeroVariant {...baseProps} />);
    expect(screen.getByText('landing.welcomeSubtitle')).toBeInTheDocument();
  });

  it('renders primary CTA button linking to daily', () => {
    render(<LandingHeroVariant {...baseProps} />);
    const cta = screen.getByText('landing.playNowFree');
    expect(cta).toBeInTheDocument();
    expect(cta.closest('a')).toHaveAttribute('href', '/en/daily');
  });

  it('shows live player count when activePlayers > 10', () => {
    render(<LandingHeroVariant {...baseProps} activePlayers={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('landing.playingNow')).toBeInTheDocument();
  });

  it('hides live player count when activePlayers <= 10', () => {
    render(<LandingHeroVariant {...baseProps} activePlayers={5} />);
    expect(screen.queryByText('landing.playingNow')).not.toBeInTheDocument();
  });

  it('shows leaderboard sidebar on desktop (same as control)', () => {
    render(<LandingHeroVariant {...baseProps} />);
    expect(screen.getAllByTestId('leaderboard-preview').length).toBeGreaterThanOrEqual(1);
  });
});

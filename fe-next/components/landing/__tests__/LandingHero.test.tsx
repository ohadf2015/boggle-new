import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LandingHero } from '../LandingHero';

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

const player = { id: '1', username: 'alice', displayName: 'Alice', totalScore: 100, avatarImage: null, avatarConfig: null };

describe('LandingHero', () => {
  const baseProps = { players: [player], playersLoading: false, isMobilePortrait: false };

  beforeEach(() => vi.clearAllMocks());

  it('renders mascot and title', () => {
    render(<LandingHero {...baseProps} />);
    expect(screen.getByTestId('mascot')).toBeInTheDocument();
    expect(screen.getByText('landing.welcomeTitle')).toBeInTheDocument();
  });

  it('does not render welcome subtitle', () => {
    render(<LandingHero {...baseProps} />);
    expect(screen.queryByText('landing.welcomeSubtitle')).not.toBeInTheDocument();
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

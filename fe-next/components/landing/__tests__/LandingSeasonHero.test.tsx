import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LandingSeasonHero } from '../LandingSeasonHero';

const mockUseAuth = vi.fn(() => ({ isAuthenticated: false, user: null }));
const mockUseSeason = vi.fn();
const mockUseCG = vi.fn(() => ({ isOnCrazyGamesPlatform: false }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'season.name' && params) return `Season ${params.number}: ${params.theme}`;
      if (key === 'season.endsIn' && params) return `Ends in ${params.days} days`;
      if (key === 'season.endingSoon') return 'Season ending soon!';
      if (key === 'season.viewLeaderboard') return 'View leaderboard';
      return key;
    },
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => mockUseCG(),
}));

vi.mock('@/hooks/useSeason', () => ({
  useSeason: () => mockUseSeason(),
}));

vi.mock('framer-motion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial', 'animate', 'exit', 'transition', 'variants', 'whileHover', 'whileTap']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'Motion';
  const motionObj = new Proxy({}, { get: () => motionComponent });
  return { m: motionObj, useReducedMotion: () => false };
});

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={String(props.alt ?? '')} src={String(props.src ?? '')} data-testid="season-hero-image" />;
  },
}));

const baseSeason = {
  currentSeason: {
    id: 5,
    name: 'Season 5: Phonic Phenoms',
    theme: 'Phonic Phenoms',
    imageUrl: '/seasons/season-5-phonic-phenoms.webp',
    accentColor: '#FFE135',
    tagline: 'Sound is the new strategy',
    gridSkinClass: 'season-skin-phonic',
    twist: { key: 'sound-wave', emoji: '🎧', title: 'Sound Wave', blurb: 'Mix beats and letters into chart-topping plays.', scoreMultiplier: 1 },
  },
  timeRemaining: { days: 12, hours: 4, totalMs: 0 },
  peakTier: 'Unranked',
};

describe('LandingSeasonHero', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null });
    mockUseCG.mockReturnValue({ isOnCrazyGamesPlatform: false });
    mockUseSeason.mockReturnValue(baseSeason);
  });

  it('renders the season image prominently for anonymous visitors', () => {
    render(<LandingSeasonHero />);
    const img = screen.getByTestId('season-hero-image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/seasons/season-5-phonic-phenoms.webp');
  });

  it('renders the season name with number and theme', () => {
    render(<LandingSeasonHero />);
    expect(screen.getByText('Season 5: Phonic Phenoms')).toBeInTheDocument();
  });

  it('renders countdown when more than 7 days remain', () => {
    render(<LandingSeasonHero />);
    expect(screen.getByText('Ends in 12 days')).toBeInTheDocument();
    expect(screen.queryByText('Season ending soon!')).not.toBeInTheDocument();
  });

  it('renders ending-soon copy when fewer than 7 days remain', () => {
    mockUseSeason.mockReturnValue({
      ...baseSeason,
      timeRemaining: { days: 3, hours: 2, totalMs: 0 },
    });
    render(<LandingSeasonHero />);
    expect(screen.getByText('Season ending soon!')).toBeInTheDocument();
  });

  it('links the entire banner to the leaderboard', () => {
    render(<LandingSeasonHero />);
    const cta = screen.getByRole('link', {
      name: 'Season 5: Phonic Phenoms — View leaderboard',
    });
    expect(cta).toHaveAttribute('href', '/leaderboard');
  });

  it('does not render a separate CTA button', () => {
    render(<LandingSeasonHero />);
    expect(screen.queryByRole('link', { name: 'View leaderboard' })).not.toBeInTheDocument();
  });

  it('allows the season title to wrap onto two lines instead of truncating', () => {
    render(<LandingSeasonHero />);
    const title = screen.getByText('Season 5: Phonic Phenoms');
    expect(title.className).toMatch(/line-clamp-2/);
    expect(title.className).not.toMatch(/\btruncate\b/);
  });

  it('surfaces the season twist (emoji + title)', () => {
    render(<LandingSeasonHero />);
    expect(screen.getByText('Sound Wave')).toBeInTheDocument();
  });

  it('does not crash if a season has no twist (defensive)', () => {
    const { currentSeason, ...rest } = baseSeason;
    const { twist: _omit, ...seasonNoTwist } = currentSeason;
    mockUseSeason.mockReturnValue({ ...rest, currentSeason: seasonNoTwist });
    expect(() => render(<LandingSeasonHero />)).not.toThrow();
  });

  it('returns null on the CrazyGames platform', () => {
    mockUseCG.mockReturnValue({ isOnCrazyGamesPlatform: true });
    const { container } = render(<LandingSeasonHero />);
    expect(container).toBeEmptyDOMElement();
  });
});

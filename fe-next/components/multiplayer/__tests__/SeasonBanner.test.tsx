import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeasonBanner } from '../SeasonBanner';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div className={className as string} style={style as React.CSSProperties} {...rest}>{children}</div>
    ),
    span: ({ children, className }: React.PropsWithChildren<Record<string, unknown>>) => (
      <span className={className as string}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('@/hooks/useSeason', () => ({
  useSeason: () => ({
    currentSeason: {
      id: 1,
      name: 'Season 1: Word Warriors',
      theme: 'Word Warriors',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-04-01'),
      rewards: [],
    },
    timeRemaining: { days: 45, hours: 12, totalMs: 45 * 86400000 },
    peakTier: 'Gold',
    seasonRewards: { coins: 500, badges: [], exclusives: [] },
    hasSeenEndSummary: false,
    updatePeakTier: vi.fn(),
    dismissEndSummary: vi.fn(),
  }),
}));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const templates: Record<string, string> = {
        'season.endsIn': `Ends in ${params?.days} days`,
        'season.peakTier': `Peak Tier: ${params?.tier}`,
        'season.name': `Season ${params?.number}: ${params?.theme}`,
      };
      return templates[key] ?? key;
    },
  }),
}));

const mockUseCrazyGames = vi.fn(() => ({ isOnCrazyGamesPlatform: false }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => mockUseCrazyGames(),
}));

describe('SeasonBanner', () => {
  beforeEach(() => {
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: false });
  });

  it('renders nothing on CrazyGames embed', () => {
    mockUseCrazyGames.mockReturnValue({ isOnCrazyGamesPlatform: true });
    const { container } = render(<SeasonBanner />);
    expect(container.querySelector('[data-testid="season-banner"]')).toBeNull();
  });

  it('renders season name', () => {
    render(<SeasonBanner />);
    expect(screen.getByText(/Season 1/)).toBeInTheDocument();
  });

  it('renders days remaining', () => {
    render(<SeasonBanner />);
    expect(screen.getByText(/45 days/)).toBeInTheDocument();
  });

  it('renders peak tier', () => {
    render(<SeasonBanner />);
    expect(screen.getByText(/Gold/)).toBeInTheDocument();
  });
});

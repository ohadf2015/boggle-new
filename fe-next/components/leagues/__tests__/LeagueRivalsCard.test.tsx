import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'leagueRivals.title': 'Your League Rivals',
        'leagueRivals.ahead': '{{pts}} pts ahead',
        'leagueRivals.behind': '{{pts}} pts behind',
        'leagueRivals.you': 'You',
        'leagueRivals.noRivals': 'Climb the league to find rivals!',
      };
      return translations[key] ?? key;
    },
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    profile: { id: 'user-1' },
  }),
}));

const mockRivalsData = {
  above: null as { username: string; avatar: string; score: number; position: number } | null,
  below: null as { username: string; avatar: string; score: number; position: number } | null,
  player: null as { position: number; score: number } | null,
  loading: false,
};

vi.mock('@/hooks/useLeagueRivals', () => ({
  useLeagueRivals: () => mockRivalsData,
}));

import { LeagueRivalsCard } from '../LeagueRivalsCard';

describe('LeagueRivalsCard', () => {
  beforeEach(() => {
    mockRivalsData.above = null;
    mockRivalsData.below = null;
    mockRivalsData.player = null;
    mockRivalsData.loading = false;
  });

  it('should show title when rivals exist', () => {
    mockRivalsData.above = { username: 'Alice', avatar: '', score: 500, position: 4 };
    mockRivalsData.below = { username: 'Carol', avatar: '', score: 300, position: 6 };
    mockRivalsData.player = { position: 5, score: 400 };

    render(<LeagueRivalsCard />);
    expect(screen.getByText('Your League Rivals')).toBeInTheDocument();
  });

  it('should show rival above with pts ahead', () => {
    mockRivalsData.above = { username: 'Alice', avatar: '', score: 500, position: 4 };
    mockRivalsData.player = { position: 5, score: 400 };

    render(<LeagueRivalsCard />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('100 pts ahead')).toBeInTheDocument();
  });

  it('should show rival below with pts behind', () => {
    mockRivalsData.below = { username: 'Carol', avatar: '', score: 300, position: 6 };
    mockRivalsData.player = { position: 5, score: 400 };

    render(<LeagueRivalsCard />);
    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('100 pts behind')).toBeInTheDocument();
  });

  it('should highlight current player with You label', () => {
    mockRivalsData.above = { username: 'Alice', avatar: '', score: 500, position: 4 };
    mockRivalsData.player = { position: 5, score: 400 };

    render(<LeagueRivalsCard />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('should show noRivals message when solo', () => {
    mockRivalsData.player = { position: 1, score: 100 };

    render(<LeagueRivalsCard />);
    expect(screen.getByText('Climb the league to find rivals!')).toBeInTheDocument();
  });

  it('should render nothing when not in a league', () => {
    const { container } = render(<LeagueRivalsCard />);
    expect(container.firstChild).toBeNull();
  });

  it('should render loading skeleton', () => {
    mockRivalsData.loading = true;
    const { container } = render(<LeagueRivalsCard />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'league.title': 'Weekly League',
        'league.bronze': 'Bronze',
        'league.silver': 'Silver',
        'league.gold': 'Gold',
        'league.diamond': 'Diamond',
        'league.ruby': 'Ruby',
        'league.yourPosition': 'Your Position',
        'league.xp': 'XP',
        'league.noLeague': 'Join a league to compete!',
        'league.standings': 'Standings',
      };
      return translations[key] ?? key;
    },
  }),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-testid="adaptive-motion" {...props}>{children}</div>
    ),
  },
}));

import { LeagueCard } from '../LeagueCard';

describe('LeagueCard', () => {
  const defaultProps = {
    tier: 'gold' as const,
    myPosition: 5,
    myXp: 450,
    topStandings: [
      { userId: 'u1', displayName: 'Alice', weeklyXp: 800, position: 1, zone: 'promotion' as const },
      { userId: 'u2', displayName: 'Bob', weeklyXp: 600, position: 2, zone: 'promotion' as const },
      { userId: 'u3', displayName: 'Carol', weeklyXp: 500, position: 3, zone: 'promotion' as const },
    ],
  };

  it('should render tier name', () => {
    render(<LeagueCard {...defaultProps} />);
    expect(screen.getByText('Gold')).toBeDefined();
  });

  it('should render player position', () => {
    render(<LeagueCard {...defaultProps} />);
    expect(screen.getByText('#5')).toBeDefined();
  });

  it('should render player XP', () => {
    render(<LeagueCard {...defaultProps} />);
    expect(screen.getByText('450')).toBeDefined();
  });

  it('should render top 3 standings', () => {
    render(<LeagueCard {...defaultProps} />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('Carol')).toBeDefined();
  });

  it('should show empty state when no league', () => {
    render(<LeagueCard tier="bronze" myPosition={null} myXp={0} topStandings={[]} />);
    expect(screen.getByText('Join a league to compete!')).toBeDefined();
  });
});

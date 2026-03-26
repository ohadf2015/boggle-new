import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'league.title': 'Weekly League',
        'league.promotionZone': 'Promotion Zone',
        'league.safeZone': 'Safe Zone',
        'league.relegationZone': 'Relegation Zone',
        'league.position': 'Position',
        'league.xp': 'XP',
        'league.standings': 'Standings',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-testid="adaptive-motion" {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import { LeagueBanner } from '../LeagueBanner';
import type { LeagueStanding } from '@/hooks/useLeague';

describe('LeagueBanner', () => {
  const standings: LeagueStanding[] = Array.from({ length: 30 }, (_, i) => ({
    userId: `u${i}`,
    displayName: `Player${i}`,
    weeklyXp: 1000 - i * 30,
    position: i + 1,
    zone: (i < 10 ? 'promotion' : i >= 25 ? 'relegation' : 'safe') as LeagueStanding['zone'],
  }));

  it('should render standings list', () => {
    render(<LeagueBanner standings={standings} myUserId="u5" tier="silver" />);
    expect(screen.getByText('Player0')).toBeDefined();
    expect(screen.getByText('Player29')).toBeDefined();
  });

  it('should highlight promotion zone entries with green', () => {
    const { container } = render(<LeagueBanner standings={standings} myUserId="u5" tier="silver" />);
    const promotionRows = container.querySelectorAll('[data-zone="promotion"]');
    expect(promotionRows.length).toBe(10);
  });

  it('should highlight relegation zone entries with red', () => {
    const { container } = render(<LeagueBanner standings={standings} myUserId="u5" tier="silver" />);
    const relegationRows = container.querySelectorAll('[data-zone="relegation"]');
    expect(relegationRows.length).toBe(5);
  });

  it('should highlight current user row', () => {
    const { container } = render(<LeagueBanner standings={standings} myUserId="u5" tier="silver" />);
    const myRow = container.querySelector('[data-is-me="true"]');
    expect(myRow).toBeTruthy();
  });
});

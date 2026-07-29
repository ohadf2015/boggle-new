import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'league.finalResults': 'Final Results',
        'league.promoted': 'Promoted!',
        'league.relegated': 'Relegated',
        'league.stayed': 'Stayed',
        'league.coinsEarned': 'Coins Earned',
        'league.newWeekIn': 'New week starts in',
        'league.gold': 'Gold',
        'league.silver': 'Silver',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('@/hooks/useInterstitialAd', () => ({
  useInterstitialAd: () => ({ showInterstitial: vi.fn() }),
  default: () => ({ showInterstitial: vi.fn() }),
}));

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ submitLeaderboardScore: vi.fn() }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div data-testid="adaptive-motion" {...props}>{children}</div>
    ),
  },
}));

import { LeagueResults } from '../LeagueResults';

describe('LeagueResults', () => {
  it('should show promoted message for promotion zone', () => {
    render(
      <LeagueResults
        tier="gold"
        position={3}
        zone="promotion"
        coinsEarned={200}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Promoted!')).toBeDefined();
  });

  it('should show relegated message for relegation zone', () => {
    render(
      <LeagueResults
        tier="silver"
        position={28}
        zone="relegation"
        coinsEarned={50}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Relegated')).toBeDefined();
  });

  it('should show stayed message for safe zone', () => {
    render(
      <LeagueResults
        tier="gold"
        position={15}
        zone="safe"
        coinsEarned={100}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Stayed')).toBeDefined();
  });

  it('should display coins earned', () => {
    render(
      <LeagueResults
        tier="gold"
        position={1}
        zone="promotion"
        coinsEarned={400}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('400')).toBeDefined();
  });
});

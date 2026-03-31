import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { NearRankTeaser } from '../NearRankTeaser';
import type { RankTier } from '@/shared/utils/eloRating';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'multiplayer.nearRank': `${params?.elo} ELO to ${params?.tier}!`,
        'multiplayer.oneMoreWin': `One more win to ${params?.tier}!`,
      };
      return translations[key] || key;
    },
  }),
}));

const goldTier: RankTier = { name: 'Gold', color: '#FFD700', minRating: 1200 };

describe('NearRankTeaser', () => {
  it('renders ELO needed text', () => {
    render(<NearRankTeaser nextTier={goldTier} eloNeeded={52} />);
    expect(screen.getByText('52 ELO to Gold!')).toBeTruthy();
  });

  it('shows one more win when within 50 ELO', () => {
    render(<NearRankTeaser nextTier={goldTier} eloNeeded={30} />);
    expect(screen.getByText('One more win to Gold!')).toBeTruthy();
  });

  it('shows ELO needed when more than 50 away', () => {
    render(<NearRankTeaser nextTier={goldTier} eloNeeded={80} />);
    expect(screen.getByText('80 ELO to Gold!')).toBeTruthy();
  });

  it('has data-testid for integration', () => {
    render(<NearRankTeaser nextTier={goldTier} eloNeeded={50} />);
    expect(screen.getByTestId('near-rank-teaser')).toBeTruthy();
  });
});

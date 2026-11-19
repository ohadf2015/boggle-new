import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrawerProfileHero } from '../DrawerProfileHero';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/components/AvatarLite', () => ({ __esModule: true, default: () => <span data-testid="avatar" /> }));
vi.mock('../../CoinBalance', () => ({ CoinBalance: () => <span /> }));
vi.mock('../../seasons/RankTierChip', () => ({ RankTierChip: () => <span /> }));
vi.mock('../../../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

const base = {
  href: '/en/profile',
  onNavigate: () => {},
  displayName: 'Maya',
  avatarConfig: null,
  currentLevel: 3,
  tier: 'bronze' as never,
  coins: 10,
  streak: 0,
  totalGames: 0,
  accentHex: null,
  isRtl: false,
};

describe('DrawerProfileHero streak flame', () => {
  it('shows the tiered flame beside the streak', () => {
    render(<DrawerProfileHero {...base} streak={15} />);
    expect(screen.getByTestId('streak-flame')).toHaveAttribute('data-tier', 'violet');
  });

  it('shows no flame at 0 days', () => {
    render(<DrawerProfileHero {...base} />);
    expect(screen.queryByTestId('streak-flame')).toBeNull();
  });
});

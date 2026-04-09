import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingLeaderboardPreview } from '../LandingLeaderboardPreview';
import type { TopPlayer } from '@/hooks/useTopPlayers';

// Minimal context mock — component reads t/language/dir
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

// Stub subcomponents to keep test focused on prestige rendering
vi.mock('@/components/Avatar', () => ({
  default: () => <div data-testid="avatar" />,
}));
vi.mock('@/components/ui/PlayerProfileTooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const makePlayer = (overrides: Partial<TopPlayer> = {}): TopPlayer => ({
  id: 'p1',
  username: 'alice',
  displayName: 'Alice',
  totalScore: 1000,
  avatarImage: null,
  avatarConfig: null,
  prestigeLevel: 0,
  ...overrides,
});

describe('LandingLeaderboardPreview — prestige badges', () => {
  it('renders a prestige badge for players with prestigeLevel > 0 (full layout)', () => {
    const players = [
      makePlayer({ id: 'p1', username: 'alice', displayName: 'Alice', prestigeLevel: 3 }),
      makePlayer({ id: 'p2', username: 'bob', displayName: 'Bob', prestigeLevel: 0 }),
    ];
    render(<LandingLeaderboardPreview players={players} loading={false} />);
    // Prestige III icon from PRESTIGE_CONFIG.DISPLAY[3]
    expect(screen.getByLabelText(/Prestige III/i)).toBeInTheDocument();
  });

  it('renders a prestige badge in compact layout too', () => {
    const players = [
      makePlayer({ id: 'p1', username: 'alice', displayName: 'Alice', prestigeLevel: 5 }),
    ];
    render(<LandingLeaderboardPreview players={players} loading={false} compact />);
    expect(screen.getByLabelText(/Prestige V/i)).toBeInTheDocument();
  });

  it('omits the badge for level 0 players', () => {
    const players = [
      makePlayer({ id: 'p1', username: 'alice', displayName: 'Alice', prestigeLevel: 0 }),
    ];
    render(<LandingLeaderboardPreview players={players} loading={false} />);
    expect(screen.queryByLabelText(/Prestige/i)).not.toBeInTheDocument();
  });
});

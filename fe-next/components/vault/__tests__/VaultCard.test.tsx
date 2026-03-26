/**
 * VaultCard Tests
 * Tests for the vault board landing page card component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import VaultCard from '../VaultCard';

// Mock LanguageContext
const mockT = (key: string, params?: Record<string, string>) => {
  const translations: Record<string, string> = {
    'vault.title': 'THE VAULT',
    'vault.open': 'Vault is Open!',
    'vault.closesIn': 'Closes in {{time}}',
    'vault.enterVault': 'Enter the Vault',
    'vault.nextVault': 'Next vault in {{time}}',
    'vault.leaderboard': 'Top Scores',
    'vault.yourRank': 'Your rank: #{{rank}}',
    'vault.completed': 'Vaulted!',
    'vault.badge': 'Vault Champion',
  };
  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(`{{${k}}}`, v);
    });
  }
  return result;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock AdaptiveMotion
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div data-testid="adaptive-motion" {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockVault = {
  id: 'v-1',
  board_name: 'Midnight Rush',
  grid: [['A', 'B'], ['C', 'D']],
  language: 'en',
  opens_at: '2026-03-22T18:00:00Z',
  closes_at: new Date(Date.now() + 4 * 60 * 60 * 1000 + 23 * 60 * 1000).toISOString(),
  is_active: true,
  created_at: '2026-03-20T00:00:00Z',
};

const mockLeaderboard = [
  { id: 's-1', vault_board_id: 'v-1', player_id: 'p-1', score: 500, words_found: 30, display_name: 'Alice' },
  { id: 's-2', vault_board_id: 'v-1', player_id: 'p-2', score: 350, words_found: 22, display_name: 'Bob' },
  { id: 's-3', vault_board_id: 'v-1', player_id: 'p-3', score: 200, words_found: 14, display_name: 'Charlie' },
];

describe('VaultCard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('when vault is active', () => {
    it('should render THE VAULT title', () => {
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={mockLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByText('THE VAULT')).toBeInTheDocument();
    });

    it('should show vault is open message', () => {
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={mockLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByText('Vault is Open!')).toBeInTheDocument();
    });

    it('should display board name', () => {
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={mockLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByText('Midnight Rush')).toBeInTheDocument();
    });

    it('should show countdown timer', () => {
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={mockLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000 + 23 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByTestId('vault-countdown')).toBeInTheDocument();
    });

    it('should render mini leaderboard with top 3', () => {
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={mockLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should show Enter the Vault CTA', () => {
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={mockLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByText('Enter the Vault')).toBeInTheDocument();
    });

    it('should have vault-card test id', () => {
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={mockLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByTestId('vault-card')).toBeInTheDocument();
    });
  });

  describe('when no active vault (teaser)', () => {
    it('should show next vault teaser', () => {
      render(
        <VaultCard
          vault={null}
          leaderboard={[]}
          timeRemaining={12 * 60 * 60 * 1000}
          isActive={false}
          nextOpensIn={12 * 60 * 60 * 1000}
        />
      );
      expect(screen.getByTestId('vault-teaser')).toBeInTheDocument();
    });

    it('should show THE VAULT title even in teaser', () => {
      render(
        <VaultCard
          vault={null}
          leaderboard={[]}
          timeRemaining={0}
          isActive={false}
          nextOpensIn={12 * 60 * 60 * 1000}
        />
      );
      expect(screen.getByText('THE VAULT')).toBeInTheDocument();
    });
  });

  describe('leaderboard display', () => {
    it('should show Top Scores heading', () => {
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={mockLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByText('Top Scores')).toBeInTheDocument();
    });

    it('should limit display to top 3 even with more entries', () => {
      const bigLeaderboard = [
        ...mockLeaderboard,
        { id: 's-4', vault_board_id: 'v-1', player_id: 'p-4', score: 100, words_found: 8, display_name: 'Dave' },
      ];
      render(
        <VaultCard
          vault={mockVault}
          leaderboard={bigLeaderboard}
          timeRemaining={4 * 60 * 60 * 1000}
          isActive={true}
        />
      );
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.queryByText('Dave')).not.toBeInTheDocument();
    });
  });
});

/**
 * PlayerProfileCard Component Tests
 * Compact card shown in leaderboards, lobbies, search results
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerProfileCard from '../PlayerProfileCard';
import type { PublicProfile } from '@/shared/types/publicProfile';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'profile.level': 'Level',
        'profile.winRate': 'Win Rate',
        'profile.games': 'Games',
        'profile.topPercent': `Top ${params?.percent ?? ''}%`,
        'profile.challenge': 'Challenge',
        'profile.addFriend': 'Add Friend',
        'profile.memberSince': 'Member since',
        'profile.viewProfile': 'View Profile',
      };
      return translations[key] || key;
    },
    locale: 'en',
  }),
}));

vi.mock('@/components/Avatar', () => {
  const MockAvatar = ({ size, className }: { size?: string; className?: string }) => {
    return <div data-testid="avatar" data-size={size} className={className} />;
  };
  return { default: MockAvatar };
});

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...Object.fromEntries(Object.entries(props).filter(([k]) => !['initial', 'animate', 'transition', 'whileHover', 'whileTap'].includes(k)))}>{children}</div>
    ),
  },
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...Object.fromEntries(Object.entries(props).filter(([k]) => !['initial', 'animate', 'transition', 'whileHover', 'whileTap'].includes(k)))}>{children}</div>
    ),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

const MOCK_PROFILE: PublicProfile = {
  id: 'user-123',
  username: 'WordMaster',
  displayName: 'Word Master',
  customAvatar: { gender: 'male' as const, base: 'round' as const, skinColor: '#FFDBB4' as const, hair: 'spiky' as const, hairColor: '#2C1B18' as const, eyes: 'round' as const, mouth: 'smile' as const, accessory: 'none' as const, accessoryColor: '#000000' as const, bgColor: '#FF6B35' as const },
  countryCode: 'US',
  currentLevel: 15,
  totalXp: 5200,
  totalGames: 100,
  totalScore: 25000,
  totalWords: 1500,
  winRate: 40,
  longestWord: 'EXTRAORDINARY',
  longestWordLength: 13,
  achievementCounts: { WORD_MASTER: 5 },
  memberSince: '2025-06',
  percentile: 4,
};

describe('PlayerProfileCard', () => {
  it('renders player name and level', () => {
    render(<PlayerProfileCard profile={MOCK_PROFILE} />);

    expect(screen.getByText('Word Master')).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it('renders avatar', () => {
    render(<PlayerProfileCard profile={MOCK_PROFILE} />);

    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('shows win rate', () => {
    render(<PlayerProfileCard profile={MOCK_PROFILE} />);

    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('shows percentile badge', () => {
    render(<PlayerProfileCard profile={MOCK_PROFILE} />);

    expect(screen.getByText(/Top 4%/)).toBeInTheDocument();
  });

  it('shows challenge button when onChallenge provided', () => {
    const onChallenge = vi.fn();
    render(<PlayerProfileCard profile={MOCK_PROFILE} onChallenge={onChallenge} />);

    const challengeBtn = screen.getByRole('button', { name: /challenge/i });
    expect(challengeBtn).toBeInTheDocument();

    fireEvent.click(challengeBtn);
    expect(onChallenge).toHaveBeenCalledWith('WordMaster');
  });

  it('hides challenge button when onChallenge not provided', () => {
    render(<PlayerProfileCard profile={MOCK_PROFILE} />);

    expect(screen.queryByRole('button', { name: /challenge/i })).not.toBeInTheDocument();
  });

  it('shows country flag when country code present', () => {
    render(<PlayerProfileCard profile={MOCK_PROFILE} />);

    // US flag emoji should be rendered
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    const { container } = render(<PlayerProfileCard profile={MOCK_PROFILE} compact />);

    // Compact mode should have smaller styling
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<PlayerProfileCard profile={MOCK_PROFILE} onClick={onClick} />);

    const card = screen.getByRole('button', { name: /view.*profile/i });
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalled();
  });

  it('does not show private data', () => {
    render(<PlayerProfileCard profile={MOCK_PROFILE} />);

    // Should not render any IDs, emails, etc.
    expect(screen.queryByText(/user-123/)).not.toBeInTheDocument();
  });
});

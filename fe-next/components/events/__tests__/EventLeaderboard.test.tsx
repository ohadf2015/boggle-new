/**
 * EventLeaderboard Tests
 * Tests for the event leaderboard component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import EventLeaderboard from '../EventLeaderboard';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'events.leaderboard': 'Leaderboard',
    'events.position': 'Position',
    'events.score': 'Score',
    'events.rewards': 'Rewards',
    'events.you': 'You',
    'events.noParticipants': 'No participants yet',
  };
  return translations[key] || key;
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
      <div data-testid="adaptive-motion" {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockParticipants = [
  { id: 'p1', event_id: 'evt-1', user_id: 'user-1', username: 'Player1', score: 500, joined_at: '', rewards_claimed: false },
  { id: 'p2', event_id: 'evt-1', user_id: 'user-2', username: 'Player2', score: 350, joined_at: '', rewards_claimed: false },
  { id: 'p3', event_id: 'evt-1', user_id: 'user-3', username: 'Player3', score: 200, joined_at: '', rewards_claimed: false },
];

const mockRewards = [
  { position: 1, coins: 500, title: 'Champion' },
  { position: 2, coins: 300, title: 'Runner-up' },
  { position: 3, coins: 100, badge: 'bronze_medal' },
];

describe('EventLeaderboard', () => {
  it('should render leaderboard title', () => {
    render(<EventLeaderboard participants={mockParticipants} rewards={mockRewards} />);
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('should render all participants', () => {
    render(<EventLeaderboard participants={mockParticipants} rewards={mockRewards} />);
    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('Player2')).toBeInTheDocument();
    expect(screen.getByText('Player3')).toBeInTheDocument();
  });

  it('should display scores', () => {
    render(<EventLeaderboard participants={mockParticipants} rewards={mockRewards} />);
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
  });

  it('should highlight current player', () => {
    render(
      <EventLeaderboard
        participants={mockParticipants}
        rewards={mockRewards}
        currentUserId="user-2"
      />
    );
    const row = screen.getByTestId('leaderboard-row-user-2');
    expect(row).toHaveClass('ring-2');
  });

  it('should show empty state when no participants', () => {
    render(<EventLeaderboard participants={[]} rewards={mockRewards} />);
    expect(screen.getByText('No participants yet')).toBeInTheDocument();
  });

  it('should support compact mode', () => {
    render(
      <EventLeaderboard
        participants={mockParticipants}
        rewards={mockRewards}
        compact
      />
    );
    expect(screen.getByTestId('event-leaderboard')).toHaveClass('compact');
  });
});

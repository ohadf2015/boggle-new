/**
 * FriendsActivityFeed Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as AuthContext from '@/contexts/AuthContext';

// Mock hooks
const mockUseFriendsActivity = vi.fn();
vi.mock('@/hooks/useFriendsActivity', () => ({
  useFriendsActivity: () => mockUseFriendsActivity(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'friendsActivity.title': 'Friends Activity',
        'friendsActivity.empty': 'Add friends to see their activity',
        'friendsActivity.addFriends': 'Find Friends',
      };
      return map[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'u1' } }),
}));

vi.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  return { default: MockLink };
});

vi.mock('@/components/Avatar', () => {
  const MockAvatar = () => {
    return <div data-testid="avatar" />;
  };
  return { default: MockAvatar };
});

import { FriendsActivityFeed } from '../FriendsActivityFeed';

describe('FriendsActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GIVEN loading state
  // WHEN component renders
  // THEN shows loading skeleton
  it('should show loading state', () => {
    mockUseFriendsActivity.mockReturnValue({ events: [], loading: true });

    const { container } = render(<FriendsActivityFeed />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  // GIVEN no events
  // WHEN component renders
  // THEN shows empty state with link to /friends
  it('should show empty state when no events', () => {
    mockUseFriendsActivity.mockReturnValue({ events: [], loading: false });

    render(<FriendsActivityFeed />);
    expect(screen.getByText('Add friends to see their activity')).toBeInTheDocument();
    expect(screen.getByText('Find Friends')).toBeInTheDocument();
    const link = screen.getByText('Find Friends').closest('a');
    expect(link).toHaveAttribute('href', '/en/friends');
  });

  // GIVEN events exist
  // WHEN component renders
  // THEN shows title and event rows
  it('should render title and activity rows', () => {
    mockUseFriendsActivity.mockReturnValue({
      events: [
        {
          friendId: 'u2',
          friendName: 'WordWiz',
          friendAvatar: null,
          friendAvatarConfig: null,
          actionKey: 'friendsActivity.scored',
          actionParams: { score: 420, number: 42 },
          timeAgo: '5m ago',
          mode: 'daily_challenge',
          beatPlayer: false,
        },
        {
          friendId: 'u3',
          friendName: 'BlastKing',
          friendAvatar: null,
          friendAvatarConfig: null,
          actionKey: 'friendsActivity.blastWords',
          actionParams: { count: 25 },
          timeAgo: '2h ago',
          mode: 'blast',
          beatPlayer: false,
        },
      ],
      loading: false,
    });

    render(<FriendsActivityFeed />);
    expect(screen.getByText('Friends Activity')).toBeInTheDocument();
    expect(screen.getByText('WordWiz')).toBeInTheDocument();
    expect(screen.getByText('BlastKing')).toBeInTheDocument();
  });

  // GIVEN unauthenticated user
  // WHEN component renders
  // THEN returns null
  it('should return null for unauthenticated users', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
    mockUseFriendsActivity.mockReturnValue({ events: [], loading: false });

    const { container } = render(<FriendsActivityFeed />);
    expect(container.innerHTML).toBe('');
  });
});

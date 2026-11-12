import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const socket = vi.hoisted(() => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }));

vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, profile: { id: 'me' }, loading: false, user: { id: 'me' } }),
}));
vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [], pendingRequests: [], outgoingRequests: [], pendingChallenges: [],
    isLoading: false, blockedUsers: [],
    sendRequest: vi.fn(), acceptRequest: vi.fn(), declineRequest: vi.fn(),
    cancelRequest: vi.fn(), unfriend: vi.fn(), block: vi.fn(), unblock: vi.fn(),
    search: vi.fn(),
  }),
}));
vi.mock('@/hooks/useFriendMessages', () => ({
  useFriendMessages: () => ({
    threads: [], messages: [], unreadCount: 0,
    sendMessage: vi.fn(), loadMessages: vi.fn(), markAsRead: vi.fn(),
    refreshThreads: vi.fn(), setTyping: vi.fn(), typingUsername: null,
    deleteMessage: vi.fn(), acceptChallenge: vi.fn(), declineChallenge: vi.fn(),
  }),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => ({ socket, isConnected: true }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));
vi.mock('../RecentOpponents', () => ({
  RecentOpponents: ({ source }: { source: string }) => <div data-testid="recent-opponents" data-source={source} />,
}));

import FriendsList from '../FriendsList';

describe('FriendsList — challenge events live in the global toast', () => {
  it('Given /friends mounted, Then it registers none of the challenge listeners (no duplicate toasts)', () => {
    render(<FriendsList />);
    const events = socket.on.mock.calls.map(([ev]) => ev);
    for (const ev of ['friends:challengeReceived', 'friends:challengeAccepted', 'friends:challengeDeclined', 'friends:challengeResult']) {
      expect(events).not.toContain(ev);
    }
    expect(events).toContain('gift:receive');
  });

  it('Given no friends, Then shows recent opponents above the Add button instead of an empty state', () => {
    render(<FriendsList />);
    const recent = screen.getByTestId('recent-opponents');
    expect(recent.getAttribute('data-source')).toBe('friends_recent');
    expect(screen.queryByText('friends.noFriendsYet')).toBeNull();
    const block = within(recent.parentElement as HTMLElement);
    expect(block.getByText('friends.addFriendsToChallenge')).toBeTruthy();
    expect(block.getByRole('button', { name: /friends\.add$/ })).toBeTruthy();
  });
});

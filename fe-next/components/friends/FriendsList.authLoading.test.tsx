/**
 * Regression: friends list "doesn't show up / no loading indication".
 *
 * Root cause (Class 1 — dual source + async resolution): while AuthContext is
 * still resolving (`loading === true`, `isAuthenticated === false`), the gate
 * fell into the unauthenticated branch and rendered the SIGN-IN screen instead
 * of a loading indicator. Logged-in users hitting /friends on a cold load saw a
 * sign-in prompt (or blank), then a flash to the list — read as "no loading".
 *
 * Fix: show the skeleton while auth is still loading, before the unauth gate.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FriendsList from './FriendsList';

const mockUseAuth = vi.fn();
const mockUseFriends = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => mockUseFriends() }));
vi.mock('@/hooks/useFriendMessages', () => ({
  useFriendMessages: () => ({
    threads: [], messages: [], unreadCount: 0,
    sendMessage: vi.fn(), loadMessages: vi.fn(), markAsRead: vi.fn(),
    refreshThreads: vi.fn(), setTyping: vi.fn(), typingUsername: null,
    deleteMessage: vi.fn(), acceptChallenge: vi.fn(), declineChallenge: vi.fn(),
  }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => vi.fn() }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

const friendsState = (over: Record<string, unknown> = {}) => ({
  friends: [], pendingRequests: [], outgoingRequests: [], pendingChallenges: [],
  isLoading: false, blockedUsers: [],
  sendRequest: vi.fn(), acceptRequest: vi.fn(), declineRequest: vi.fn(),
  cancelRequest: vi.fn(), unfriend: vi.fn(), block: vi.fn(), unblock: vi.fn(),
  search: vi.fn(),
  ...over,
});

describe('FriendsList — auth-loading gate', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseFriends.mockReset();
  });

  it('shows the loading skeleton (not sign-in) while auth is still resolving', () => {
    // Realistic cold-load: auth still resolving, and useFriends has already
    // settled to isLoading:false because it sees isAuthenticated:false. The
    // skeleton here rides ENTIRELY on the `|| authLoading` clause — keep
    // isLoading:false so this test guards exactly that clause.
    mockUseAuth.mockReturnValue({ isAuthenticated: false, profile: null, loading: true });
    mockUseFriends.mockReturnValue(friendsState({ isLoading: false }));

    render(<FriendsList />);

    expect(screen.getAllByLabelText('Loading content').length).toBeGreaterThan(0);
    expect(screen.queryByText('friends.signInRequired')).not.toBeInTheDocument();
  });

  it('still shows sign-in once auth has resolved to unauthenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, profile: null, loading: false });
    mockUseFriends.mockReturnValue(friendsState());

    render(<FriendsList />);

    expect(screen.getByText('friends.signInRequired')).toBeInTheDocument();
  });
});

/**
 * Regression: Friends header action buttons ejected off-screen (Class 5 —
 * mobile-web layout). On wide phones (e.g. Galaxy S25 Ultra) and across all LTR
 * locales the cyan "Add friend" / pink "Form pact" buttons were pushed past the
 * right viewport edge; only Hebrew (RTL) — where the same buttons sit at the
 * leading edge — appeared to work.
 *
 * Root cause: a horizontally over-wide child could give the page horizontal
 * scroll, and the header's trailing-edge (right, in LTR) action buttons then
 * rode off-screen. The `xs:` (480px) label reveal landed exactly on wide-phone
 * widths, adding width pressure.
 *
 * Fix contract (asserted here):
 *  - Root wrapper contains its own width (`min-w-0` + `max-w-full`) and clips
 *    stray horizontal overflow (`overflow-x-clip`) so nothing can gain page
 *    horizontal scroll and shift the header out of view.
 *  - Header is a single non-wrapping row; the action-buttons cluster is
 *    `shrink-0` (pinned to the trailing edge, never displaced), while the title
 *    absorbs remaining space and truncates.
 *  - Button labels only reveal at `sm:` (≥640px, tablet/desktop) — never at the
 *    `xs` wide-phone width — keeping the header compact on every phone.
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

const friend = {
  id: 'f1',
  odUserId: 'od1',
  username: 'anders',
  displayName: 'Anders',
  avatarImage: null,
  customAvatar: null,
  isOnline: true,
  lastSeenAt: new Date().toISOString(),
};

const friendsState = (over: Record<string, unknown> = {}) => ({
  friends: [friend], pendingRequests: [], outgoingRequests: [], pendingChallenges: [],
  isLoading: false, blockedUsers: [],
  sendRequest: vi.fn(), acceptRequest: vi.fn(), declineRequest: vi.fn(),
  cancelRequest: vi.fn(), unfriend: vi.fn(), block: vi.fn(), unblock: vi.fn(),
  search: vi.fn(),
  ...over,
});

describe('FriendsList — header layout containment', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseFriends.mockReset();
    mockUseAuth.mockReturnValue({ isAuthenticated: true, profile: { id: 'u1' }, loading: false });
    mockUseFriends.mockReturnValue(friendsState());
  });

  it('root wrapper contains its width and clips stray horizontal overflow', () => {
    const { container } = render(<FriendsList />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('min-w-0');
    expect(root.className).toContain('max-w-full');
    expect(root.className).toContain('overflow-x-clip');
  });

  it('header is a non-wrapping row with the action cluster pinned (shrink-0)', () => {
    render(<FriendsList />);
    const actions = screen.getByTestId('friends-header-actions');
    expect(actions.className).toContain('shrink-0');

    const header = actions.parentElement as HTMLElement;
    expect(header.className).toContain('flex-nowrap');
    // The title must be allowed to yield space and truncate, not the buttons.
    expect(header.className).not.toContain('flex-wrap ');
  });

  it('reveals button labels only at sm (never at the xs wide-phone width)', () => {
    render(<FriendsList />);
    const addLabel = screen.getByText('friends.add');
    expect(addLabel.className).toContain('sm:inline');
    expect(addLabel.className).not.toContain('xs:inline');
  });

  it('tab strip scrolls internally instead of widening the parent', () => {
    render(<FriendsList />);
    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('overflow-x-auto');
    expect(tablist.className).toContain('min-w-0');
    expect(tablist.className).toContain('max-w-full');
  });
});

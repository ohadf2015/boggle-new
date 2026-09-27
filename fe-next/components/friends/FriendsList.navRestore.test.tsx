/**
 * Regression: entering the friends chat area and going "back" (device/browser
 * back gesture, not the in-thread close button) made the whole mobile bottom
 * tab bar disappear on every subsequent page.
 *
 * Root cause (Class 2/4 — stale mutable global + silent leak): opening a chat
 * thread hid the global bottom nav via an IMPERATIVE `setIsInGame(true)`, but
 * the matching `setIsInGame(false)` lived ONLY in the in-thread close handler.
 * `isInGame` is stored in the layout-level NavigationContext, so it survives
 * the route change. Leaving the thread by unmounting the component (back
 * gesture) never reset it → nav stayed hidden globally.
 *
 * Fix: drive nav-hiding off `selectedThread` with an effect whose cleanup
 * always restores the nav on unmount — the same contract BlastView uses.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setIsInGameSpy = vi.fn();

let friendUserIdParam: string | null = null;

const mockThreads = [
  {
    conversationId: 'c1',
    friendUserId: 'f1',
    friendUsername: 'friend1',
    friendDisplayName: 'Friend One',
    friendAvatar: { emoji: '', color: '', image: undefined, customAvatar: undefined },
    lastMessage: 'hi',
    lastMessageAt: 1,
    unreadCount: 0,
    isOnline: false,
  },
];

vi.mock('@/contexts/NavigationContext', () => ({ useHideNavigation: () => setIsInGameSpy }));
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
    threads: mockThreads, messages: [], unreadCount: 0,
    sendMessage: vi.fn(), loadMessages: vi.fn(), markAsRead: vi.fn(),
    refreshThreads: vi.fn(), setTyping: vi.fn(), typingUsername: null,
    deleteMessage: vi.fn(), acceptChallenge: vi.fn(), declineChallenge: vi.fn(),
  }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/utils/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({
    get: (k: string) =>
      k === 'friendUserId' ? friendUserIdParam : k === 'tab' ? 'messages' : null,
  }),
}));

// Stub MessageThread so we can drive onClose without the full conversation UI.
vi.mock('./messaging/MessageThread', () => ({
  MessageThread: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <button data-testid="thread-close" onClick={onClose}>
        close
      </button>
    ) : null,
}));

import FriendsList from './FriendsList';

describe('FriendsList — restores bottom nav on leaving chat', () => {
  beforeEach(() => {
    setIsInGameSpy.mockClear();
    friendUserIdParam = null;
  });

  it('hides the nav when a chat thread opens (setIsInGame(true))', () => {
    friendUserIdParam = 'f1'; // deep-link auto-opens the thread on mount
    render(<FriendsList />);
    expect(screen.getByTestId('thread-close')).toBeInTheDocument();
    expect(setIsInGameSpy).toHaveBeenCalledWith(true);
  });

  it('restores the nav when leaving via the in-thread close button', () => {
    friendUserIdParam = 'f1';
    render(<FriendsList />);
    setIsInGameSpy.mockClear();
    fireEvent.click(screen.getByTestId('thread-close'));
    expect(setIsInGameSpy).toHaveBeenLastCalledWith(false);
  });

  it('restores the nav when unmounting with a thread still open (back gesture)', () => {
    friendUserIdParam = 'f1';
    const { unmount } = render(<FriendsList />);
    expect(setIsInGameSpy).toHaveBeenCalledWith(true);
    setIsInGameSpy.mockClear();
    unmount();
    expect(setIsInGameSpy).toHaveBeenLastCalledWith(false);
  });
});

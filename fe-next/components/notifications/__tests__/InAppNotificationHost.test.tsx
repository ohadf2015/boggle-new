import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LIVE_NOTICE_EVENT } from '@/shared/liveNotice';

const t = (key: string, a?: unknown, b?: unknown) => {
  const params = (typeof a === 'object' ? a : b) as Record<string, string> | undefined;
  return params ? `${key}|${Object.values(params).join(',')}` : key;
};
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'he' }) }));
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: nav.push }), usePathname: () => '/he' }));
const auth = vi.hoisted(() => ({ isAuthenticated: true, profile: { id: 'me' } as { id: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
const realtime = vi.hoisted(() => ({ cb: null as null | ((n: Record<string, unknown>) => void) }));
vi.mock('@/lib/supabaseRealtimeNotifications', () => ({
  subscribeToNotifications: (_userId: string, cb: (n: Record<string, unknown>) => void) => {
    realtime.cb = cb;
    return () => { realtime.cb = null; };
  },
}));
const accept = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock('@/utils/friends', () => ({ acceptFriendRequest: accept }));

type Handler = (data: unknown) => void;
function makeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    on: vi.fn((ev: string, fn: Handler) => { if (!handlers.has(ev)) handlers.set(ev, new Set()); handlers.get(ev)!.add(fn); }),
    off: vi.fn((ev: string, fn: Handler) => { handlers.get(ev)?.delete(fn); }),
    fire(ev: string, data: unknown) { [...(handlers.get(ev) ?? [])].forEach((fn) => fn(data)); },
  };
}
let socket = makeSocket();
let hasSocket = true;
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => (hasSocket ? { socket, isConnected: true } : null) }));

import InAppNotificationHost from '../InAppNotificationHost';

beforeEach(() => {
  vi.clearAllMocks();
  socket = makeSocket();
  hasSocket = true;
  auth.isAuthenticated = true;
  auth.profile = { id: 'me' };
  realtime.cb = null;
});

describe('InAppNotificationHost', () => {
  it('Given a live gift notice, Then shows title, body, Open and Not now', () => {
    render(<InAppNotificationHost />);
    act(() => socket.fire(LIVE_NOTICE_EVENT, {
      id: 'g1',
      type: 'gift_received',
      title: 'You got a gift',
      body: 'Maya sent you 50 coins',
      deepLink: '/friends',
    }));
    expect(screen.getByTestId('in-app-notice')).toHaveAttribute('data-notice-type', 'gift_received');
    expect(screen.getByText('You got a gift')).toBeTruthy();
    expect(screen.getByText('Maya sent you 50 coins')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'friends.open' }));
    expect(nav.push).toHaveBeenCalledWith('/he/friends');
    expect(screen.queryByTestId('in-app-notice')).toBeNull();
  });

  it('Given a friend request socket event, Then Accept writes the friendship and opens Friends', async () => {
    render(<InAppNotificationHost />);
    act(() => socket.fire('friends:requestReceived', { requestId: 'req-1', fromUserId: 'maya-id', fromName: 'Maya' }));
    expect(screen.getByText('friends.requestReceivedToast|Maya')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'friends.acceptRequest' }));
    await waitFor(() => expect(accept).toHaveBeenCalledWith('req-1'));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/he/friends?tab=friends'));
  });

  it('Given a game invite live notice, Then ignores it (IncomingChallengeToast owns that card)', () => {
    render(<InAppNotificationHost />);
    act(() => socket.fire(LIVE_NOTICE_EVENT, {
      id: 'inv',
      type: 'game_invite',
      title: 'Maya invited you',
      body: 'Join the room',
      deepLink: '/multiplayer?room=ABCD',
    }));
    expect(screen.queryByTestId('in-app-notice')).toBeNull();
  });

  it('Given a tower-wreck history row on a page without a socket, Then Realtime still shows the banner', () => {
    hasSocket = false;
    render(<InAppNotificationHost />);
    act(() => realtime.cb?.({
      id: 'n-9',
      title: 'Your tower was wrecked',
      body: 'Fish stole a floor',
      notification_type: 'social',
      action_url: '/word-tower',
      related_entity_type: null,
    }));
    expect(screen.getByTestId('in-app-notice')).toBeTruthy();
    expect(screen.getByText('Your tower was wrecked')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'friends.open' }));
    expect(nav.push).toHaveBeenCalledWith('/he/word-tower');
  });

  it('Given a signed-out visitor, Then renders nothing', () => {
    auth.isAuthenticated = false;
    auth.profile = null;
    const { container } = render(<InAppNotificationHost />);
    expect(container.innerHTML).toBe('');
  });
});

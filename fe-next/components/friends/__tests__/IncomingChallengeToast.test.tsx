import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const t = (key: string, a?: unknown, b?: unknown) => {
  const params = (typeof a === 'object' ? a : b) as Record<string, string> | undefined;
  return params ? `${key}|${Object.values(params).join(',')}` : key;
};
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'he' }) }));
vi.mock('@/components/Avatar', () => ({ default: () => <span data-testid="avatar" /> }));
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));
const nav = vi.hoisted(() => ({ pathname: '/he/daily', push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: nav.push }) }));
const inGame = vi.hoisted(() => ({ value: false }));
vi.mock('@/lib/inGameSurface', () => ({ useInGameSurface: () => inGame.value }));
const auth = vi.hoisted(() => ({ isAuthenticated: true, profile: { id: 'me' } as { id: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
const pending = vi.hoisted(() => ({ list: [] as unknown[], fetch: vi.fn() }));
const realtime = vi.hoisted(() => ({ cb: null as null | ((n: { related_entity_type: string | null }) => void), userId: '' }));
vi.mock('@/lib/supabaseRealtimeNotifications', () => ({
  subscribeToNotifications: (userId: string, cb: typeof realtime.cb) => {
    realtime.userId = userId;
    realtime.cb = cb;
    return () => { realtime.cb = null; };
  },
}));
vi.mock('@/hooks/useFriends', () => ({ useFriends: () => { throw new Error('the global toast must not start the friends poll'); } }));
vi.mock('@/utils/friendsHeadToHead', () => ({ getPendingChallenges: pending.fetch }));

type Handler = (data: unknown) => void;
function makeSocket() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    handlers,
    on: vi.fn((ev: string, fn: Handler) => { if (!handlers.has(ev)) handlers.set(ev, new Set()); handlers.get(ev)!.add(fn); }),
    off: vi.fn((ev: string, fn: Handler) => { handlers.get(ev)?.delete(fn); }),
    emit: vi.fn(),
    fire(ev: string, data: unknown) { [...(handlers.get(ev) ?? [])].forEach((fn) => fn(data)); },
  };
}
let socket = makeSocket();
let hasSocket = true;
vi.mock('@/utils/SocketContext', () => ({ useSocketOptional: () => (hasSocket ? { socket, isConnected: true } : null) }));

import IncomingChallengeToast from '../IncomingChallengeToast';

async function renderToast() {
  const r = render(<IncomingChallengeToast />);
  await act(async () => {});
  return r;
}

const challenge = (over: Record<string, unknown> = {}) => ({
  id: 'ch-1',
  challengerId: 'maya-id',
  challengerUsername: 'maya',
  challengerDisplayName: 'Maya',
  challengerAvatarEmoji: '',
  challengerAvatarColor: '',
  challengeId: 'ROOM1',
  challengeCode: 'ROOM1',
  status: 'pending',
  createdAt: new Date().toISOString(),
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  socket = makeSocket();
  hasSocket = true;
  try { sessionStorage.clear(); } catch { /* jsdom */ }
  nav.pathname = '/he/daily';
  inGame.value = false;
  auth.isAuthenticated = true;
  auth.profile = { id: 'me' };
  pending.list = [];
  pending.fetch.mockImplementation(async () => pending.list);
  try { localStorage.clear(); } catch { /* jsdom */ }
});

describe('IncomingChallengeToast — challenge received', () => {
  it('Given a fresh pending challenge, When rendered on any page, Then shows who challenged with Join and Not now', async () => {
    pending.list = [challenge()];
    await renderToast();
    expect(screen.getByText('friends.challenges.toast.title|Maya')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'friends.challenges.acceptAndPlay' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'friends.challenges.toast.notNow' })).toBeTruthy();
  });

  it('Given a page with no socket, When a friend-challenge row lands in realtime, Then refetches pending challenges (no polling)', async () => {
    hasSocket = false;
    await renderToast();
    expect(realtime.userId).toBe('me');
    expect(pending.fetch).toHaveBeenCalledTimes(1);
    expect(pending.fetch).toHaveBeenCalledWith('me');
    act(() => realtime.cb?.({ related_entity_type: 'rival_ping:gg' }));
    expect(pending.fetch).toHaveBeenCalledTimes(1);
    pending.list = [challenge()];
    await act(async () => realtime.cb?.({ related_entity_type: 'friend_challenge' }));
    expect(pending.fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByText('friends.challenges.toast.title|Maya')).toBeTruthy();
  });

  it('Given Join tapped, When the server accepts, Then navigates to the room in my language', async () => {
    pending.list = [challenge()];
    await renderToast();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'friends.challenges.acceptAndPlay' }));
    });
    expect(socket.emit).toHaveBeenCalledWith('friends:acceptChallenge', { challengeId: 'ch-1' });
    await act(async () => {
      socket.fire('friends:challengeAccepted', { challengeId: 'ch-1', roomCode: 'ROOM1', fromUserId: 'maya-id', toUserId: 'me' });
    });
    expect(nav.push).toHaveBeenCalledWith('/he/multiplayer?room=ROOM1');
    expect(nav.push).toHaveBeenCalledTimes(1);
  });

  it('Given a page without a socket (home), When Join tapped, Then goes to the room and accepts once the room page connects', async () => {
    hasSocket = false;
    pending.list = [challenge()];
    const { unmount } = await renderToast();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'friends.challenges.acceptAndPlay' }));
    });
    expect(nav.push).toHaveBeenCalledWith('/he/multiplayer?room=ROOM1');
    unmount();

    hasSocket = true;
    nav.pathname = '/he/multiplayer';
    await renderToast();
    expect(socket.emit).toHaveBeenCalledWith('friends:acceptChallenge', { challengeId: 'ch-1' });
    expect(screen.queryByText('friends.challenges.toast.title|Maya')).toBeNull();
  });

  it('Given Not now tapped, Then the card goes away and stays away on remount', async () => {
    pending.list = [challenge()];
    const { unmount } = await renderToast();
    fireEvent.click(screen.getByRole('button', { name: 'friends.challenges.toast.notNow' }));
    expect(screen.queryByText('friends.challenges.toast.title|Maya')).toBeNull();
    unmount();
    await renderToast();
    expect(screen.queryByText('friends.challenges.toast.title|Maya')).toBeNull();
  });

  it('Given a round on screen, Then the card is held until it ends', async () => {
    pending.list = [challenge()];
    inGame.value = true;
    const { rerender } = await renderToast();
    expect(screen.queryByText('friends.challenges.toast.title|Maya')).toBeNull();
    inGame.value = false;
    rerender(<IncomingChallengeToast />);
    expect(screen.getByText('friends.challenges.toast.title|Maya')).toBeTruthy();
  });

  it('Given a challenge older than the live window, Then no card (it stays on /friends)', async () => {
    pending.list = [challenge({ createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() })];
    await renderToast();
    expect(screen.queryByText('friends.challenges.toast.title|Maya')).toBeNull();
  });

  it('Given a signed-out visitor, Then renders nothing and registers no listeners', async () => {
    auth.isAuthenticated = false;
    auth.profile = null;
    pending.list = [challenge()];
    const { container } = await renderToast();
    expect(container.innerHTML).toBe('');
    expect(socket.on).not.toHaveBeenCalled();
  });
});

describe('IncomingChallengeToast — my challenge was accepted', () => {
  const accepted = { challengeId: 'ch-9', roomCode: 'NEW1', challengeType: 'new_game', fromUserId: 'me', toUserId: 'maya-id', toUsername: 'maya' };

  it('Given I am browsing, When my challenge is accepted, Then I am routed into the room', () => {
    render(<IncomingChallengeToast />);
    act(() => socket.fire('friends:challengeAccepted', accepted));
    expect(nav.push).toHaveBeenCalledWith('/he/multiplayer?room=NEW1');
    expect(toastMock.success).toHaveBeenCalledWith('friends.challenges.friendAccepted|maya');
  });

  it('Given I am mid-round, When accepted, Then not yanked: a Join card appears instead', () => {
    inGame.value = true;
    render(<IncomingChallengeToast />);
    act(() => socket.fire('friends:challengeAccepted', accepted));
    expect(nav.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'friends.challenges.toast.join' }));
    expect(nav.push).toHaveBeenCalledWith('/he/multiplayer?room=NEW1');
  });

  it('Given an invite to the room I am hosting, When accepted, Then I stay put', () => {
    nav.pathname = '/he/multiplayer';
    render(<IncomingChallengeToast />);
    act(() => socket.fire('friends:challengeAccepted', { ...accepted, challengeType: 'join_room' }));
    expect(nav.push).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'friends.challenges.toast.join' })).toBeNull();
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('Given I am the one who accepted, Then the echo neither toasts nor routes', () => {
    render(<IncomingChallengeToast />);
    act(() => socket.fire('friends:challengeAccepted', { ...accepted, fromUserId: 'maya-id', toUserId: 'me' }));
    expect(nav.push).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it('Given my challenge was declined, Then only I (the challenger) get a toast', () => {
    render(<IncomingChallengeToast />);
    act(() => socket.fire('friends:challengeDeclined', { fromUserId: 'maya-id', toUserId: 'me', toUsername: 'me' }));
    expect(toastMock).not.toHaveBeenCalled();
    act(() => socket.fire('friends:challengeDeclined', { fromUserId: 'me', toUserId: 'maya-id', toUsername: 'maya' }));
    expect(toastMock).toHaveBeenCalledWith('friends.challengeDeclinedToast|maya', expect.anything());
  });

  it('registers exactly one listener per challenge event', () => {
    render(<IncomingChallengeToast />);
    for (const ev of ['friends:challengeAccepted', 'friends:challengeDeclined', 'friends:challengeResult']) {
      expect(socket.handlers.get(ev)?.size).toBe(1);
    }
  });
});

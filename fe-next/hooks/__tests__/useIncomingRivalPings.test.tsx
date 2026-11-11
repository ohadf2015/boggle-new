import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ value: { user: { id: 'me', is_anonymous: false }, loading: false, isAuthenticated: true } as Record<string, unknown> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('@/lib/rivals/pingClient', () => ({ fetchIncomingPings: vi.fn() }));
const realtime = vi.hoisted(() => ({ handler: null as null | ((n: Record<string, unknown>) => void), unsubscribe: vi.fn() }));
vi.mock('@/lib/supabaseRealtimeNotifications', () => ({
  subscribeToNotifications: vi.fn((_id: string, onNew: (n: Record<string, unknown>) => void) => {
    realtime.handler = onNew;
    return realtime.unsubscribe;
  }),
}));

import { useIncomingRivalPings } from '../useIncomingRivalPings';
import { fetchIncomingPings } from '@/lib/rivals/pingClient';
import { subscribeToNotifications } from '@/lib/supabaseRealtimeNotifications';

const ping = (id: string, createdAt = '2026-11-11T10:00:00Z') => ({
  id,
  pingId: 'gg',
  createdAt,
  sender: { id: `s-${id}`, name: 'Maya', avatar: { emoji: null, color: null, image: null, config: null } },
});

beforeEach(() => {
  vi.clearAllMocks();
  realtime.handler = null;
  auth.value = { user: { id: 'me', is_anonymous: false }, loading: false, isAuthenticated: true };
});

describe('useIncomingRivalPings', () => {
  it('loads waiting pings oldest first and listens on its own channel', async () => {
    vi.mocked(fetchIncomingPings).mockResolvedValue([ping('b', '2026-11-11T11:00:00Z'), ping('a')] as never);
    const { result } = renderHook(() => useIncomingRivalPings());
    await waitFor(() => expect(result.current.queue.map((p) => p.id)).toEqual(['a', 'b']));
    expect(subscribeToNotifications).toHaveBeenCalledWith('me', expect.any(Function), undefined, 'rival-pings');
  });

  it('does nothing for guests, anonymous sessions or while auth is loading', () => {
    for (const value of [
      { user: null, loading: false, isAuthenticated: false },
      { user: { id: 'anon', is_anonymous: true }, loading: false, isAuthenticated: true },
      { user: { id: 'me' }, loading: true, isAuthenticated: true },
    ]) {
      auth.value = value;
      renderHook(() => useIncomingRivalPings());
    }
    expect(fetchIncomingPings).not.toHaveBeenCalled();
    expect(subscribeToNotifications).not.toHaveBeenCalled();
  });

  it('refetches when a rival ping lands and ignores other notifications', async () => {
    vi.mocked(fetchIncomingPings).mockResolvedValueOnce([]).mockResolvedValueOnce([ping('a')] as never);
    const { result } = renderHook(() => useIncomingRivalPings());
    await waitFor(() => expect(fetchIncomingPings).toHaveBeenCalledTimes(1));

    act(() => realtime.handler?.({ id: 'x', related_entity_type: null }));
    expect(fetchIncomingPings).toHaveBeenCalledTimes(1);

    act(() => realtime.handler?.({ id: 'a', related_entity_type: 'rival_ping:gg' }));
    await waitFor(() => expect(result.current.queue.map((p) => p.id)).toEqual(['a']));
  });

  it('never re-queues a ping once dismissed', async () => {
    vi.mocked(fetchIncomingPings).mockResolvedValue([ping('a')] as never);
    const { result } = renderHook(() => useIncomingRivalPings());
    await waitFor(() => expect(result.current.queue).toHaveLength(1));
    act(() => result.current.dismiss('a'));
    expect(result.current.queue).toEqual([]);

    act(() => realtime.handler?.({ id: 'z', related_entity_type: 'rival_ping:gg' }));
    await waitFor(() => expect(fetchIncomingPings).toHaveBeenCalledTimes(2));
    expect(result.current.queue).toEqual([]);
  });
});

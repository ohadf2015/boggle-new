/**
 * handlePushData — route foreground push payloads into in-app state.
 *
 * Bug addressed: when the app is foregrounded and a push arrives, the tray
 * notification now shows (via LocalNotifications bridge), but in-app React
 * Query caches were NOT invalidated. Gift UI (useUnclaimedGifts) has a
 * 5-minute staleTime, so recipients waited up to 5 min to see the badge.
 * Friend-message views that aren't connected via socket also missed updates.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { handlePushData } from '../handlePushData';
import { queryKeys } from '@/lib/queryKeys';

describe('handlePushData', () => {
  const invalidateQueries = vi.fn();
  const queryClient = { invalidateQueries } as unknown as import('@tanstack/react-query').QueryClient;

  beforeEach(() => {
    invalidateQueries.mockClear();
  });

  it('invalidates gifts query when type is "gift_received" (backend canonical)', () => {
    handlePushData(queryClient, { type: 'gift_received', actionUrl: '/' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.gifts._def });
  });

  it('invalidates gifts query when type is legacy "gift"', () => {
    handlePushData(queryClient, { type: 'gift' });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.gifts._def });
  });

  it.each([
    'direct_message',
    'friend_request',
    'friend_accepted',
    'game_invite',
    'challenge_accepted',
    'challenge_declined',
  ])('dispatches a push-received event for friend type "%s"', (type) => {
    const listener = vi.fn();
    window.addEventListener('lexiclash:push-received', listener as EventListener);

    handlePushData(queryClient, { type, threadId: 'abc' });

    expect(listener).toHaveBeenCalledTimes(1);
    const evt = listener.mock.calls[0][0] as CustomEvent<Record<string, string>>;
    expect(evt.detail).toEqual({ type, threadId: 'abc' });

    window.removeEventListener('lexiclash:push-received', listener as EventListener);
  });

  it('always dispatches the raw event regardless of type (for generic listeners)', () => {
    const listener = vi.fn();
    window.addEventListener('lexiclash:push-received', listener as EventListener);

    handlePushData(queryClient, { type: 'gift' });

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('lexiclash:push-received', listener as EventListener);
  });

  it('no-ops gracefully when data is empty', () => {
    expect(() => handlePushData(queryClient, {})).not.toThrow();
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});

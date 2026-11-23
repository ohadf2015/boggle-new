/**
 * FriendStatusContext — sendTo auto-accept tracking
 *
 * A mutual add (the challenger already sent the recipient a request, or vice
 * versa) completes a friendship instantly. The context must track that as
 * friend_added — the viral loop's terminal metric — not friend_request_sent.
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FriendStatusProvider, useFriendStatus } from '../FriendStatusContext';

const friendsState = vi.hoisted(() => ({
  sendRequest: vi.fn(),
  acceptRequest: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'me' } }),
}));
vi.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [],
    outgoingRequests: [],
    pendingRequests: [],
    sendRequest: friendsState.sendRequest,
    acceptRequest: friendsState.acceptRequest,
  }),
}));
vi.mock('@/hooks/useSocialCapabilities', () => ({
  useSocialCapabilities: () => ({ caps: { friendManagement: true, friendMessaging: true }, tier: 'adult' }),
}));
const trackGrowthEvent = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent }));

function wrapper({ children }: { children: React.ReactNode }) {
  return <FriendStatusProvider>{children}</FriendStatusProvider>;
}

describe('FriendStatusContext.sendTo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks friend_request_sent and returns "sent" for a plain request', async () => {
    friendsState.sendRequest.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useFriendStatus(), { wrapper });
    let outcome: unknown;
    await act(async () => { outcome = await result.current!.sendTo('u2', 'quick_challenge_results'); });
    expect(outcome).toBe('sent');
    expect(trackGrowthEvent).toHaveBeenCalledWith('friend_request_sent', { surface: 'quick_challenge_results' });
    expect(trackGrowthEvent).not.toHaveBeenCalledWith('friend_added', expect.anything());
    expect(result.current!.relationFor('u2')).toBe('sent');
  });

  it('tracks friend_added and returns "accepted" when the server auto-accepts a mutual add', async () => {
    friendsState.sendRequest.mockResolvedValue({ success: true, autoAccepted: true });
    const { result } = renderHook(() => useFriendStatus(), { wrapper });
    let outcome: unknown;
    await act(async () => { outcome = await result.current!.sendTo('u2', 'quick_challenge_results'); });
    expect(outcome).toBe('accepted');
    expect(trackGrowthEvent).toHaveBeenCalledWith('friend_added', { surface: 'quick_challenge_results', via: 'auto_accept' });
    expect(trackGrowthEvent).not.toHaveBeenCalledWith('friend_request_sent', expect.anything());
    expect(result.current!.relationFor('u2')).toBe('friend');
  });

  it('returns false and tracks nothing when the request fails', async () => {
    friendsState.sendRequest.mockResolvedValue({ success: false, code: 'SERVER_ERROR' });
    const { result } = renderHook(() => useFriendStatus(), { wrapper });
    let outcome: unknown;
    await act(async () => { outcome = await result.current!.sendTo('u2', 'quick_challenge_results'); });
    expect(outcome).toBe(false);
    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });
});

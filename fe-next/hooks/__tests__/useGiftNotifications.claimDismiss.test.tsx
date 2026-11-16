import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockPost, mockClaim, mockRefresh } = vi.hoisted(() => ({ mockPost: vi.fn(), mockClaim: vi.fn(), mockRefresh: vi.fn(async () => {}) }));
vi.mock('@/utils/authFetch', () => ({ postWithAuth: mockPost, getWithAuth: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { gift_modal_dismissed_at: null }, refreshProfile: vi.fn() }),
}));
const gifts = [{ id: 'g1', claimed: false, created_at: '2026-01-01T00:00:00Z' }];
vi.mock('@/hooks/useUnclaimedGifts', () => ({
  useUnclaimedGifts: () => ({ unclaimedCount: 1, gifts, refresh: mockRefresh, claimGift: mockClaim }),
}));

import { useGiftNotifications } from '@/components/header/useGiftNotifications';

beforeEach(() => {
  vi.clearAllMocks();
  mockPost.mockResolvedValue({ ok: true });
  mockClaim.mockResolvedValue({ xpAwarded: 1, coinsAwarded: 1 });
});

describe('useGiftNotifications dismissal', () => {
  it('persists a dismissal when the player closes a gift without claiming', async () => {
    const { result } = renderHook(() => useGiftNotifications());
    act(() => result.current.handleOpenGiftModal());
    await act(async () => { await result.current.handleDismissGiftModal(); });
    expect(mockPost).toHaveBeenCalledWith('/api/player/gifts/dismiss-modal');
  });

  it('does not persist a dismissal for the close that follows a successful claim', async () => {
    const { result } = renderHook(() => useGiftNotifications());
    act(() => result.current.handleOpenGiftModal());
    await act(async () => { await result.current.handleClaimGift('g1'); });
    await act(async () => { await result.current.handleDismissGiftModal(); });
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('useGiftNotifications failed claim', () => {
  it('refreshes the gift list and rethrows so the modal can tell the player', async () => {
    mockClaim.mockRejectedValue(new Error('Cannot claim gift'));
    const { result } = renderHook(() => useGiftNotifications());
    await act(async () => {
      await expect(result.current.handleClaimGift('g1')).rejects.toThrow('Cannot claim gift');
    });
    expect(mockRefresh).toHaveBeenCalled();
  });
});

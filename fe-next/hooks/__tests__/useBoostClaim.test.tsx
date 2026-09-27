import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBoostClaim, BOOST_TOKEN_STORAGE_KEY } from '../useBoostClaim';

let mockShowAd: ReturnType<typeof vi.fn>;
let mockOnRewardEarned: ((coinsAwarded: number) => void) | undefined;
let mockOnAdError: ((error: string) => void) | undefined;

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: any) => {
    mockOnRewardEarned = opts.onRewardEarned;
    mockOnAdError = opts.onAdError;
    return {
      showAd: mockShowAd,
      status: 'idle',
      isAdAvailable: true,
      canShowAd: true,
      error: null,
      rewardAmount: 50,
      viewsToday: 0,
      maxViews: 10,
      isDailyLimitReached: false,
      isPlaceholder: false,
    };
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mockShowAd = vi.fn();
  mockOnRewardEarned = undefined;
  mockOnAdError = undefined;
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, token: 'b1.s1.hint.999.sig', remaining: 4 }),
  })) as never;
});

describe('useBoostClaim', () => {
  it('shows ad then POSTs claim and persists token', async () => {
    const { result } = renderHook(() => useBoostClaim('s1'));

    let claimPromise: Promise<boolean>;
    await act(async () => {
      claimPromise = result.current.claim('hint');
    });

    // Simulate ad success
    expect(mockShowAd).toHaveBeenCalled();
    expect(mockOnRewardEarned).toBeDefined();

    await act(async () => {
      await mockOnRewardEarned?.(50);
      // Give the async request time to complete
      await new Promise((r) => setTimeout(r, 10));
    });

    const success = await claimPromise!;
    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/boosts/claim', expect.objectContaining({ method: 'POST' }));
    expect(sessionStorage.getItem(BOOST_TOKEN_STORAGE_KEY('s1'))).toContain('hint');
  });

  it('does not POST if ad declined', async () => {
    const { result } = renderHook(() => useBoostClaim('s1'));

    let claimPromise: Promise<boolean>;
    await act(async () => {
      claimPromise = result.current.claim('hint');
    });

    expect(mockOnAdError).toBeDefined();

    await act(async () => {
      await mockOnAdError?.('ad_declined');
      // Give the async state update time
      await new Promise((r) => setTimeout(r, 10));
    });

    const success = await claimPromise!;
    expect(success).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('exposes claimed boost from sessionStorage on mount', async () => {
    sessionStorage.setItem(BOOST_TOKEN_STORAGE_KEY('s1'), JSON.stringify({ boostType: 'hint', token: 'b1.s1.hint.999.sig' }));
    const { result } = renderHook(() => useBoostClaim('s1'));
    await waitFor(() => expect(result.current.claimed?.boostType).toBe('hint'));
  });
});

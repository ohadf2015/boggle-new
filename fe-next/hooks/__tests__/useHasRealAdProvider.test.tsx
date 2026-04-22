/**
 * useHasRealAdProvider — read-only hook used to gate rewarded-ad entry points.
 *
 * Placement CTAs should only render when a real ad provider (CrazyGames,
 * AdMob native, AdSense) is wired AND working. In production without a
 * provider we fall into placeholder mode — the entry point must disappear.
 *
 * Dev (`NODE_ENV !== 'production'`) returns true so local testing works.
 */
import { renderHook } from '@testing-library/react';

const crazyGamesState = { isAvailable: false, isOnCrazyGamesPlatform: false };
const adPlacementState = { isReady: false };
const capacitorState = { isNative: false };

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ ...crazyGamesState, showRewardedAd: vi.fn() }),
}));

vi.mock('@/hooks/useAdPlacement', () => ({
  useAdPlacement: () => ({ ...adPlacementState, showRewarded: vi.fn() }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => capacitorState.isNative },
}));

import { useHasRealAdProvider } from '../useHasRealAdProvider';

describe('useHasRealAdProvider', () => {
  beforeEach(() => {
    crazyGamesState.isAvailable = false;
    crazyGamesState.isOnCrazyGamesPlatform = false;
    adPlacementState.isReady = false;
    capacitorState.isNative = false;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true in development even without any provider (local testing)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { result } = renderHook(() => useHasRealAdProvider());
    expect(result.current).toBe(true);
  });

  it('returns false in production with no provider', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { result } = renderHook(() => useHasRealAdProvider());
    expect(result.current).toBe(false);
  });

  it('returns true in production when on CrazyGames platform', () => {
    vi.stubEnv('NODE_ENV', 'production');
    crazyGamesState.isAvailable = true;
    crazyGamesState.isOnCrazyGamesPlatform = true;
    const { result } = renderHook(() => useHasRealAdProvider());
    expect(result.current).toBe(true);
  });

  it('returns true in production on native (AdMob)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    capacitorState.isNative = true;
    const { result } = renderHook(() => useHasRealAdProvider());
    expect(result.current).toBe(true);
  });

  it('returns true in production when AdSense placement ready', () => {
    vi.stubEnv('NODE_ENV', 'production');
    adPlacementState.isReady = true;
    const { result } = renderHook(() => useHasRealAdProvider());
    expect(result.current).toBe(true);
  });

  it('returns false in production when CrazyGames SDK loaded but not on platform', () => {
    vi.stubEnv('NODE_ENV', 'production');
    crazyGamesState.isAvailable = true;
    crazyGamesState.isOnCrazyGamesPlatform = false;
    const { result } = renderHook(() => useHasRealAdProvider());
    expect(result.current).toBe(false);
  });
});

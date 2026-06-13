import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getFlag, onFlags } = vi.hoisted(() => ({
  getFlag: vi.fn(),
  onFlags: vi.fn(),
}));

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    getFeatureFlag: getFlag,
    onFeatureFlags: onFlags,
  },
}));

import { useOfflineModeFlag } from '../useOfflineModeFlag';

describe('useOfflineModeFlag', () => {
  beforeEach(() => {
    getFlag.mockReset();
    onFlags.mockReset();
    delete process.env.NEXT_PUBLIC_OFFLINE_DEV;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to false when PostHog returns nothing', () => {
    getFlag.mockReturnValue(undefined);
    const { result } = renderHook(() => useOfflineModeFlag());
    expect(result.current).toBe(false);
  });

  it('returns true when PostHog reports the offline-mode flag enabled', () => {
    getFlag.mockReturnValue(true);
    const { result } = renderHook(() => useOfflineModeFlag());
    expect(result.current).toBe(true);
  });

  it('overrides to true via NEXT_PUBLIC_OFFLINE_DEV env regardless of PostHog', () => {
    process.env.NEXT_PUBLIC_OFFLINE_DEV = '1';
    getFlag.mockReturnValue(false);
    const { result } = renderHook(() => useOfflineModeFlag());
    expect(result.current).toBe(true);
  });

  it('reads the correct flag key', () => {
    getFlag.mockReturnValue(false);
    renderHook(() => useOfflineModeFlag());
    expect(getFlag).toHaveBeenCalledWith('offline-mode');
  });
});

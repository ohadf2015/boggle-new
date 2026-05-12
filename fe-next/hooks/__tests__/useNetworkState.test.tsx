import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn(async () => ({ connected: true, connectionType: 'wifi' })),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

import { useNetworkState } from '../useNetworkState';

describe('useNetworkState', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '4g', rtt: 100 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns online=true and slow=false on a fast connection', () => {
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.online).toBe(true);
    expect(result.current.slow).toBe(false);
    expect(result.current.type).toBe('wifi');
  });

  it('flips online=false on the offline window event', () => {
    const { result } = renderHook(() => useNetworkState());
    act(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.online).toBe(false);
    expect(result.current.type).toBe('none');
  });

  it('flags slow=true when navigator.connection.effectiveType is 2g', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '2g', rtt: 1500 },
    });
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.slow).toBe(true);
  });

  it('flags slow=true when effectiveType is slow-2g', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: 'slow-2g', rtt: 3000 },
    });
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.slow).toBe(true);
  });

  it('keeps slow=false on 3g (borderline but considered fast enough)', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '3g', rtt: 500 },
    });
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.slow).toBe(false);
  });

  it('exposes rttMs from navigator.connection.rtt when present', () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '4g', rtt: 87 },
    });
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.rttMs).toBe(87);
  });

  it('returns rttMs=null when Network Information API is unavailable', () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
    const { result } = renderHook(() => useNetworkState());
    expect(result.current.rttMs).toBeNull();
    expect(result.current.type).toBe('unknown');
  });
});

describe('useNetworkState — native plugin missing fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '4g', rtt: 100 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not throw when Capacitor Network plugin is missing on native', async () => {
    const unhandled = vi.fn();
    process.on?.('unhandledRejection', unhandled);

    vi.doMock('@capacitor/core', () => ({
      Capacitor: { isNativePlatform: () => true },
    }));
    vi.doMock('@capacitor/network', () => ({
      Network: {
        getStatus: vi.fn(async () => {
          throw new Error('"Network" plugin is not implemented on android');
        }),
        addListener: vi.fn(async () => {
          throw new Error('"Network" plugin is not implemented on android');
        }),
      },
    }));

    const { useNetworkState: useNetworkStateNative } = await import('../useNetworkState');
    const { result } = renderHook(() => useNetworkStateNative());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.online).toBe(true);
    expect(unhandled).not.toHaveBeenCalled();
    process.off?.('unhandledRejection', unhandled);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChainHaptics } from '../useChainHaptics';

const vibrateMock = vi.fn();

beforeEach(() => {
  vibrateMock.mockClear();
  Object.defineProperty(navigator, 'vibrate', {
    value: vibrateMock,
    configurable: true,
  });
  // Ensure haptics enabled (default true if absent)
  if (typeof localStorage !== 'undefined') localStorage.removeItem('haptics-enabled');
});

describe('useChainHaptics', () => {
  it('does not vibrate on first render', () => {
    renderHook(() => useChainHaptics({ chainEventKey: 0, chainDepth: 0 }));
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('chain depth 2 fires medium pattern', () => {
    const { rerender } = renderHook(({ k, d }) => useChainHaptics({ chainEventKey: k, chainDepth: d }), {
      initialProps: { k: 0, d: 0 },
    });
    rerender({ k: 1, d: 2 });
    expect(vibrateMock).toHaveBeenCalledWith([40, 20, 40]); // vibrateMedium
  });

  it('chain depth 3 fires heavy pattern', () => {
    const { rerender } = renderHook(({ k, d }) => useChainHaptics({ chainEventKey: k, chainDepth: d }), {
      initialProps: { k: 0, d: 0 },
    });
    rerender({ k: 1, d: 3 });
    expect(vibrateMock).toHaveBeenCalledWith([60, 30, 60, 30, 60]); // vibrateHeavy
  });

  it('chain depth 5 fires success-chord pattern', () => {
    const { rerender } = renderHook(({ k, d }) => useChainHaptics({ chainEventKey: k, chainDepth: d }), {
      initialProps: { k: 0, d: 0 },
    });
    rerender({ k: 1, d: 5 });
    expect(vibrateMock).toHaveBeenCalledWith([100, 50, 50, 50]); // vibrateSuccessChord
  });

  it('chain depth 1 (tier=none) does not vibrate', () => {
    const { rerender } = renderHook(({ k, d }) => useChainHaptics({ chainEventKey: k, chainDepth: d }), {
      initialProps: { k: 0, d: 0 },
    });
    rerender({ k: 1, d: 1 });
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('same chainEventKey does not refire (idempotent)', () => {
    const { rerender } = renderHook(({ k, d }) => useChainHaptics({ chainEventKey: k, chainDepth: d }), {
      initialProps: { k: 1, d: 3 },
    });
    vibrateMock.mockClear();
    rerender({ k: 1, d: 3 });
    expect(vibrateMock).not.toHaveBeenCalled();
  });
});

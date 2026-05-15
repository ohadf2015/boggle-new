import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBlastHaptics } from '../useBlastHaptics';

describe('useBlastHaptics', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vibrateMock,
    });
    localStorage.setItem('haptics-enabled', 'true');
  });

  afterEach(() => {
    localStorage.removeItem('haptics-enabled');
  });

  it('fires a light tick when the selection count grows', () => {
    const { rerender } = renderHook(
      ({ count }: { count: number }) =>
        useBlastHaptics({ selectionCount: count, invalidKey: 0, foundCount: 0, status: 'playing' }),
      { initialProps: { count: 0 } },
    );
    vibrateMock.mockClear();
    rerender({ count: 1 });
    expect(vibrateMock).toHaveBeenCalled();
  });

  it('does not fire when selection count shrinks', () => {
    const { rerender } = renderHook(
      ({ count }: { count: number }) =>
        useBlastHaptics({ selectionCount: count, invalidKey: 0, foundCount: 0, status: 'playing' }),
      { initialProps: { count: 3 } },
    );
    vibrateMock.mockClear();
    rerender({ count: 2 });
    expect(vibrateMock).not.toHaveBeenCalled();
  });

  it('fires an error buzz when invalidKey changes', () => {
    const { rerender } = renderHook(
      ({ k }: { k: number }) =>
        useBlastHaptics({ selectionCount: 0, invalidKey: k, foundCount: 0, status: 'playing' }),
      { initialProps: { k: 0 } },
    );
    vibrateMock.mockClear();
    rerender({ k: 1 });
    expect(vibrateMock).toHaveBeenCalled();
    const pattern = vibrateMock.mock.calls[0]![0] as number[];
    expect(pattern.length).toBeGreaterThanOrEqual(2);
  });

  it('fires a success pulse when a new word is found', () => {
    const { rerender } = renderHook(
      ({ f }: { f: number }) =>
        useBlastHaptics({ selectionCount: 0, invalidKey: 0, foundCount: f, status: 'playing' }),
      { initialProps: { f: 0 } },
    );
    vibrateMock.mockClear();
    rerender({ f: 1 });
    expect(vibrateMock).toHaveBeenCalled();
  });

  it('fires a long success chord when status flips to levelComplete', () => {
    const { rerender } = renderHook(
      ({ s }: { s: 'playing' | 'levelComplete' }) =>
        useBlastHaptics({ selectionCount: 0, invalidKey: 0, foundCount: 1, status: s }),
      { initialProps: { s: 'playing' as const } },
    );
    vibrateMock.mockClear();
    rerender({ s: 'levelComplete' });
    expect(vibrateMock).toHaveBeenCalled();
  });

  it('respects haptics-enabled=false', () => {
    localStorage.setItem('haptics-enabled', 'false');
    const { rerender } = renderHook(
      ({ count }: { count: number }) =>
        useBlastHaptics({ selectionCount: count, invalidKey: 0, foundCount: 0, status: 'playing' }),
      { initialProps: { count: 0 } },
    );
    vibrateMock.mockClear();
    rerender({ count: 1 });
    expect(vibrateMock).not.toHaveBeenCalled();
  });
});

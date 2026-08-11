import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useShareOpenGuard } from '../useShareOpenGuard';

describe('useShareOpenGuard', () => {
  it('returns true on first call with a sessionId', () => {
    const { result } = renderHook(() => useShareOpenGuard());

    const shouldFire = result.current.shouldFireShareOpen('game-123');

    expect(shouldFire).toBe(true);
  });

  it('returns false on subsequent calls with the same sessionId', () => {
    const { result } = renderHook(() => useShareOpenGuard());

    // First call
    const first = result.current.shouldFireShareOpen('game-123');
    expect(first).toBe(true);

    // Second call with same sessionId
    const second = result.current.shouldFireShareOpen('game-123');
    expect(second).toBe(false);

    // Third call — still false
    const third = result.current.shouldFireShareOpen('game-123');
    expect(third).toBe(false);
  });

  it('allows multiple different sessionIds to each fire once', () => {
    const { result } = renderHook(() => useShareOpenGuard());

    const session1First = result.current.shouldFireShareOpen('game-1');
    const session2First = result.current.shouldFireShareOpen('game-2');
    const session1Second = result.current.shouldFireShareOpen('game-1');
    const session2Second = result.current.shouldFireShareOpen('game-2');

    expect(session1First).toBe(true);
    expect(session2First).toBe(true);
    expect(session1Second).toBe(false);
    expect(session2Second).toBe(false);
  });

  it('returns false for null or undefined sessionId', () => {
    const { result } = renderHook(() => useShareOpenGuard());

    expect(result.current.shouldFireShareOpen(null)).toBe(false);
    expect(result.current.shouldFireShareOpen(undefined)).toBe(false);
    expect(result.current.shouldFireShareOpen('')).toBe(false);
  });

  it('preserves guard state across re-renders', () => {
    const { result, rerender } = renderHook(() => useShareOpenGuard());

    // First render: fire once
    const first = result.current.shouldFireShareOpen('game-123');
    expect(first).toBe(true);

    // Simulate a re-render (parent props changed, etc.)
    rerender();

    // Same sessionId on the "new" hook instance should still be suppressed
    // because the ref persists across re-renders
    const second = result.current.shouldFireShareOpen('game-123');
    expect(second).toBe(false);
  });
});

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWordCraftGame } from '../useWordCraftGame';

describe('useWordCraftGame dimensions', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 360 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes 11x11 board on phone viewport', () => {
    const { result } = renderHook(() => useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['test']) }));
    expect(result.current.state.board.size).toBe(11);
  });

  it('initializes 13x13 board on tablet viewport', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    const { result } = renderHook(() => useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['test']) }));
    expect(result.current.state.board.size).toBe(13);
  });

  it('does not re-evaluate dims after resize', () => {
    const { result } = renderHook(() => useWordCraftGame({ seed: 1, locale: 'en', dict: new Set(['test']) }));
    const sizeBefore = result.current.state.board.size;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
    window.dispatchEvent(new Event('resize'));
    expect(result.current.state.board.size).toBe(sizeBefore);
  });
});

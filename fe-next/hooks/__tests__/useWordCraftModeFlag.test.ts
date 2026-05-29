import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWordCraftMode } from '../useWordCraftModeFlag';

function withSearch(search: string) {
  vi.stubGlobal('window', { location: { search } } as unknown as Window & typeof globalThis);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useWordCraftMode', () => {
  it('defaults to territory with no params', () => {
    withSearch('');
    expect(renderHook(() => useWordCraftMode()).result.current).toBe('territory');
  });

  it('reads gems', () => {
    withSearch('?mode=gems');
    expect(renderHook(() => useWordCraftMode()).result.current).toBe('gems');
  });

  it('reads cards (the power-card run mode)', () => {
    withSearch('?mode=cards');
    expect(renderHook(() => useWordCraftMode()).result.current).toBe('cards');
  });

  it('reads classic (explicit + legacy ?classic=1)', () => {
    withSearch('?mode=classic');
    expect(renderHook(() => useWordCraftMode()).result.current).toBe('classic');
    withSearch('?classic=1');
    expect(renderHook(() => useWordCraftMode()).result.current).toBe('classic');
  });
});

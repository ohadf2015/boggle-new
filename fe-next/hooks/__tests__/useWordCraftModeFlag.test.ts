import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWordCraftMode, gateWordCraftMode } from '../useWordCraftModeFlag';

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

  it('resolves retired classic links to Territory', () => {
    withSearch('?mode=classic');
    expect(renderHook(() => useWordCraftMode()).result.current).toBe('territory');
    withSearch('?classic=1');
    expect(renderHook(() => useWordCraftMode()).result.current).toBe('territory');
  });
});

describe('gateWordCraftMode (only Territory is public)', () => {
  it('keeps Cards & Gems for admins', () => {
    expect(gateWordCraftMode('cards', true)).toBe('cards');
    expect(gateWordCraftMode('gems', true)).toBe('gems');
  });

  it('redirects non-admins from Cards & Gems to Territory', () => {
    expect(gateWordCraftMode('cards', false)).toBe('territory');
    expect(gateWordCraftMode('gems', false)).toBe('territory');
  });

  it('always allows Territory for everyone', () => {
    expect(gateWordCraftMode('territory', false)).toBe('territory');
    expect(gateWordCraftMode('territory', true)).toBe('territory');
  });
});

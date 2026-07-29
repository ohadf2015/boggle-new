import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

let mockPathname = '/en';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

import {
  useFirstGameLanguageNotice,
  FIRST_GAME_LANG_NOTICE_KEY,
} from './useFirstGameLanguageNotice';

describe('useFirstGameLanguageNotice', () => {
  beforeEach(() => {
    localStorage.clear();
    mockPathname = '/en';
  });

  it('stays hidden on non-gameplay routes', () => {
    mockPathname = '/en/settings';
    const { result } = renderHook(() => useFirstGameLanguageNotice());
    expect(result.current.visible).toBe(false);
  });

  it('shows once when first reaching a gameplay route', () => {
    mockPathname = '/en/singleplayer';
    const { result } = renderHook(() => useFirstGameLanguageNotice());
    expect(result.current.visible).toBe(true);
    // Persisted immediately so it is a once-ever notice.
    expect(localStorage.getItem(FIRST_GAME_LANG_NOTICE_KEY)).toBe('1');
  });

  it('does NOT show again on a later game once the flag is set', () => {
    localStorage.setItem(FIRST_GAME_LANG_NOTICE_KEY, '1');
    mockPathname = '/en/blast';
    const { result } = renderHook(() => useFirstGameLanguageNotice());
    expect(result.current.visible).toBe(false);
  });

  it('dismiss() hides the notice', () => {
    mockPathname = '/en/multiplayer';
    const { result } = renderHook(() => useFirstGameLanguageNotice());
    expect(result.current.visible).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
  });

  it('exposes the active language (fallback en without a provider)', () => {
    mockPathname = '/en/crossword';
    const { result } = renderHook(() => useFirstGameLanguageNotice());
    expect(result.current.language).toBe('en');
  });
});

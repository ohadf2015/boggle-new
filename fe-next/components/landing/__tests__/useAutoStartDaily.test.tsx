/**
 * useAutoStartDaily — NYT-style "the homepage IS the game" for returning
 * visitors. Anyone who has ever completed a Word Hunt on this device is
 * redirected from the landing to today's puzzle (which itself auto-skips
 * its ready screen for returning players). New visitors keep the hero;
 * signed-in users keep the home hub, and we never redirect while auth is
 * still resolving.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockReplace = vi.fn();
const mockHasEverPlayed = vi.fn<() => boolean>(() => false);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  hasEverPlayedWordHunt: () => mockHasEverPlayed(),
}));

import { useAutoStartDaily } from '../useAutoStartDaily';

const base = { language: 'en' as const, authLoading: false, isAuthenticated: false };

describe('useAutoStartDaily', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasEverPlayed.mockReturnValue(false);
  });

  it('redirects a returning guest straight to today\'s word hunt', () => {
    mockHasEverPlayed.mockReturnValue(true);
    renderHook(() => useAutoStartDaily(base));
    expect(mockReplace).toHaveBeenCalledWith('/en/daily/word-hunt');
  });

  it('uses the active locale in the redirect target', () => {
    mockHasEverPlayed.mockReturnValue(true);
    renderHook(() => useAutoStartDaily({ ...base, language: 'he' }));
    expect(mockReplace).toHaveBeenCalledWith('/he/daily/word-hunt');
  });

  it('keeps the hero for a brand-new visitor (never played)', () => {
    renderHook(() => useAutoStartDaily(base));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('never redirects while auth is still resolving', () => {
    mockHasEverPlayed.mockReturnValue(true);
    renderHook(() => useAutoStartDaily({ ...base, authLoading: true }));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('leaves signed-in users on the home hub', () => {
    mockHasEverPlayed.mockReturnValue(true);
    renderHook(() => useAutoStartDaily({ ...base, isAuthenticated: true }));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects once auth resolves to guest', () => {
    mockHasEverPlayed.mockReturnValue(true);
    const { rerender } = renderHook(
      (props) => useAutoStartDaily(props),
      { initialProps: { ...base, authLoading: true } },
    );
    expect(mockReplace).not.toHaveBeenCalled();
    rerender({ ...base, authLoading: false });
    expect(mockReplace).toHaveBeenCalledWith('/en/daily/word-hunt');
  });
});

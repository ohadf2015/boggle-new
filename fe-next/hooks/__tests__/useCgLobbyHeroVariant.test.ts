import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCgLobbyHeroVariant } from '../useCgLobbyHeroVariant';

const SEEN_KEY = 'lexiclash_cg_seen';

describe('useCgLobbyHeroVariant', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns first-timer when cgUser=null and seen-flag absent', () => {
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(result.current.variant).toBe('first-timer');
    expect(result.current.displayName).toBe(null);
  });

  it('returns returning-named when cgUser has username', () => {
    const { result } = renderHook(() =>
      useCgLobbyHeroVariant({ username: 'OhadF' }),
    );
    expect(result.current.variant).toBe('returning-named');
    expect(result.current.displayName).toBe('OhadF');
  });

  it('returns returning-anon when cgUser=null but seen-flag is set', () => {
    localStorage.setItem(SEEN_KEY, '1');
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(result.current.variant).toBe('returning-anon');
    expect(result.current.displayName).toBe(null);
  });

  it('falls back to first-timer when localStorage access throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(result.current.variant).toBe('first-timer');
    spy.mockRestore();
  });

  it('exposes a markSeen() that writes the flag without throwing on storage failure', () => {
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(() => result.current.markSeen()).not.toThrow();
    expect(localStorage.getItem(SEEN_KEY)).toBe('1');
  });

  it('markSeen swallows storage errors', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useCgLobbyHeroVariant(null));
    expect(() => result.current.markSeen()).not.toThrow();
    spy.mockRestore();
  });

  it('does not re-evaluate variant on rerender (variant is computed once on mount)', () => {
    const { result, rerender } = renderHook(
      ({ user }: { user: { username: string } | null }) => useCgLobbyHeroVariant(user),
      { initialProps: { user: null } },
    );
    expect(result.current.variant).toBe('first-timer');
    rerender({ user: { username: 'LateBinding' } });
    expect(result.current.variant).toBe('first-timer');
  });
});

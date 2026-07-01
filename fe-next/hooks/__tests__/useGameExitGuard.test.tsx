/**
 * useGameExitGuard — shared "leave active game?" flow. Verifies the in-app
 * back button confirms only while active, the guard blocks browser/hardware
 * back into a confirm, and confirming quits + flips `leaving` so the guard's
 * teardown won't pop the phantom history entry (Capacitor black-screen guard).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameExitGuard } from '../useGameExitGuard';

// Capture the options useNavigationGuard is called with each render.
let lastGuardOptions: {
  enabled: boolean;
  leaving?: boolean;
  onNavigationAttempt?: () => boolean | void;
} | null = null;
vi.mock('../useNavigationGuard', () => ({
  useNavigationGuard: (opts: typeof lastGuardOptions) => {
    lastGuardOptions = opts;
  },
}));

describe('useGameExitGuard', () => {
  beforeEach(() => {
    lastGuardOptions = null;
  });

  it('enables the guard while active and not yet quitting', () => {
    const onQuit = vi.fn();
    renderHook(() => useGameExitGuard({ active: true, onQuit }));
    expect(lastGuardOptions?.enabled).toBe(true);
    expect(lastGuardOptions?.leaving).toBe(false);
  });

  it('does NOT enable the guard when inactive', () => {
    const onQuit = vi.fn();
    renderHook(() => useGameExitGuard({ active: false, onQuit }));
    expect(lastGuardOptions?.enabled).toBe(false);
  });

  it('requestExit opens the confirm while active (does not quit yet)', () => {
    const onQuit = vi.fn();
    const { result } = renderHook(() => useGameExitGuard({ active: true, onQuit }));
    act(() => result.current.requestExit());
    expect(result.current.showConfirm).toBe(true);
    expect(onQuit).not.toHaveBeenCalled();
  });

  it('requestExit quits immediately when NOT active (post-game back)', () => {
    const onQuit = vi.fn();
    const { result } = renderHook(() => useGameExitGuard({ active: false, onQuit }));
    act(() => result.current.requestExit());
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(result.current.showConfirm).toBe(false);
  });

  it('the guard callback blocks back nav and opens the confirm', () => {
    const onQuit = vi.fn();
    const { result } = renderHook(() => useGameExitGuard({ active: true, onQuit }));
    let returned: boolean | void = undefined;
    act(() => { returned = lastGuardOptions?.onNavigationAttempt?.(); });
    expect(returned).toBe(false);
    expect(result.current.showConfirm).toBe(true);
  });

  it('confirmQuit quits and flips leaving so teardown skips the phantom pop', () => {
    const onQuit = vi.fn();
    const { result } = renderHook(() => useGameExitGuard({ active: true, onQuit }));
    act(() => result.current.confirmQuit());
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(result.current.quitting).toBe(true);
    expect(result.current.showConfirm).toBe(false);
    // After quitting, the guard is disabled and marked leaving.
    expect(lastGuardOptions?.enabled).toBe(false);
    expect(lastGuardOptions?.leaving).toBe(true);
  });
});

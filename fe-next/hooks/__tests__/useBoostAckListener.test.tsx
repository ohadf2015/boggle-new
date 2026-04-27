/**
 * Tests for useBoostAckListener.
 *
 * Surfaces a success toast when the server confirms a boost was registered
 * via the `boost:applied` socket event. Solves the prior UX gap where users
 * claimed a boost, saw "active this game" in the picker, but had ZERO in-game
 * confirmation that the boost had actually been applied server-side.
 */

import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- Mock socket --------------------------------------------------------
const handlers: Record<string, ((data: unknown) => void) | undefined> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => {
    handlers[event] = handler;
  }),
  off: vi.fn((event: string) => {
    delete handlers[event];
  }),
};

vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({ socket: mockSocket, isConnected: true }),
}));

// --- Mock toast ---------------------------------------------------------
const neoSuccessToast = vi.fn();
vi.mock('@/components/NeoToast', () => ({
  neoSuccessToast: (...args: unknown[]) => neoSuccessToast(...args),
  TOAST_ICONS: { sparkle: 'sparkle', gamepad: 'gamepad' },
}));

// --- Mock i18n ----------------------------------------------------------
const tSpy = vi.fn((key: string, _vars?: Record<string, unknown>) => `t:${key}`);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tSpy }),
}));

import { useBoostAckListener } from '../useBoostAckListener';

describe('useBoostAckListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  it('subscribes to boost:applied on mount', () => {
    renderHook(() => useBoostAckListener());
    expect(mockSocket.on).toHaveBeenCalledWith('boost:applied', expect.any(Function));
  });

  it('does not fire a toast before any event', () => {
    renderHook(() => useBoostAckListener());
    expect(neoSuccessToast).not.toHaveBeenCalled();
  });

  it('fires a success toast with the boost-specific title when boost:applied succeeds', () => {
    renderHook(() => useBoostAckListener());

    act(() => {
      handlers['boost:applied']?.({ success: true, boostType: 'scoreMultiplier' });
    });

    expect(neoSuccessToast).toHaveBeenCalledTimes(1);
    // The hook must look up the per-type title so the user sees WHICH boost is live
    expect(tSpy).toHaveBeenCalledWith('boosts.scoreMultiplier.title');
    // ...and pass it into the activation copy
    expect(tSpy).toHaveBeenCalledWith('boosts.activated', expect.objectContaining({ boost: 't:boosts.scoreMultiplier.title' }));
  });

  it('handles every supported boost type', () => {
    renderHook(() => useBoostAckListener());
    const types = ['freezeTime', 'hint', 'scoreMultiplier', 'firstWordBonus'];
    for (const type of types) {
      act(() => {
        handlers['boost:applied']?.({ success: true, boostType: type });
      });
    }
    expect(neoSuccessToast).toHaveBeenCalledTimes(types.length);
  });

  it('does not fire a toast when success is false', () => {
    renderHook(() => useBoostAckListener());

    act(() => {
      handlers['boost:applied']?.({ success: false });
    });

    expect(neoSuccessToast).not.toHaveBeenCalled();
  });

  it('does not fire a toast when boostType is missing', () => {
    renderHook(() => useBoostAckListener());

    act(() => {
      handlers['boost:applied']?.({ success: true });
    });

    expect(neoSuccessToast).not.toHaveBeenCalled();
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useBoostAckListener());
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith('boost:applied', expect.any(Function));
  });
});

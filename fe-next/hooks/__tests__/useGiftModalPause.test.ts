/**
 * useGiftModalPause Hook Tests
 *
 * Tests the hook that listens for gift modal open/close events
 * and returns whether the gift modal is currently open.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGiftModalPause } from '../useGiftModalPause';

describe('useGiftModalPause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false initially', () => {
    const { result } = renderHook(() => useGiftModalPause());
    expect(result.current).toBe(false);
  });

  it('should return true when gift modal opens', () => {
    const { result } = renderHook(() => useGiftModalPause());

    act(() => {
      window.dispatchEvent(
        new CustomEvent('giftModalStateChange', {
          detail: { isOpen: true },
        })
      );
    });

    expect(result.current).toBe(true);
  });

  it('should return false when gift modal closes', () => {
    const { result } = renderHook(() => useGiftModalPause());

    // Open the modal
    act(() => {
      window.dispatchEvent(
        new CustomEvent('giftModalStateChange', {
          detail: { isOpen: true },
        })
      );
    });

    expect(result.current).toBe(true);

    // Close the modal
    act(() => {
      window.dispatchEvent(
        new CustomEvent('giftModalStateChange', {
          detail: { isOpen: false },
        })
      );
    });

    expect(result.current).toBe(false);
  });

  it('should handle multiple open/close cycles', () => {
    const { result } = renderHook(() => useGiftModalPause());

    // First cycle
    act(() => {
      window.dispatchEvent(
        new CustomEvent('giftModalStateChange', {
          detail: { isOpen: true },
        })
      );
    });
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('giftModalStateChange', {
          detail: { isOpen: false },
        })
      );
    });
    expect(result.current).toBe(false);

    // Second cycle
    act(() => {
      window.dispatchEvent(
        new CustomEvent('giftModalStateChange', {
          detail: { isOpen: true },
        })
      );
    });
    expect(result.current).toBe(true);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('giftModalStateChange', {
          detail: { isOpen: false },
        })
      );
    });
    expect(result.current).toBe(false);
  });

  it('should cleanup event listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useGiftModalPause());

    // Verify listener was added
    expect(addSpy).toHaveBeenCalledWith(
      'giftModalStateChange',
      expect.any(Function)
    );

    unmount();

    // Verify listener was removed on unmount
    expect(removeSpy).toHaveBeenCalledWith(
      'giftModalStateChange',
      expect.any(Function)
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

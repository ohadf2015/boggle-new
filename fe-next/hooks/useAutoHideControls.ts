'use client';

import { useState, useCallback } from 'react';
import { useSafeTimeout } from './useSafeTimeout';

interface UseAutoHideControlsOptions {
  /** Time in ms before hiding controls (default: 3000) */
  hideDelay?: number;
  /** Whether controls start hidden (default: true) */
  initialHidden?: boolean;
  /** Whether the feature is enabled (default: true) */
  enabled?: boolean;
}

interface UseAutoHideControlsReturn {
  /** Whether controls are currently visible */
  isVisible: boolean;
  /** Whether controls are pinned (won't auto-hide) */
  isPinned: boolean;
  /** Show controls temporarily (starts auto-hide timer) */
  show: () => void;
  /** Pin controls to stay visible permanently */
  pin: () => void;
  /** Unpin and hide controls */
  unpin: () => void;
  /** Toggle pinned state */
  togglePin: () => void;
}

/**
 * Hook for auto-hiding UI controls with scroll/touch reveal
 * - Controls hide by default
 * - Show on user interaction (scroll, touch)
 * - Auto-hide after delay
 * - Click to pin (stay visible)
 */
export function useAutoHideControls(options: UseAutoHideControlsOptions = {}): UseAutoHideControlsReturn {
  const {
    hideDelay = 3000,
    initialHidden = true,
    enabled = true,
  } = options;

  const [isVisible, setIsVisible] = useState(!initialHidden);
  const [isPinned, setIsPinned] = useState(false);
  const { set: setHideTimer, clear: clearHideTimer } = useSafeTimeout();

  // Start hide timer
  const startHideTimer = useCallback(() => {
    if (!enabled) return;

    setHideTimer(() => {
      if (!isPinned) {
        setIsVisible(false);
      }
    }, hideDelay);
  }, [hideDelay, isPinned, setHideTimer, enabled]);

  // Show controls (with auto-hide timer)
  const show = useCallback(() => {
    if (!enabled) return;
    setIsVisible(true);
    if (!isPinned) {
      startHideTimer();
    }
  }, [isPinned, startHideTimer, enabled]);

  // Pin controls (stay visible)
  const pin = useCallback(() => {
    if (!enabled) return;
    clearHideTimer();
    setIsPinned(true);
    setIsVisible(true);
  }, [clearHideTimer, enabled]);

  // Unpin and hide
  const unpin = useCallback(() => {
    if (!enabled) return;
    setIsPinned(false);
    setIsVisible(false);
  }, [enabled]);

  // Toggle pinned state
  const togglePin = useCallback(() => {
    if (!enabled) return;
    if (isPinned) {
      unpin();
    } else {
      pin();
    }
  }, [isPinned, pin, unpin, enabled]);

  // If disabled, always show
  if (!enabled) {
    return {
      isVisible: true,
      isPinned: false,
      show: () => {},
      pin: () => {},
      unpin: () => {},
      togglePin: () => {},
    };
  }

  return {
    isVisible,
    isPinned,
    show,
    pin,
    unpin,
    togglePin,
  };
}

export default useAutoHideControls;

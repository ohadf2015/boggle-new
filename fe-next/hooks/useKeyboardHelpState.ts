'use client';

/**
 * useKeyboardHelpState - Manages state for keyboard shortcuts help system
 *
 * Features:
 * - Tracks help overlay open/close state
 * - Persists first-time hint dismissal to localStorage
 * - Detects '?' key press to open help
 * - Handles Escape to close
 * - Desktop-only by default
 */

import { useState, useCallback, useEffect } from 'react';
import { useDismissedFlag } from '@/hooks/useLocalStorageState';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';

// ==================== Types ====================

export interface UseKeyboardHelpStateOptions {
  /** Whether the keyboard help system is enabled (typically false on mobile) */
  enabled?: boolean;
  /** Whether first-time quick tip is enabled */
  enableQuickTip?: boolean;
}

export interface UseKeyboardHelpStateReturn {
  /** Whether the help overlay is open */
  isHelpOpen: boolean;
  /** Whether to show the first-time quick tip */
  showQuickTip: boolean;
  /** Open the help overlay */
  openHelp: () => void;
  /** Close the help overlay */
  closeHelp: () => void;
  /** Dismiss the first-time quick tip (persisted) */
  dismissQuickTip: () => void;
}

// ==================== Constants ====================

const STORAGE_KEY_QUICK_TIP = 'lexiclash_keyboard_quick_tip_dismissed';

// ==================== Hook ====================

export function useKeyboardHelpState(
  options: UseKeyboardHelpStateOptions = {}
): UseKeyboardHelpStateReturn {
  const { enabled = true, enableQuickTip = true } = options;

  // Help overlay state
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // First-time quick tip dismissal (persisted)
  const { isDismissed: isQuickTipDismissed, dismiss: dismissQuickTipStorage } =
    useDismissedFlag(STORAGE_KEY_QUICK_TIP);

  // Open/close helpers
  const openHelp = useCallback(() => {
    if (enabled) {
      setIsHelpOpen(true);
    }
  }, [enabled]);

  const closeHelp = useCallback(() => {
    setIsHelpOpen(false);
  }, []);

  // Dismiss quick tip (also closes help if open)
  const dismissQuickTip = useCallback(() => {
    dismissQuickTipStorage();
  }, [dismissQuickTipStorage]);

  // Listen for '?' key to open help, Escape to close
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (isTypingTarget(event)) {
        return;
      }

      // '?' key (Shift + /) opens help
      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        setIsHelpOpen((prev) => !prev); // Toggle on repeated press
        return;
      }

      // Escape closes help overlay (with priority)
      if (event.key === 'Escape' && isHelpOpen) {
        event.preventDefault();
        event.stopPropagation();
        setIsHelpOpen(false);
        return;
      }
    };

    // Use capture to get Escape before other handlers
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enabled, isHelpOpen]);

  // Compute whether to show quick tip
  const showQuickTip = enabled && enableQuickTip && !isQuickTipDismissed;

  return {
    isHelpOpen,
    showQuickTip,
    openHelp,
    closeHelp,
    dismissQuickTip,
  };
}

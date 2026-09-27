/**
 * useDrillKeyboardSupport - Keyboard support for brain drills
 *
 * Convenience hook that bundles:
 * - useKeyboardWordInput for typed word input
 * - Desktop detection
 * - Enter key hint state management
 * - Quick tip visibility management
 *
 * Provides everything needed to add keyboard support to a drill component.
 */

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useKeyboardWordInput, type UseKeyboardWordInputOptions } from './useKeyboardWordInput';
import type { LetterGrid, Language } from '@/types';
import type { HighlightedCell } from '@/components/GridComponent';

// ==================== Constants ====================

const QUICK_TIP_STORAGE_KEY = 'lexiclash_drill_keyboard_tip_dismissed';
const ENTER_HINT_STORAGE_KEY = 'lexiclash_drill_enter_hint_count';
const MAX_ENTER_HINT_SHOWS = 5;

// ==================== Types ====================

export interface UseDrillKeyboardSupportOptions {
  /** The letter grid to validate against */
  grid: LetterGrid;
  /** Language for normalization */
  language: Language | string;
  /** Board language (for desktop keyboard mismatch notifications) */
  gameLanguage?: Language | string | null;
  /** Whether keyboard input is enabled (typically phase === 'playing') */
  enabled: boolean;
  /** Callback when word is submitted via keyboard */
  onWordSubmit: (word: string) => void;
  /** Minimum word length for submission */
  minWordLength?: number;
}

export interface UseDrillKeyboardSupportReturn {
  // From useKeyboardWordInput
  /** The currently typed word */
  typedWord: string;
  /** Whether the typed word could exist on the grid */
  isValidOnGrid: boolean;
  /** Cells to highlight on the grid matching the typed letters */
  highlightedCells: HighlightedCell[];
  /** Clear the typed word */
  clearTypedWord: () => void;
  /** Submit the typed word */
  submitTypedWord: () => void;
  /** Whether keyboard input mode is active (user has started typing) */
  isTypingMode: boolean;

  // Desktop detection
  /** Whether the device is desktop (non-mobile) */
  isDesktop: boolean;

  // Quick tip state
  /** Whether to show the keyboard quick tip */
  showQuickTip: boolean;
  /** Dismiss the quick tip permanently */
  dismissQuickTip: () => void;

  // Enter hint state
  /** Whether to show the Enter key hint */
  showEnterHint: boolean;
  /** Increment the Enter hint show counter */
  incrementEnterHintCount: () => void;
  /** Dismiss Enter hint permanently */
  dismissEnterHint: () => void;
}

// ==================== Hook ====================

export function useDrillKeyboardSupport(
  options: UseDrillKeyboardSupportOptions
): UseDrillKeyboardSupportReturn {
  const {
    grid,
    language,
    gameLanguage,
    enabled,
    onWordSubmit,
    minWordLength = 2,
  } = options;

  // Desktop detection
  const isDesktop = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }, []);

  // Use the keyboard word input hook
  const keyboardInput = useKeyboardWordInput({
    grid,
    language: language as string,
    gameLanguage: gameLanguage as Language | null | undefined,
    enabled: enabled && isDesktop, // Only enable on desktop
    onWordSubmit,
    minWordLength,
  });

  // Quick tip state (show on first drill play)
  const [showQuickTip, setShowQuickTip] = useState(false);

  useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;

    const dismissed = localStorage.getItem(QUICK_TIP_STORAGE_KEY) === 'true';
    if (!dismissed && enabled) {
      // Small delay before showing tip
      const timer = setTimeout(() => {
        setShowQuickTip(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    return; // Explicit return for TypeScript
  }, [isDesktop, enabled]);

  const dismissQuickTip = useCallback(() => {
    setShowQuickTip(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(QUICK_TIP_STORAGE_KEY, 'true');
    }
  }, []);

  // Enter hint state
  const [enterHintCount, setEnterHintCount] = useState<number>(0);
  const [showEnterHint, setShowEnterHint] = useState(false);

  useEffect(() => {
    if (!isDesktop || typeof window === 'undefined') return;

    const stored = localStorage.getItem(ENTER_HINT_STORAGE_KEY);
    const count = stored ? parseInt(stored, 10) : 0;
    setEnterHintCount(count);
    setShowEnterHint(count < MAX_ENTER_HINT_SHOWS);
  }, [isDesktop]);

  const incrementEnterHintCount = useCallback(() => {
    if (enterHintCount < MAX_ENTER_HINT_SHOWS) {
      const newCount = enterHintCount + 1;
      setEnterHintCount(newCount);
      if (typeof window !== 'undefined') {
        localStorage.setItem(ENTER_HINT_STORAGE_KEY, String(newCount));
      }
      if (newCount >= MAX_ENTER_HINT_SHOWS) {
        setShowEnterHint(false);
      }
    }
  }, [enterHintCount]);

  const dismissEnterHint = useCallback(() => {
    setShowEnterHint(false);
    setEnterHintCount(MAX_ENTER_HINT_SHOWS);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ENTER_HINT_STORAGE_KEY, String(MAX_ENTER_HINT_SHOWS));
    }
  }, []);

  // Track when Enter hint is shown
  const shouldShowEnterHint = showEnterHint &&
    keyboardInput.isTypingMode &&
    keyboardInput.typedWord.length >= minWordLength &&
    keyboardInput.isValidOnGrid;

  // Increment counter when hint becomes visible
  useEffect(() => {
    if (shouldShowEnterHint) {
      incrementEnterHintCount();
    }
  }, [shouldShowEnterHint, incrementEnterHintCount]);

  return {
    // From useKeyboardWordInput
    typedWord: keyboardInput.typedWord,
    isValidOnGrid: keyboardInput.isValidOnGrid,
    highlightedCells: keyboardInput.highlightedCells,
    clearTypedWord: keyboardInput.clearTypedWord,
    submitTypedWord: keyboardInput.submitTypedWord,
    isTypingMode: keyboardInput.isTypingMode,

    // Desktop detection
    isDesktop,

    // Quick tip state
    showQuickTip,
    dismissQuickTip,

    // Enter hint state
    showEnterHint: shouldShowEnterHint,
    incrementEnterHintCount,
    dismissEnterHint,
  };
}

export default useDrillKeyboardSupport;

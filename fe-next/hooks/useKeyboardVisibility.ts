'use client';

import { useState, useEffect, useCallback } from 'react';

interface KeyboardVisibilityState {
  /** Whether the virtual keyboard is currently visible */
  isVisible: boolean;
  /** Estimated height of the keyboard in pixels */
  keyboardHeight: number;
}

interface UseKeyboardVisibilityOptions {
  /** Minimum height difference to consider keyboard open (default: 150px) */
  threshold?: number;
  /** Callback when keyboard visibility changes */
  onVisibilityChange?: (isVisible: boolean, height: number) => void;
}

/**
 * Hook to detect mobile virtual keyboard visibility
 *
 * Uses Visual Viewport API when available, falls back to resize detection.
 * Sets CSS custom property --keyboard-height for use in styles.
 *
 * @example
 * ```tsx
 * const { isVisible, keyboardHeight } = useKeyboardVisibility();
 *
 * return (
 *   <div className={isVisible ? 'keyboard-open' : ''}>
 *     <input type="text" className="keyboard-scroll-target" />
 *   </div>
 * );
 * ```
 */
export function useKeyboardVisibility(
  options: UseKeyboardVisibilityOptions = {}
): KeyboardVisibilityState {
  const { threshold = 150, onVisibilityChange } = options;

  const [state, setState] = useState<KeyboardVisibilityState>({
    isVisible: false,
    keyboardHeight: 0,
  });

  const updateKeyboardState = useCallback((isVisible: boolean, height: number) => {
    setState(prev => {
      if (prev.isVisible === isVisible && prev.keyboardHeight === height) {
        return prev;
      }
      return { isVisible, keyboardHeight: height };
    });

    // Update CSS custom property for use in stylesheets
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${height}px`
      );
    }

    onVisibilityChange?.(isVisible, height);
  }, [onVisibilityChange]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use Visual Viewport API if available (modern browsers)
    const visualViewport = window.visualViewport;

    if (visualViewport) {
      const handleViewportResize = () => {
        const viewportHeight = visualViewport.height;
        const windowHeight = window.innerHeight;
        const heightDiff = windowHeight - viewportHeight;

        const isKeyboardVisible = heightDiff > threshold;
        const keyboardHeight = isKeyboardVisible ? heightDiff : 0;

        updateKeyboardState(isKeyboardVisible, keyboardHeight);
      };

      // Initial check
      handleViewportResize();

      visualViewport.addEventListener('resize', handleViewportResize);
      visualViewport.addEventListener('scroll', handleViewportResize);

      return () => {
        visualViewport.removeEventListener('resize', handleViewportResize);
        visualViewport.removeEventListener('scroll', handleViewportResize);
      };
    }

    // Fallback: detect via window resize + focus events
    let lastWindowHeight = window.innerHeight;
    let focusedElement: Element | null = null;

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const heightDiff = lastWindowHeight - currentHeight;

      // Only consider keyboard if an input-like element is focused
      const isInputFocused =
        focusedElement instanceof HTMLInputElement ||
        focusedElement instanceof HTMLTextAreaElement ||
        focusedElement?.getAttribute('contenteditable') === 'true';

      if (isInputFocused && heightDiff > threshold) {
        updateKeyboardState(true, heightDiff);
      } else if (heightDiff < -threshold || !isInputFocused) {
        updateKeyboardState(false, 0);
        lastWindowHeight = currentHeight;
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      focusedElement = e.target as Element;
      // Small delay to let keyboard animation complete
      setTimeout(handleResize, 300);
    };

    const handleFocusOut = () => {
      focusedElement = null;
      // Small delay to let keyboard animation complete
      setTimeout(() => {
        updateKeyboardState(false, 0);
        lastWindowHeight = window.innerHeight;
      }, 300);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [threshold, updateKeyboardState]);

  return state;
}

/**
 * Utility to scroll an element into view when keyboard opens
 * Use with inputs that might be obscured by the virtual keyboard
 */
export function scrollIntoViewIfNeeded(element: HTMLElement | null): void {
  if (!element) return;

  // Add scroll margin to ensure element isn't hidden behind keyboard
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}

export default useKeyboardVisibility;

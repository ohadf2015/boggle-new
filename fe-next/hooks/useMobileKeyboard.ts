'use client';

import { useState, useEffect, useCallback } from 'react';

interface MobileKeyboardState {
  keyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * Hook to detect mobile virtual keyboard visibility and height
 * Uses visualViewport API for accurate detection across iOS and Android
 */
export function useMobileKeyboard(): MobileKeyboardState {
  const [state, setState] = useState<MobileKeyboardState>({
    keyboardVisible: false,
    keyboardHeight: 0,
  });

  const handleResize = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Use visualViewport for accurate keyboard detection
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const windowHeight = window.innerHeight;
    const heightDiff = windowHeight - viewportHeight;

    // Keyboard is considered visible if height difference > 150px
    // This threshold accounts for small browser chrome changes
    const isKeyboardVisible = heightDiff > 150;

    setState({
      keyboardVisible: isKeyboardVisible,
      keyboardHeight: isKeyboardVisible ? heightDiff : 0,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial check
    handleResize();

    // Listen to visualViewport resize events (best for keyboard detection)
    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize);
    }

    // Fallback for browsers without visualViewport
    window.addEventListener('resize', handleResize);

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return state;
}

/**
 * Utility function to scroll an element into view when keyboard opens
 * Call this on input focus for better mobile UX
 */
export function scrollInputIntoView(element: HTMLElement | null): void {
  if (!element) return;

  // Small delay to allow keyboard to open first
  setTimeout(() => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, 100);
}

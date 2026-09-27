/**
 * useFocusTrap Hook
 *
 * Traps keyboard focus within a container element for accessible modals/dialogs.
 * Implements WCAG 2.1.2 (Keyboard) focus management.
 *
 * - Cycles Tab/Shift+Tab within focusable elements
 * - Focuses first focusable element on open
 * - Restores focus to previously focused element on close
 * - Optionally handles Escape key
 */

import { useCallback, useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onEscape?: () => void
): void {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements =
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    },
    [containerRef, onEscape]
  );

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleKeyDown);

    // Delay to allow modal animation/render to complete
    const timerId = setTimeout(() => {
      const firstFocusable =
        containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timerId);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, handleKeyDown, containerRef]);
}

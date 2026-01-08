'use client';

import { useEffect, useCallback, useRef, RefObject } from 'react';

interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose: () => void;
  modalRef: RefObject<HTMLElement | null>;
  /** Delay before focusing first element (for animation) */
  focusDelay?: number;
}

/**
 * Hook for modal accessibility features
 * - Focus trap (Tab/Shift+Tab cycles within modal)
 * - Escape key to close
 * - Focus restoration on close
 */
export function useModalAccessibility({
  isOpen,
  onClose,
  modalRef,
  focusDelay = 100,
}: UseModalAccessibilityOptions) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    // Focus trap
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose, modalRef]);

  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Add keyboard listener
      document.addEventListener('keydown', handleKeyDown);

      // Focus first focusable element after animation
      const timeoutId = setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, focusDelay);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timeoutId);
      };
    } else {
      // Restore focus when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
      return;
    }
  }, [isOpen, handleKeyDown, modalRef, focusDelay]);
}

export default useModalAccessibility;

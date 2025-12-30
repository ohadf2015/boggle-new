/**
 * useFocusTrap - Accessibility hook for trapping focus within a container
 *
 * Traps focus within a container element when active, cycling through
 * focusable elements with Tab/Shift+Tab. Returns focus to the trigger
 * element when the trap is deactivated.
 *
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const containerRef = useFocusTrap(isOpen);
 *
 *   return isOpen ? (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       <button onClick={onClose}>Close</button>
 *       <input type="text" />
 *     </div>
 *   ) : null;
 * }
 * ```
 */

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // Store the currently focused element to restore later
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the first focusable element in the container
      const container = containerRef.current;
      if (container) {
        // Small delay to ensure DOM is ready
        requestAnimationFrame(() => {
          const focusable = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
          focusable?.focus();
        });
      }
    } else {
      // Return focus to the trigger element
      previousFocusRef.current?.focus();
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      // Shift+Tab from first element -> focus last
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      // Tab from last element -> focus first
      else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

export default useFocusTrap;

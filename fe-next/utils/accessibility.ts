/**
 * Accessibility utility functions
 */

export interface AnimationVariant {
  initial?: Record<string, unknown>;
  animate?: Record<string, unknown>;
  exit?: Record<string, unknown>;
  transition?: Record<string, unknown>;
}

export interface AccessibleButtonProps {
  'aria-label': string;
  'role': string;
  'tabIndex': number;
  'aria-describedby'?: string;
}

export interface AccessibleInputProps {
  id: string;
  'aria-required': boolean;
  'aria-invalid'?: string;
  'aria-describedby'?: string;
}

/**
 * Check if user prefers reduced motion
 * @returns True if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation variants that respect reduced motion preference
 * @param normalVariants - Normal animation variants
 * @param reducedVariants - Reduced motion variants (optional)
 * @returns Animation variants based on user preference
 */
export const getAccessibleAnimationVariants = (
  normalVariants: AnimationVariant,
  reducedVariants: AnimationVariant = {}
): AnimationVariant => {
  if (prefersReducedMotion()) {
    return {
      initial: reducedVariants.initial || { opacity: 1 },
      animate: reducedVariants.animate || { opacity: 1 },
      exit: reducedVariants.exit || { opacity: 1 },
      transition: { duration: 0 }
    };
  }

  return normalVariants;
};

/**
 * Generate accessible button props
 * @param label - Accessible label
 * @param description - Additional description (optional)
 * @returns Accessibility props for button
 */
export const getAccessibleButtonProps = (
  label: string,
  description: string | null = null
): AccessibleButtonProps => {
  const props: AccessibleButtonProps = {
    'aria-label': label,
    'role': 'button',
    'tabIndex': 0
  };

  if (description) {
    props['aria-describedby'] = description;
  }

  return props;
};

/**
 * Handle keyboard navigation for custom interactive elements
 * @param event - Keyboard event
 * @param onClick - Click handler function
 */
export const handleKeyboardClick = (
  event: React.KeyboardEvent,
  onClick: (event: React.KeyboardEvent) => void
): void => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick(event);
  }
};

/**
 * Announce message to screen readers
 * @param message - Message to announce
 * @param priority - Priority level: 'polite' or 'assertive'
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  if (typeof window === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Get ARIA props for form input
 * @param id - Input ID
 * @param required - Whether input is required
 * @param error - Error message (if any)
 * @param describedBy - ID of describing element
 * @returns ARIA props
 */
export const getAccessibleInputProps = (
  id: string,
  required: boolean = false,
  error: string | null = null,
  describedBy: string | null = null
): AccessibleInputProps => {
  const props: AccessibleInputProps = {
    id,
    'aria-required': required,
  };

  if (error) {
    props['aria-invalid'] = 'true';
    props['aria-describedby'] = `${id}-error`;
  } else if (describedBy) {
    props['aria-describedby'] = describedBy;
  }

  return props;
};

/**
 * Focus trap utility for modals/dialogs
 * @param element - Container element
 * @returns Cleanup function
 */
export const createFocusTrap = (element: HTMLElement | null): (() => void) => {
  if (!element) return () => {};

  const focusableElements = element.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Focus first element
  if (firstElement) {
    firstElement.focus();
  }

  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Skip to main content link helper
 * @param mainContentId - ID of main content element
 */
export const skipToMainContent = (mainContentId: string = 'main-content'): void => {
  const mainContent = document.getElementById(mainContentId);
  if (mainContent) {
    mainContent.focus();
    mainContent.scrollIntoView();
  }
};

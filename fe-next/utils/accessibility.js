/**
 * Accessibility utility functions
 */

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation variants that respect reduced motion preference
 * @param {Object} normalVariants - Normal animation variants
 * @param {Object} reducedVariants - Reduced motion variants (optional)
 * @returns {Object} Animation variants based on user preference
 */
export const getAccessibleAnimationVariants = (normalVariants, reducedVariants = {}) => {
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
 * @param {string} label - Accessible label
 * @param {string} description - Additional description (optional)
 * @returns {Object} Accessibility props for button
 */
export const getAccessibleButtonProps = (label, description = null) => {
  const props = {
    'aria-label': label,
    role: 'button',
    tabIndex: 0
  };

  if (description) {
    props['aria-describedby'] = description;
  }

  return props;
};

/**
 * Handle keyboard navigation for custom interactive elements
 * @param {KeyboardEvent} event - Keyboard event
 * @param {Function} onClick - Click handler function
 */
export const handleKeyboardClick = (event, onClick) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick(event);
  }
};

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level: 'polite' or 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
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
 * @param {string} id - Input ID
 * @param {boolean} required - Whether input is required
 * @param {string} error - Error message (if any)
 * @param {string} describedBy - ID of describing element
 * @returns {Object} ARIA props
 */
export const getAccessibleInputProps = (id, required = false, error = null, describedBy = null) => {
  const props = {
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
 * @param {HTMLElement} element - Container element
 * @returns {Function} Cleanup function
 */
export const createFocusTrap = (element) => {
  if (!element) return () => {};

  const focusableElements = element.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
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
 * @param {string} mainContentId - ID of main content element
 */
export const skipToMainContent = (mainContentId = 'main-content') => {
  const mainContent = document.getElementById(mainContentId);
  if (mainContent) {
    mainContent.focus();
    mainContent.scrollIntoView();
  }
};

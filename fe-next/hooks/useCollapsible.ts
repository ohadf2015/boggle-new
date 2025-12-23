/**
 * useCollapsible - Reusable expand/collapse UI pattern hook
 *
 * Consolidates expand/collapse state management used in:
 * - ResultsPlayerCard.tsx (word sections)
 * - SinglePlayerResults.tsx (bot details)
 * - Other collapsible UI elements
 */

import { useState, useCallback, useId } from 'react';

export interface UseCollapsibleOptions {
  /** Initial expanded state (default: false) */
  defaultExpanded?: boolean;
  /** Callback when state changes */
  onToggle?: (isExpanded: boolean) => void;
}

export interface UseCollapsibleReturn {
  /** Current expanded state */
  isExpanded: boolean;
  /** Toggle the expanded state */
  toggle: () => void;
  /** Expand the content */
  expand: () => void;
  /** Collapse the content */
  collapse: () => void;
  /** Set expanded state directly */
  setExpanded: (expanded: boolean) => void;
  /** Props for the toggle button (accessibility) */
  getButtonProps: () => {
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-controls': string;
  };
  /** Props for the collapsible content (accessibility) */
  getContentProps: () => {
    id: string;
    'aria-hidden': boolean;
  };
  /** Framer Motion animation props for the content */
  animationProps: {
    initial: { height: number; opacity: number };
    animate: { height: 'auto' | number; opacity: number };
    exit: { height: number; opacity: number };
    transition: { duration: number; ease: string };
  };
}

/**
 * Hook for managing expand/collapse UI state with accessibility
 *
 * @example
 * ```tsx
 * const { isExpanded, toggle, getButtonProps, getContentProps, animationProps } = useCollapsible('words');
 *
 * return (
 *   <>
 *     <button {...getButtonProps()}>
 *       {isExpanded ? 'Collapse' : 'Expand'}
 *     </button>
 *     <AnimatePresence>
 *       {isExpanded && (
 *         <motion.div {...getContentProps()} {...animationProps}>
 *           Content here
 *         </motion.div>
 *       )}
 *     </AnimatePresence>
 *   </>
 * );
 * ```
 */
export function useCollapsible(
  id?: string,
  options: UseCollapsibleOptions = {}
): UseCollapsibleReturn {
  const { defaultExpanded = false, onToggle } = options;

  // Generate unique ID if not provided
  const generatedId = useId();
  const contentId = id ? `collapsible-${id}` : `collapsible-${generatedId}`;

  const [isExpanded, setIsExpandedState] = useState(defaultExpanded);

  const setExpanded = useCallback((expanded: boolean) => {
    setIsExpandedState(expanded);
    onToggle?.(expanded);
  }, [onToggle]);

  const toggle = useCallback(() => {
    setExpanded(!isExpanded);
  }, [isExpanded, setExpanded]);

  const expand = useCallback(() => {
    setExpanded(true);
  }, [setExpanded]);

  const collapse = useCallback(() => {
    setExpanded(false);
  }, [setExpanded]);

  const getButtonProps = useCallback(() => ({
    onClick: toggle,
    'aria-expanded': isExpanded,
    'aria-controls': contentId,
  }), [toggle, isExpanded, contentId]);

  const getContentProps = useCallback(() => ({
    id: contentId,
    'aria-hidden': !isExpanded,
  }), [contentId, isExpanded]);

  // Framer Motion animation props
  const animationProps = {
    initial: { height: 0, opacity: 0 },
    animate: { height: 'auto' as const, opacity: 1 },
    exit: { height: 0, opacity: 0 },
    transition: { duration: 0.2, ease: 'easeInOut' },
  };

  return {
    isExpanded,
    toggle,
    expand,
    collapse,
    setExpanded,
    getButtonProps,
    getContentProps,
    animationProps,
  };
}

export default useCollapsible;

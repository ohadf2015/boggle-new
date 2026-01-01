'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Modal types in priority order (higher priority = shown first)
 * When multiple modals want to show, highest priority wins
 */
export type ModalType =
  | 'wordFeedback'   // Priority 1: Crowd-sourced word validation
  | 'share'          // Priority 2: Share win prompt
  | 'auth'           // Priority 3: Sign up prompt
  | 'firstWin'       // Priority 4: First win celebration signup
  | 'generic';       // Priority 5: Any other modal

const MODAL_PRIORITY: Record<ModalType, number> = {
  wordFeedback: 1,
  share: 2,
  auth: 3,
  firstWin: 4,
  generic: 5,
};

interface ModalQueueState {
  /** Currently showing modal type (or null if none) */
  activeModal: ModalType | null;
  /** Whether we've already shown a modal this session */
  hasShownModal: boolean;
  /** Queue of modals waiting to be shown (if we decide to show more than one) */
  queue: ModalType[];
}

interface UseModalQueueReturn {
  /** Currently active modal type */
  activeModal: ModalType | null;
  /** Whether we've shown a modal this session */
  hasShownModal: boolean;
  /** Request to show a modal - returns true if it will be shown */
  requestModal: (type: ModalType) => boolean;
  /** Close the current modal */
  closeModal: () => void;
  /** Check if a specific modal type can be shown */
  canShowModal: (type: ModalType) => boolean;
  /** Reset the queue (use sparingly) */
  reset: () => void;
}

/**
 * useModalQueue - Manages modal display to prevent cognitive overload
 *
 * Features:
 * - Limits to 1 modal per session (configurable)
 * - Priority-based: If multiple modals request at once, highest priority wins
 * - Session-aware: Tracks if a modal was already shown
 *
 * Usage:
 * ```tsx
 * const { activeModal, requestModal, closeModal } = useModalQueue();
 *
 * // Request to show a modal
 * useEffect(() => {
 *   if (shouldShowWordFeedback) {
 *     requestModal('wordFeedback');
 *   }
 * }, [shouldShowWordFeedback]);
 *
 * // In render:
 * <WordFeedbackModal isOpen={activeModal === 'wordFeedback'} onClose={closeModal} />
 * ```
 */
export function useModalQueue(options?: {
  /** Allow showing more than one modal per session (default: false) */
  allowMultiple?: boolean;
  /** Types that can always show, ignoring the limit */
  alwaysAllowTypes?: ModalType[];
}): UseModalQueueReturn {
  const { allowMultiple = false, alwaysAllowTypes = [] } = options || {};

  const [state, setState] = useState<ModalQueueState>({
    activeModal: null,
    hasShownModal: false,
    queue: [],
  });

  // Track if component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const canShowModal = useCallback((type: ModalType): boolean => {
    // Always allow types in the whitelist
    if (alwaysAllowTypes.includes(type)) {
      return true;
    }

    // If multiple allowed, always can show
    if (allowMultiple) {
      return true;
    }

    // If no modal shown yet this session, allow
    if (!state.hasShownModal) {
      return true;
    }

    return false;
  }, [allowMultiple, alwaysAllowTypes, state.hasShownModal]);

  const requestModal = useCallback((type: ModalType): boolean => {
    // Check if we can show this modal
    if (!canShowModal(type)) {
      return false;
    }

    setState(prev => {
      // If there's already an active modal, check priority
      if (prev.activeModal !== null) {
        const currentPriority = MODAL_PRIORITY[prev.activeModal];
        const newPriority = MODAL_PRIORITY[type];

        // Only replace if new modal has higher priority (lower number)
        if (newPriority < currentPriority) {
          return {
            ...prev,
            activeModal: type,
            hasShownModal: true,
          };
        }

        // Otherwise, don't change
        return prev;
      }

      // No active modal, show this one
      return {
        ...prev,
        activeModal: type,
        hasShownModal: true,
      };
    });

    return true;
  }, [canShowModal]);

  const closeModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeModal: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      activeModal: null,
      hasShownModal: false,
      queue: [],
    });
  }, []);

  return {
    activeModal: state.activeModal,
    hasShownModal: state.hasShownModal,
    requestModal,
    closeModal,
    canShowModal,
    reset,
  };
}

export default useModalQueue;

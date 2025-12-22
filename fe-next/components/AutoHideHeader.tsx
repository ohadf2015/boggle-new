'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import { useMobileLandscape } from '../hooks/useMobileLandscape';
import { useAutoHideControls } from '../hooks/useAutoHideControls';

interface AutoHideHeaderProps {
  className?: string;
  /** Callback when header visibility changes */
  onVisibilityChange?: (isVisible: boolean) => void;
}

/**
 * AutoHideHeader - Header wrapper that auto-hides in landscape mode
 *
 * Behavior:
 * - Portrait/Desktop: Header is always visible (normal behavior)
 * - Landscape Mobile: Header auto-hides after 3 seconds
 *   - Shows on touch/scroll
 *   - Can be pinned to stay visible
 *   - Slides up/down with animation
 */
export function AutoHideHeader({ className, onVisibilityChange }: AutoHideHeaderProps) {
  const isLandscape = useMobileLandscape();

  const {
    isVisible,
    isPinned,
    show: showHeader,
    togglePin,
  } = useAutoHideControls({
    hideDelay: 3000,
    initialHidden: true,
    enabled: isLandscape,
  });

  // Notify parent of visibility changes
  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(isLandscape ? (isVisible || isPinned) : true);
    }
  }, [isLandscape, isVisible, isPinned, onVisibilityChange]);

  // Show header on scroll/touch in landscape mode
  useEffect(() => {
    if (!isLandscape) return;

    const handleInteraction = () => showHeader();

    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('touchmove', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('touchmove', handleInteraction);
    };
  }, [isLandscape, showHeader]);

  // In portrait/desktop mode, always show header normally
  if (!isLandscape) {
    return <Header className={className} />;
  }

  // In landscape mode, use auto-hide behavior
  const headerVisible = isVisible || isPinned;

  return (
    <>
      {/* Fixed header container for landscape */}
      <AnimatePresence>
        {headerVisible && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50"
            onClick={(e) => {
              // Toggle pin when clicking the header area (not buttons)
              if (e.target === e.currentTarget) {
                togglePin();
              }
            }}
          >
            <Header className={className} />

            {/* Pin indicator */}
            {isPinned && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-6 h-6 bg-neo-yellow border-2 border-neo-black rounded-neo text-xs flex items-center justify-center shadow-hard-sm"
              >
                <span role="img" aria-label="Pinned">📌</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch target to reveal header when hidden */}
      {!headerVisible && (
        <div
          className="fixed top-0 left-0 right-0 h-12 z-40"
          onTouchStart={showHeader}
          onClick={showHeader}
          aria-label="Tap to show header"
        />
      )}
    </>
  );
}

export default AutoHideHeader;

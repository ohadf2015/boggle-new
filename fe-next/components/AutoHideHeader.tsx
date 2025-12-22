'use client';

import { useEffect, useCallback, useState } from 'react';
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
 *   - Shows on touch/scroll/mousemove
 *   - Can be pinned to stay visible (click header or Ctrl+H/Cmd+H)
 *   - Slides up/down with animation (respects prefers-reduced-motion)
 */
export function AutoHideHeader({ className, onVisibilityChange }: AutoHideHeaderProps) {
  const isLandscape = useMobileLandscape();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

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

  // Show header on scroll/touch/mousemove in landscape mode
  useEffect(() => {
    if (!isLandscape) return;

    const handleInteraction = () => showHeader();

    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('touchmove', handleInteraction, { passive: true });
    window.addEventListener('mousemove', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('touchmove', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
    };
  }, [isLandscape, showHeader]);

  // Keyboard shortcut (Ctrl+H / Cmd+H) to toggle header visibility
  useEffect(() => {
    if (!isLandscape) return;

    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        togglePin();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isLandscape, togglePin]);

  // In portrait/desktop mode, always show header normally
  if (!isLandscape) {
    return <Header className={className} />;
  }

  // In landscape mode, use auto-hide behavior
  const headerVisible = isVisible || isPinned;
  const animationDuration = prefersReducedMotion ? 0 : 0.3;

  return (
    <>
      {/* ARIA live region for screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {headerVisible ? 'Header visible' : 'Header hidden. Press Ctrl+H to show.'}
      </div>

      {/* Fixed header container for landscape */}
      <AnimatePresence>
        {headerVisible && (
          <motion.div
            initial={prefersReducedMotion ? false : { y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: -100, opacity: 0 }}
            transition={{ duration: animationDuration, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50"
            onClick={(e) => {
              // Toggle pin when clicking the header area (not buttons)
              if (e.target === e.currentTarget) {
                togglePin();
              }
            }}
          >
            <Header className={className} />

            {/* Pin indicator with tooltip */}
            {isPinned && (
              <motion.button
                initial={prefersReducedMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                className="absolute top-2 right-2 w-6 h-6 bg-neo-yellow border-2 border-neo-black rounded-neo text-xs flex items-center justify-center shadow-hard-sm cursor-pointer hover:bg-neo-yellow/80"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin();
                }}
                title="Unpin header (Ctrl+H)"
                aria-label="Unpin header"
              >
                <span aria-hidden="true">📌</span>
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Touch target to reveal header when hidden */}
      {!headerVisible && (
        <button
          className="fixed top-0 left-0 right-0 h-12 z-40 bg-transparent border-none cursor-pointer"
          onTouchStart={showHeader}
          onClick={showHeader}
          aria-label="Show header (or press Ctrl+H)"
        />
      )}
    </>
  );
}

export default AutoHideHeader;
